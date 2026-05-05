/**
 * @module escrow-v2
 * @description V2 escrow settlement layer — supports settlement security
 * modes (CoSigned, DisputeWindow), receipt-based dispute resolution,
 * pending settlements, and automatic resolution via merkle proofs.
 *
 * @category Modules
 * @since v0.7.0
 * @packageDocumentation
 */

import {
  SystemProgram,
  type PublicKey,
  type TransactionSignature,
  type AccountMeta,
  type Signer,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseModule } from "./base";
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrowV2,
  derivePendingSettlement as derivePendingPda,
  deriveDispute as deriveDisputePda,
  deriveStake,
  deriveSettlementReceipt,
} from "../pda";
import type {
  EscrowAccountV2Data,
  PendingSettlementData,
  DisputeRecordData,
  CreateEscrowV2Args,
} from "../types";
import {
  buildPriorityFeeIxs,
  buildRpcOptions,
} from "../utils/priority-fee";
import type { SettleOptions } from "../utils/priority-fee";
import { isAcceptedPaymentToken, computeRequiredStakeLamports } from "../constants/payments";
import { throwPredicted } from "../utils/anchor-errors";

/**
 * @name EscrowV2Module
 * @description Manages V2 escrow accounts with settlement security modes,
 * dispute windows, and pending settlement flows.
 *
 * @category Modules
 * @since v0.7.0
 * @extends BaseModule
 */
export class EscrowV2Module extends BaseModule {
  // ── Helpers ──────────────────────────────────────────

  /** Convert BN | number | bigint → number for PDA seed functions. */
  private toNum(v: BN | number | bigint): number {
    return BN.isBN(v) ? v.toNumber() : Number(v);
  }

  // ── PDA helpers ──────────────────────────────────────

  deriveEscrow(
    agentPda: PublicKey,
    depositor?: PublicKey,
    nonce: BN | number | bigint = 0,
  ): readonly [PublicKey, number] {
    return deriveEscrowV2(agentPda, depositor ?? this.walletPubkey, this.toNum(nonce));
  }

  derivePendingSettlement(
    escrowV2Pda: PublicKey,
    settlementIndex: BN | number | bigint,
  ): readonly [PublicKey, number] {
    return derivePendingPda(escrowV2Pda, this.toNum(settlementIndex));
  }

  deriveDispute(
    pendingSettlementPda: PublicKey,
  ): readonly [PublicKey, number] {
    return deriveDisputePda(pendingSettlementPda);
  }

  // ── Instructions ─────────────────────────────────────

