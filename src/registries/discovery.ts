/**
 * @module registries/discovery
 * @description High-level agent and tool discovery registry.
 *
 * Abstracts the raw PDA-level indexing + fetching into a single
 * developer-friendly interface for finding agents, tools, and
 * services across the SAP network.
 *
 * Use cases:
 *   - "Find all agents that support Jupiter swaps"
 *   - "Find all Swap tools across all agents"
 *   - "Get the full profile of agent X (identity + stats + tools)"
 *   - "Get network-wide statistics"
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const discovery = client.discovery;
 *
 * // Find agents that support Jupiter protocol
 * const agents = await discovery.findAgentsByProtocol("jupiter");
 *
 * // Get full agent profile (identity + stats + attestations)
 * const profile = await discovery.getAgentProfile(agentWallet);
 *
 * // Find all Swap tools across the network
 * const tools = await discovery.findToolsByCategory("swap");
 *
 * // Network overview
 * const stats = await discovery.getNetworkOverview();
 * ```
 */

import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import type { SapProgram } from "../modules/base";
import {
  deriveAgent,
  deriveAgentStats,
  deriveCapabilityIndex,
  deriveProtocolIndex,
  deriveToolCategoryIndex,
  deriveGlobalRegistry,
} from "../pda";
import { sha256 } from "../utils";
import { TOOL_CATEGORY_VALUES } from "../constants";
import type {
  AgentAccountData,
  AgentStatsData,
  CapabilityIndexData,
  ProtocolIndexData,
  ToolCategoryIndexData,
  ToolDescriptorData,
  GlobalRegistryData,
} from "../types";

// ═══════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface DiscoveredAgent
 * @name DiscoveredAgent
 * @description Compact agent identity returned by discovery queries.
 * Contains the agent PDA, optional identity data, and optional stats.
 * Returned by {@link DiscoveryRegistry.findAgentsByCapability},
 * {@link DiscoveryRegistry.findAgentsByProtocol}, and
 * {@link DiscoveryRegistry.findAgentsByCapabilities}.
 * @category Registries
 * @since v0.1.0
 */
export interface DiscoveredAgent {
  /** Agent PDA address. */
  readonly pda: PublicKey;
  /** Agent identity data (null if account not found). */
  readonly identity: AgentAccountData | null;
  /** Agent stats (null if account not found). */
  readonly stats: AgentStatsData | null;
}

/**
 * @interface AgentProfile
 * @name AgentProfile
 * @description Full agent profile with all discoverable data.
 * Combines identity, stats, and computed fields into a single
 * display-ready structure. Returned by {@link DiscoveryRegistry.getAgentProfile}.
 * @category Registries
 * @since v0.1.0
 */
export interface AgentProfile {
  /** Agent PDA. */
  readonly pda: PublicKey;
  /** Agent identity (name, description, capabilities, pricing, etc.). */
  readonly identity: AgentAccountData;
  /** Lightweight metrics (total calls, active status). */
  readonly stats: AgentStatsData | null;
  /** Computed fields for display. */
  readonly computed: {
    /** Is the agent currently active? */
    readonly isActive: boolean;
    /** Total calls served (from stats or identity fallback). */
    readonly totalCalls: string;
    /** Reputation score (0-1000). */
    readonly reputationScore: number;
    /** Has x402 endpoint configured? */
    readonly hasX402: boolean;
    /** Number of capabilities. */
    readonly capabilityCount: number;
    /** Number of pricing tiers. */
    readonly pricingTierCount: number;
    /** Protocol list. */
    readonly protocols: string[];
  };
}

/**
 * @interface DiscoveredTool
 * @name DiscoveredTool
 * @description Discovered tool with agent context.
 * Contains the tool PDA and optional descriptor data.
 * Returned by {@link DiscoveryRegistry.findToolsByCategory}.
 * @category Registries
 * @since v0.1.0
 */
export interface DiscoveredTool {
  /** Tool PDA address. */
  readonly pda: PublicKey;
  /** Tool descriptor data (null if not found). */
  readonly descriptor: ToolDescriptorData | null;
}

/**
 * @interface NetworkOverview
 * @name NetworkOverview
 * @description Network-wide statistics aggregated from the GlobalRegistry account.
 * Provides counts of agents, tools, vaults, attestations, and more.
 * Returned by {@link DiscoveryRegistry.getNetworkOverview}.
 * @category Registries
 * @since v0.1.0
 */
