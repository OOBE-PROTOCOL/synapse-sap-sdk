/**
 * @module postgres/types
 * @description PostgreSQL adapter type definitions for SAP v2.
 *
 * Defines configuration, row shapes, and query result types
 * for the PostgreSQL off-chain mirror.
 *
 * @category Postgres
 * @since v0.1.0
 */

// ═══════════════════════════════════════════════════════════════════
//  Configuration
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapPostgresConfig
 * @description Configuration for the SAP PostgreSQL adapter.
 * @category Postgres
 * @since v0.1.0
 */
export interface SapPostgresConfig {
  /**
   * PostgreSQL connection string.
   * @example "postgresql://user:pass@localhost:5432/sap"
   */
  readonly connectionString: string;

  /**
   * Whether to automatically run schema migrations on connect.
   * @default false
   */
  readonly autoMigrate?: boolean;

  /**
   * Table name prefix (default: "sap_").
   * @default "sap_"
   */
  readonly tablePrefix?: string;

  /**
   * Enable verbose query logging.
   * @default false
   */
  readonly debug?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Account Type Registry
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapAccountType
 * @description All syncable on-chain account types.
 * @category Postgres
 * @since v0.1.0
 */
export type SapAccountType =
  | "global_registry"
  | "agents"
  | "agent_stats"
  | "feedbacks"
  | "capability_indexes"
  | "protocol_indexes"
  | "plugin_slots"
  | "memory_entries"
  | "memory_chunks"
  | "memory_vaults"
  | "sessions"
  | "epoch_pages"
  | "vault_delegates"
  | "tools"
  | "checkpoints"
  | "escrows"
  | "tool_category_indexes"
  | "attestations"
  | "memory_buffers"
  | "memory_digests"
  | "memory_ledgers"
  | "ledger_pages";

/**
 * @name SapTableName
 * @description Mapping of account types to PostgreSQL table names.
 * @category Postgres
 * @since v0.1.0
 */
export const SAP_TABLE_MAP: Record<SapAccountType, string> = {
  global_registry: "sap_global_registry",
  agents: "sap_agents",
  agent_stats: "sap_agent_stats",
  feedbacks: "sap_feedbacks",
  capability_indexes: "sap_capability_indexes",
  protocol_indexes: "sap_protocol_indexes",
  plugin_slots: "sap_plugin_slots",
  memory_entries: "sap_memory_entries",
  memory_chunks: "sap_memory_chunks",
  memory_vaults: "sap_memory_vaults",
  sessions: "sap_sessions",
  epoch_pages: "sap_epoch_pages",
  vault_delegates: "sap_vault_delegates",
  tools: "sap_tools",
  checkpoints: "sap_checkpoints",
  escrows: "sap_escrows",
  tool_category_indexes: "sap_tool_category_indexes",
  attestations: "sap_attestations",
  memory_buffers: "sap_memory_buffers",
  memory_digests: "sap_memory_digests",
  memory_ledgers: "sap_memory_ledgers",
  ledger_pages: "sap_ledger_pages",
};

// ═══════════════════════════════════════════════════════════════════
//  Row Types (PostgreSQL ↔ TypeScript)
// ═══════════════════════════════════════════════════════════════════

/** Base fields present on every synced row. */
export interface SyncMeta {
  readonly pda: string;
  readonly slot: number;
  readonly synced_at: Date;
  readonly raw_data: Record<string, unknown> | null;
}

/** sap_agents row. */
export interface AgentRow extends SyncMeta {
  readonly bump: number;
  readonly version: number;
  readonly wallet: string;
  readonly name: string;
  readonly description: string;
  readonly agent_id: string | null;
  readonly agent_uri: string | null;
  readonly x402_endpoint: string | null;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly reputation_score: number;
  readonly total_feedbacks: number;
  readonly reputation_sum: string;
  readonly total_calls_served: string;
  readonly avg_latency_ms: number;
  readonly uptime_percent: number;
  readonly capabilities: unknown[];
  readonly pricing: unknown[];
  readonly protocols: string[];
  readonly active_plugins: unknown[];
}

/** sap_escrows row. */
export interface EscrowRow extends SyncMeta {
  readonly bump: number;
  readonly agent: string;
  readonly depositor: string;
  readonly agent_wallet: string;
  readonly balance: string;
  readonly total_deposited: string;
  readonly total_settled: string;
  readonly total_calls_settled: string;
  readonly price_per_call: string;
  readonly max_calls: string;
  readonly created_at: string;
  readonly last_settled_at: string | null;
  readonly expires_at: string | null;
  readonly volume_curve: unknown[];
  readonly token_mint: string | null;
  readonly token_decimals: number;
}

/** sap_tools row. */
export interface ToolRow extends SyncMeta {
  readonly bump: number;
  readonly agent: string;
  readonly tool_name: string;
  readonly version: number;
  readonly http_method: string;
  readonly category: string;
  readonly params_count: number;
  readonly required_params: number;
  readonly is_compound: boolean;
  readonly is_active: boolean;
  readonly total_invocations: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** sap_memory_ledgers row. */
export interface LedgerRow extends SyncMeta {
  readonly bump: number;
  readonly session: string;
  readonly authority: string;
  readonly num_entries: number;
  readonly total_data_size: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly num_pages: number;
}

/** sap_events row. */
export interface EventRow {
  readonly id: number;
  readonly event_name: string;
  readonly tx_signature: string;
  readonly slot: number;
  readonly block_time: number | null;
  readonly data: Record<string, unknown>;
  readonly agent_pda: string | null;
  readonly wallet: string | null;
  readonly synced_at: Date;
}

/** sap_sync_cursors row. */
export interface SyncCursorRow {
  readonly account_type: string;
  readonly last_slot: number;
  readonly last_signature: string | null;
  readonly updated_at: Date;
}

// ═══════════════════════════════════════════════════════════════════
//  Sync Options
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SyncOptions
 * @description Options for the sync engine.
 * @category Postgres
 * @since v0.1.0
 */
export interface SyncOptions {
  /** Account types to sync. Default: all. */
  readonly accountTypes?: SapAccountType[];

  /** Sync events from TX logs. @default true */
  readonly syncEvents?: boolean;

  /** Batch size for account fetching. @default 100 */
  readonly batchSize?: number;

  /** Callback invoked after each batch. */
  readonly onProgress?: (synced: number, total: number, type: string) => void;

  /** Skip accounts that haven't changed since last sync. @default true */
  readonly incremental?: boolean;
}