  async create(
    agentWallet: PublicKey,
    args: CreateEscrowV2Args,
    splAccounts: AccountMeta[] = [],
  ): Promise<TransactionSignature> {
    // v0.10.0: payment-token allowlist (SOL or USDC only).
    if (!isAcceptedPaymentToken(args.tokenMint ?? null)) {
      throw new Error(
        "createEscrowV2: tokenMint must be null (SOL) or USDC (mainnet/devnet). " +
        "On-chain will reject with PaymentTokenNotAllowed.",
      );
    }

    // v0.12.7 preflight: mirror the on-chain settlement-security guards
    // (escrow_v2.rs:106-115) so callers fail fast with a clear message
    // instead of paying for a tx that aborts with `InvalidSettlementSecurity`
    // or `CoSignerRequired`.
    const security = args.settlementSecurity;
    if (security === 0) {
      throw new Error(
        "createEscrowV2: settlementSecurity=0 (SelfReport) is deprecated since " +
        "v0.7. Use 1 (CoSigned) or 2 (DisputeWindow). On-chain rejects with " +
        "SelfReportDeprecated.",
      );
    }
    if (security === 1 && !args.coSigner) {
      throw new Error(
        "createEscrowV2: settlementSecurity=1 (CoSigned) requires `coSigner` " +
        "to be set. On-chain rejects with CoSignerRequired.",
      );
    }
    if (security === 2) {
      // The on-chain check is `dispute_window_slots > 0` — i.e. >= 1 slot.
      // Zero would let an agent settle and immediately drain pending funds
      // before any depositor could possibly file a dispute, defeating the
      // entire DisputeWindow security model. Enforce client-side too.
      const slots = BigInt(this.bn(args.disputeWindowSlots).toString());
      if (slots < 1n) {
        throw new Error(
          "createEscrowV2: settlementSecurity=2 (DisputeWindow) requires " +
          "`disputeWindowSlots >= 1` to prevent the zero-window abuse vector. " +
          "Recommended minimum is 2_160 slots (~15 min). On-chain rejects " +
          "with InvalidSettlementSecurity.",
        );
      }
    }
    if (security !== 0 && security !== 1 && security !== 2) {
      throw new Error(
        `createEscrowV2: settlementSecurity must be 1 (CoSigned) or 2 (DisputeWindow), got ${String(security)}.`,
      );
    }

    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, undefined, args.escrowNonce);
    const [stakePda] = deriveStake(agentPda);
    // v0.11 H-1 preflight: surface an actionable error if the agent's stake
    // does not cover the slashable share of the new escrow. Saves a failed
    // tx fee and gives the caller a clear top-up amount.
    try {
      const stakeAccount = await this.fetchAccountNullable<{ stakedAmount: BN }>("agentStake", stakePda);
      if (stakeAccount) {
        const escrowLamports = BigInt(this.bn(args.initialDeposit).toString());
        const required = computeRequiredStakeLamports(escrowLamports);
        const have = BigInt(stakeAccount.stakedAmount.toString());
        if (have < required) {
          throw new Error(
            `createEscrowV2: agent stake ${have} lamports < required ${required} ` +
            `lamports for escrow of ${escrowLamports} lamports. Top up via stakingModule.deposit.`,
          );
        }
      }
      // If no stake account exists at all, on-chain will reject with
      // AccountNotInitialized — we let that bubble up unchanged.
    } catch (err) {
      // Preflight is advisory; rethrow only the explicit coverage error.
      if (err instanceof Error && err.message.startsWith("createEscrowV2: agent stake")) {
        throw err;
      }
    }
    // v0.11 H-1 preflight: surface an actionable error if the agent's stake
    // does not cover the slashable share of the new escrow. Saves a failed
    // tx fee and gives the caller a clear top-up amount.
    try {
      const stakeAccount = await this.fetchAccountNullable<{ stakedAmount: BN }>("agentStake", stakePda);
      if (stakeAccount) {
        const escrowLamports = BigInt(this.bn(args.initialDeposit).toString());
        const required = computeRequiredStakeLamports(escrowLamports);
        const have = BigInt(stakeAccount.stakedAmount.toString());
        if (have < required) {
          throw new Error(
            `createEscrowV2: agent stake ${have} lamports < required ${required} ` +
            `lamports for escrow of ${escrowLamports} lamports. Top up via stakingModule.deposit.`,
          );
        }
      }
      // If no stake account exists at all, on-chain will reject with
      // AccountNotInitialized — we let that bubble up unchanged.
    } catch (err) {
      // Preflight is advisory; rethrow only the explicit coverage error.
      if (err instanceof Error && err.message.startsWith("createEscrowV2: agent stake")) {
        throw err;
      }
    }

    return this.methods
      .createEscrowV2(
        this.bn(args.escrowNonce),
        this.bn(args.pricePerCall),
        this.bn(args.maxCalls),
        this.bn(args.initialDeposit),
        args.expiresAt,
        args.volumeCurve,
        args.tokenMint,
        args.tokenDecimals,
        args.settlementSecurity,
        this.bn(args.disputeWindowSlots),
        args.coSigner,
        args.arbiter,
      )
      .accounts({
        depositor: this.walletPubkey,
        agent: agentPda,
        agentStake: stakePda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts)
      .rpc();
  }

  async deposit(
    agentWallet: PublicKey,
    nonce: BN | number | bigint,
    amount: BN | number | bigint,
    splAccounts: AccountMeta[] = [],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, undefined, nonce);

    // v0.13.0 preflights — escrow exists, token shape matches, amount > 0
    const escrow = await this.requireAccountExists<EscrowAccountV2Data>(
      "escrowAccountV2",
      escrowPda,
      { predicted: "NotAuthority", hint: "Escrow V2 PDA not found — call createEscrow first" },
    );
    const want = BigInt(this.bn(amount).toString());
    if (want <= 0n) throwPredicted("InsufficientEscrowBalance", "Deposit amount must be > 0");
    const isSpl = escrow.tokenMint != null;
    if (isSpl && splAccounts.length < 4) {
      throwPredicted("SplTokenRequired", "Pass [depositorAta, escrowAta, tokenMint, tokenProgram]");
    }
    if (!isSpl && splAccounts.length > 0) {
      throwPredicted("InvalidTokenAccount", "SOL escrow does not accept splAccounts");
    }