export interface NetworkOverview {
  /** Total registered agents. */
  readonly totalAgents: string;
  /** Currently active agents. */
  readonly activeAgents: string;
  /** Total feedback entries. */
  readonly totalFeedbacks: string;
  /** Total registered tools. */
  readonly totalTools: number;
  /** Total memory vaults. */
  readonly totalVaults: number;
  /** Total attestations. */
  readonly totalAttestations: number;
  /** Total capability indexes. */
  readonly totalCapabilities: number;
  /** Total protocol indexes. */
  readonly totalProtocols: number;
  /** Protocol authority. */
  readonly authority: PublicKey;
}

/**
 * @typedef {string} ToolCategoryName
 * @name ToolCategoryName
 * @description Tool category string literal type derived from `TOOL_CATEGORY_VALUES`.
 * Valid values include: `"swap"`, `"data"`, `"lending"`, `"governance"`, etc.
 * @category Registries
 * @since v0.1.0
 * @see {@link DiscoveryRegistry.findToolsByCategory}
 */
export type ToolCategoryName = keyof typeof TOOL_CATEGORY_VALUES;

// ═══════════════════════════════════════════════════════════════════
//  Discovery Registry
// ═══════════════════════════════════════════════════════════════════

/**
 * @name DiscoveryRegistry
 * @description High-level agent and tool discovery registry for the SAP network.
 *
 * Provides a developer-friendly API for finding agents by capability,
 * protocol, or tool category, fetching full agent profiles, and
 * retrieving network-wide statistics.
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const discovery = client.discovery;
 *
 * // Find agents by capability
 * const swapAgents = await discovery.findAgentsByCapability("jupiter:swap");
 *
 * // Get agent profile
 * const profile = await discovery.getAgentProfile(agentWallet);
 *
 * // Network statistics
 * const overview = await discovery.getNetworkOverview();
 * ```
 */
export class DiscoveryRegistry {
  constructor(private readonly program: SapProgram) {}

  // ── Agent Discovery ──────────────────────────────────

  /**
   * @name findAgentsByCapability
   * @description Find all agent PDAs registered for a specific capability.
   * Hashes the capability ID with SHA-256 and looks up the capability index PDA.
   *
   * @param capabilityId - The capability identifier string (e.g. `"jupiter:swap"`).
   * @param opts - Optional settings.
   * @param opts.hydrate - If `false`, returns only PDAs without fetching identity/stats. Defaults to `true`.
   * @returns An array of {@link DiscoveredAgent} matching the capability.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const agents = await discovery.findAgentsByCapability("jupiter:swap");
   * ```
   */
  async findAgentsByCapability(
    capabilityId: string,
    opts?: { hydrate?: boolean },
  ): Promise<DiscoveredAgent[]> {
    const capHash = sha256(capabilityId);
    const [pda] = deriveCapabilityIndex(capHash);

    const index = await this.fetchNullable<CapabilityIndexData>(
      "capabilityIndex",
      pda,
    );
    if (!index) return [];

    if (opts?.hydrate === false) {
      return index.agents.map((agentPda) => ({
        pda: agentPda,
        identity: null,
        stats: null,
      }));
    }

    return this.hydrateAgents(index.agents);
  }

  /**
   * @name findAgentsByProtocol
   * @description Find all agent PDAs registered for a specific protocol.
   * Hashes the protocol ID with SHA-256 and looks up the protocol index PDA.
   *
   * @param protocolId - The protocol identifier string (e.g. `"jupiter"`).
   * @param opts - Optional settings.
   * @param opts.hydrate - If `false`, returns only PDAs without fetching identity/stats. Defaults to `true`.
   * @returns An array of {@link DiscoveredAgent} matching the protocol.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const agents = await discovery.findAgentsByProtocol("jupiter");
   * ```
   */
  async findAgentsByProtocol(
    protocolId: string,
    opts?: { hydrate?: boolean },
  ): Promise<DiscoveredAgent[]> {
    const protoHash = sha256(protocolId);
    const [pda] = deriveProtocolIndex(protoHash);

    const index = await this.fetchNullable<ProtocolIndexData>(
      "protocolIndex",
      pda,
    );
    if (!index) return [];

    if (opts?.hydrate === false) {
      return index.agents.map((agentPda) => ({
        pda: agentPda,
        identity: null,
        stats: null,
      }));
    }

    return this.hydrateAgents(index.agents);
  }

