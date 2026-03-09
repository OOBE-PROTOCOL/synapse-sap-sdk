/**
 * @module events
 * @description Decode SAP v2 events from transaction logs.
 *
 * Uses Anchor's event parser under the hood.  Provides a
 * strongly-typed, filterable event stream.
 */

import { type Program, BN, EventParser as AnchorEventParser } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

// ── Event Data Types ────────────────────────────────────

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

export interface UpdatedEventData {
  readonly name: "UpdatedEvent";
  readonly data: {
    agent: PublicKey;
    wallet: PublicKey;
    updatedFields: string[];
    timestamp: BN;
  };
}

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

/** Union of all known SAP event types. */
export type SapEvent =
  | RegisteredEventData
  | UpdatedEventData
  | FeedbackEventData
  | MemoryInscribedEventData
  | PaymentSettledEventData
  | LedgerEntryEventData;

// ── Event name literals ─────────────────────────────────

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

export type SapEventName = (typeof SAP_EVENT_NAMES)[number];

// ── Parser Class ────────────────────────────────────────

/**
 * Typed wrapper around Anchor's EventParser.
 *
 * Usage:
 * ```ts
 * const events = client.events.parseLogs(txLogs);
 * for (const event of events) {
 *   if (event.name === "MemoryInscribedEvent") { ... }
 * }
 * ```
 */
export class EventParser {
  private readonly parser: AnchorEventParser;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(program: Program<any>) {
    this.parser = new AnchorEventParser(program.programId, program.coder);
  }

  /**
   * Parse raw transaction log lines into typed events.
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
   * Filter events by name.
   */
  filterByName<N extends SapEventName>(
    events: ParsedEvent[],
    name: N,
  ): ParsedEvent[] {
    return events.filter((e) => e.name === name);
  }
}

/** A parsed event with name and data fields. */
export interface ParsedEvent {
  readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly data: Record<string, any>;
}
