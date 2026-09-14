// Auto-generated from IDL v1.0.3 — regen: `python3 scripts/regen-idl-types.py`
// DO NOT EDIT BY HAND: fields are camelCase to match the BorshCoder that
// @coral-xyz/anchor builds via convertIdlToCamelCase (Program ctor).
// Keep in sync anchor: src/types/common.ts mirrors these shapes with JSDoc.

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface AccountMigratedEvent {
  account: PublicKey;
  accountType: string;
  fromVersion: number;
  toVersion: number;
  timestamp: BN;
}

export interface AgentAccount {
  bump: number;
  version: number;
  wallet: PublicKey;
  name: string;
  description: string;
  agentId: (string | null);
  agentUri: (string | null);
  x402Endpoint: (string | null);
  isActive: boolean;
  createdAt: BN;
  updatedAt: BN;
  reputationScore: number;
  totalFeedbacks: number;
  reputationSum: BN;
  totalCallsServed: BN;
  avgLatencyMs: number;
  uptimePercent: number;
  capabilities: Capability[];
  pricing: PricingTier[];
  protocols: string[];
  activePlugins: PluginRef[];
}

export interface AgentAttestation {
  bump: number;
  agent: PublicKey;
  attester: PublicKey;
  attestationType: string;
  metadataHash: number[];
  isActive: boolean;
  expiresAt: BN;
  createdAt: BN;
  updatedAt: BN;
}

export interface AgentPricingMenu {
  bump: number;
  agent: PublicKey;
  tiers: PricingTier[];
  updatedAt: BN;
}

export interface AgentStake {
  bump: number;
  agent: PublicKey;
  wallet: PublicKey;
  stakedAmount: BN;
  slashedAmount: BN;
  lastStakeAt: BN;
  unstakeRequestedAt: BN;
  unstakeAmount: BN;
  unstakeAvailableAt: BN;
  totalDisputesWon: number;
  totalDisputesLost: number;
  createdAt: BN;
}

export interface AgentStats {
  bump: number;
  agent: PublicKey;
  wallet: PublicKey;
  totalCallsServed: BN;
  isActive: boolean;
  activeEscrows: number;
  updatedAt: BN;
}

export interface AttestationCreatedEvent {
  agent: PublicKey;
  attester: PublicKey;
  attestationType: string;
  expiresAt: BN;
  timestamp: BN;
}

export interface AttestationRevokedEvent {
  agent: PublicKey;
  attester: PublicKey;
  attestationType: string;
  timestamp: BN;
}

export interface BatchSettledEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  numSettlements: number;
  totalCalls: BN;
  totalAmount: BN;
  serviceHashes: number[][];
  callsPerSettlement: BN[];
  remainingBalance: BN;
  timestamp: BN;
}

export type BillingInterval =
  | { Daily: null | Record<string, never> }
  | { Weekly: null | Record<string, never> }
  | { Monthly: null | Record<string, never> }
;

export interface CallsReportedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  callsReported: BN;
  totalCallsServed: BN;
  timestamp: BN;
}

export interface Capability {
  id: string;
  description: (string | null);
  protocolId: (string | null);
  version: (string | null);
}

export interface CapabilityIndex {
  bump: number;
  capabilityId: string;
  capabilityHash: number[];
  agents: PublicKey[];
  totalPages: number;
  lastUpdated: BN;
}

export interface CheckpointCreatedEvent {
  session: PublicKey;
  checkpoint: PublicKey;
  checkpointIndex: number;
  merkleRoot: number[];
  sequenceAt: number;
  epochAt: number;
  timestamp: BN;
}

export interface ClosedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface CoSignedSettlementEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  coSigner: PublicKey;
  callsSettled: BN;
  amount: BN;
  serviceHash: number[];
  timestamp: BN;
}

export interface CounterShard {
  bump: number;
  shardIndex: number;
  totalAgents: BN;
  activeAgents: BN;
  totalFeedbacks: BN;
  totalTools: number;
  totalVaults: number;
  totalAttestations: number;
  totalSettlements: BN;
  totalDisputes: number;
  totalSubscriptions: number;
  lastUpdated: BN;
}

