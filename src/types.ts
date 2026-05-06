// ================================================================
//  synapse-sap-sdk / src/types.ts
//  Shared TypeScript types — 1:1 with on-chain state (v0.13)
// ================================================================

import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

// ── Escrow Layer ──
export enum SettlementSecurity {
  SelfReport    = 0,      // v0.7+ deprecated
  CoSigned      = 1,
  DisputeWindow = 2,
}

export interface VolumeCurvePoint {
  afterCalls: number;
  pricePerCall: BN;
}

/** EscrowAccountV2 — matches on-chain struct after v0.13 hardening */
export interface EscrowAccountV2 {
  // Discriminator + account metadata
  agent: PublicKey;
  depositor: PublicKey;
  // Token
  tokenMint: PublicKey | null;
  decimals: number;
  // Balances
  balance: BN;
  totalDeposited: BN;
  totalSettled: BN;
  totalCallsSettled: BN;
  pendingAmount: BN;
  pendingCalls: BN;
  // Security (v0.13)
  maxObligation: BN;           // H-2: cap on total balance
  disputeBondTotal: BN;        // C-3: tracked dispute bonds
  pendingSettlementCount: number; // C-5: open pending count
  // Config
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

// ── Agent Layer ──
export enum Capability {
  None     = 0b0000,
  Text     = 0b0001,
  Code     = 0b0010,
  Image    = 0b0100,
  Voice    = 0b1000,
  All      = 0b1111,
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
  averageRating: number;  // u32 / 100
  reviewCount: number;
  disputeCount: number;
  disputesLost: number;
  // v0.12 H-1
  activeEscrows: number;
  updatedAt: BN;
}

export interface AgentStake {
  wallet: PublicKey;
  stakedAmount: BN;
  slashedAmount: BN;
  unstakeAmount: BN;       // H-11: pending unstake
  unstakeRequestedAt: BN;
  unstakeAvailableAt: BN;
  totalDisputesLost: number;
  createdAt: BN;
  updatedAt: BN;
}

// ── Dispute Layer ──
export enum DisputeOutcome {
  Pending      = 0,
  DepositorWins = 1,
  AgentWins    = 2,
  Refunded     = 3,
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

// ── Subscription Layer ──
export enum BillingInterval {
  Hourly  = 0,
  Daily   = 1,
  Weekly  = 2,
  Monthly = 3,
  Yearly  = 4,
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
  // v0.13: SPL support placeholder
  tokenMint: PublicKey | null;
  tokenDecimals: number;
}

// ── Receipt Layer ──
export interface ReceiptBatch {
  agent: PublicKey;
  tool: string;
  merkleRoot: Uint8Array;
  count: number;
  createdAt: BN;
}

// ── Vault / Memory Layer ──
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

// ── Tool / Indexing ──
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

// ── On-chain Return Types ──
export interface ProgramConfig {
  admin: PublicKey;
  treasury: PublicKey;
  feeBasisPoints: number;     // u16
  paused: boolean;
  minStake: BN;
  version: number;           // u8
}
