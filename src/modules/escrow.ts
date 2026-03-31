/**
 * @module escrow
 * @description x402 escrow settlement layer — create, deposit,
 * settle, withdraw, batch settle, and close escrow accounts.
 *
 * Supports both SOL and SPL token escrows. SPL operations require
 * passing additional `AccountMeta[]` via the `splAccounts` parameter.
 *
 * @category Modules
 * @since v0.1.0
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
  deriveEscrow,
} from "../pda";
import type {
  EscrowAccountData,
  CreateEscrowArgs,
  Settlement,
} from "../types";
import {
  buildPriorityFeeIxs,
  buildRpcOptions,
} from "../utils/priority-fee";
import type { SettleOptions } from "../utils/priority-fee";

/**
 * @name EscrowModule
 * @description Manages x402-compatible escrow accounts for agent micropayments.
 *   Provides methods to create, fund, settle, withdraw, batch-settle, close,
 *   and fetch escrow PDAs on the Synapse Agent Protocol.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * // Create a SOL escrow for an agent
 * const sig = await sap.escrow.create(agentWallet, {
 *   pricePerCall: new BN(1_000_000),
 *   maxCalls: new BN(100),
 *   initialDeposit: new BN(100_000_000),
 *   expiresAt: null,
 *   volumeCurve: null,
 *   tokenMint: null,
 *   tokenDecimals: null,
 * });
 * ```
 */
