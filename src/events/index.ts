/**
 * @module events
 * @description Decode SAP v2 events from transaction logs.
 *
 * Uses Anchor's event parser under the hood. Provides a
 * strongly-typed, filterable event stream.
 *
 * @category Events
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { EventParser } from "@synapse-sap/sdk/events";
 *
 * const events = client.events.parseLogs(txLogs);
 * for (const event of events) {
 *   if (event.name === "PaymentSettledEvent") {
 *     console.log(event.data);
 *   }
 * }
 * ```
 */

import { type Program, BN, EventParser as AnchorEventParser } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════
//  Event Data Types
// ═══════════════════════════════════════════════════════════════════

/**
 * Decoded payload for the `RegisteredEvent` emitted when a new agent is registered.
 *
 * @interface RegisteredEventData
 * @name RegisteredEventData
 * @description Contains the agent PDA, owner wallet, display name, capabilities list, and timestamp.
 * @category Events
 * @since v0.1.0
 * @see {@link SapEvent}
 */
export interface RegisteredEventData {
  readonly name: "RegisteredEvent";
  readonly data: {
    agent: PublicKey;
    wallet: PublicKey;
    name: string;
    capabilities: string[];
    timestamp: BN;
  };
}

/**
 * Decoded payload for the `UpdatedEvent` emitted when an agent’s profile is modified.
 *
 * @interface UpdatedEventData
 * @name UpdatedEventData
 * @description Contains the agent PDA, owner wallet, a list of changed field names, and timestamp.
 * @category Events
 * @since v0.1.0
 * @see {@link SapEvent}
 */
export interface UpdatedEventData {
  readonly name: "UpdatedEvent";
  readonly data: {
    agent: PublicKey;
    wallet: PublicKey;
    updatedFields: string[];
    timestamp: BN;
  };
}

/**
 * Decoded payload for the `FeedbackEvent` emitted when a reviewer submits feedback.
 *
 * @interface FeedbackEventData
 * @name FeedbackEventData
 * @description Contains the agent PDA, reviewer wallet, numeric score, tag, and timestamp.
 * @category Events
 * @since v0.1.0
 * @see {@link SapEvent}
 */
export interface FeedbackEventData {
  readonly name: "FeedbackEvent";
  readonly data: {
    agent: PublicKey;
    reviewer: PublicKey;
    score: number;
    tag: string;
    timestamp: BN;
  };
}

/**
 * Decoded payload for the `MemoryInscribedEvent` emitted when data is written to a vault.
 *
 * @interface MemoryInscribedEventData
 * @name MemoryInscribedEventData
 * @description Contains vault/session PDAs, sequence info, encrypted data, nonce, content hash,
 *   fragment metadata, compression flag, and timestamp.
 * @category Events
 * @since v0.1.0
 * @see {@link SapEvent}
 */
export interface MemoryInscribedEventData {
  readonly name: "MemoryInscribedEvent";
  readonly data: {
    vault: PublicKey;
    session: PublicKey;
    sequence: number;
    epochIndex: number;
    encryptedData: number[];
    nonce: number[];
    contentHash: number[];
    totalFragments: number;
    fragmentIndex: number;
    compression: number;
    dataLen: number;
    nonceVersion: number;
    timestamp: BN;
  };
}

/**
 * Decoded payload for the `PaymentSettledEvent` emitted when an escrow settlement occurs.
 *
 * @interface PaymentSettledEventData
 * @name PaymentSettledEventData
 * @description Contains escrow/agent/depositor PDAs, settlement counts, amounts, service hash,
 *   and remaining balance.
 * @category Events
 * @since v0.1.0
 * @see {@link SapEvent}
 */
export interface PaymentSettledEventData {
  readonly name: "PaymentSettledEvent";
  readonly data: {
    escrow: PublicKey;
    agent: PublicKey;
    depositor: PublicKey;
    callsSettled: BN;
    amount: BN;
    serviceHash: number[];
    totalCallsSettled: BN;
    remainingBalance: BN;
    timestamp: BN;
  };
}

/**
 * Decoded payload for the `LedgerEntryEvent` emitted when data is appended to a ledger.
 *
 * @interface LedgerEntryEventData
 * @name LedgerEntryEventData
 * @description Contains session/ledger PDAs, entry index, raw data, content hash,
 *   Merkle root, and timestamp.
 * @category Events
 * @since v0.1.0
 * @see {@link SapEvent}
 */
export interface LedgerEntryEventData {
  readonly name: "LedgerEntryEvent";
  readonly data: {
    session: PublicKey;
    ledger: PublicKey;
    entryIndex: number;
    data: number[];
    contentHash: number[];
    dataLen: number;
    merkleRoot: number[];
    timestamp: BN;
  };
}

