// ================================================================
//  synapse-sap-sdk / src/types.ts
//  Shared TypeScript types — 1:1 with on-chain state (v0.3)
// ================================================================

import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

// ── Escrow Layer ──
export enum SettlementSecurity {
  SelfReport    = 0,      // deprecated for new escrows
  CoSigned      = 1,
  DisputeWindow = 2,
}

export interface VolumeCurvePoint {
  afterCalls: number;
  pricePerCall: BN;
}

/** EscrowAccountV2 — matches the on-chain Rust struct. */
export interface EscrowAccountV2 {
  bump: number;
  version: number;
  agent: PublicKey;
  depositor: PublicKey;
  agentWallet: PublicKey;
  escrowNonce: BN;
  balance: BN;
  totalDeposited: BN;
  totalSettled: BN;
  totalCallsSettled: BN;
  pricePerCall: BN;
  maxCalls: BN;
  createdAt: BN;
  lastSettledAt: BN;
  expiresAt: BN;
  volumeCurve: VolumeCurvePoint[];
  tokenMint: PublicKey | null;
  tokenDecimals: number;
  settlementSecurity: SettlementSecurity;
  disputeWindowSlots: BN;
  settlementIndex: BN;
  coSigner: PublicKey | null;
  arbiter: PublicKey | null;
  pendingAmount: BN;
  pendingCalls: BN;
}

export interface PendingSettlement {
  bump: number;
  escrow: PublicKey;
  agent: PublicKey;
  agentWallet: PublicKey;
  depositor: PublicKey;
  settlementIndex: BN;
  callsToSettle: BN;
  amount: BN;
  serviceHash: number[];
  createdAt: BN;
  releaseSlot: BN;
  isFinalized: boolean;
  isDisputed: boolean;
  outcome: DisputeOutcome;
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

// ── Dispute Layer ──
export enum DisputeOutcome {
  Pending      = 0,
  DepositorWins = 1,
  AgentWins    = 2,
  AutoReleased = 3,
}

export interface DisputeRecord {
  bump: number;
  pendingSettlement: PublicKey;
  escrow: PublicKey;
  depositor: PublicKey;
  agent: PublicKey;
  evidenceHash: number[];
  agentEvidenceHash: number[];
  arbiter: PublicKey;
  outcome: DisputeOutcome;
  createdAt: BN;
  resolvedAt: BN;
  resolutionHash: number[];
  slashAmount: BN;
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
  feeBasisPoints: number;
  paused: boolean;
  minStake: BN;
  version: number;
}

// ================================================================
//  Re-exports from types/ sub-modules ( barrel )  
// ================================================================

export type { RegisterAgentArgs } from "./types/instructions";
export type { UpdateAgentArgs } from "./types/instructions";
export type { GiveFeedbackArgs } from "./types/instructions";
export type { UpdateFeedbackArgs } from "./types/instructions";
export type { PublishToolArgs } from "./types/instructions";
export type { UpdateToolArgs } from "./types/instructions";
export type { InscribeToolSchemaArgs } from "./types/instructions";
export type { InscribeMemoryArgs } from "./types/instructions";
export type { CompactInscribeArgs } from "./types/instructions";
export type { CreateEscrowArgs } from "./types/instructions";
export type { CreateAttestationArgs } from "./types/instructions";
export type { CreateEscrowV2Args } from "./types/instructions";
export type { CreateSubscriptionArgs } from "./types/instructions";
export type { DelegatePermissionBit } from "./types/instructions";
export type { SchemaTypeValue } from "./types/instructions";
export type { CompressionTypeValue } from "./types/instructions";

export type { VolumeCurveBreakpoint } from "./types/common";
export type { PricingTier } from "./types/common";
export type { PluginRef } from "./types/common";
export type { Settlement } from "./types/common";

export type { EndpointDescriptor } from "./types/endpoint";
export type { HealthCheckDescriptor } from "./types/endpoint";
export type { ToolManifestEntry } from "./types/endpoint";
export type { AgentManifest } from "./types/endpoint";
export type { EndpointValidationResult } from "./types/endpoint";

export type {
  AgentAccountData,
  AgentStatsData,
  FeedbackAccountData,
  CapabilityIndexData,
  ProtocolIndexData,
  ToolCategoryIndexData,
  GlobalRegistryData,
  MemoryVaultData,
  SessionLedgerData,
  EpochPageData,
  VaultDelegateData,
  SessionCheckpointData,
  ToolDescriptorData,
  EscrowAccountData,
  EscrowAccountV2Data,
  PendingSettlementData,
  DisputeRecordData,
  ReceiptBatchData,
  AgentStakeData,
  SubscriptionData,
  CounterShardData,
  IndexPageData,
  MemoryLedgerData,
  LedgerPageData,
  AgentAttestationData,
} from "./types/accounts";

export type { TokenTypeKind, SettlementModeKind } from "./types/enums";
export { TokenType, SettlementMode } from "./types/enums";