export interface DeactivatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface DelegateAddedEvent {
  vault: PublicKey;
  delegate: PublicKey;
  permissions: number;
  expiresAt: BN;
  timestamp: BN;
}

export interface DelegateRevokedEvent {
  vault: PublicKey;
  delegate: PublicKey;
  timestamp: BN;
}

export interface DisputeAutoResolvedEvent {
  dispute: PublicKey;
  pendingSettlement: PublicKey;
  escrow: PublicKey;
  outcome: number;
  provenCalls: number;
  claimedCalls: number;
  agentAmount: BN;
  depositorAmount: BN;
  slashAmount: BN;
  timestamp: BN;
}

export interface DisputeFiledEvent {
  dispute: PublicKey;
  pendingSettlement: PublicKey;
  escrow: PublicKey;
  depositor: PublicKey;
  agent: PublicKey;
  evidenceHash: number[];
  disputeType: number;
  disputeBond: BN;
  proofDeadline: BN;
  timestamp: BN;
}

export type DisputeOutcome =
  | { Pending: null | Record<string, never> }
  | { DepositorWins: null | Record<string, never> }
  | { AgentWins: null | Record<string, never> }
  | { AutoReleased: null | Record<string, never> }
  | { PartialRefund: null | Record<string, never> }
  | { Split: null | Record<string, never> }
;

export interface DisputeRecord {
  bump: number;
  pendingSettlement: PublicKey;
  escrow: PublicKey;
  depositor: PublicKey;
  agent: PublicKey;
  disputeType: DisputeType;
  evidenceHash: number[];
  agentEvidenceHash: number[];
  outcome: DisputeOutcome;
  resolutionLayer: ResolutionLayer;
  createdAt: BN;
  resolvedAt: BN;
  resolutionHash: number[];
  slashAmount: BN;
  disputeBond: BN;
  provenCalls: number;
  claimedCalls: number;
  proofDeadline: BN;
}

export interface DisputeResolvedEvent {
  dispute: PublicKey;
  pendingSettlement: PublicKey;
  escrow: PublicKey;
  outcome: number;
  slashAmount: BN;
  resolutionHash: number[];
  timestamp: BN;
}

export type DisputeType =
  | { NonDelivery: null | Record<string, never> }
  | { PartialDelivery: null | Record<string, never> }
  | { Overcharge: null | Record<string, never> }
  | { Quality: null | Record<string, never> }
;

export interface EpochOpenedEvent {
  session: PublicKey;
  epochPage: PublicKey;
  epochIndex: number;
  startSequence: number;
  timestamp: BN;
}

export interface EpochPage {
  bump: number;
  session: PublicKey;
  epochIndex: number;
  startSequence: number;
  inscriptionCount: number;
  totalBytes: number;
  firstTs: BN;
  lastTs: BN;
}

export interface EpochPageClosedEvent {
  session: PublicKey;
  epochPage: PublicKey;
  epochIndex: number;
  timestamp: BN;
}

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
  volumeCurve: VolumeCurveBreakpoint[];
  tokenMint: (PublicKey | null);
  tokenDecimals: number;
  settlementSecurity: SettlementSecurity;
  disputeWindowSlots: BN;
  settlementIndex: BN;
  coSigner: (PublicKey | null);
  arbiter: (PublicKey | null);
  pendingAmount: BN;
  pendingCalls: BN;
  receiptBatchCount: number;
  disputeBondTotal: BN;
  maxObligation: BN;
  pendingSettlementCount: number;
}

export interface EscrowClosedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  totalSettled: BN;
  totalCallsSettled: BN;
  timestamp: BN;
}

export interface EscrowCreatedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  pricePerCall: BN;
  maxCalls: BN;
  initialDeposit: BN;
  expiresAt: BN;
  timestamp: BN;
}

export interface EscrowDepositedEvent {
  escrow: PublicKey;
  depositor: PublicKey;
  amount: BN;
  newBalance: BN;
  timestamp: BN;
}

export interface EscrowV2CreatedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  escrowNonce: BN;
  pricePerCall: BN;
  maxCalls: BN;
  initialDeposit: BN;
  settlementSecurity: number;
  disputeWindowSlots: BN;
  coSigner: (PublicKey | null);
  arbiter: (PublicKey | null);
  timestamp: BN;
}

