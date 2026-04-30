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
import { isAcceptedPaymentToken } from "../constants/payments";

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

    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda, undefined, args.escrowNonce);
    const [stakePda] = deriveStake(agentPda);

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
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = this.deriveEscrow(agentPda, depositorWallet, nonce);
    const [statsPda] = deriveAgentStats(agentPda);
    const [receiptPda] = deriveSettlementReceipt(escrowPda, serviceHash);

    const preIxs = buildPriorityFeeIxs(opts);
    const rpcOpts = buildRpcOptions(opts);

    let builder = this.methods
      .settleCallsV2(this.bn(nonce), this.bn(callsToSettle), serviceHash)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        settlementReceipt: receiptPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts);

    if (preIxs.length > 0) {
      builder = builder.preInstructions(preIxs);
    }

    return builder.rpc(rpcOpts);
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
