/**
 * @module registries
 * @description High-level registry barrel export.
 *
 * Registries are developer-facing abstractions that combine
 * multiple raw SDK modules into cohesive, workflow-oriented APIs:
 *
 *   - **DiscoveryRegistry** — Find agents, tools, and services across
 *     the SAP network by capability, protocol, or tool category.
 *
 *   - **X402Registry** — Full x402 micropayment lifecycle: pricing
 *     estimation, escrow management, HTTP header generation,
 *     settlement, and balance monitoring.
 *
 *   - **SessionManager** — Unified memory session lifecycle: create
 *     vault, open session, write data, read ring buffer, seal
 *     archives, and close sessions in a single API.
 *
 *   - **AgentBuilder** — Fluent builder for agent registration with
 *     capabilities, pricing tiers, tools, and x402 endpoint config.
 *
 * All registries are accessible as lazy singletons on `SapClient`:
 *
 * ```ts
 * const client = SapClient.from(provider);
 *
 * client.discovery    // → DiscoveryRegistry
 * client.x402         // → X402Registry
 * client.session      // → SessionManager
 * client.builder      // → AgentBuilder (fresh instance each access)
 * ```
 *
 * @category Registries
 * @since v0.1.0
 * @see {@link DiscoveryRegistry}
 * @see {@link X402Registry}
 * @see {@link SessionManager}
 * @see {@link AgentBuilder}
 */

export { DiscoveryRegistry } from "./discovery";
export type {
  DiscoveredAgent,
  AgentProfile,
  DiscoveredTool,
  NetworkOverview,
  ToolCategoryName,
} from "./discovery";

export { X402Registry } from "./x402";
export type {
  CostEstimate,
  PaymentContext,
  PreparePaymentOptions,
  X402Headers,
  EscrowBalance,
  SettlementResult,
  BatchSettlementResult,
  SettleOptions,
} from "./x402";

export { SessionManager } from "./session";
export type {
  SessionContext,
  WriteResult,
  SealResult,
  RingBufferEntry,
  SessionStatus,
} from "./session";

export { AgentBuilder } from "./builder";
export type {
  CapabilityInput,
  PricingTierInput,
  ToolInput,
  RegisterResult,
  RegisterWithToolsResult,
} from "./builder";

export { MetaplexBridge } from "./metaplex-bridge";
export type {
  UnifiedProfile,
  MplAgentSnapshot,
  Eip8004Registration,
  Eip8004Service,
  AttachAgentIdentityOpts,
  UpdateAgentIdentityUriOpts,
} from "./metaplex-bridge";