export interface EscrowWithdrawnEvent {
  escrow: PublicKey;
  depositor: PublicKey;
  amount: BN;
  remainingBalance: BN;
  timestamp: BN;
}

export interface FeedbackAccount {
  bump: number;
  agent: PublicKey;
  reviewer: PublicKey;
  score: number;
  tag: string;
  commentHash: number[] | null;
  createdAt: BN;
  updatedAt: BN;
  isRevoked: boolean;
}

export interface FeedbackEvent {
  agent: PublicKey;
  reviewer: PublicKey;
  score: number;
  tag: string;
  timestamp: BN;
}

export interface FeedbackRevokedEvent {
  agent: PublicKey;
  reviewer: PublicKey;
  timestamp: BN;
}

export interface FeedbackUpdatedEvent {
  agent: PublicKey;
  reviewer: PublicKey;
  oldScore: number;
  newScore: number;
  timestamp: BN;
}

export interface GlobalRegistry {
  bump: number;
  totalAgents: BN;
  activeAgents: BN;
  totalFeedbacks: BN;
  totalCapabilities: number;
  totalProtocols: number;
  lastRegisteredAt: BN;
  initializedAt: BN;
  authority: PublicKey;
  totalTools: number;
  totalVaults: number;
  totalEscrows: number;
  totalAttestations: number;
}

export interface IndexPage {
  bump: number;
  parentIndex: PublicKey;
  pageIndex: number;
  entries: PublicKey[];
  lastUpdated: BN;
}

export interface IndexPageCreatedEvent {
  parentIndex: PublicKey;
  indexPage: PublicKey;
  pageIndex: number;
  timestamp: BN;
}

export interface LedgerEntryEvent {
  session: PublicKey;
  ledger: PublicKey;
  entryIndex: number;
  data: number[];
  contentHash: number[];
  dataLen: number;
  merkleRoot: number[];
  timestamp: BN;
}

export interface LedgerPage {
  bump: number;
  ledger: PublicKey;
  pageIndex: number;
  sealedAt: BN;
  entriesInPage: number;
  dataSize: number;
  merkleRootAtSeal: number[];
  data: number[];
}

export interface LedgerSealedEvent {
  session: PublicKey;
  ledger: PublicKey;
  page: PublicKey;
  pageIndex: number;
  entriesInPage: number;
  dataSize: number;
  merkleRootAtSeal: number[];
  timestamp: BN;
}

export interface MemoryInscribedEvent {
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
}

export interface MemoryLedger {
  bump: number;
  session: PublicKey;
  authority: PublicKey;
  numEntries: number;
  merkleRoot: number[];
  latestHash: number[];
  totalDataSize: BN;
  createdAt: BN;
  updatedAt: BN;
  numPages: number;
  ring: number[];
}

export interface MemoryVault {
  bump: number;
  agent: PublicKey;
  wallet: PublicKey;
  vaultNonce: number[];
  totalSessions: number;
  totalInscriptions: BN;
  totalBytesInscribed: BN;
  createdAt: BN;
  protocolVersion: number;
  nonceVersion: number;
  lastNonceRotation: BN;
}

export interface PaymentSettledEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  callsSettled: BN;
  amount: BN;
  serviceHash: number[];
  totalCallsSettled: BN;
  remainingBalance: BN;
  timestamp: BN;
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
  receiptMerkleRoot: number[];
  createdAt: BN;
  releaseSlot: BN;
  isFinalized: boolean;
  isDisputed: boolean;
  outcome: DisputeOutcome;
}

export interface PluginRef {
  pluginType: PluginType;
  pda: PublicKey;
}

export type PluginType =
  | { Memory: null | Record<string, never> }
  | { Validation: null | Record<string, never> }
  | { Delegation: null | Record<string, never> }
  | { Analytics: null | Record<string, never> }
  | { Governance: null | Record<string, never> }
  | { Custom: null | Record<string, never> }
;

export interface PricingMenuMigratedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  pricingMenu: PublicKey;
  tierCount: number;
  timestamp: BN;
}

