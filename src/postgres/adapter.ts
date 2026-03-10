/**
 * @module postgres/adapter
 * @description PostgreSQL adapter for SAP v2 — syncs on-chain accounts
 * to a relational database for off-chain querying and analytics.
 *
 * The adapter uses `pg` (node-postgres) as the database driver.
 * It is database-driver agnostic at the interface level — you can
 * substitute any client that implements the `PgClient` interface.
 *
 * @category Postgres
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SapPostgres } from "@synapse-sap/sdk/postgres";
 * import { Pool } from "pg";
 *
 * const pool = new Pool({ connectionString: "postgresql://..." });
 * const pg = new SapPostgres(pool, sapClient);
 *
 * // Run schema migration
 * await pg.migrate();
 *
 * // Sync all agents to PostgreSQL
 * await pg.syncAgents();
 *
 * // Full sync (all account types)
 * await pg.syncAll();
 *
 * // Query off-chain
 * const agents = await pg.query("SELECT * FROM sap_agents WHERE is_active = true");
 * ```
 */

import type { PublicKey } from "@solana/web3.js";
import type { SapClient } from "../core/client";
import type {
  SyncOptions,
  SyncCursorRow,
  SapAccountType,
} from "./types";
import {
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
import { deriveGlobalRegistry } from "../pda";

import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════
//  Database Client Interface (driver-agnostic)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface PgClient
 * @description Minimal PostgreSQL client interface.
 * Compatible with `pg.Pool`, `pg.Client`, or any wrapper
 * that provides `query()`.
 * @category Postgres
 * @since v0.1.0
 */
export interface PgClient {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>;
}

// ═══════════════════════════════════════════════════════════════════
//  SapPostgres Adapter
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapPostgres
 * @description PostgreSQL off-chain mirror for SAP v2 on-chain data.
 *
 * Connects to a PostgreSQL database and synchronizes all 22 on-chain
 * account types into relational tables. Supports incremental sync,
 * event logging, and cursor-based pagination.
 *
 * @category Postgres
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SapPostgres } from "@synapse-sap/sdk/postgres";
 * import { Pool } from "pg";
 * import { SapClient } from "@synapse-sap/sdk";
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const sap = SapClient.from(provider);
 * const pg = new SapPostgres(pool, sap);
 *
 * await pg.migrate();        // Create tables
 * await pg.syncAll();         // Mirror on-chain state
 *
 * // Read from PostgreSQL
 * const { rows } = await pg.query(
 *   "SELECT * FROM sap_agents WHERE is_active = true ORDER BY reputation_score DESC"
 * );
 * ```
 */
export class SapPostgres {
  private readonly db: PgClient;
  private readonly client: SapClient;
  private readonly debug: boolean;

  constructor(db: PgClient, client: SapClient, debug = false) {
    this.db = db;
    this.client = client;
    this.debug = debug;
  }

  // ═════════════════════════════════════════════
  //  Schema Migration
  // ═════════════════════════════════════════════

  /**
   * @name migrate
   * @description Run the SQL schema migration to create all SAP tables,
   * indexes, views, and enum types. Safe to call multiple times
   * (uses `CREATE IF NOT EXISTS`).
   * @returns {Promise<void>}
   * @since v0.1.0
   */
  async migrate(): Promise<void> {
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    await this.db.query(sql);
    this.log("Schema migration complete");
  }

  /**
   * @name migrateWithSQL
   * @description Run migration with a custom SQL string.
   * Useful when the schema.sql file is bundled differently.
   * @param sql - The full SQL schema to execute.
   * @since v0.1.0
   */
  async migrateWithSQL(sql: string): Promise<void> {
    await this.db.query(sql);
    this.log("Schema migration complete (custom SQL)");
  }

  // ═════════════════════════════════════════════
  //  Raw Query
  // ═════════════════════════════════════════════

  /**
   * @name query
   * @description Execute a raw SQL query against the database.
   * @param text - SQL query string.
   * @param values - Parameterized values.
   * @returns Query result with rows and rowCount.
   * @since v0.1.0
   */
  async query<T = unknown>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    this.log(`QUERY: ${text.substring(0, 120)}...`);
    return this.db.query(text, values) as Promise<{
      rows: T[];
      rowCount: number;
    }>;
  }

  // ═════════════════════════════════════════════
  //  Upsert Helper
  // ═════════════════════════════════════════════

  /**
   * @name upsert
   * @description Insert or update a row in the specified table.
   * Uses `ON CONFLICT (pda) DO UPDATE` for idempotent writes.
   * @param table - Target table name.
   * @param row - Key-value record to insert.
   * @since v0.1.0
   */
  async upsert(table: string, row: Record<string, unknown>): Promise<void> {
    const keys = Object.keys(row);
    const values = Object.values(row);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    const updates = keys
      .filter((k) => k !== "pda")
      .map((k) => `${k} = $${keys.indexOf(k) + 1}`)
      .join(", ");

    const sql = `
      INSERT INTO ${table} (${keys.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (pda) DO UPDATE SET ${updates}
    `;

    await this.db.query(sql, values);
  }

  /**
   * @name upsertBatch
   * @description Upsert multiple rows in a single transaction.
   * @param table - Target table name.
   * @param rows - Array of key-value records.
   * @since v0.1.0
   */
  async upsertBatch(
    table: string,
    rows: Record<string, unknown>[],
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.db.query("BEGIN");
    try {
      for (const row of rows) {
        await this.upsert(table, row);
      }
      await this.db.query("COMMIT");
    } catch (err) {
      await this.db.query("ROLLBACK");
      throw err;
    }
  }

  // ═════════════════════════════════════════════
  //  Sync Cursors
  // ═════════════════════════════════════════════

  /**
   * @name getCursor
   * @description Get the sync cursor for a given account type.
   * @param accountType - The account type to check.
   * @since v0.1.0
   */
  async getCursor(accountType: SapAccountType): Promise<SyncCursorRow | null> {
    const { rows } = await this.db.query(
      "SELECT * FROM sap_sync_cursors WHERE account_type = $1",
      [accountType],
    );
    return (rows[0] as SyncCursorRow) ?? null;
  }

  /**
   * @name updateCursor
   * @description Update the sync cursor after a successful sync.
   * @param accountType - The account type synced.
   * @param slot - The last synced slot.
   * @param signature - Optional last TX signature.
   * @since v0.1.0
   */
  async updateCursor(
    accountType: SapAccountType | string,
    slot: number,
    signature?: string,
  ): Promise<void> {
    await this.db.query(
      `UPDATE sap_sync_cursors
       SET last_slot = $1, last_signature = $2, updated_at = NOW()
       WHERE account_type = $3`,
      [slot, signature ?? null, accountType],
    );
  }

  // ═════════════════════════════════════════════
  //  Individual Sync Methods
  // ═════════════════════════════════════════════

  /**
   * @name syncGlobal
   * @description Sync the GlobalRegistry singleton to PostgreSQL.
   * @since v0.1.0
   */
  async syncGlobal(): Promise<void> {
    const [globalPda] = deriveGlobalRegistry();
    const pdaStr = globalPda.toBase58();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await (this.client.program.account as any).globalRegistry.fetch(globalPda);
      const slot = await this.client.program.provider.connection.getSlot();
      const row = serializeGlobalRegistry(pdaStr, data, slot);
      await this.upsert("sap_global_registry", row);
      await this.updateCursor("global_registry", slot);
      this.log(`Synced global registry`);
    } catch {
      this.log("Global registry not found (not initialized yet)");
    }
  }

  /**
   * @name syncAgents
   * @description Sync all AgentAccount PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncAgents(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).agentAccount.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeAgent(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_agents", rows);
    await this.updateCursor("agents", slot);
    this.log(`Synced ${rows.length} agents`);
    return rows.length;
  }

  /**
   * @name syncAgentStats
   * @description Sync all AgentStats PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncAgentStats(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).agentStats.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeAgentStats(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_agent_stats", rows);
    await this.updateCursor("agent_stats", slot);
    this.log(`Synced ${rows.length} agent stats`);
    return rows.length;
  }

  /**
   * @name syncFeedbacks
   * @description Sync all FeedbackAccount PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncFeedbacks(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).feedbackAccount.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeFeedback(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_feedbacks", rows);
    await this.updateCursor("feedbacks", slot);
    this.log(`Synced ${rows.length} feedbacks`);
    return rows.length;
  }

  /**
   * @name syncTools
   * @description Sync all ToolDescriptor PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncTools(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).toolDescriptor.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeTool(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_tools", rows);
    await this.updateCursor("tools", slot);
    this.log(`Synced ${rows.length} tools`);
    return rows.length;
  }

  /**
   * @name syncEscrows
   * @description Sync all EscrowAccount PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncEscrows(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).escrowAccount.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeEscrow(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_escrows", rows);
    await this.updateCursor("escrows", slot);
    this.log(`Synced ${rows.length} escrows`);
    return rows.length;
  }

  /**
   * @name syncAttestations
   * @description Sync all AgentAttestation PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncAttestations(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).agentAttestation.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeAttestation(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_attestations", rows);
    await this.updateCursor("attestations", slot);
    this.log(`Synced ${rows.length} attestations`);
    return rows.length;
  }

  /**
   * @name syncVaults
   * @description Sync all MemoryVault PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncVaults(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).memoryVault.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeVault(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_memory_vaults", rows);
    await this.updateCursor("memory_vaults", slot);
    this.log(`Synced ${rows.length} vaults`);
    return rows.length;
  }

  /**
   * @name syncSessions
   * @description Sync all SessionLedger PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncSessions(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).sessionLedger.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeSession(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_sessions", rows);
    await this.updateCursor("sessions", slot);
    this.log(`Synced ${rows.length} sessions`);
    return rows.length;
  }

  /**
   * @name syncLedgers
   * @description Sync all MemoryLedger PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncLedgers(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).memoryLedger.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeLedger(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_memory_ledgers", rows);
    await this.updateCursor("memory_ledgers", slot);
    this.log(`Synced ${rows.length} ledgers`);
    return rows.length;
  }

  /**
   * @name syncLedgerPages
   * @description Sync all LedgerPage PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncLedgerPages(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).ledgerPage.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeLedgerPage(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_ledger_pages", rows);
    await this.updateCursor("ledger_pages", slot);
    this.log(`Synced ${rows.length} ledger pages`);
    return rows.length;
  }

  /**
   * @name syncCapabilityIndexes
   * @description Sync all CapabilityIndex PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncCapabilityIndexes(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).capabilityIndex.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeCapabilityIndex(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_capability_indexes", rows);
    await this.updateCursor("capability_indexes", slot);
    this.log(`Synced ${rows.length} capability indexes`);
    return rows.length;
  }

  /**
   * @name syncProtocolIndexes
   * @description Sync all ProtocolIndex PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncProtocolIndexes(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).protocolIndex.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeProtocolIndex(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_protocol_indexes", rows);
    await this.updateCursor("protocol_indexes", slot);
    this.log(`Synced ${rows.length} protocol indexes`);
    return rows.length;
  }

  /**
   * @name syncToolCategoryIndexes
   * @description Sync all ToolCategoryIndex PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncToolCategoryIndexes(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).toolCategoryIndex.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeToolCategoryIndex(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_tool_category_indexes", rows);
    await this.updateCursor("tool_category_indexes", slot);
    this.log(`Synced ${rows.length} tool category indexes`);
    return rows.length;
  }

  /**
   * @name syncEpochPages
   * @description Sync all EpochPage PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncEpochPages(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).epochPage.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeEpochPage(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_epoch_pages", rows);
    await this.updateCursor("epoch_pages", slot);
    this.log(`Synced ${rows.length} epoch pages`);
    return rows.length;
  }

  /**
   * @name syncDelegates
   * @description Sync all VaultDelegate PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncDelegates(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).vaultDelegate.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeDelegate(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_vault_delegates", rows);
    await this.updateCursor("vault_delegates", slot);
    this.log(`Synced ${rows.length} delegates`);
    return rows.length;
  }

  /**
   * @name syncCheckpoints
   * @description Sync all SessionCheckpoint PDAs to PostgreSQL.
   * @since v0.1.0
   */
  async syncCheckpoints(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = await (this.client.program.account as any).sessionCheckpoint.all();
    const slot = await this.client.program.provider.connection.getSlot();
    const rows = accounts.map(
      (a: { publicKey: PublicKey; account: unknown }) =>
        serializeCheckpoint(a.publicKey.toBase58(), a.account as never, slot),
    );
    await this.upsertBatch("sap_checkpoints", rows);
    await this.updateCursor("checkpoints", slot);
    this.log(`Synced ${rows.length} checkpoints`);
    return rows.length;
  }

  // ═════════════════════════════════════════════
  //  Full Sync
  // ═════════════════════════════════════════════

  /**
   * @name syncAll
   * @description Sync all on-chain account types to PostgreSQL.
   *
   * Fetches every account via `program.account.*.all()` and
   * upserts into the corresponding table. Reports progress
   * via the `onProgress` callback.
   *
   * @param options - Optional sync configuration.
   * @returns Summary of synced account counts.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const result = await pg.syncAll({
   *   onProgress: (synced, total, type) => {
   *     console.log(`[${type}] ${synced}/${total}`);
   *   },
   * });
   * console.log("Total synced:", result.totalRecords);
   * ```
   */
  async syncAll(options?: SyncOptions): Promise<SyncAllResult> {
    const result: SyncAllResult = {
      agents: 0,
      agentStats: 0,
      feedbacks: 0,
      tools: 0,
      escrows: 0,
      attestations: 0,
      vaults: 0,
      sessions: 0,
      epochPages: 0,
      delegates: 0,
      checkpoints: 0,
      ledgers: 0,
      ledgerPages: 0,
      capabilityIndexes: 0,
      protocolIndexes: 0,
      toolCategoryIndexes: 0,
      totalRecords: 0,
      durationMs: 0,
    };

    const start = Date.now();
    const total = 16;
    const onProgress = options?.onProgress;

    // Sync in dependency order
    await this.syncGlobal();
    if (onProgress) onProgress(1, total, "global_registry");

    result.agents = await this.syncAgents();
    if (onProgress) onProgress(2, total, "agents");

    result.agentStats = await this.syncAgentStats();
    if (onProgress) onProgress(3, total, "agent_stats");

    result.feedbacks = await this.syncFeedbacks();
    if (onProgress) onProgress(4, total, "feedbacks");

    result.tools = await this.syncTools();
    if (onProgress) onProgress(5, total, "tools");

    result.escrows = await this.syncEscrows();
    if (onProgress) onProgress(6, total, "escrows");

    result.attestations = await this.syncAttestations();
    if (onProgress) onProgress(7, total, "attestations");

    result.vaults = await this.syncVaults();
    if (onProgress) onProgress(8, total, "vaults");

    result.sessions = await this.syncSessions();
    if (onProgress) onProgress(9, total, "sessions");

    result.epochPages = await this.syncEpochPages();
    if (onProgress) onProgress(10, total, "epoch_pages");

    result.delegates = await this.syncDelegates();
    if (onProgress) onProgress(11, total, "delegates");

    result.checkpoints = await this.syncCheckpoints();
    if (onProgress) onProgress(12, total, "checkpoints");

    result.ledgers = await this.syncLedgers();
    if (onProgress) onProgress(13, total, "ledgers");

    result.ledgerPages = await this.syncLedgerPages();
    if (onProgress) onProgress(14, total, "ledger_pages");

    result.capabilityIndexes = await this.syncCapabilityIndexes();
    if (onProgress) onProgress(15, total, "capability_indexes");

    result.protocolIndexes = await this.syncProtocolIndexes();
    result.toolCategoryIndexes = await this.syncToolCategoryIndexes();
    if (onProgress) onProgress(16, total, "indexes");

    result.totalRecords =
      result.agents +
      result.agentStats +
      result.feedbacks +
      result.tools +
      result.escrows +
      result.attestations +
      result.vaults +
      result.sessions +
      result.epochPages +
      result.delegates +
      result.checkpoints +
      result.ledgers +
      result.ledgerPages +
      result.capabilityIndexes +
      result.protocolIndexes +
      result.toolCategoryIndexes;

    result.durationMs = Date.now() - start;
    this.log(
      `Full sync complete: ${result.totalRecords} records in ${result.durationMs}ms`,
    );

    return result;
  }

  // ═════════════════════════════════════════════
  //  Event Sync
  // ═════════════════════════════════════════════

  /**
   * @name syncEvent
   * @description Store a parsed SAP event in the events log table.
   * @param eventName - The event name (e.g. "RegisteredEvent").
   * @param txSignature - The transaction signature.
   * @param slot - The Solana slot.
   * @param data - The parsed event data.
   * @param agentPda - Optional agent PDA for indexing.
   * @param wallet - Optional wallet for indexing.
   * @since v0.1.0
   */
  async syncEvent(
    eventName: string,
    txSignature: string,
    slot: number,
    data: Record<string, unknown>,
    agentPda?: string,
    wallet?: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO sap_events (event_name, tx_signature, slot, data, agent_pda, wallet)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventName, txSignature, slot, JSON.stringify(data), agentPda ?? null, wallet ?? null],
    );
  }

  // ═════════════════════════════════════════════
  //  Convenience Queries
  // ═════════════════════════════════════════════

  /**
   * @name getAgent
   * @description Fetch a single agent by PDA or wallet.
   * @param pdaOrWallet - Agent PDA (base58) or owner wallet.
   * @since v0.1.0
   */
  async getAgent(pdaOrWallet: string): Promise<unknown | null> {
    const { rows } = await this.db.query(
      "SELECT * FROM sap_agents WHERE pda = $1 OR wallet = $1 LIMIT 1",
      [pdaOrWallet],
    );
    return rows[0] ?? null;
  }

  /**
   * @name getActiveAgents
   * @description Fetch all active agents, ordered by reputation.
   * @param limit - Max agents to return (default: 100).
   * @since v0.1.0
   */
  async getActiveAgents(limit = 100): Promise<unknown[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM sap_active_agents
       ORDER BY reputation_score DESC
       LIMIT $1`,
      [limit],
    );
    return rows;
  }

  /**
   * @name getEscrowBalance
   * @description Fetch escrow balance for a specific agent/depositor pair.
   * @param agentPda - Agent PDA (base58).
   * @param depositor - Depositor wallet (base58).
   * @since v0.1.0
   */
  async getEscrowBalance(
    agentPda: string,
    depositor: string,
  ): Promise<unknown | null> {
    const { rows } = await this.db.query(
      "SELECT * FROM sap_escrow_balances WHERE agent = $1 AND depositor = $2",
      [agentPda, depositor],
    );
    return rows[0] ?? null;
  }

  /**
   * @name getAgentTools
   * @description Fetch all active tools for a given agent.
   * @param agentPda - Agent PDA (base58).
   * @since v0.1.0
   */
  async getAgentTools(agentPda: string): Promise<unknown[]> {
    const { rows } = await this.db.query(
      "SELECT * FROM sap_agent_tools WHERE agent = $1",
      [agentPda],
    );
    return rows;
  }

  /**
   * @name getRecentEvents
   * @description Fetch the most recent events.
   * @param limit - Max events to return (default: 50).
   * @param eventName - Optional filter by event name.
   * @since v0.1.0
   */
  async getRecentEvents(
    limit = 50,
    eventName?: string,
  ): Promise<unknown[]> {
    if (eventName) {
      const { rows } = await this.db.query(
        "SELECT * FROM sap_events WHERE event_name = $1 ORDER BY id DESC LIMIT $2",
        [eventName, limit],
      );
      return rows;
    }
    const { rows } = await this.db.query(
      "SELECT * FROM sap_events ORDER BY id DESC LIMIT $1",
      [limit],
    );
    return rows;
  }

  /**
   * @name getSyncStatus
   * @description Get the sync status for all account types.
   * @since v0.1.0
   */
  async getSyncStatus(): Promise<SyncCursorRow[]> {
    const { rows } = await this.db.query(
      "SELECT * FROM sap_sync_cursors ORDER BY account_type",
    );
    return rows as SyncCursorRow[];
  }

  // ═════════════════════════════════════════════
  //  Internal
  // ═════════════════════════════════════════════

  private log(msg: string): void {
    if (this.debug) {
      console.log(`[SapPostgres] ${msg}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Result Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface SyncAllResult
 * @description Result of a full sync operation.
 * @category Postgres
 * @since v0.1.0
 */
export interface SyncAllResult {
  agents: number;
  agentStats: number;
  feedbacks: number;
  tools: number;
  escrows: number;
  attestations: number;
  vaults: number;
  sessions: number;
  epochPages: number;
  delegates: number;
  checkpoints: number;
  ledgers: number;
  ledgerPages: number;
  capabilityIndexes: number;
  protocolIndexes: number;
  toolCategoryIndexes: number;
  totalRecords: number;
  durationMs: number;
}