export class EscrowModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /**
   * @name deriveEscrow
   * @description Derive the `EscrowAccount` PDA for a given agent and depositor.
   * @param agentPda - The agent account PDA.
   * @param depositor - The depositor wallet. Defaults to the connected wallet.
   * @returns A tuple of `[PublicKey, bump]` for the escrow PDA.
   * @see {@link deriveEscrow} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveEscrow(
    agentPda: PublicKey,
    depositor?: PublicKey,
  ): readonly [PublicKey, number] {
    return deriveEscrow(agentPda, depositor ?? this.walletPubkey);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * @name create
   * @description Create a new escrow for agent micropayments.
   *
   *   For **SOL escrow**: pass `tokenMint: null` and leave `splAccounts` empty.
   *   For **SPL escrow**: pass `tokenMint`, `tokenDecimals`, and provide
   *   `splAccounts` with `[depositorAta, escrowAta, tokenMint, tokenProgram]`.
   *
   * @param agentWallet - The wallet of the agent to pay.
   * @param args - Escrow creation parameters (price, max calls, deposit, expiry, volume curve, token info).
   * @param splAccounts - Remaining accounts for SPL token transfers:
   *   `[depositorAta, escrowAta, tokenMint, tokenProgram]`. Defaults to `[]`.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async create(
    agentWallet: PublicKey,
    args: CreateEscrowArgs,
    splAccounts: AccountMeta[] = [],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda);
    const [statsPda] = deriveAgentStats(agentPda);

    return this.methods
      .createEscrow(
        args.pricePerCall,
        args.maxCalls,
        args.initialDeposit,
        args.expiresAt,
        args.volumeCurve,
        args.tokenMint,
        args.tokenDecimals,
      )
      .accounts({
        depositor: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts)
      .rpc();
  }

  /**
   * @name deposit
   * @description Deposit additional funds into an existing escrow.
   * @param agentWallet - The wallet of the agent associated with the escrow.
   * @param amount - The amount to deposit (lamports for SOL, smallest unit for SPL).
   * @param splAccounts - Remaining accounts for SPL token transfers. Defaults to `[]`.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async deposit(
    agentWallet: PublicKey,
    amount: BN | number | bigint,
    splAccounts: AccountMeta[] = [],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda);

    return this.methods
      .depositEscrow(this.bn(amount))
      .accounts({
        depositor: this.walletPubkey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts)
      .rpc();
  }

  /**
   * @name settle
   * @description Agent settles calls — claims earned funds from the escrow.
   *   Must be called by the agent owner wallet.
   * @param depositorWallet - The wallet of the client who funded the escrow.
   * @param callsToSettle - Number of calls to settle payment for.
   * @param serviceHash - A 32-byte SHA-256 hash identifying the service rendered.
   * @param splAccounts - Remaining accounts for SPL token transfers. Defaults to `[]`.
   * @param opts - Optional {@link SettleOptions} for priority fees and RPC tuning.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   * @updated v0.6.2 — Added optional `opts` parameter for priority fees.
   */
  async settle(
    depositorWallet: PublicKey,
    callsToSettle: BN | number | bigint,
    serviceHash: number[],
    splAccounts: AccountMeta[] = [],
    opts?: SettleOptions,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = deriveEscrow(agentPda, depositorWallet);
    const [statsPda] = deriveAgentStats(agentPda);

    const preIxs = buildPriorityFeeIxs(opts);
    const rpcOpts = buildRpcOptions(opts);

    let builder = this.methods
      .settleCalls(this.bn(callsToSettle), serviceHash)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts);

    if (preIxs.length > 0) {
      builder = builder.preInstructions(preIxs);
    }

    return builder.rpc(rpcOpts);
  }

  /**
   * @name withdraw
   * @description Client withdraws un-settled funds from their escrow.
   * @param agentWallet - The wallet of the agent associated with the escrow.
   * @param amount - The amount to withdraw (lamports for SOL, smallest unit for SPL).
   * @param splAccounts - Remaining accounts for SPL token transfers. Defaults to `[]`.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async withdraw(
    agentWallet: PublicKey,
    amount: BN | number | bigint,
    splAccounts: AccountMeta[] = [],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda);

    return this.methods
      .withdrawEscrow(this.bn(amount))
      .accounts({
        depositor: this.walletPubkey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts)
      .rpc();
  }

  /**
   * @name close
   * @description Close an empty escrow PDA (balance must be 0) and reclaim rent.
   * @param agentWallet - The wallet of the agent associated with the escrow.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async close(agentWallet: PublicKey): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = this.deriveEscrow(agentPda);

    return this.methods
      .closeEscrow()
      .accounts({
        depositor: this.walletPubkey,
        escrow: escrowPda,
      })
      .rpc();
  }

  /**
   * @name settleBatch
   * @description Batch settlement — process up to 10 settlements in a single
   *   transaction. Must be called by the agent owner wallet.
   * @param depositorWallet - The wallet of the client who funded the escrow.
   * @param settlements - Array of settlement entries (up to 10).
   * @param splAccounts - Remaining accounts for SPL token transfers. Defaults to `[]`.
   * @param opts - Optional {@link SettleOptions} for priority fees and RPC tuning.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   * @updated v0.6.2 — Added optional `opts` parameter for priority fees.
   */
  async settleBatch(
    depositorWallet: PublicKey,
    settlements: Settlement[],
    splAccounts: AccountMeta[] = [],
    opts?: SettleOptions,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = deriveEscrow(agentPda, depositorWallet);
    const [statsPda] = deriveAgentStats(agentPda);

    const preIxs = buildPriorityFeeIxs(opts);
    const rpcOpts = buildRpcOptions(opts);

    let builder = this.methods
      .settleBatch(settlements)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts);

    if (preIxs.length > 0) {
      builder = builder.preInstructions(preIxs);
    }

    return builder.rpc(rpcOpts);
  }

  // ── Fetchers ─────────────────────────────────────────

  /**
   * @name fetch
   * @description Fetch a deserialized `EscrowAccount`.
   * @param agentPda - The agent account PDA.
   * @param depositor - The depositor wallet. Defaults to the connected wallet.
   * @returns {Promise<EscrowAccountData>} The escrow account data.
   * @throws Will throw if the escrow account does not exist.
   * @since v0.1.0
   */
  async fetch(agentPda: PublicKey, depositor?: PublicKey): Promise<EscrowAccountData> {
    const [pda] = this.deriveEscrow(agentPda, depositor);
    return this.fetchAccount<EscrowAccountData>("escrowAccount", pda);
  }

  /**
   * @name fetchNullable
   * @description Fetch a deserialized `EscrowAccount`, or `null` if it
   *   does not exist on-chain.
   * @param agentPda - The agent account PDA.
   * @param depositor - The depositor wallet. Defaults to the connected wallet.
   * @returns {Promise<EscrowAccountData | null>} The escrow data or `null`.
   * @since v0.1.0
   */
  async fetchNullable(agentPda: PublicKey, depositor?: PublicKey): Promise<EscrowAccountData | null> {
    const [pda] = this.deriveEscrow(agentPda, depositor);
    return this.fetchAccountNullable<EscrowAccountData>("escrowAccount", pda);
  }

  /**
   * @name fetchByPda
   * @description Fetch an escrow account by its PDA address directly,
   *   bypassing PDA derivation.
   * @param escrowPda - The escrow PDA public key.
   * @returns {Promise<EscrowAccountData>} The escrow account data.
   * @throws Will throw if the escrow account does not exist.
   * @since v0.1.0
   */
  async fetchByPda(escrowPda: PublicKey): Promise<EscrowAccountData> {
    return this.fetchAccount<EscrowAccountData>("escrowAccount", escrowPda);
  }
}