export interface PricingTier {
  tierId: string;
  pricePerCall: BN;
  minPricePerCall: (BN | null);
  maxPricePerCall: (BN | null);
  rateLimit: number;
  maxCallsPerSession: number;
  burstLimit: (number | null);
  tokenType: TokenType;
  tokenMint: (PublicKey | null);
  tokenDecimals: (number | null);
  settlementMode: (SettlementMode | null);
  minEscrowDeposit: (BN | null);
  batchIntervalSec: (number | null);
  volumeCurve: VolumeCurveBreakpoint[] | null;
}

export interface ProtocolIndex {
  bump: number;
  protocolId: string;
  protocolHash: number[];
  agents: PublicKey[];
  totalPages: number;
  lastUpdated: BN;
}

export interface ReactivatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface ReceiptBatch {
  bump: number;
  escrow: PublicKey;
  batchIndex: number;
  merkleRoot: number[];
  callCount: number;
  periodStart: BN;
  periodEnd: BN;
  inscribedAt: BN;
}

export interface ReceiptBatchInscribedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  batchIndex: number;
  merkleRoot: number[];
  callCount: number;
  periodStart: BN;
  periodEnd: BN;
  timestamp: BN;
}

export interface ReceiptProofSubmittedEvent {
  dispute: PublicKey;
  escrow: PublicKey;
  agent: PublicKey;
  receiptsSubmitted: number;
  receiptsVerified: number;
  totalProven: number;
  timestamp: BN;
}

export interface RegisteredEvent {
  agent: PublicKey;
  wallet: PublicKey;
  name: string;
  capabilities: string[];
  timestamp: BN;
}

export interface ReputationUpdatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  avgLatencyMs: number;
  uptimePercent: number;
  timestamp: BN;
}

export type ResolutionLayer =
  | { Pending: null | Record<string, never> }
  | { Auto: null | Record<string, never> }
  | { Governance: null | Record<string, never> }
;

export interface SessionCheckpoint {
  bump: number;
  session: PublicKey;
  checkpointIndex: number;
  merkleRoot: number[];
  sequenceAt: number;
  epochAt: number;
  totalBytesAt: BN;
  inscriptionsAt: BN;
  createdAt: BN;
}

export interface SessionClosedEvent {
  vault: PublicKey;
  session: PublicKey;
  totalInscriptions: number;
  totalBytes: BN;
  totalEpochs: number;
  timestamp: BN;
}

export interface SessionLedger {
  bump: number;
  vault: PublicKey;
  sessionHash: number[];
  sequenceCounter: number;
  totalBytes: BN;
  currentEpoch: number;
  totalEpochs: number;
  createdAt: BN;
  lastInscribedAt: BN;
  isClosed: boolean;
  merkleRoot: number[];
  totalCheckpoints: number;
  tipHash: number[];
}

export interface SessionOpenedEvent {
  vault: PublicKey;
  session: PublicKey;
  sessionHash: number[];
  timestamp: BN;
}

export interface SessionPdaClosedEvent {
  vault: PublicKey;
  session: PublicKey;
  totalInscriptions: number;
  totalBytes: BN;
  timestamp: BN;
}

export interface SettlementFinalizedEvent {
  pendingSettlement: PublicKey;
  escrow: PublicKey;
  agent: PublicKey;
  amount: BN;
  callsSettled: BN;
  timestamp: BN;
}

export type SettlementMode =
  | { Instant: null | Record<string, never> }
  | { Escrow: null | Record<string, never> }
  | { Batched: null | Record<string, never> }
  | { X402: null | Record<string, never> }
;

export interface SettlementPendingEvent {
  pendingSettlement: PublicKey;
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  settlementIndex: BN;
  callsToSettle: BN;
  amount: BN;
  serviceHash: number[];
  releaseSlot: BN;
  timestamp: BN;
}

export type SettlementSecurity =
  | { SelfReport: null | Record<string, never> }
  | { CoSigned: null | Record<string, never> }
  | { DisputeWindow: null | Record<string, never> }
;

