/**
 * @synapse-sap/sdk — TypeScript SDK for SAP v2 (Solana Agent Protocol)
 *
 * @example
 * ```ts
 * import { SapClient } from "@synapse-sap/sdk";
 *
 * const client = SapClient.from(provider);
 *
 * // Register agent
 * await client.agent.register({
 *   name: "MyAgent",
 *   description: "AI-powered swap agent",
 *   capabilities: [{ id: "jupiter:swap", description: null, protocolId: "jupiter", version: "1.0.0" }],
 *   pricing: [],
 *   protocols: ["jupiter"],
 * });
 *
 * // Fetch agent
 * const agent = await client.agent.fetch();
 *
 * // Create escrow
 * await client.escrow.create(agentWallet, {
 *   pricePerCall: new BN(1000),
 *   maxCalls: new BN(1000),
 *   initialDeposit: new BN(1_000_000),
 *   expiresAt: new BN(0),
 *   volumeCurve: [],
 *   tokenMint: null,
 *   tokenDecimals: 9,
 * });
 *
 * // Write to ledger
 * await client.ledger.write(sessionPda, data, contentHash);
 * ```
 */

// ── Core Client ──────────────────────────────────────
export { SapClient } from "./client";

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
  SAP_PROGRAM_ID,
  SEEDS,
  LIMITS,
  AGENT_VERSION,
  VAULT_PROTOCOL_VERSION,
  TOOL_CATEGORY_VALUES,
  HTTP_METHOD_VALUES,
} from "./constants";

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
