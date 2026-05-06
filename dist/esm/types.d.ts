import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
export declare enum SettlementSecurity {
    SelfReport = 0,// v0.7+ deprecated
    CoSigned = 1,
    DisputeWindow = 2
}
export interface VolumeCurvePoint {
    afterCalls: number;
    pricePerCall: BN;
}
/** EscrowAccountV2 — matches on-chain struct after v0.13 hardening */
export interface EscrowAccountV2 {
    agent: PublicKey;
    depositor: PublicKey;
    tokenMint: PublicKey | null;
    decimals: number;
    balance: BN;
    totalDeposited: BN;
    totalSettled: BN;
    totalCallsSettled: BN;
    pendingAmount: BN;
    pendingCalls: BN;
    maxObligation: BN;
    disputeBondTotal: BN;
    pendingSettlementCount: number;
    pricePerCall: BN;
    basePrice: BN;
    maxCalls: BN;
    volumeCurve: VolumeCurvePoint[];
    settlementSecurity: SettlementSecurity;
    coSigner: PublicKey | null;
    arbiter: PublicKey | null;
    disputeWindowSlots: number;
    finalized: boolean;
    createdAt: BN;
    expiresAt: BN;
    lastSettledAt: BN;
    settlementIndex: BN;
    escrowNonce: number;
    bump: number;
}
export interface PendingSettlement {
    escrow: PublicKey;
    depositor: PublicKey;
    agent: PublicKey;
    amount: BN;
    calls: BN;
    settlementIndex: BN;
    filedSlot: BN;
    releaseSlot: BN;
    isDisputed: boolean;
    finalized: boolean;
    bump: number;
}
export interface SettlementEvent {
    escrow: PublicKey;
    agent: PublicKey;
    depositor: PublicKey;
    amount: BN;
    callsSettled: BN;
    settlementIndex: BN;
    timestamp: BN;
}
export declare enum Capability {
    None = 0,
    Text = 1,
    Code = 2,
    Image = 4,
    Voice = 8,
    All = 15
}
export interface AgentAccount {
    wallet: PublicKey;
    name: string;
    endpointUri: string;
    publicDidDocHash?: string;
    capabilities: Capability;
    isOpen: boolean;
    totalCallsServed: BN;
    createdAt: BN;
    updatedAt: BN;
}
export interface AgentStats {
    wallet: PublicKey;
    totalCallsServed: BN;
    lifetimeRevenue: BN;
    averageRating: number;
    reviewCount: number;
    disputeCount: number;
    disputesLost: number;
    activeEscrows: number;
    updatedAt: BN;
}
export interface AgentStake {
    wallet: PublicKey;
    stakedAmount: BN;
    slashedAmount: BN;
    unstakeAmount: BN;
    unstakeRequestedAt: BN;
    unstakeAvailableAt: BN;
    totalDisputesLost: number;
    createdAt: BN;
    updatedAt: BN;
}
export declare enum DisputeOutcome {
    Pending = 0,
    DepositorWins = 1,
    AgentWins = 2,
    Refunded = 3
}
export interface DisputeRecord {
    escrow: PublicKey;
    depositor: PublicKey;
    agent: PublicKey;
    settlementIndex: BN;
    amount: BN;
    bondAmount: BN;
    receiptRoot: Uint8Array;
    filedAt: BN;
    proofDeadline: BN;
    outcome: DisputeOutcome;
    arbiter: PublicKey | null;
    settledAt: BN;
    bump: number;
}
export declare enum BillingInterval {
    Hourly = 0,
    Daily = 1,
    Weekly = 2,
    Monthly = 3,
    Yearly = 4
}
export interface Subscription {
    agent: PublicKey;
    subscriber: PublicKey;
    balance: BN;
    totalPaid: BN;
    pricePerInterval: BN;
    intervalsPaid: number;
    billingInterval: BillingInterval;
    lastClaimedAt: BN;
    nextDueAt: BN;
    startedAt: BN;
    cancelledAt: BN;
    createdAt: BN;
    tokenMint: PublicKey | null;
    tokenDecimals: number;
}
export interface ReceiptBatch {
    agent: PublicKey;
    tool: string;
    merkleRoot: Uint8Array;
    count: number;
    createdAt: BN;
}
export interface MemoryVault {
    agent: PublicKey;
    totalInscriptions: BN;
    delegateCount: number;
    createdAt: BN;
    updatedAt: BN;
}
export interface VaultDelegate {
    vault: PublicKey;
    delegate: PublicKey;
    permissions: number;
    expiresAt: BN;
    bump: number;
}
export interface SessionLedger {
    session: BN;
    inscriptions: BN;
    fragments: number;
    lastSequence: number;
    updatedAt: BN;
}
export interface EpochPage {
    vault: PublicKey;
    epoch: BN;
    entries: number;
    sizeBytes: number;
    full: boolean;
    bump: number;
}
export interface ToolRegistryEntry {
    agent: PublicKey;
    name: string;
    description: string;
    category: number;
    capability: number;
    toolPda: PublicKey;
    createdAt: BN;
}
export interface CapabilityIndex {
    capabilityHash: Uint8Array;
    count: number;
    agents: PublicKey[];
}
export interface ProgramConfig {
    admin: PublicKey;
    treasury: PublicKey;
    feeBasisPoints: number;
    paused: boolean;
    minStake: BN;
    version: number;
}
//# sourceMappingURL=types.d.ts.map