export interface ShardInitializedEvent {
  shard: PublicKey;
  shardIndex: number;
  timestamp: BN;
}

export interface StakeClosedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  returnedLamports: BN;
  timestamp: BN;
}

export interface StakeDepositedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  amount: BN;
  totalStaked: BN;
  timestamp: BN;
}

export interface StakeSlashedEvent {
  agent: PublicKey;
  dispute: PublicKey;
  slashAmount: BN;
  remainingStaked: BN;
  compensatedTo: PublicKey;
  timestamp: BN;
}

export interface Subscription {
  bump: number;
  agent: PublicKey;
  subscriber: PublicKey;
  agentWallet: PublicKey;
  subId: BN;
  pricePerInterval: BN;
  billingInterval: BillingInterval;
  tokenMint: (PublicKey | null);
  tokenDecimals: number;
  balance: BN;
  totalPaid: BN;
  intervalsPaid: number;
  startedAt: BN;
  lastClaimedAt: BN;
  cancelledAt: BN;
  nextDueAt: BN;
  createdAt: BN;
}

export interface SubscriptionCancelledEvent {
  subscription: PublicKey;
  agent: PublicKey;
  subscriber: PublicKey;
  refundAmount: BN;
  intervalsUsed: number;
  timestamp: BN;
}

export interface SubscriptionClaimedEvent {
  subscription: PublicKey;
  agent: PublicKey;
  subscriber: PublicKey;
  amount: BN;
  intervalsPaid: number;
  remainingBalance: BN;
  timestamp: BN;
}

export interface SubscriptionCreatedEvent {
  subscription: PublicKey;
  agent: PublicKey;
  subscriber: PublicKey;
  subId: BN;
  pricePerInterval: BN;
  billingInterval: number;
  initialDeposit: BN;
  timestamp: BN;
}

export type TokenType =
  | { Sol: null | Record<string, never> }
  | { Usdc: null | Record<string, never> }
  | { Spl: null | Record<string, never> }
;

export type ToolCategory =
  | { Swap: null | Record<string, never> }
  | { Lend: null | Record<string, never> }
  | { Stake: null | Record<string, never> }
  | { Nft: null | Record<string, never> }
  | { Payment: null | Record<string, never> }
  | { Data: null | Record<string, never> }
  | { Governance: null | Record<string, never> }
  | { Bridge: null | Record<string, never> }
  | { Analytics: null | Record<string, never> }
  | { Custom: null | Record<string, never> }
;

export interface ToolCategoryIndex {
  bump: number;
  category: number;
  tools: PublicKey[];
  totalPages: number;
  lastUpdated: BN;
}

export interface ToolClosedEvent {
  agent: PublicKey;
  tool: PublicKey;
  toolName: string;
  totalInvocations: BN;
  timestamp: BN;
}

export interface ToolDeactivatedEvent {
  agent: PublicKey;
  tool: PublicKey;
  toolName: string;
  timestamp: BN;
}

export interface ToolDescriptor {
  bump: number;
  agent: PublicKey;
  toolNameHash: number[];
  toolName: string;
  protocolHash: number[];
  version: number;
  descriptionHash: number[];
  inputSchemaHash: number[];
  outputSchemaHash: number[];
  httpMethod: ToolHttpMethod;
  category: ToolCategory;
  paramsCount: number;
  requiredParams: number;
  isCompound: boolean;
  isActive: boolean;
  totalInvocations: BN;
  createdAt: BN;
  updatedAt: BN;
  previousVersion: PublicKey;
}

export type ToolHttpMethod =
  | { Get: null | Record<string, never> }
  | { Post: null | Record<string, never> }
  | { Put: null | Record<string, never> }
  | { Delete: null | Record<string, never> }
  | { Compound: null | Record<string, never> }
;

export interface ToolInvocationReportedEvent {
  agent: PublicKey;
  tool: PublicKey;
  invocationsReported: BN;
  totalInvocations: BN;
  timestamp: BN;
}

export interface ToolPublishedEvent {
  agent: PublicKey;
  tool: PublicKey;
  toolName: string;
  protocolHash: number[];
  version: number;
  httpMethod: number;
  category: number;
  paramsCount: number;
  requiredParams: number;
  isCompound: boolean;
  timestamp: BN;
}

