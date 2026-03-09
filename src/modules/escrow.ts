/**
 * @module escrow
 * @description x402 escrow settlement layer — create, deposit,
 * settle, withdraw, batch settle, close.
 *
 * Supports both SOL and SPL token escrows via remaining accounts.
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

export class EscrowModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /** Derive the EscrowAccount PDA. */
  deriveEscrow(
    agentPda: PublicKey,
    depositor?: PublicKey,
  ): readonly [PublicKey, number] {
    return deriveEscrow(agentPda, depositor ?? this.walletPubkey);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * Create a new escrow for agent micropayments.
   *
   * For SOL escrow: pass `tokenMint: null` and leave `splAccounts` empty.
   * For SPL escrow: pass `tokenMint`, `tokenDecimals`, and `splAccounts`.
   *
   * @param agentWallet — the wallet of the agent to pay.
   * @param splAccounts — remaining accounts for SPL: [depositorAta, escrowAta, tokenMint, tokenProgram].
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
   * Deposit additional funds into an existing escrow.
   * @param splAccounts — remaining accounts for SPL transfers.
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
   * Agent settles calls — claims funds from escrow.
   * Must be called by the agent owner wallet.
   * @param splAccounts — remaining accounts for SPL transfers.
   */
  async settle(
    depositorWallet: PublicKey,
    callsToSettle: BN | number | bigint,
    serviceHash: number[],
    splAccounts: AccountMeta[] = [],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = deriveEscrow(agentPda, depositorWallet);
    const [statsPda] = deriveAgentStats(agentPda);

    return this.methods
      .settleCalls(this.bn(callsToSettle), serviceHash)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts)
      .rpc();
  }

  /**
   * Client withdraws funds from their escrow.
   * @param splAccounts — remaining accounts for SPL transfers.
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

  /** Close an empty escrow PDA (balance must be 0). */
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
   * Batch settlement — process up to 10 settlements in one TX.
   * Must be called by the agent owner wallet.
   * @param splAccounts — remaining accounts for SPL transfers.
   */
  async settleBatch(
    depositorWallet: PublicKey,
    settlements: Settlement[],
    splAccounts: AccountMeta[] = [],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = deriveEscrow(agentPda, depositorWallet);
    const [statsPda] = deriveAgentStats(agentPda);

    return this.methods
      .settleBatch(settlements)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(splAccounts)
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /** Fetch an escrow account. */
  async fetch(agentPda: PublicKey, depositor?: PublicKey): Promise<EscrowAccountData> {
    const [pda] = this.deriveEscrow(agentPda, depositor);
    return this.fetchAccount<EscrowAccountData>("escrowAccount", pda);
  }

  /** Fetch an escrow account, or `null`. */
  async fetchNullable(agentPda: PublicKey, depositor?: PublicKey): Promise<EscrowAccountData | null> {
    const [pda] = this.deriveEscrow(agentPda, depositor);
    return this.fetchAccountNullable<EscrowAccountData>("escrowAccount", pda);
  }

  /** Fetch an escrow by PDA directly. */
  async fetchByPda(escrowPda: PublicKey): Promise<EscrowAccountData> {
    return this.fetchAccount<EscrowAccountData>("escrowAccount", escrowPda);
  }
}
