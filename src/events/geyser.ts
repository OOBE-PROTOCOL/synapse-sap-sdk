/**
 * @module events/geyser
 * @description Yellowstone gRPC (Geyser) event stream for SAP v2.
 *
 * Drop-in alternative to the WebSocket `connection.onLogs()` pipeline.
 * Uses Triton / Helius / any Yellowstone-compatible gRPC endpoint to
 * receive program transaction updates with sub-second latency and
 * automatic reconnection.
 *
 * @category Events
 * @since v0.6.3
 *
 * @example
 * ```ts
 * import { GeyserEventStream } from "@oobe-protocol-labs/synapse-sap-sdk";
 * import { EventParser }       from "@oobe-protocol-labs/synapse-sap-sdk";
 *
 * const stream = new GeyserEventStream({
 *   endpoint:  "https://grpc.triton.one",
 *   token:     process.env.GEYSER_TOKEN!,
 *   programId: "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
 * });
 *
 * const parser = new EventParser(program);
 *
 * stream.on("logs", (logs, signature, slot) => {
 *   const events = parser.parseLogs(logs);
 *   for (const event of events) {
 *     console.log(event.name, event.data);
 *   }
 * });
 *
 * stream.on("error", (err) => console.error("gRPC error:", err));
 *
 * await stream.connect();
 * // ... later
 * await stream.disconnect();
 * ```
 */

import { EventEmitter } from "events";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/**
 * Configuration for the Yellowstone gRPC event stream.
 *
 * @interface GeyserConfig
 * @since v0.6.3
 */
export interface GeyserConfig {
  /** Yellowstone gRPC endpoint URL (e.g. "https://grpc.triton.one") */
  endpoint: string;

  /** Authentication token for the gRPC endpoint */
  token: string;

  /** SAP program ID to filter. Defaults to SAP v2 program. */
  programId?: string;

  /**
   * Commitment level for the subscription.
   * @default "confirmed"
   */
  commitment?: "processed" | "confirmed" | "finalized";

  /**
   * Automatically reconnect on disconnect.
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Delay between reconnection attempts in ms.
   * @default 3000
   */
  reconnectDelayMs?: number;

  /**
   * Maximum number of reconnection attempts. 0 = unlimited.
   * @default 0
   */
  maxReconnectAttempts?: number;

  /**
   * Include failed transactions in the stream.
   * @default false
   */
  includeFailedTxs?: boolean;
}

/**
 * Events emitted by {@link GeyserEventStream}.
 *
 * @interface GeyserStreamEvents
 * @since v0.6.3
 */
export interface GeyserStreamEvents {
  /**
   * Emitted for each transaction's log messages.
   * Same shape as `connection.onLogs()` callback — plug into `EventParser.parseLogs()`.
   */
  logs: (logs: string[], signature: string, slot: number) => void;

  /** Emitted when the gRPC stream connects or reconnects. */
  connected: () => void;

  /** Emitted when the stream disconnects. */
  disconnected: (reason: string) => void;

  /** Emitted on transport or parsing errors. */
  error: (err: Error) => void;

  /** Emitted on reconnection attempt. */
  reconnecting: (attempt: number) => void;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const SAP_PROGRAM_ID = "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ";

const COMMITMENT_MAP: Record<string, number> = {
  processed: 0,
  confirmed: 1,
  finalized: 2,
};

// ═══════════════════════════════════════════════════════════════════
//  GeyserEventStream
// ═══════════════════════════════════════════════════════════════════

/**
 * Yellowstone gRPC event stream for SAP v2 programs.
 *
 * Wraps `@triton-one/yellowstone-grpc` and emits parsed log lines
 * compatible with the existing {@link EventParser}.
 *
 * @name GeyserEventStream
 * @category Events
 * @since v0.6.3
 *
 * @example
 * ```ts
 * const stream = new GeyserEventStream({
 *   endpoint: "https://grpc.triton.one",
 *   token:    process.env.GEYSER_TOKEN!,
 * });
 *
 * stream.on("logs", (logs, sig, slot) => {
 *   const events = parser.parseLogs(logs);
 *   events.forEach(e => db.insertEvent(e));
 * });
 *
 * await stream.connect();
 * ```
 */
export class GeyserEventStream extends EventEmitter {
  private readonly config: Required<GeyserConfig>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stream: any = null;
  private reconnectAttempts = 0;
  private _connected = false;
  private _stopped = false;

  constructor(config: GeyserConfig) {
    super();
    this.config = {
      endpoint: config.endpoint,
      token: config.token,
      programId: config.programId ?? SAP_PROGRAM_ID,
      commitment: config.commitment ?? "confirmed",
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelayMs: config.reconnectDelayMs ?? 3_000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 0,
      includeFailedTxs: config.includeFailedTxs ?? false,
    };
  }