  /**
   * @name findToolsByCategory
   * @description Find all tool PDAs registered in a specific category.
   * Accepts either a category name string or a numeric category value.
   *
   * @param category - Tool category name (e.g. `"swap"`) or numeric category value.
   * @param opts - Optional settings.
   * @param opts.hydrate - If `false`, returns only PDAs without fetching descriptors. Defaults to `true`.
   * @returns An array of {@link DiscoveredTool} matching the category.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const tools = await discovery.findToolsByCategory("swap");
   * const tools = await discovery.findToolsByCategory(0); // numeric
   * ```
   */
  async findToolsByCategory(
    category: ToolCategoryName | number,
    opts?: { hydrate?: boolean },
  ): Promise<DiscoveredTool[]> {
    const categoryNum =
      typeof category === "number"
        ? category
        : TOOL_CATEGORY_VALUES[category] ?? 9;

    const [pda] = deriveToolCategoryIndex(categoryNum);
    const index = await this.fetchNullable<ToolCategoryIndexData>(
      "toolCategoryIndex",
      pda,
    );
    if (!index) return [];

    if (opts?.hydrate === false) {
      return index.tools.map((toolPda) => ({
        pda: toolPda,
        descriptor: null,
      }));
    }

    return this.hydrateTools(index.tools);
  }

  // ── Agent Profile ────────────────────────────────────

  /**
   * @name getAgentProfile
   * @description Get the full profile of an agent by wallet address.
   * Combines identity + stats into a single response with computed fields
   * for easy display (active status, total calls, reputation, etc.).
   *
   * @param wallet - The agent owner's wallet public key.
   * @returns The full {@link AgentProfile}, or `null` if the agent does not exist.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const profile = await discovery.getAgentProfile(agentWallet);
   * console.log(profile.identity.name);
   * console.log(profile.computed.isActive);
   * console.log(profile.computed.totalCalls);
   * ```
   */
  async getAgentProfile(wallet: PublicKey): Promise<AgentProfile | null> {
    const [agentPda] = deriveAgent(wallet);
    const [statsPda] = deriveAgentStats(agentPda);

    const [identity, stats] = await Promise.all([
      this.fetchNullable<AgentAccountData>("agentAccount", agentPda),
      this.fetchNullable<AgentStatsData>("agentStats", statsPda),
    ]);

    if (!identity) return null;

    const totalCallsBN: BN = stats?.totalCallsServed ?? identity.totalCallsServed;

    return {
      pda: agentPda,
      identity,
      stats,
      computed: {
        isActive: identity.isActive,
        totalCalls: totalCallsBN.toString(),
        reputationScore: identity.reputationScore,
        hasX402: !!identity.x402Endpoint,
        capabilityCount: identity.capabilities.length,
        pricingTierCount: identity.pricing.length,
        protocols: [...identity.protocols],
      },
    };
  }

  /**
   * @name isAgentActive
   * @description Check if an agent exists and is currently active.
   * Reads the agent stats account to determine active status.
   *
   * @param wallet - The agent owner's wallet public key.
   * @returns `true` if the agent exists and is active, `false` otherwise.
   * @since v0.1.0
   */
  async isAgentActive(wallet: PublicKey): Promise<boolean> {
    const [agentPda] = deriveAgent(wallet);
    const [statsPda] = deriveAgentStats(agentPda);

    const stats = await this.fetchNullable<AgentStatsData>(
      "agentStats",
      statsPda,
    );
    return stats?.isActive ?? false;
  }

  // ── Network Overview ─────────────────────────────────

  /**
   * @name getNetworkOverview
   * @description Get network-wide statistics from the GlobalRegistry account.
   * Returns aggregated counts and metadata for the entire SAP network.
   *
   * @returns A {@link NetworkOverview} with all network-level statistics.
   * @since v0.1.0
   */
  async getNetworkOverview(): Promise<NetworkOverview> {
    const [pda] = deriveGlobalRegistry();
    const reg = await this.fetch<GlobalRegistryData>("globalRegistry", pda);

    return {
      totalAgents: reg.totalAgents.toString(),
      activeAgents: reg.activeAgents.toString(),
      totalFeedbacks: reg.totalFeedbacks.toString(),
      totalTools: reg.totalTools,
      totalVaults: reg.totalVaults,
      totalAttestations: reg.totalAttestations,
      totalCapabilities: reg.totalCapabilities,
      totalProtocols: reg.totalProtocols,
      authority: reg.authority,
    };
  }