export interface ToolReactivatedEvent {
  agent: PublicKey;
  tool: PublicKey;
  toolName: string;
  timestamp: BN;
}

export interface ToolSchemaInscribedEvent {
  agent: PublicKey;
  tool: PublicKey;
  toolName: string;
  schemaType: number;
  schemaData: number[];
  schemaHash: number[];
  compression: number;
  version: number;
  timestamp: BN;
}

export interface ToolUpdatedEvent {
  agent: PublicKey;
  tool: PublicKey;
  toolName: string;
  oldVersion: number;
  newVersion: number;
  timestamp: BN;
}

export interface UnstakeCancelledEvent {
  agent: PublicKey;
  wallet: PublicKey;
  cancelledAmount: BN;
  timestamp: BN;
}

export interface UnstakeCompletedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  amount: BN;
  remainingStaked: BN;
  timestamp: BN;
}

export interface UnstakeRequestedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  amount: BN;
  availableAt: BN;
  timestamp: BN;
}

export interface UpdatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  updatedFields: string[];
  timestamp: BN;
}

export interface VaultClosedEvent {
  vault: PublicKey;
  agent: PublicKey;
  wallet: PublicKey;
  totalSessions: number;
  totalInscriptions: BN;
  timestamp: BN;
}

export interface VaultDelegate {
  bump: number;
  vault: PublicKey;
  delegate: PublicKey;
  permissions: number;
  expiresAt: BN;
  createdAt: BN;
}

