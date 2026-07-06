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
import {
  MIN_AGENT_STAKE_LAMPORTS,
  computeRequiredStakeLamports,
} from "../constants/payments";
import { throwPredicted } from "../utils/anchor-errors";

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

    // v0.13.0 preflights
    const want = BigInt(this.bn(initialDeposit).toString());
    if (want < MIN_AGENT_STAKE_LAMPORTS) {
      throwPredicted(
        "StakeBelowMinimum",
        `initial deposit ${want} < MIN_AGENT_STAKE_LAMPORTS ${MIN_AGENT_STAKE_LAMPORTS}`,
      );
    }
    await this.requireAccountAbsent(
      "agentStake",
      stakePda,
      "Stake already initialized — use depositStake to top up",
    );

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

    // v0.13.0 preflight — stake must already exist; amount > 0
    if (BigInt(this.bn(amount).toString()) <= 0n) {
      throwPredicted("InsufficientStake", "Deposit amount must be > 0");
    }
    await this.requireAccountExists<AgentStakeData>(
      "agentStake",
      stakePda,
      { predicted: "NoStakeAccount", hint: "Call initStake first" },
    );

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

    // v0.13.0 preflight — enforce MIN_STAKE floor + no double-pending
    const stake = await this.requireAccountExists<AgentStakeData>(
      "agentStake",
      stakePda,
      { predicted: "NoStakeAccount", hint: "No stake account to unstake from" },
    );
    const want = BigInt(this.bn(amount).toString());
    if (want <= 0n) throwPredicted("InsufficientStake", "Unstake amount must be > 0");
    const max = this.getMaxUnstakeLamports(stake);
    if (want > max) {
      throwPredicted(
        "StakeBelowMinimum",
        `requested ${want} would drop stake below MIN_AGENT_STAKE_LAMPORTS (max unstake = ${max})`,
      );
    }
    if (BigInt(stake.unstakeAmount.toString()) > 0n) {
      throwPredicted(
        "UnstakeAlreadyPending",
        "A pending unstake already exists — completeUnstake first or wait for cooldown",
      );
    }

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

    // v0.13.0 preflight — cooldown must have elapsed and an unstake must be pending
    const stake = await this.requireAccountExists<AgentStakeData>(
      "agentStake",
      stakePda,
      { predicted: "NoStakeAccount", hint: "No stake account" },
    );
    const pending = BigInt(stake.unstakeAmount.toString());
    if (pending === 0n) {
      throwPredicted("NoUnstakePending", "Call requestUnstake first");
    }
    const availableAt = BigInt(stake.unstakeAvailableAt.toString());
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    if (nowSec < availableAt) {
      throwPredicted(
        "UnstakeCooldownNotMet",
        `available at unix ${availableAt}, now ${nowSec} (Δ ${availableAt - nowSec}s)`,
      );
    }

    return this.methods
      .completeUnstake()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        stake: stakePda,
      })
      .rpc();
  }

  /**
   * Close a legacy stake account after its agent PDA has already been closed.
   *
   * Normal v0.3.0 agent closure returns stake automatically via `agent.close()`.
   * This helper exists for v0.18-era accounts where the agent was closed while
   * the permanent collateral floor stayed in the StakePDA.
   */
  async closeStake(agentWallet: PublicKey): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [stakePda] = this.deriveStake(agentPda);

    await this.requireAccountExists<AgentStakeData>(
      "agentStake",
      stakePda,
      { predicted: "NoStakeAccount", hint: "No stake account to close" },
    );

    return this.methods
      .closeStake()
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

  // ── v0.11 helpers ────────────────────────────────────────────

  /**
   * Compute the maximum amount that can be requested via `requestUnstake`
   * without breaching the on-chain {@link MIN_AGENT_STAKE_LAMPORTS} floor.
   *
   * Returns 0 if the agent is already at (or below) the floor.
   *
   * @since v0.11.0
   */
  getMaxUnstakeLamports(stake: AgentStakeData): bigint {
    const staked = BigInt(stake.stakedAmount.toString());
    if (staked <= MIN_AGENT_STAKE_LAMPORTS) return 0n;
    return staked - MIN_AGENT_STAKE_LAMPORTS;
  }

  /**
   * Returns the lamport delta the agent must `deposit` to satisfy the
   * per-escrow stake-coverage requirement for `escrowLamports`. 0 if already
   * sufficient. Useful for a UI "top up to open this escrow" button.
   *
   * Mirrors the on-chain check in `create_escrow_v2` (v0.11 H-1).
   *
   * @since v0.11.0
   */
  getRequiredTopUp(stake: AgentStakeData, escrowLamports: bigint): bigint {
    const required = computeRequiredStakeLamports(escrowLamports);
    const have = BigInt(stake.stakedAmount.toString());
    return have >= required ? 0n : required - have;
  }
}
