/**
 * @synapse-sap/sdk — TypeScript SDK for SAP v2 (Synapse Agent Protocol)
 *
 * Modular architecture:
 *
 * | Path              | Description                                   |
 * |-------------------|-----------------------------------------------|
 * | `core/`           | SapClient, SapConnection (RPC factory)        |
 * | `types/`          | On-chain enums, account data, instruction DTOs|
 * | `constants/`      | Program IDs, PDA seeds, size limits           |
 * | `pda/`            | Deterministic PDA derivation helpers          |
 * | `events/`         | Transaction-log event parser                  |
 * | `errors/`         | Typed SDK error classes                       |
 * | `utils/`          | Hashing, validation, serialization            |
 * | `modules/`        | Low-level per-domain instruction wrappers     |
 * | `registries/`     | High-level abstractions (discovery, x402, …)  |
 * | `plugin/`         | SynapseAgentKit adapter (52 tools)            |
 * | `idl/`            | Embedded Anchor IDL                           |
 *
 * @example
 * ```ts
 * import { SapClient, SapConnection } from "@synapse-sap/sdk";
 *
 * // Quick start — from Anchor provider
 * const client = SapClient.from(provider);
 *
 * // Or from RPC URL (synapse-client-sdk compatible)
 * const conn = SapConnection.devnet();
 * const client2 = conn.fromKeypair(keypair);
 *
 * // Use domain modules:
 * await client.agent.register({ ... });
 * await client.escrow.create(agentWallet, { ... });
 * await client.ledger.write(sessionPda, data, contentHash);
 *
 * // Use registries (high-level):
 * const agents = await client.discovery.findAgentsByProtocol("jupiter");
 * const ctx = await client.session.start("conv-123");
 * ```
 *
 * @packageDocumentation
 * @category SDK
 * @since v0.1.0
 */

// ── Core ─────────────────────────────────────────────
export { SapClient, SapConnection } from "./core";
export type { SapCluster, SapConnectionConfig } from "./core";

// ── Types ────────────────────────────────────────────
export type {
  // Enums
  TokenTypeKind,
  PluginTypeKind,
  SettlementModeKind,
  ToolHttpMethodKind,
  ToolCategoryKind,
  DelegatePermissionBit,
  SchemaTypeValue,
  CompressionTypeValue,
  // Helper structs
  Capability,
  VolumeCurveBreakpoint,
  PricingTier,
  PluginRef,
  Settlement,
  // Account data
  AgentAccountData,
  FeedbackAccountData,
  CapabilityIndexData,
  ProtocolIndexData,
  GlobalRegistryData,
  MemoryVaultData,
  SessionLedgerData,
  EpochPageData,
  VaultDelegateData,
  ToolDescriptorData,
  SessionCheckpointData,
  EscrowAccountData,
  AgentStatsData,
  ToolCategoryIndexData,
  AgentAttestationData,
  MemoryLedgerData,
  LedgerPageData,
  // Instruction args
  RegisterAgentArgs,
  UpdateAgentArgs,
  GiveFeedbackArgs,
  UpdateFeedbackArgs,
  PublishToolArgs,
  UpdateToolArgs,
  InscribeMemoryArgs,
  CompactInscribeArgs,
  CreateEscrowArgs,
  CreateAttestationArgs,
  InscribeToolSchemaArgs,
} from "./types";

export {
  TokenType,
  PluginType,
  SettlementMode,
  ToolHttpMethod,
  ToolCategory,
  DelegatePermission,
  SchemaType,
  CompressionType,
} from "./types";

// ── Constants ────────────────────────────────────────
export {
  SAP_PROGRAM_ADDRESS,
  SAP_PROGRAM_ID,
  MAINNET_SAP_PROGRAM_ID,
  DEVNET_SAP_PROGRAM_ID,
  LOCALNET_SAP_PROGRAM_ID,
  SEEDS,
  LIMITS,
  AGENT_VERSION,
  VAULT_PROTOCOL_VERSION,
  TOOL_CATEGORY_VALUES,
  HTTP_METHOD_VALUES,
} from "./constants";

// ── IDL ──────────────────────────────────────────────
export { SAP_IDL, IDL_PROGRAM_ADDRESS, IDL_METADATA } from "./idl/index";
export type { SynapseAgentSapIDL } from "./idl/index";

// ── PDA Derivation ───────────────────────────────────
export {
  deriveGlobalRegistry,
  deriveAgent,
  deriveAgentStats,
  deriveFeedback,
  deriveCapabilityIndex,
  deriveProtocolIndex,
  deriveToolCategoryIndex,
  deriveVault,
  deriveSession,
  deriveEpochPage,
  deriveVaultDelegate,
  deriveCheckpoint,
  deriveTool,
  deriveEscrow,
  deriveAttestation,
  deriveLedger,
  deriveLedgerPage,
} from "./pda";

// ── Utilities ────────────────────────────────────────
export { sha256, hashToArray, assert } from "./utils";
export { serializeAccount, serializeValue } from "./utils";

// ── Errors ───────────────────────────────────────────
export {
  SapError,
  SapValidationError,
  SapRpcError,
  SapAccountNotFoundError,
  SapTimeoutError,
  SapPermissionError,
} from "./errors";

// ── Events ───────────────────────────────────────────
export { EventParser, SAP_EVENT_NAMES } from "./events";
export type {
  SapEvent,
  SapEventName,
  ParsedEvent,
  RegisteredEventData,
  UpdatedEventData,
  FeedbackEventData,
  MemoryInscribedEventData,
  PaymentSettledEventData,
  LedgerEntryEventData,
} from "./events";

// ── Modules (for advanced usage / tree-shaking) ──────
export {
  AgentModule,
  FeedbackModule,
  IndexingModule,
  ToolsModule,
  VaultModule,
  EscrowModule,
  AttestationModule,
  LedgerModule,
  BaseModule,
} from "./modules/index";
export type { SapProgram, SapTransactionResult } from "./modules/base";

// ── Plugin (SynapseAgentKit integration) ─────────────
export { createSAPPlugin, SAPPlugin } from "./plugin/index";
export type {
  SAPPluginConfig,
  SynapsePlugin,
  PluginMeta,
  PluginContext,
  PluginInstallResult,
} from "./plugin/index";
export type {
  ProtocolMethod,
  PluginProtocol,
} from "./plugin/protocols";
export { SAP_PROTOCOLS } from "./plugin/protocols";

// ── PostgreSQL Adapter (off-chain mirror) ────────────────
export { SapPostgres, SapSyncEngine, SAP_TABLE_MAP } from "./postgres";
export type {
  PgClient,
  SyncAllResult,
  SapAccountType,
  SyncMeta,
  AgentRow,
  EscrowRow,
  ToolRow,
  LedgerRow,
  EventRow,
  SyncCursorRow,
  SyncOptions,
} from "./postgres";

// ── Registries (high-level developer abstractions) ────
export {
  DiscoveryRegistry,
  X402Registry,
  SessionManager,
  AgentBuilder,
} from "./registries/index";
export type {
  DiscoveredAgent,
  AgentProfile,
  DiscoveredTool,
  NetworkOverview,
  ToolCategoryName,
  CostEstimate,
  PaymentContext,
  PreparePaymentOptions,
  X402Headers,
  EscrowBalance,
  SettlementResult,
  BatchSettlementResult,
  SessionContext,
  WriteResult,
  SealResult,
  RingBufferEntry,
  SessionStatus,
  CapabilityInput,
  PricingTierInput,
  ToolInput,
  RegisterResult,
  RegisterWithToolsResult,
} from "./registries/index";
