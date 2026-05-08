// ================================================================
//  synapse-sap-sdk / src/events/index.ts
//  All program event parsers
// ================================================================

import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

export type SapEventName =
  | "EscrowCreated"
  | "SettlementFiled"
  | "SettlementFinalized"
  | "DisputeFiled"
  | "DisputeResolved"
  | "StakeEvent"
  | "SubscriptionEvent";

export interface ParsedEvent {
  name: SapEventName;
  data: Record<string, unknown>;
  signature: TransactionSignature;
  slot: number;
}

export class EventParser {
  constructor(private program: Program) {}

  parseLogs(logs: string[]): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    for (const log of logs) {
      if (!log.includes("Program log:")) continue;
      const payload = log.replace(/^Program log:\s*/, "");
      for (const name of [
        "EscrowCreated",
        "SettlementFiled",
        "SettlementFinalized",
        "DisputeFiled",
        "DisputeResolved",
        "StakeEvent",
        "SubscriptionEvent",
      ] as SapEventName[]) {
        if (payload.startsWith(`Event ${name} `)) {
          const b64 = payload.slice(`Event ${name} `.length);
          events.push({ name, data: { raw: b64 }, signature: "", slot: 0 });
        }
      }
    }
    return events;
  }
}

export function parseEventsFromLogs(
  logs: string[],
  signature: TransactionSignature
): ParsedEvent[] {
  const parser = new EventParser({} as Program);
  return parser.parseLogs(logs).map((e) => ({ ...e, signature }));
}

export async function fetchTransactionEvents(
  connection: any,
  signature: TransactionSignature
): Promise<ParsedEvent[]> {
  const tx = await connection.getTransaction(signature, { commitment: "confirmed" });
  if (!tx || !tx.meta?.logMessages) return [];
  return parseEventsFromLogs(tx.meta.logMessages, signature);
}