  /** Whether the gRPC stream is currently connected. */
  get connected(): boolean {
    return this._connected;
  }

  /**
   * Connect to the Yellowstone gRPC endpoint and start streaming.
   *
   * @throws If `@triton-one/yellowstone-grpc` is not installed.
   */
  async connect(): Promise<void> {
    this._stopped = false;
    this.reconnectAttempts = 0;

    // Dynamic import — yellowstone is an optional peer dependency
    let YellowstoneClient: new (...args: unknown[]) => unknown;
    try {
      const mod = await import("@triton-one/yellowstone-grpc");
      YellowstoneClient = mod.default ?? mod.Client;
    } catch {
      throw new Error(
        "Missing dependency: @triton-one/yellowstone-grpc\n" +
          "Install it with: npm i @triton-one/yellowstone-grpc",
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client = new (YellowstoneClient as any)(
      this.config.endpoint,
      this.config.token,
      undefined, // TLS options — use defaults
    );

    await this.subscribe();
  }

  /**
   * Disconnect from the gRPC stream and stop reconnection.
   */
  async disconnect(): Promise<void> {
    this._stopped = true;
    this._connected = false;

    if (this.stream) {
      try {
        this.stream.cancel?.();
        this.stream = null;
      } catch {
        // ignore cancel errors
      }
    }

    this.emit("disconnected", "manual");
  }

  // ─── Internal ──────────────────────────────────────

  private async subscribe(): Promise<void> {
    if (!this.client || this._stopped) return;

    try {
      this.stream = await this.client.subscribe();
    } catch (err) {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
      await this.maybeReconnect();
      return;
    }

    // Build the subscription request
    const request = {
      accounts: {},
      slots: {},
      transactions: {
        sap: {
          vote: false,
          failed: this.config.includeFailedTxs,
          signature: undefined,
          accountInclude: [this.config.programId],
          accountExclude: [],
          accountRequired: [],
        },
      },
      transactionsStatus: {},
      blocks: {},
      blocksMeta: {},
      entry: {},
      commitment: COMMITMENT_MAP[this.config.commitment] ?? 1,
      accountsDataSlice: [],
      ping: { id: 1 },
    };

    // Send subscription
    try {
      await new Promise<void>((resolve, reject) => {
        this.stream.write(request, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
      await this.maybeReconnect();
      return;
    }

    this._connected = true;
    this.reconnectAttempts = 0;
    this.emit("connected");

    // Listen for data
    this.stream.on("data", (data: GeyserUpdateMessage) => {
      try {
        this.handleMessage(data);
      } catch (err) {
        this.emit("error", err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.stream.on("error", (err: Error) => {
      this.emit("error", err);
    });

    this.stream.on("end", () => {
      this._connected = false;
      this.emit("disconnected", "stream-end");
      this.maybeReconnect();
    });

    this.stream.on("close", () => {
      this._connected = false;
      this.emit("disconnected", "stream-close");
      this.maybeReconnect();
    });
  }

  private handleMessage(data: GeyserUpdateMessage): void {
    // Respond to pings to keep the stream alive
    if (data.ping) {
      this.stream?.write({ ping: { id: data.ping.id } }, () => {});
      return;
    }

    // Extract transaction data
    const tx = data.transaction;
    if (!tx?.transaction?.transaction) return;

    const meta = tx.transaction.meta;
    if (!meta) return;

    // Extract log messages from the transaction meta
    const logs: string[] = meta.logMessages ?? [];
    if (logs.length === 0) return;

    const signature = tx.transaction.signature
      ? Buffer.from(tx.transaction.signature).toString("base64")
      : "unknown";

    const slot = Number(tx.slot ?? 0);

    this.emit("logs", logs, signature, slot);
  }

  private async maybeReconnect(): Promise<void> {
    if (this._stopped || !this.config.autoReconnect) return;

    const max = this.config.maxReconnectAttempts;
    if (max > 0 && this.reconnectAttempts >= max) {
      this.emit(
        "error",
        new Error(`Max reconnect attempts (${max}) exceeded`),
      );
      return;
    }

    this.reconnectAttempts++;
    this.emit("reconnecting", this.reconnectAttempts);

    await new Promise((r) => setTimeout(r, this.config.reconnectDelayMs));

    if (!this._stopped) {
      await this.subscribe();
    }
  }
}

// ─── Internal Yellowstone message types ─────────────

interface GeyserUpdateMessage {
  ping?: { id: number };
  transaction?: {
    slot?: string | number;
    transaction?: {
      signature?: Uint8Array;
      transaction?: unknown;
      meta?: {
        logMessages?: string[];
      };
    };
  };
}