  // ── Multi-category Search ────────────────────────────

  /**
   * @name findAgentsByCapabilities
   * @description Search across multiple capability IDs at once.
   * Returns deduplicated agent PDAs aggregated from all matching capability indexes.
   *
   * @param capabilityIds - Array of capability identifier strings to search.
   * @param opts - Optional settings.
   * @param opts.hydrate - If `false`, returns only PDAs without fetching identity/stats. Defaults to `true`.
   * @returns A deduplicated array of {@link DiscoveredAgent} matching any of the capabilities.
   * @since v0.1.0
   */
  async findAgentsByCapabilities(
    capabilityIds: string[],
    opts?: { hydrate?: boolean },
  ): Promise<DiscoveredAgent[]> {
    const seen = new Set<string>();
    const results: DiscoveredAgent[] = [];

    for (const capId of capabilityIds) {
      const agents = await this.findAgentsByCapability(capId, opts);
      for (const agent of agents) {
        const key = agent.pda.toBase58();
        if (!seen.has(key)) {
          seen.add(key);
          results.push(agent);
        }
      }
    }

    return results;
  }

  /**
   * @name getToolCategorySummary
   * @description Search across all 10 tool categories and return a summary.
   * Lists each category with its name, numeric value, and tool count.
   *
   * @returns An array of category summary objects with `category`, `categoryNum`, and `toolCount`.
   * @since v0.1.0
   */
  async getToolCategorySummary(): Promise<
    Array<{ category: string; categoryNum: number; toolCount: number }>
  > {
    const categories = Object.entries(TOOL_CATEGORY_VALUES) as Array<
      [ToolCategoryName, number]
    >;

    const results: Array<{
      category: string;
      categoryNum: number;
      toolCount: number;
    }> = [];

    for (const [name, num] of categories) {
      const [pda] = deriveToolCategoryIndex(num);
      const index = await this.fetchNullable<ToolCategoryIndexData>(
        "toolCategoryIndex",
        pda,
      );
      results.push({
        category: name,
        categoryNum: num,
        toolCount: index?.tools.length ?? 0,
      });
    }

    return results;
  }

  // ── Internals ────────────────────────────────────────

  /**
   * @name hydrateAgents
   * @description Hydrate an array of agent PDAs by fetching identity and stats data.
   * @param agentPdas - Array of agent PDA public keys.
   * @returns An array of {@link DiscoveredAgent} with populated identity and stats fields.
   * @private
   */
  private async hydrateAgents(
    agentPdas: PublicKey[],
  ): Promise<DiscoveredAgent[]> {
    return Promise.all(
      agentPdas.map(async (agentPda) => {
        const [statsPda] = deriveAgentStats(agentPda);
        const [identity, stats] = await Promise.all([
          this.fetchNullable<AgentAccountData>("agentAccount", agentPda),
          this.fetchNullable<AgentStatsData>("agentStats", statsPda),
        ]);
        return { pda: agentPda, identity, stats };
      }),
    );
  }

  /**
   * @name hydrateTools
   * @description Hydrate an array of tool PDAs by fetching descriptor data.
   * @param toolPdas - Array of tool PDA public keys.
   * @returns An array of {@link DiscoveredTool} with populated descriptor fields.
   * @private
   */
  private async hydrateTools(
    toolPdas: PublicKey[],
  ): Promise<DiscoveredTool[]> {
    return Promise.all(
      toolPdas.map(async (toolPda) => {
        const descriptor = await this.fetchNullable<ToolDescriptorData>(
          "toolDescriptor",
          toolPda,
        );
        return { pda: toolPda, descriptor };
      }),
    );
  }

  /**
   * @name fetch
   * @description Fetch an on-chain account by name and PDA. Throws if not found.
   * @param name - Anchor account discriminator name.
   * @param pda - Account public key to fetch.
   * @returns The deserialized account data.
   * @throws If the account does not exist.
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetch<T>(name: string, pda: PublicKey): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[name].fetch(pda) as Promise<T>;
  }

  /**
   * @name fetchNullable
   * @description Fetch an on-chain account by name and PDA. Returns `null` if not found.
   * @param name - Anchor account discriminator name.
   * @param pda - Account public key to fetch.
   * @returns The deserialized account data, or `null` if the account does not exist.
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchNullable<T>(name: string, pda: PublicKey): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[name].fetchNullable(pda) as Promise<T | null>;
  }
}