    return this.methods
      .depositEscrowV2(this.bn(nonce), this.bn(amount))
      .accounts({
        depositor: this.walletPubkey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts)
      .rpc();
  }

  async settle(
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
    callsToSettle: BN | number | bigint,
    serviceHash: number[],
    splAccounts: AccountMeta[] = [],
    opts?: SettleOptions,
    coSigner?: Signer,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = this.deriveEscrow(agentPda, depositorWallet, nonce);
    const [statsPda] = deriveAgentStats(agentPda);
    const [receiptPda] = deriveSettlementReceipt(escrowPda, serviceHash);

    const preIxs = buildPriorityFeeIxs(opts);
    const rpcOpts = buildRpcOptions(opts);

    // CoSigned escrows require the co-signer to appear in
    // remaining_accounts with `is_signer = true` AND to actually sign
    // the transaction (Anchor on-chain checks `acc.is_signer`).
    // We dedupe so callers can also pass it manually via splAccounts.
    const remaining: AccountMeta[] = coSigner
      ? [
          ...splAccounts.filter((a) => !a.pubkey.equals(coSigner.publicKey)),
          { pubkey: coSigner.publicKey, isSigner: true, isWritable: false },
        ]
      : splAccounts;

    let builder = this.methods
      .settleCallsV2(this.bn(nonce), this.bn(callsToSettle), serviceHash)
      .accountsPartial({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        settlementReceipt: receiptPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remaining);

    if (coSigner) {
      builder = builder.signers([coSigner]);
    }

    if (preIxs.length > 0) {
      builder = builder.preInstructions(preIxs);
    }

    return builder.rpc(rpcOpts);
  }

  /**
   * Read the current `escrow.settlement_index` from chain.
   *
   * In DisputeWindow mode (`settlementSecurity = 2`), every successful
   * `settleCallsV2` increments this value. The PRE-increment value is the
   * one to pass to {@link createPendingSettlement} for that batch.
   *
   * @returns the current `settlementIndex` as `bigint` (next index to use
   *   for `createPendingSettlement` if you have NOT yet called `settle` for
   *   it; if you HAVE just settled, subtract 1 — but prefer the event
   *   `SettlementPendingEvent.settlement_index` over arithmetic).
   * @since v0.12.8
   */
  async nextSettlementIndex(
    agentWallet: PublicKey,
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
  ): Promise<bigint> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, depositorWallet, nonce);
    const escrow = await this.fetchAccountNullable<EscrowAccountV2Data>(
      "escrowAccountV2",
      escrowPda,
    );
    if (!escrow) {
      throw new Error(
        `nextSettlementIndex: escrow PDA ${escrowPda.toBase58()} not found on-chain`,
      );
    }
    return BigInt(escrow.settlementIndex.toString());
  }

  async createPendingSettlement(
    agentWallet: PublicKey,
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
    settlementIndex: BN | number | bigint,
    callsToSettle: BN | number | bigint,
    amount: BN | number | bigint,
    serviceHash: number[],
    receiptMerkleRoot: number[] = new Array(32).fill(0),
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, depositorWallet, nonce);
    const [pendingPda] = this.derivePendingSettlement(escrowPda, settlementIndex);

    // v0.12.8: preflight against the "Allocate: account already in use"
    // SystemProgram error (custom 0x0). The pending_settlement PDA is
    // seeded on `escrow + settlement_index`, so reusing the same index
    // (e.g. always 0, or a stale retry value) collides with an existing
    // account. Fail fast with an actionable message instead of burning a
    // failed tx fee on simulation.
    const existing = await this.provider.connection.getAccountInfo(pendingPda);
    if (existing) {
      const idx = this.bn(settlementIndex).toString();
      throw new Error(
        `createPendingSettlement: pending PDA ${pendingPda.toBase58()} ` +
          `already exists for settlementIndex=${idx}. ` +
          `Use EscrowV2Module.nextSettlementIndex() to read the current ` +
          `escrow.settlement_index, or capture SettlementPendingEvent.settlement_index ` +
          `from the preceding settleCallsV2 tx. Reusing a settlementIndex ` +
          `causes SystemProgram Allocate (custom 0x0) failures.`,
      );
    }

    return this.methods
      .createPendingSettlement(
        this.bn(settlementIndex),
        this.bn(callsToSettle),
        this.bn(amount),
        serviceHash,
        receiptMerkleRoot,
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        escrow: escrowPda,
        pendingSettlement: pendingPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async finalizeSettlement(
    agentWallet: PublicKey,
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
    settlementIndex: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, depositorWallet, nonce);
    const [pendingPda] = this.derivePendingSettlement(escrowPda, settlementIndex);
    const [statsPda] = deriveAgentStats(agentPda);

    // v0.12.9: preflight against ArithmeticOverflow at finalize.
    //
    // The on-chain handler subtracts `pending_settlement.amount` from BOTH
    // `escrow.balance` AND `escrow.pending_amount`. If the PendingSettlement
    // PDA was created without a preceding `settle_calls_v2` (orphan PDA from
    // legacy probe loops, or a buggy caller that skipped the settle step),
    // `escrow.pending_amount` is smaller than `pending_settlement.amount`
    // and the program aborts with ArithmeticOverflow (error 6075) at
    // escrow_v2.rs:633. Each retry burns ~5 000 lamports of base fee.
    //
    // Detect this BEFORE signing and throw with a clear, actionable message
    // pointing at the orphan-recovery path.
    const [escrowAcc, pendingAcc] = await Promise.all([
      this.fetchAccountNullable<EscrowAccountV2Data>("escrowAccountV2", escrowPda),
      this.fetchAccountNullable<PendingSettlementData>("pendingSettlement", pendingPda),
    ]);
    if (!escrowAcc) {
      throw new Error(
        `finalizeSettlement: escrow PDA ${escrowPda.toBase58()} not found on-chain.`,
      );
    }
    if (!pendingAcc) {
      throw new Error(
        `finalizeSettlement: pending PDA ${pendingPda.toBase58()} not found on-chain ` +
          `(settlementIndex=${settlementIndex.toString()}). Nothing to finalize.`,
      );
    }
    const psAmount = BigInt(pendingAcc.amount.toString());
    const escrowPendingAmount = BigInt(escrowAcc.pendingAmount.toString());
    const escrowBalance = BigInt(escrowAcc.balance.toString());
    if (psAmount > escrowPendingAmount || psAmount > escrowBalance) {
      throw new Error(
        `finalizeSettlement: orphan/inconsistent PendingSettlement detected ` +
          `at ${pendingPda.toBase58()} (settlementIndex=${settlementIndex.toString()}). ` +
          `pending.amount=${psAmount} but escrow.pending_amount=${escrowPendingAmount}, ` +
          `escrow.balance=${escrowBalance}. The on-chain finalize would abort with ` +
          `ArithmeticOverflow (6075). This PDA was almost certainly created by a ` +
          `caller that skipped settle_calls_v2 (legacy probe loop). It cannot be ` +
          `finalized and cannot be closed (close_pending_settlement requires ` +
          `is_finalized=true). Skip this index permanently in your settle queue.`,
      );
    }

    return this.methods
      .finalizeSettlement()
      .accounts({
        payer: this.walletPubkey,
        agentWallet,
        escrow: escrowPda,
        pendingSettlement: pendingPda,
        agentStats: statsPda,
      })
      .rpc();
  }

  /**
   * Identify orphan PendingSettlement PDAs that cannot be finalized.
   *
   * @returns `null` if the PDA is finalizable (or already finalized / disputed).
   *          Otherwise an object describing the inconsistency, suitable for
   *          logging or feeding into a quarantine list. Use this from a
   *          recovery script to scan a range of `settlement_index` values:
   *
   * ```ts
   * for (let idx = 0n; idx < currentIdx; idx++) {
   *   const orphan = await sap.escrowV2.diagnoseOrphanPending(
   *     agentWallet, depositorWallet, nonce, idx,
   *   );
   *   if (orphan) log.warn({ idx, ...orphan }, "skip orphan");
   * }
   * ```
   *
   * @since v0.12.9
   */
  async diagnoseOrphanPending(
    agentWallet: PublicKey,
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
    settlementIndex: BN | number | bigint,
  ): Promise<{
    pendingPda: PublicKey;
    psAmount: bigint;
    escrowPendingAmount: bigint;
    escrowBalance: bigint;
    isFinalized: boolean;
    isDisputed: boolean;
    reason: "ok" | "missing" | "amount_exceeds_pending" | "amount_exceeds_balance" | "already_finalized" | "disputed";
  } | null> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, depositorWallet, nonce);
    const [pendingPda] = this.derivePendingSettlement(escrowPda, settlementIndex);
    const [escrowAcc, pendingAcc] = await Promise.all([
      this.fetchAccountNullable<EscrowAccountV2Data>("escrowAccountV2", escrowPda),
      this.fetchAccountNullable<PendingSettlementData>("pendingSettlement", pendingPda),
    ]);
    if (!escrowAcc) return null;
    if (!pendingAcc) {
      return {
        pendingPda,
        psAmount: 0n,
        escrowPendingAmount: BigInt(escrowAcc.pendingAmount.toString()),
        escrowBalance: BigInt(escrowAcc.balance.toString()),
        isFinalized: false,
        isDisputed: false,
        reason: "missing",
      };
    }
    const psAmount = BigInt(pendingAcc.amount.toString());
    const escrowPendingAmount = BigInt(escrowAcc.pendingAmount.toString());
    const escrowBalance = BigInt(escrowAcc.balance.toString());
    const base = {
      pendingPda,
      psAmount,
      escrowPendingAmount,
      escrowBalance,
      isFinalized: pendingAcc.isFinalized,
      isDisputed: pendingAcc.isDisputed,
    };
    if (pendingAcc.isFinalized) return { ...base, reason: "already_finalized" };
    if (pendingAcc.isDisputed) return { ...base, reason: "disputed" };
    if (psAmount > escrowPendingAmount) return { ...base, reason: "amount_exceeds_pending" };
    if (psAmount > escrowBalance) return { ...base, reason: "amount_exceeds_balance" };
    return null;
  }

  async fileDispute(
    agentWallet: PublicKey,
    nonce: BN | number | bigint,
    settlementIndex: BN | number | bigint,
    evidenceHash: number[],
    disputeType: number = 0,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, undefined, nonce);
    const [pendingPda] = this.derivePendingSettlement(escrowPda, settlementIndex);
    const [disputePda] = this.deriveDispute(pendingPda);

    return this.methods
      .fileDispute(evidenceHash, disputeType)
      .accounts({
        depositor: this.walletPubkey,
        escrow: escrowPda,
        pendingSettlement: pendingPda,
        dispute: disputePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @deprecated Since v0.7.0 — Arbiter-based resolution removed.
   * Use {@link ReceiptModule.submitReceiptProof} + {@link ReceiptModule.autoResolveDispute} instead.
   */
  async resolveDispute(
    _depositorWallet: PublicKey,
    _agentWallet: PublicKey,
    _nonce: BN | number | bigint,
    _settlementIndex: BN | number | bigint,
    _outcome: number,
  ): Promise<TransactionSignature> {
    throw new Error("resolveDispute removed in v0.7.0 — use ReceiptModule.autoResolveDispute");
  }

  async closeDispute(
    pendingSettlementPda: PublicKey,
  ): Promise<TransactionSignature> {
    const [disputePda] = this.deriveDispute(pendingSettlementPda);

    return this.methods
      .closeDispute()
      .accounts({
        depositor: this.walletPubkey,
        dispute: disputePda,
      })
      .rpc();
  }

  async closePendingSettlement(
    pendingSettlementPda: PublicKey,
  ): Promise<TransactionSignature> {
    return this.methods
      .closePendingSettlement()
      .accounts({
        payer: this.walletPubkey,
        pendingSettlement: pendingSettlementPda,
      })
      .rpc();
  }

  async withdraw(
    agentWallet: PublicKey,
    nonce: BN | number | bigint,
    amount: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, undefined, nonce);

    // v0.13.0 preflight — amount must fit (balance - pendingAmount); the
    // on-chain handler subtracts pending_amount from withdrawable funds.
    const escrow = await this.requireAccountExists<EscrowAccountV2Data>(
      "escrowAccountV2",
      escrowPda,
      { predicted: "NotAuthority", hint: "Escrow V2 PDA not found" },
    );
    const want = BigInt(this.bn(amount).toString());
    if (want <= 0n) throwPredicted("InsufficientEscrowBalance", "Withdraw amount must be > 0");
    const balance = BigInt(escrow.balance.toString());
    const pending = BigInt(escrow.pendingAmount.toString());
    const free = balance > pending ? balance - pending : 0n;
    if (want > free) {
      throwPredicted(
        "InsufficientEscrowBalance",
        `requested ${want}, withdrawable ${free} (balance ${balance} − pending ${pending})`,
      );
    }

    return this.methods
      .withdrawEscrowV2(this.bn(amount))
      .accounts({
        depositor: this.walletPubkey,
        escrow: escrowPda,
      })
      .rpc();
  }

  async close(
    agentWallet: PublicKey,
    nonce: BN | number | bigint = 0,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, undefined, nonce);

    // v0.13.0 preflight — close fails if balance != 0 OR pending_amount != 0.
    // Pending != 0 commonly indicates orphan PendingSettlement PDAs;
    // run diagnoseOrphanPending() across the index range to identify them.
    const escrow = await this.requireAccountExists<EscrowAccountV2Data>(
      "escrowAccountV2",
      escrowPda,
      { predicted: "NotAuthority", hint: "Escrow V2 PDA already closed" },
    );
    const balance = BigInt(escrow.balance.toString());
    const pending = BigInt(escrow.pendingAmount.toString());
    if (balance !== 0n) {
      throwPredicted("EscrowNotEmpty", `balance ${balance} > 0 — withdraw first`);
    }
    if (pending !== 0n) {
      throwPredicted(
        "EscrowNotClosed",
        `pending_amount ${pending} > 0 — finalize all PendingSettlements first or quarantine orphans via diagnoseOrphanPending`,
      );
    }

    return this.methods
      .closeEscrowV2()
      .accounts({
        depositor: this.walletPubkey,
        escrow: escrowPda,
      })
      .rpc();
  }

  /**
   * @deprecated Since v0.7.0 — Migration instruction removed from program.
   */
  async migrateFromV1(
    _agentWallet: PublicKey,
  ): Promise<TransactionSignature> {
    throw new Error("migrateFromV1 removed in v0.7.0 — migration instruction was deleted");
  }

  // ── Fetchers ─────────────────────────────────────────

  async fetch(
    agentPda: PublicKey,
    depositor?: PublicKey,
    nonce: BN | number | bigint = 0,
  ): Promise<EscrowAccountV2Data> {
    const [pda] = this.deriveEscrow(agentPda, depositor, nonce);
    return this.fetchAccount<EscrowAccountV2Data>("escrowAccountV2", pda);
  }

  async fetchNullable(
    agentPda: PublicKey,
    depositor?: PublicKey,
    nonce: BN | number | bigint = 0,
  ): Promise<EscrowAccountV2Data | null> {
    const [pda] = this.deriveEscrow(agentPda, depositor, nonce);
    return this.fetchAccountNullable<EscrowAccountV2Data>("escrowAccountV2", pda);
  }

  async fetchByPda(escrowPda: PublicKey): Promise<EscrowAccountV2Data> {
    return this.fetchAccount<EscrowAccountV2Data>("escrowAccountV2", escrowPda);
  }

  async fetchPendingSettlement(
    pendingPda: PublicKey,
  ): Promise<PendingSettlementData> {
    return this.fetchAccount<PendingSettlementData>("pendingSettlement", pendingPda);
  }

  async fetchPendingSettlementNullable(
    pendingPda: PublicKey,
  ): Promise<PendingSettlementData | null> {
    return this.fetchAccountNullable<PendingSettlementData>("pendingSettlement", pendingPda);
  }

  async fetchDispute(
    disputePda: PublicKey,
  ): Promise<DisputeRecordData> {
    return this.fetchAccount<DisputeRecordData>("disputeRecord", disputePda);
  }

  async fetchDisputeNullable(
    disputePda: PublicKey,
  ): Promise<DisputeRecordData | null> {
    return this.fetchAccountNullable<DisputeRecordData>("disputeRecord", disputePda);
  }
}
