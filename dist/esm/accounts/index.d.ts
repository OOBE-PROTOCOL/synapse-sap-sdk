import { Connection, PublicKey } from "@solana/web3.js";
import { EscrowAccountV2, PendingSettlement, AgentAccount, AgentStats, AgentStake, DisputeRecord, Subscription } from "../types";
export declare function parseEscrowAccountV2(data: Buffer): EscrowAccountV2;
export declare function fetchEscrowAccountV2(connection: Connection, pubkey: PublicKey): Promise<EscrowAccountV2 | null>;
export declare function parsePendingSettlement(data: Buffer): PendingSettlement;
export declare function parseAgentAccount(data: Buffer): AgentAccount;
export declare function parseAgentStats(data: Buffer): AgentStats;
export declare function parseAgentStake(data: Buffer): AgentStake;
export declare function parseDisputeRecord(data: Buffer): DisputeRecord;
export declare function parseSubscription(data: Buffer): Subscription;
//# sourceMappingURL=index.d.ts.map