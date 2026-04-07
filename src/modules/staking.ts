/**
 * @module staking
 * @description Agent staking lifecycle — init, deposit, request unstake,
 * complete unstake, and fetch stake accounts.
 *
 * @category Modules
 * @since v0.7.0
 * @packageDocumentation
 */

import {
  SystemProgram,
  type PublicKey,
  type TransactionSignature,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseModule } from "./base";
import { deriveAgent, deriveStake } from "../pda";
import type { AgentStakeData } from "../types";

/**
 * @name StakingModule
 * @description Manages agent stake accounts — init, deposit, unstake, and fetch.
 *
 * @category Modules
 * @since v0.7.0
 * @extends BaseModule
 */
export class StakingModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  deriveStake(agentPda: PublicKey): readonly [PublicKey, number] {
    return deriveStake(agentPda);
  }

  // ── Instructions ─────────────────────────────────────

  async initStake(
    agentWallet: PublicKey,
    initialDeposit: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [stakePda] = this.deriveStake(agentPda);

    return this.methods
      .initStake(this.bn(initialDeposit))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        stake: stakePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async deposit(
    agentWallet: PublicKey,
    amount: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [stakePda] = this.deriveStake(agentPda);

    return this.methods
      .depositStake(this.bn(amount))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        stake: stakePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async requestUnstake(
    agentWallet: PublicKey,
    amount: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [stakePda] = this.deriveStake(agentPda);

    return this.methods
      .requestUnstake(this.bn(amount))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        stake: stakePda,
      })
      .rpc();
  }

  async completeUnstake(
    agentWallet: PublicKey,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [stakePda] = this.deriveStake(agentPda);

    return this.methods
      .completeUnstake()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        stake: stakePda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  async fetch(agentPda: PublicKey): Promise<AgentStakeData> {
    const [pda] = this.deriveStake(agentPda);
    return this.fetchAccount<AgentStakeData>("agentStake", pda);
  }

  async fetchNullable(agentPda: PublicKey): Promise<AgentStakeData | null> {
    const [pda] = this.deriveStake(agentPda);
    return this.fetchAccountNullable<AgentStakeData>("agentStake", pda);
  }

  async fetchByPda(stakePda: PublicKey): Promise<AgentStakeData> {
    return this.fetchAccount<AgentStakeData>("agentStake", stakePda);
  }
}
