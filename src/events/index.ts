// ================================================================
//  synapse-sap-sdk / src/events/index.ts
//  All program event parsers
// ================================================================

import { PublicKey, TransactionSignature } from "@solana/web3.js";

export interface ParsedEvent {
  name: string;
  data: Record<string, any>;
  signature: TransactionSignature;
  slot: number;
}

const EVENT_DISCRIMS: Record<string, Uint8Array> = {
  EscrowCreated: new Uint8Array([0]),
  SettlementFiled: new Uint8Array([0]),
  SettlementFinalized: new Uint8Array([0]),
  DisputeFiled: new Uint8Array([0]),
  DisputeResolved: new Uint8Array([0]),
  StakeEvent: new Uint8Array([0]),
  SubscriptionEvent: new Uint8Array([0]),
};

/** Parse program logs for emitted events */
export function parseEventsFromLogs(
  logs: string[],
  signature: string
): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  for (const log of logs) {
    if (!log.includes("Program log:")) continue;
    const payload = log.replace(/^Program log:\s*/, "");
    // Anchor event format: "Event <name> <base64encoded>"
    for (const [name, _discrim] of Object.entries(EVENT_DISCRIMS)) {
      if (payload.startsWith(`Event ${name} `)) {
        const b64 = payload.slice(`Event ${name} `.length);
        // TODO: full Borsh deserialization for each event schema
        events.push({ name, data: { raw: b64 }, signature, slot: 0 });
      }
    }
  }
  return events;
}

/** Fetch + parse events for a given transaction */
export async function fetchTransactionEvents(
  connection: any, // Connection
  signature: TransactionSignature
): Promise<ParsedEvent[]> {
  const tx = await connection.getTransaction(signature, { commitment: "confirmed" });
  if (!tx || !tx.meta?.logMessages) return [];
  return parseEventsFromLogs(tx.meta.logMessages, signature);
}
