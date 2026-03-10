/**
 * @module postgres/sync
 * @description Real-time and scheduled sync engine for the SAP PostgreSQL
 * adapter. Provides cron-like periodic sync and WebSocket-based
 * live event streaming.
 *
 * @category Postgres
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SapSyncEngine } from "@synapse-sap/sdk/postgres";
 * import { SapPostgres }   from "@synapse-sap/sdk/postgres";
 * import { SapClient }     from "@synapse-sap/sdk";
 * import { Pool }          from "pg";
 *
 * const pool = new Pool({ connectionString: "postgresql://..." });
 * const sap  = SapClient.from(provider);
 * const pg   = new SapPostgres(pool, sap);
 * const sync = new SapSyncEngine(pg, sap);
 *
 * // One-shot full sync
 * await sync.run();
 *
 * // Periodic sync (every 60 seconds)
 * sync.start(60_000);
 *
 * // Live event streaming via WebSocket
 * await sync.startEventStream();
 *
 * // Graceful shutdown
 * await sync.stop();
 * ```
 */

import type { SapClient } from "../core/client";
import { EventParser } from "../events";
import type { SapPostgres, SyncAllResult } from "./adapter";
import type { SyncOptions } from "./types";

// ═══════════════════════════════════════════════════════════════════
//  Sync Engine
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapSyncEngine
 * @description Orchestrates periodic and real-time sync between
 * Solana on-chain state and the PostgreSQL mirror.
 *
 * Two operational modes:
 *
 * 1. **Periodic sync** — polls all account types at a configurable
 *    interval and upserts into PostgreSQL.
 *
 * 2. **Event streaming** — subscribes to SAP program logs via
 *    WebSocket and inserts events in real-time.
 *
 * Both modes can run simultaneously.
 *
 * @category Postgres
 * @since v0.1.0
 */
export class SapSyncEngine {
  private readonly pg: SapPostgres;
  private readonly client: SapClient;
  private readonly debug: boolean;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private logSubId: number | null = null;
  private running = false;

  constructor(pg: SapPostgres, client: SapClient, debug = false) {
    this.pg = pg;
    this.client = client;
    this.debug = debug;
  }

  // ═════════════════════════════════════════════
  //  One-shot Sync
  // ═════════════════════════════════════════════

  /**
   * @name run
   * @description Execute a single full sync cycle.
   * @param options - Optional sync configuration.
   * @returns Sync result summary.
   * @since v0.1.0
   */
  async run(options?: SyncOptions): Promise<SyncAllResult> {
    this.log("Starting one-shot sync...");
    const result = await this.pg.syncAll(options);
    this.log(`One-shot sync complete: ${result.totalRecords} records`);
    return result;
  }

  // ═════════════════════════════════════════════
  //  Periodic Sync
  // ═════════════════════════════════════════════

  /**
   * @name start
   * @description Start periodic sync at the given interval.
   * Safe to call when already running — resets the interval.
   *
   * @param intervalMs - Sync interval in milliseconds (default: 60_000).
   * @param options - Optional sync configuration.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * // Sync every 30 seconds
   * sync.start(30_000);
   * ```
   */
  start(intervalMs = 60_000, options?: SyncOptions): void {
    this.stopInterval();
    this.running = true;
    this.log(`Starting periodic sync every ${intervalMs}ms`);

    // Run immediately, then repeat
    this.pg.syncAll(options).catch((err) => this.log(`Sync error: ${err}`));

    this.intervalId = setInterval(() => {
      if (!this.running) return;
      this.pg.syncAll(options).catch((err) => this.log(`Sync error: ${err}`));
    }, intervalMs);
  }

  /**
   * @name stop
   * @description Stop all sync activity (periodic + event stream).
   * @since v0.1.0
   */
  async stop(): Promise<void> {
    this.running = false;
    this.stopInterval();
    await this.stopEventStream();
    this.log("Sync engine stopped");
  }

  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ═════════════════════════════════════════════
  //  Real-time Event Stream
  // ═════════════════════════════════════════════

  /**
   * @name startEventStream
   * @description Subscribe to SAP program logs via WebSocket and
   * insert parsed events into the `sap_events` table in real-time.
   *
   * @since v0.1.0
   *
   * @example
   * ```ts
   * // Start streaming events
   * await sync.startEventStream();
   *
   * // Later, stop the stream
   * await sync.stopEventStream();
   * ```
   */
  async startEventStream(): Promise<void> {
    if (this.logSubId !== null) {
      this.log("Event stream already running");
      return;
    }

    const connection = this.client.program.provider.connection;
    const programId = this.client.program.programId;
    const eventParser = new EventParser(this.client.program);

    this.logSubId = connection.onLogs(
      programId,
      async (logInfo) => {
        try {
          const events = eventParser.parseLogs(logInfo.logs);
          for (const event of events) {
            const data = event.data as Record<string, unknown>;
            const agentPda =
              (data.agent as string) ?? (data.agentPda as string) ?? undefined;
            const wallet =
              (data.wallet as string) ?? (data.owner as string) ?? undefined;

            await this.pg.syncEvent(
              event.name,
              logInfo.signature,
              0, // slot populated from getSlot if needed
              data,
              agentPda,
              wallet,
            );
          }
        } catch (err) {
          this.log(`Event parse error: ${err}`);
        }
      },
      "confirmed",
    );

    this.log("Event stream started");
  }

  /**
   * @name stopEventStream
   * @description Unsubscribe from the program log stream.
   * @since v0.1.0
   */
  async stopEventStream(): Promise<void> {
    if (this.logSubId !== null) {
      const connection = this.client.program.provider.connection;
      await connection.removeOnLogsListener(this.logSubId);
      this.logSubId = null;
      this.log("Event stream stopped");
    }
  }

  // ═════════════════════════════════════════════
  //  Status
  // ═════════════════════════════════════════════

  /**
   * @name isRunning
   * @description Check whether the periodic sync is active.
   * @since v0.1.0
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * @name isStreaming
   * @description Check whether the event stream is active.
   * @since v0.1.0
   */
  isStreaming(): boolean {
    return this.logSubId !== null;
  }

  // ═════════════════════════════════════════════
  //  Internal
  // ═════════════════════════════════════════════

  private log(msg: string): void {
    if (this.debug) {
      console.log(`[SapSyncEngine] ${msg}`);
    }
  }
}
