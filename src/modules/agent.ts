/**
 * @module agent
 * @description Agent lifecycle operations for the Synapse Agent Protocol.
 *
 * Covers: register, update, deactivate, reactivate, close,
 * report calls, update reputation metrics, and account fetching.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
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

/**
 * @name AgentModule
 * @description Manages the full agent lifecycle on the Synapse Agent Protocol.
 *   Provides methods to register, update, deactivate, reactivate, and close
 *   agent identities, as well as self-report call metrics and reputation data.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * // Register a new agent
 * const sig = await sap.agent.register({
 *   name: "my-agent",
 *   description: "An example agent",
 *   capabilities: [0, 1],
 *   pricing: { free: {} },
 *   protocols: [0],
 * });
 * // Fetch agent data
 * const data = await sap.agent.fetch();
 * ```
 */
export class AgentModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /**
   * @name deriveAgent
   * @description Derive the `AgentAccount` PDA for a wallet.
   * @param wallet - The wallet public key. Defaults to the connected wallet.
   * @returns A tuple of `[PublicKey, bump]` for the agent PDA.
   * @see {@link deriveAgent} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveAgent(wallet?: PublicKey): readonly [PublicKey, number] {
    return deriveAgent(wallet ?? this.walletPubkey);
  }

  /**
   * @name deriveStats
   * @description Derive the `AgentStats` PDA for a given agent.
   * @param agentPda - The agent account PDA.
   * @returns A tuple of `[PublicKey, bump]` for the stats PDA.
   * @see {@link deriveAgentStats} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveStats(agentPda: PublicKey): readonly [PublicKey, number] {
    return deriveAgentStats(agentPda);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * @name register
   * @description Register a new agent identity on-chain. Creates the
   *   `AgentAccount`, `AgentStats`, and updates the `GlobalRegistry`.
   * @param args - Registration parameters (name, description, capabilities, pricing, protocols, etc.).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name update
   * @description Update an existing agent's metadata fields. All fields
   *   are optional — only non-null values are written.
   * @param args - Partial update parameters.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name deactivate
   * @description Deactivate an agent, setting `is_active = false`.
   *   The agent remains on-chain but is excluded from active discovery.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name reactivate
   * @description Reactivate a previously deactivated agent, restoring
   *   it to active status.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name close
   * @description Close an agent PDA and its associated stats PDA.
   *   Rent is returned to the owner wallet.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name reportCalls
   * @description Self-report call metrics for the agent. This updates the
   *   `AgentStats` counter but does not affect on-chain reputation.
   * @param callsServed - The number of calls to report.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name updateReputation
   * @description Update self-reported latency and uptime metrics.
   *   These are informational and do not affect on-chain reputation scoring.
   * @param avgLatencyMs - Average response latency in milliseconds.
   * @param uptimePercent - Uptime percentage (0–100).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name fetch
   * @description Fetch the deserialized `AgentAccount` data for a wallet.
   * @param wallet - The wallet public key. Defaults to the connected wallet.
   * @returns {Promise<AgentAccountData>} The agent account data.
   * @throws Will throw if the agent account does not exist.
   * @since v0.1.0
   */
  async fetch(wallet?: PublicKey): Promise<AgentAccountData> {
    const [pda] = this.deriveAgent(wallet ?? this.walletPubkey);
    return this.fetchAccount<AgentAccountData>("agentAccount", pda);
  }

  /**
   * @name fetchNullable
   * @description Fetch the deserialized `AgentAccount` data, or `null`
   *   if the account doesn't exist on-chain.
   * @param wallet - The wallet public key. Defaults to the connected wallet.
   * @returns {Promise<AgentAccountData | null>} The agent data or `null`.
   * @since v0.1.0
   */
  async fetchNullable(wallet?: PublicKey): Promise<AgentAccountData | null> {
    const [pda] = this.deriveAgent(wallet ?? this.walletPubkey);
    return this.fetchAccountNullable<AgentAccountData>("agentAccount", pda);
  }

  /**
   * @name fetchStats
   * @description Fetch the deserialized `AgentStats` data for an agent.
   * @param agentPda - The agent account PDA.
   * @returns {Promise<AgentStatsData>} The agent stats data.
   * @throws Will throw if the stats account does not exist.
   * @since v0.1.0
   */
  async fetchStats(agentPda: PublicKey): Promise<AgentStatsData> {
    const [pda] = this.deriveStats(agentPda);
    return this.fetchAccount<AgentStatsData>("agentStats", pda);
  }

  /**
   * @name fetchStatsNullable
   * @description Fetch the deserialized `AgentStats` data, or `null`
   *   if the account doesn't exist on-chain.
   * @param agentPda - The agent account PDA.
   * @returns {Promise<AgentStatsData | null>} The stats data or `null`.
   * @since v0.1.0
   */
  async fetchStatsNullable(agentPda: PublicKey): Promise<AgentStatsData | null> {
    const [pda] = this.deriveStats(agentPda);
    return this.fetchAccountNullable<AgentStatsData>("agentStats", pda);
  }

  /**
   * @name fetchGlobalRegistry
   * @description Fetch the `GlobalRegistry` singleton account that tracks
   *   aggregate protocol statistics.
   * @returns {Promise<GlobalRegistryData>} The global registry data.
   * @throws Will throw if the registry has not been initialized.
   * @since v0.1.0
   */
  async fetchGlobalRegistry(): Promise<import("../types").GlobalRegistryData> {
    const [pda] = deriveGlobalRegistry();
    return this.fetchAccount("globalRegistry", pda);
  }
}