export interface VaultInitializedEvent {
  agent: PublicKey;
  vault: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface VaultNonceRotatedEvent {
  vault: PublicKey;
  wallet: PublicKey;
  oldNonce: number[];
  newNonce: number[];
  nonceVersion: number;
  timestamp: BN;
}

export interface VolumeCurveBreakpoint {
  afterCalls: number;
  pricePerCall: BN;
}

// ── Events (event parser DTOs) ──

export interface AccountMigratedEvent {
}

export interface AttestationCreatedEvent {
}

export interface AttestationRevokedEvent {
}

export interface BatchSettledEvent {
}

export interface CallsReportedEvent {
}

export interface CheckpointCreatedEvent {
}

export interface ClosedEvent {
}

export interface CoSignedSettlementEvent {
}

export interface DeactivatedEvent {
}

export interface DelegateAddedEvent {
}

export interface DelegateRevokedEvent {
}

export interface DisputeAutoResolvedEvent {
}

export interface DisputeFiledEvent {
}

export interface DisputeResolvedEvent {
}

export interface EpochOpenedEvent {
}

export interface EpochPageClosedEvent {
}

export interface EscrowClosedEvent {
}

export interface EscrowCreatedEvent {
}

export interface EscrowDepositedEvent {
}

export interface EscrowV2CreatedEvent {
}

export interface EscrowWithdrawnEvent {
}

export interface FeedbackEvent {
}

export interface FeedbackRevokedEvent {
}

export interface FeedbackUpdatedEvent {
}

export interface IndexPageCreatedEvent {
}

export interface LedgerEntryEvent {
}

export interface LedgerSealedEvent {
}

export interface MemoryInscribedEvent {
}

export interface PaymentSettledEvent {
}

export interface PricingMenuMigratedEvent {
}

export interface ReactivatedEvent {
}

export interface ReceiptBatchInscribedEvent {
}

export interface ReceiptProofSubmittedEvent {
}

export interface RegisteredEvent {
}

export interface ReputationUpdatedEvent {
}

export interface SessionClosedEvent {
}

export interface SessionOpenedEvent {
}

export interface SessionPdaClosedEvent {
}

export interface SettlementFinalizedEvent {
}

export interface SettlementPendingEvent {
}

export interface ShardInitializedEvent {
}

export interface StakeClosedEvent {
}

export interface StakeDepositedEvent {
}

export interface StakeSlashedEvent {
}

export interface SubscriptionCancelledEvent {
}

export interface SubscriptionClaimedEvent {
}

export interface SubscriptionCreatedEvent {
}

export interface ToolClosedEvent {
}

export interface ToolDeactivatedEvent {
}

export interface ToolInvocationReportedEvent {
}

export interface ToolPublishedEvent {
}

export interface ToolReactivatedEvent {
}

export interface ToolSchemaInscribedEvent {
}

export interface ToolUpdatedEvent {
}

export interface UnstakeCancelledEvent {
}

export interface UnstakeCompletedEvent {
}

export interface UnstakeRequestedEvent {
}

export interface UpdatedEvent {
}

export interface VaultClosedEvent {
}

export interface VaultInitializedEvent {
}

export interface VaultNonceRotatedEvent {
}

// ── Program error names (by numeric code) ──
export const SAP_ERROR_NAMES: Record<number, string> = {
  6000: "NameTooLong",
  6001: "DescriptionTooLong",
  6002: "UriTooLong",
  6003: "TooManyCapabilities",
  6004: "TooManyPricingTiers",
  6005: "TooManyProtocols",
  6006: "TooManyPlugins",
  6007: "AlreadyActive",
  6008: "AlreadyInactive",
  6009: "InvalidFeedbackScore",
  6010: "TagTooLong",
  6011: "SelfReviewNotAllowed",
  6012: "FeedbackAlreadyRevoked",
  6013: "CapabilityIndexFull",
  6014: "ProtocolIndexFull",
  6015: "AgentNotInIndex",
  6016: "InvalidCapabilityHash",
  6017: "InvalidProtocolHash",
  6018: "InvalidPluginType",
  6019: "ChunkDataTooLarge",
  6020: "ContentTypeTooLong",
  6021: "IpfsCidTooLong",
  6022: "EmptyName",
  6023: "ControlCharInName",
  6024: "EmptyDescription",
  6025: "AgentIdTooLong",
  6026: "InvalidCapabilityFormat",
  6027: "DuplicateCapability",
  6028: "EmptyTierId",
  6029: "DuplicateTierId",
  6030: "InvalidRateLimit",
  6031: "SplRequiresTokenMint",
  6032: "InvalidX402Endpoint",
  6033: "InvalidVolumeCurve",
  6034: "TooManyVolumeCurvePoints",
  6035: "MinPriceExceedsMax",
  6036: "InvalidUptimePercent",
  6037: "SessionClosed",
  6038: "InvalidSequence",
  6039: "InvalidFragmentIndex",
  6040: "InscriptionTooLarge",
  6041: "EmptyInscription",
  6042: "InvalidTotalFragments",
  6043: "EpochMismatch",
  6044: "VaultNotClosed",
  6045: "SessionNotClosed",
  6046: "DelegateExpired",
  6047: "InvalidDelegate",
  6048: "ToolNameTooLong",
  6049: "EmptyToolName",
  6050: "InvalidToolNameHash",
  6051: "InvalidToolHttpMethod",
  6052: "InvalidToolCategory",
  6053: "ToolAlreadyInactive",
  6054: "ToolAlreadyActive",
  6055: "InvalidSchemaHash",
  6056: "InvalidSchemaType",
  6057: "InvalidCheckpointIndex",
  6058: "FeedbackNotRevoked",
  6059: "IndexNotEmpty",
  6060: "SessionStillOpen",
  6061: "NoFieldsToUpdate",
  6062: "InsufficientEscrowBalance",
  6063: "EscrowMaxCallsExceeded",
  6064: "EscrowEmpty",
  6065: "EscrowNotEmpty",
  6066: "InvalidSettlementCalls",
  6067: "AttestationTypeTooLong",
  6068: "EmptyAttestationType",
  6069: "SelfAttestationNotAllowed",
  6070: "AttestationAlreadyRevoked",
  6071: "AttestationNotRevoked",
  6072: "ToolCategoryIndexFull",
  6073: "ToolNotInCategoryIndex",
  6074: "ToolCategoryMismatch",
  6075: "ArithmeticOverflow",
  6076: "EscrowExpired",
  6077: "AgentInactive",
  6078: "AttestationExpired",
  6079: "BufferFull",
  6080: "BufferDataTooLarge",
  6081: "Unauthorized",
  6082: "InvalidSession",
  6083: "EmptyDigestHash",
  6084: "LedgerDataTooLarge",
  6085: "LedgerRingEmpty",
  6086: "BatchEmpty",
  6087: "BatchTooLarge",
  6088: "SplTokenRequired",
  6089: "InvalidTokenAccount",
  6090: "InvalidTokenProgram",
  6091: "InvalidPaymentToken",
  6092: "InvalidSettlementSecurity",
  6093: "CoSignerRequired",
  6094: "InvalidCoSigner",
  6095: "InvalidArbiter",
  6096: "ArbiterRequired",
  6097: "EscrowNonceReused",
  6098: "SettlementNotPending",
  6099: "SettlementAlreadyFinalized",
  6100: "DisputeWindowNotExpired",
  6101: "DisputeWindowExpired",
  6102: "NotDepositor",
  6103: "DisputeAlreadyFiled",
  6104: "DisputeStillOpen",
  6105: "NotArbiter",
  6106: "InvalidDisputeOutcome",
  6107: "StakeBelowMinimum",
  6108: "NoStakeAccount",
  6109: "UnstakeAlreadyPending",
  6110: "UnstakeCooldownNotMet",
  6111: "NoUnstakePending",
  6112: "SlashExceedsStake",
  6113: "SubscriptionAlreadyActive",
  6114: "SubscriptionCancelled",
  6115: "NoIntervalDue",
  6116: "SubscriptionInsufficientBalance",
  6117: "InvalidBillingInterval",
  6118: "InvalidShardIndex",
  6119: "IndexPageFull",
  6120: "InvalidPageIndex",
  6121: "IndexPageNotEmpty",
  6122: "AlreadyMigrated",
  6123: "MigrationV1Only",
  6124: "SettlementDisputed",
  6125: "InvalidAgentWallet",
  6126: "StakeAgentMismatch",
  6127: "NotAuthority",
  6128: "UnstakeBelowRent",
  6129: "InsufficientStake",
  6130: "SelfReportDeprecated",
  6131: "ArbiterDeprecated",
  6132: "InvalidBatchIndex",
  6133: "InvalidPeriod",
  6134: "InvalidDisputeType",
  6135: "ProofDeadlineExpired",
  6136: "ProofDeadlineNotExpired",
  6137: "InvalidReceiptProof",
  6138: "SettlementReplay",
  6139: "PaymentTokenNotAllowed",
  6140: "AgentStakeRequired",
  6141: "DelegateExpiryInvalid",
  6142: "EscrowNotClosed",
  6143: "VolumeCurveNotDescending",
  6144: "DuplicateServiceHash",
  6145: "StakeBelowCoverage",
  6146: "StakeNotClosable",
  6147: "AgentStakeAccountMissing",
  6148: "PricingTierNotFound",
  6149: "AgentStatsMigrationRequired",
  6150: "InvalidPricingMenu",
  6151: "MaxCallsPerSettlementExceeded",
  6152: "InvalidVolumeCurvePrice",
  6153: "EscrowCoverageExceeded",
  6154: "CoSignerIsAgentWallet",
  6155: "EscrowAlreadyExpired",
  6156: "PendingSettlementExists",
  6157: "TokenAccountOwnerMismatch",
  6158: "InvalidTreasury",
  6159: "PendingSettlementRequired",
  6160: "InvalidPendingSettlement",
  6161: "PendingSettlementDeprecated",
  6162: "MaxReceiptProofExceeded",
  6163: "MaxMerkleDepthExceeded",
  6164: "PendingAmountMismatch",
  6165: "StakeSlashLocksUnstake",
  6166: "InvalidPricePerCall",
  6167: "SubscriptionIntervalOverflow",
  6168: "AgentStatsVersionMismatch",
  6169: "EscrowVersionMismatch",
  6170: "ReceiptProofAlreadySubmitted",
  6171: "DuplicateReceiptProof",
  6172: "MissingReceiptSignature",
  6173: "AgentCapabilityMismatch",
  6174: "AgentProtocolMismatch",
  6175: "InvalidToolParameterCount",
  6176: "ActiveEscrowCounterUnderflow",
};

