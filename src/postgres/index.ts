/**
 * @module postgres
 * @description PostgreSQL off-chain mirror for SAP v2.
 *
 * Re-exports all public types, the adapter, sync engine,
 * and serializer functions.
 *
 * @category Postgres
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import {
 *   SapPostgres,
 *   SapSyncEngine,
 *   SAP_TABLE_MAP,
 * } from "@synapse-sap/sdk/postgres";
 * ```
 */

// ── Adapter & sync engine ────────────────────────────────────────
export { SapPostgres, type PgClient, type SyncAllResult } from "./adapter";
export { SapSyncEngine } from "./sync";

// ── Types ────────────────────────────────────────────────────────
export {
  SAP_TABLE_MAP,
  type SapPostgresConfig,
  type SapAccountType,
  type SyncMeta,
  type AgentRow,
  type EscrowRow,
  type ToolRow,
  type LedgerRow,
  type EventRow,
  type SyncCursorRow,
  type SyncOptions,
} from "./types";

// ── Serializers ──────────────────────────────────────────────────
export {
  serializeGlobalRegistry,
  serializeAgent,
  serializeAgentStats,
  serializeFeedback,
  serializeCapabilityIndex,
  serializeProtocolIndex,
  serializeVault,
  serializeSession,
  serializeEpochPage,
  serializeDelegate,
  serializeTool,
  serializeCheckpoint,
  serializeEscrow,
  serializeToolCategoryIndex,
  serializeAttestation,
  serializeLedger,
  serializeLedgerPage,
} from "./serializers";