/**
 * Discriminated union of all known SAP v2 event types.
 *
 * @name SapEvent
 * @description Use the `name` discriminant to narrow to a specific event payload.
 * @category Events
 * @since v0.1.0
 */
export type SapEvent =
  | RegisteredEventData
  | UpdatedEventData
  | FeedbackEventData
  | MemoryInscribedEventData
  | PaymentSettledEventData
  | LedgerEntryEventData;

// ═══════════════════════════════════════════════════════════════════
//  Event Name Literals
// ═══════════════════════════════════════════════════════════════════

/**
 * Exhaustive list of all SAP v2 event name strings.
 *
 * @name SAP_EVENT_NAMES
 * @description Frozen array of every event discriminant emitted by the program.
 *   Useful for log filtering and exhaustive switch checks.
 * @category Events
 * @since v0.1.0
 * @see {@link SapEventName}
 */
export const SAP_EVENT_NAMES = [
  "RegisteredEvent",
  "UpdatedEvent",
  "DeactivatedEvent",
  "ReactivatedEvent",
  "ClosedEvent",
  "FeedbackEvent",
  "FeedbackUpdatedEvent",
  "FeedbackRevokedEvent",
  "ReputationUpdatedEvent",
  "CallsReportedEvent",
  "VaultInitializedEvent",
  "SessionOpenedEvent",
  "MemoryInscribedEvent",
  "EpochOpenedEvent",
  "SessionClosedEvent",
  "VaultClosedEvent",
  "SessionPdaClosedEvent",
  "EpochPageClosedEvent",
  "VaultNonceRotatedEvent",
  "DelegateAddedEvent",
  "DelegateRevokedEvent",
  "ToolPublishedEvent",
  "ToolSchemaInscribedEvent",
  "ToolUpdatedEvent",
  "ToolDeactivatedEvent",
  "ToolReactivatedEvent",
  "ToolClosedEvent",
  "ToolInvocationReportedEvent",
  "CheckpointCreatedEvent",
  "EscrowCreatedEvent",
  "EscrowDepositedEvent",
  "PaymentSettledEvent",
  "EscrowWithdrawnEvent",
  "BatchSettledEvent",
  "AttestationCreatedEvent",
  "AttestationRevokedEvent",
  "LedgerEntryEvent",
  "LedgerSealedEvent",
] as const;

/**
 * String literal union of all SAP v2 event names.
 *
 * @name SapEventName
 * @description Derived from {@link SAP_EVENT_NAMES} for compile-time exhaustiveness.
 * @category Events
 * @since v0.1.0
 */
export type SapEventName = (typeof SAP_EVENT_NAMES)[number];

// ═══════════════════════════════════════════════════════════════════
//  Event Parser
// ═══════════════════════════════════════════════════════════════════

/**
 * A single parsed event extracted from transaction logs.
 *
 * @interface ParsedEvent
 * @name ParsedEvent
 * @description Lightweight container with a `name` discriminant and untyped `data` record.
 *   Narrow via {@link SapEventName} for type-safe access.
 * @category Events
 * @since v0.1.0
 */
export interface ParsedEvent {
  readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly data: Record<string, any>;
}

/**
 * Typed wrapper around Anchor’s `EventParser` for SAP v2 programs.
 *
 * Extracts strongly-typed {@link ParsedEvent} objects from raw
 * transaction log lines.
 *
 * @name EventParser
 * @description Instantiate with an Anchor `Program` and call {@link EventParser.parseLogs}
 *   to decode events, or {@link EventParser.filterByName} to narrow results.
 * @category Events
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const parser = new EventParser(program);
 * const events = parser.parseLogs(txLogs);
 * const settled = parser.filterByName(events, "PaymentSettledEvent");
 * ```
 */
export class EventParser {
  private readonly parser: AnchorEventParser;

  /**
   * Create a new `EventParser`.
   *
   * @param program - An Anchor `Program` instance whose IDL defines the events to decode.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(program: Program<any>) {
    this.parser = new AnchorEventParser(program.programId, program.coder);
  }

  /**
   * Parse raw transaction log lines into typed events.
   *
   * @param logs - Array of log strings from a confirmed transaction.
   * @returns {ParsedEvent[]} Decoded events found in the logs.
   */
  parseLogs(logs: string[]): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const generator = this.parser.parseLogs(logs);
    for (const event of generator) {
      events.push(event as ParsedEvent);
    }
    return events;
  }

  /**
   * Filter a list of parsed events by event name.
   *
   * @param events - The full array of {@link ParsedEvent} objects to filter.
   * @param name   - The {@link SapEventName} to match against.
   * @returns {ParsedEvent[]} Only events whose `name` matches.
   */
  filterByName<N extends SapEventName>(
    events: ParsedEvent[],
    name: N,
  ): ParsedEvent[] {
    return events.filter((e) => e.name === name);
  }
}
