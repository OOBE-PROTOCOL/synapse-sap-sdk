/**
 * @module agent
 * @description Agent lifecycle operations.
 *
 * Covers: register, update, deactivate, reactivate, close,
 * report calls, update reputation metrics, and account fetching.
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import { deriveAgent, deriveAgentStats, deriveGlobalRegistry } from "../pda";
import type {
  AgentAccountData,
  AgentStatsData,
  RegisterAgentArgs,
  UpdateAgentArgs,
} from "../types";

export class AgentModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /** Derive the AgentAccount PDA for a wallet. */
  deriveAgent(wallet?: PublicKey): readonly [PublicKey, number] {
    return deriveAgent(wallet ?? this.walletPubkey);
  }

  /** Derive the AgentStats PDA for an agent. */
  deriveStats(agentPda: PublicKey): readonly [PublicKey, number] {
    return deriveAgentStats(agentPda);
  }

  // ── Instructions ─────────────────────────────────────

  /** Register a new agent identity onchain. */
  async register(args: RegisterAgentArgs): Promise<TransactionSignature> {
    const [agentPda] = this.deriveAgent();
    const [statsPda] = this.deriveStats(agentPda);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .registerAgent(
        args.name,
        args.description,
        args.capabilities,
        args.pricing,
        args.protocols,
        args.agentId ?? null,
        args.agentUri ?? null,
        args.x402Endpoint ?? null,
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Update an existing agent's metadata. */
  async update(args: UpdateAgentArgs): Promise<TransactionSignature> {
    const [agentPda] = this.deriveAgent();

    return this.methods
      .updateAgent(
        args.name ?? null,
        args.description ?? null,
        args.capabilities ?? null,
        args.pricing ?? null,
        args.protocols ?? null,
        args.agentId ?? null,
        args.agentUri ?? null,
        args.x402Endpoint ?? null,
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Deactivate an agent (sets `is_active = false`). */
  async deactivate(): Promise<TransactionSignature> {
    const [agentPda] = this.deriveAgent();
    const [statsPda] = this.deriveStats(agentPda);

    return this.methods
      .deactivateAgent()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
      })
      .rpc();
  }

  /** Reactivate a previously deactivated agent. */
  async reactivate(): Promise<TransactionSignature> {
    const [agentPda] = this.deriveAgent();
    const [statsPda] = this.deriveStats(agentPda);

    return this.methods
      .reactivateAgent()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
      })
      .rpc();
  }

  /** Close an agent PDA (rent returned to wallet). */
  async close(): Promise<TransactionSignature> {
    const [agentPda] = this.deriveAgent();
    const [statsPda] = this.deriveStats(agentPda);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .closeAgent()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Self-report call metrics (does not affect reputation). */
  async reportCalls(callsServed: number | bigint): Promise<TransactionSignature> {
    const [agentPda] = this.deriveAgent();
    const [statsPda] = this.deriveStats(agentPda);

    return this.methods
      .reportCalls(this.bn(callsServed))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        agentStats: statsPda,
      })
      .rpc();
  }

  /** Update self-reported latency & uptime (does not affect reputation). */
  async updateReputation(
    avgLatencyMs: number,
    uptimePercent: number,
  ): Promise<TransactionSignature> {
    const [agentPda] = this.deriveAgent();

    return this.methods
      .updateReputation(avgLatencyMs, uptimePercent)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /** Fetch the AgentAccount data for a wallet. */
  async fetch(wallet?: PublicKey): Promise<AgentAccountData> {
    const [pda] = this.deriveAgent(wallet ?? this.walletPubkey);
    return this.fetchAccount<AgentAccountData>("agentAccount", pda);
  }

  /** Fetch the AgentAccount data, or `null` if it doesn't exist. */
  async fetchNullable(wallet?: PublicKey): Promise<AgentAccountData | null> {
    const [pda] = this.deriveAgent(wallet ?? this.walletPubkey);
    return this.fetchAccountNullable<AgentAccountData>("agentAccount", pda);
  }

  /** Fetch the AgentStats data for an agent. */
  async fetchStats(agentPda: PublicKey): Promise<AgentStatsData> {
    const [pda] = this.deriveStats(agentPda);
    return this.fetchAccount<AgentStatsData>("agentStats", pda);
  }

  /** Fetch the AgentStats data, or `null`. */
  async fetchStatsNullable(agentPda: PublicKey): Promise<AgentStatsData | null> {
    const [pda] = this.deriveStats(agentPda);
    return this.fetchAccountNullable<AgentStatsData>("agentStats", pda);
  }

  /** Fetch the GlobalRegistry singleton. */
  async fetchGlobalRegistry(): Promise<import("../types.js").GlobalRegistryData> {
    const [pda] = deriveGlobalRegistry();
    return this.fetchAccount("globalRegistry", pda);
  }
}
