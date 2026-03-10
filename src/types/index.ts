/**
 * @module types
 * @description Strongly-typed domain models for SAP v2.
 *
 * Every type mirrors the onchain Rust struct / enum exactly.
 * Types are organized into four layers:
 *
 * - **enums** — Anchor-style enum variant objects (`TokenType`, `ToolCategory`, …)
 * - **common** — Shared helper structs (`Capability`, `PricingTier`, `Settlement`, …)
 * - **accounts** — Deserialized on-chain PDA account data (`AgentAccountData`, …)
 * - **instructions** — Instruction argument DTOs + permission/schema helpers
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import type { AgentAccountData, RegisterAgentArgs } from "@synapse-sap/sdk/types";
 * import { TokenType, SettlementMode } from "@synapse-sap/sdk/types";
 * ```
 */

// ── Enums ────────────────────────────────────────────
export {
  TokenType,
  PluginType,
  SettlementMode,
  ToolHttpMethod,
  ToolCategory,
} from "./enums";

export type {
  TokenTypeKind,
  PluginTypeKind,
  SettlementModeKind,
  ToolHttpMethodKind,
  ToolCategoryKind,
} from "./enums";

// ── Common Structs ───────────────────────────────────
export type {
  Capability,
  VolumeCurveBreakpoint,
  PricingTier,
  PluginRef,
  Settlement,
} from "./common";

// ── Account Data ─────────────────────────────────────
export type {
  AgentAccountData,
  AgentStatsData,
  FeedbackAccountData,
  CapabilityIndexData,
  ProtocolIndexData,
  ToolCategoryIndexData,
  GlobalRegistryData,
  MemoryVaultData,
  SessionLedgerData,
  EpochPageData,
  VaultDelegateData,
  SessionCheckpointData,
  ToolDescriptorData,
  EscrowAccountData,
  AgentAttestationData,
  MemoryLedgerData,
  LedgerPageData,
} from "./accounts";

// ── Instruction Args ─────────────────────────────────
export type {
  RegisterAgentArgs,
  UpdateAgentArgs,
  GiveFeedbackArgs,
  UpdateFeedbackArgs,
  PublishToolArgs,
  UpdateToolArgs,
  InscribeToolSchemaArgs,
  InscribeMemoryArgs,
  CompactInscribeArgs,
  CreateEscrowArgs,
  CreateAttestationArgs,
  DelegatePermissionBit,
  SchemaTypeValue,
  CompressionTypeValue,
} from "./instructions";

export {
  DelegatePermission,
  SchemaType,
  CompressionType,
} from "./instructions";
