import { TransactionSignature } from "@solana/web3.js";
export interface ParsedEvent {
    name: string;
    data: Record<string, any>;
    signature: TransactionSignature;
    slot: number;
}
/** Parse program logs for emitted events */
export declare function parseEventsFromLogs(logs: string[], signature: string): ParsedEvent[];
/** Fetch + parse events for a given transaction */
export declare function fetchTransactionEvents(connection: any, // Connection
signature: TransactionSignature): Promise<ParsedEvent[]>;
//# sourceMappingURL=index.d.ts.map