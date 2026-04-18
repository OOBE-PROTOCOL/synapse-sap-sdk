/**
 * @module types/accounts
 * @description Deserialized on-chain account data interfaces.
 *
 * Every interface mirrors the corresponding Rust struct exactly.
 * Anchor deserializes PDA accounts into these shapes.
 *
 * @category Types
 * @since v0.1.0
 */

import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import type { ToolHttpMethodKind, ToolCategoryKind, SettlementSecurityKind, DisputeOutcomeKind, BillingIntervalKind, ResolutionLayerKind } from "./enums";
import type { Capability, PricingTier, PluginRef, VolumeCurveBreakpoint } from "./common";

// ═══════════════════════════════════════════════════════════════════
//  Agent
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface AgentAccountData
 * @description Core agent identity PDA.
 *
 * Stores the agent's profile, reputation metrics, pricing tiers,
 * capabilities, and active plugin references. This is the primary
 * on-chain identity anchor for every registered agent.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link AgentStatsData} for the lightweight hot-path metrics companion.
 */
export interface AgentAccountData {
  /** PDA bump seed. */
  readonly bump: number;
  /** Account schema version for migrations. */
  readonly version: number;
  /** Owner wallet that controls this agent. */
  readonly wallet: PublicKey;
  /** Human-readable agent name. */
  readonly name: string;
  /** Human-readable agent description. */
  readonly description: string;
  /** Off-chain agent identifier (e.g. DID or UUID). */
  readonly agentId: string | null;
  /** URI pointing to extended agent metadata (JSON). */
  readonly agentUri: string | null;
  /** x402 payment endpoint URL. */
  readonly x402Endpoint: string | null;
  /** Whether the agent is currently accepting calls. */
  readonly isActive: boolean;
  /** Unix timestamp of agent registration. */
  readonly createdAt: BN;
  /** Unix timestamp of the last profile update. */
  readonly updatedAt: BN;
  /** Computed reputation score (0–100). */
  readonly reputationScore: number;
  /** Total number of feedbacks received. */
  readonly totalFeedbacks: number;
  /** Raw sum of all feedback scores (used for averaging). */
  readonly reputationSum: BN;
  /** Lifetime calls served counter. */
  readonly totalCallsServed: BN;
  /** Average latency in milliseconds. */
  readonly avgLatencyMs: number;
  /** Uptime percentage (0–100). */
  readonly uptimePercent: number;
  /** Declared capabilities for discovery indexing. */
  readonly capabilities: Capability[];
  /** Active pricing tiers. */
  readonly pricing: PricingTier[];
  /** Supported protocol identifiers. */
  readonly protocols: string[];
  /** Currently enabled plugin references. */
  readonly activePlugins: PluginRef[];
}

/**
 * @interface AgentStatsData
 * @description Lightweight hot-path metrics PDA for an agent.
 *
 * This account is separated from the main {@link AgentAccountData} to
 * minimize the compute cost of frequent counter updates.
 *
 * @category Types
 * @since v0.1.0
 */
export interface AgentStatsData {
  /** PDA bump seed. */
  readonly bump: number;
  /** Agent PDA this stats account tracks. */
  readonly agent: PublicKey;
  /** Owner wallet. */
  readonly wallet: PublicKey;
  /** Lifetime calls served counter. */
  readonly totalCallsServed: BN;
  /** Whether the agent is currently active. */
  readonly isActive: boolean;
  /** Unix timestamp of the last update. */
  readonly updatedAt: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Reputation
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface FeedbackAccountData
 * @description Trustless reputation entry PDA.
 *
 * Each feedback is a unique PDA keyed by `[agent, reviewer]` preventing
 * duplicate reviews. Scores contribute to the agent's aggregate reputation.
 *
 * @category Types
 * @since v0.1.0
 */
export interface FeedbackAccountData {
  /** PDA bump seed. */
  readonly bump: number;
  /** Agent PDA this feedback targets. */
  readonly agent: PublicKey;
  /** Wallet of the reviewer who submitted the feedback. */
  readonly reviewer: PublicKey;
  /** Reputation score (1–100). */
  readonly score: number;
  /** Freeform tag / category for the feedback. */
  readonly tag: string;
  /** Optional SHA-256 hash of an off-chain comment. */
  readonly commentHash: number[] | null; // [u8; 32]
  /** Unix timestamp of creation. */
  readonly createdAt: BN;
  /** Unix timestamp of the last update. */
  readonly updatedAt: BN;
  /** Whether this feedback has been revoked by the reviewer. */
  readonly isRevoked: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Discovery Indexes
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface CapabilityIndexData
 * @description Scalable discovery index PDA keyed by capability hash.
 *
 * Enables consumers to look up all agents that declare a given capability.
 * Supports pagination via `totalPages`.
 *
 * @category Types
 * @since v0.1.0
 */
export interface CapabilityIndexData {
  readonly bump: number;
  /** Human-readable capability identifier. */
  readonly capabilityId: string;
  /** SHA-256 hash of the capability ID used as PDA seed. */
  readonly capabilityHash: number[]; // [u8; 32]
  /** Agent PDAs that declare this capability. */
  readonly agents: PublicKey[];
  /** Total number of pages for this index. */
  readonly totalPages: number;
  /** Unix timestamp of the last index update. */
  readonly lastUpdated: BN;
}

/**
 * @interface ProtocolIndexData
 * @description Scalable discovery index PDA keyed by protocol hash.
 *
 * Enables consumers to look up all agents that support a given protocol.
 *
 * @category Types
 * @since v0.1.0
 */
export interface ProtocolIndexData {
  readonly bump: number;
  /** Human-readable protocol identifier. */
  readonly protocolId: string;
  /** SHA-256 hash of the protocol ID used as PDA seed. */
  readonly protocolHash: number[]; // [u8; 32]
  /** Agent PDAs that support this protocol. */
  readonly agents: PublicKey[];
  /** Total number of pages for this index. */
  readonly totalPages: number;
  /** Unix timestamp of the last index update. */
  readonly lastUpdated: BN;
}

/**
 * @interface ToolCategoryIndexData
 * @description Cross-agent tool discovery index PDA keyed by category.
 *
 * @category Types
 * @since v0.1.0
 */
export interface ToolCategoryIndexData {
  readonly bump: number;
  /** Numeric category discriminant. */
  readonly category: number;
  /** Tool descriptor PDAs in this category. */
  readonly tools: PublicKey[];
  /** Total number of pages for this index. */
  readonly totalPages: number;
  /** Unix timestamp of the last index update. */
  readonly lastUpdated: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Global Registry
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface GlobalRegistryData
 * @description Network-wide statistics singleton PDA.
 *
 * A single instance exists per program deployment and aggregates global
 * counters across all agents, feedbacks, tools, vaults, escrows, and attestations.
 *
 * @category Types
 * @since v0.1.0
 */
export interface GlobalRegistryData {
  readonly bump: number;
  /** Total number of registered agents. */
  readonly totalAgents: BN;
  /** Number of currently active agents. */
  readonly activeAgents: BN;
  /** Total feedbacks submitted network-wide. */
  readonly totalFeedbacks: BN;
  /** Distinct capability count. */
  readonly totalCapabilities: number;
  /** Distinct protocol count. */
  readonly totalProtocols: number;
  /** Unix timestamp of the last agent registration. */
  readonly lastRegisteredAt: BN;
  /** Unix timestamp of registry initialization. */
  readonly initializedAt: BN;
  /** Upgrade authority for the registry. */
  readonly authority: PublicKey;
  /** Total published tools. */
  readonly totalTools: number;
  /** Total memory vaults. */
  readonly totalVaults: number;
  /** Total escrow accounts. */
  readonly totalEscrows: number;
  /** Total attestations issued. */
  readonly totalAttestations: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Memory Vault
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface MemoryVaultData
 * @description Encrypted inscription vault PDA.
 *
 * Each agent may own one vault that stores NaCl-encrypted memory
 * inscriptions across multiple sessions. The vault tracks a nonce
 * for key rotation.
 *
 * @category Types
 * @since v0.1.0
 */
export interface MemoryVaultData {
  readonly bump: number;
  /** Agent PDA that owns this vault. */
  readonly agent: PublicKey;
  /** Wallet of the vault owner. */
  readonly wallet: PublicKey;
  /** Current encryption nonce seed (32 bytes). */
  readonly vaultNonce: number[]; // [u8; 32]
  /** Total sessions created inside this vault. */
  readonly totalSessions: number;
  /** Total inscriptions across all sessions. */
  readonly totalInscriptions: BN;
  /** Total bytes inscribed across all sessions. */
  readonly totalBytesInscribed: BN;
  /** Unix timestamp of vault creation. */
  readonly createdAt: BN;
  /** Protocol version this vault was created with. */
  readonly protocolVersion: number;
  /** Current nonce version (increments on rotation). */
  readonly nonceVersion: number;
  /** Unix timestamp of the last nonce rotation. */
  readonly lastNonceRotation: BN;
}

/**
 * @interface SessionLedgerData
 * @description Compact session index PDA within a {@link MemoryVaultData}.
 *
 * Tracks inscription order, epoch segmentation, Merkle checkpointing,
 * and the hash-chain tip for integrity verification.
 *
 * @category Types
 * @since v0.1.0
 */
export interface SessionLedgerData {
  readonly bump: number;
  /** Parent vault PDA. */
  readonly vault: PublicKey;
  /** SHA-256 session identifier. */
  readonly sessionHash: number[]; // [u8; 32]
  /** Next inscription sequence number. */
  readonly sequenceCounter: number;
  /** Total bytes inscribed in this session. */
  readonly totalBytes: BN;
  /** Current epoch index. */
  readonly currentEpoch: number;
  /** Total epochs created. */
  readonly totalEpochs: number;
  /** Unix timestamp of session creation. */
  readonly createdAt: BN;
  /** Unix timestamp of the last inscription. */
  readonly lastInscribedAt: BN;
  /** Whether the session has been closed. */
  readonly isClosed: boolean;
  /** Running Merkle root across all inscriptions. */
  readonly merkleRoot: number[]; // [u8; 32]
  /** Total checkpoints taken. */
  readonly totalCheckpoints: number;
  /** Hash of the latest inscription in the chain. */
  readonly tipHash: number[]; // [u8; 32]
}

/**
 * @interface EpochPageData
 * @description Per-epoch scan target PDA within a session.
 *
 * Epochs partition inscriptions into bounded pages, enabling efficient
 * range scans and garbage collection.
 *
 * @category Types
 * @since v0.1.0
 */
export interface EpochPageData {
  readonly bump: number;
  /** Parent session PDA. */
  readonly session: PublicKey;
  /** Zero-based epoch index. */
  readonly epochIndex: number;
  /** Sequence number of the first inscription in this epoch. */
  readonly startSequence: number;
  /** Number of inscriptions in this epoch. */
  readonly inscriptionCount: number;
  /** Total bytes across all inscriptions in this epoch. */
  readonly totalBytes: number;
  /** Unix timestamp of the first inscription. */
  readonly firstTs: BN;
  /** Unix timestamp of the last inscription. */
  readonly lastTs: BN;
}

/**
 * @interface VaultDelegateData
 * @description Hot-wallet authorization PDA for vault operations.
 *
 * Allows a delegate wallet to perform permitted operations (inscribe,
 * open/close sessions) on behalf of the vault owner until expiry.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link DelegatePermission} for available permission bits.
 */
export interface VaultDelegateData {
  readonly bump: number;
  /** Parent vault PDA. */
  readonly vault: PublicKey;
  /** Delegate wallet public key. */
  readonly delegate: PublicKey;
  /** Bitmask of granted permissions. */
  readonly permissions: number;
  /** Unix timestamp when the delegation expires. */
  readonly expiresAt: BN;
  /** Unix timestamp of delegation creation. */
  readonly createdAt: BN;
}

/**
 * @interface SessionCheckpointData
 * @description Fast-sync snapshot PDA for a session.
 *
 * Checkpoints capture a Merkle root at a particular sequence point,
 * enabling clients to verify session integrity without replaying
 * every inscription.
 *
 * @category Types
 * @since v0.1.0
 */
export interface SessionCheckpointData {
  readonly bump: number;
  /** Parent session PDA. */
  readonly session: PublicKey;
  /** Zero-based checkpoint index. */
  readonly checkpointIndex: number;
  /** Merkle root at the checkpoint. */
  readonly merkleRoot: number[]; // [u8; 32]
  /** Sequence number at which the checkpoint was taken. */
  readonly sequenceAt: number;
  /** Epoch index at checkpoint time. */
  readonly epochAt: number;
  /** Cumulative bytes at checkpoint time. */
  readonly totalBytesAt: BN;
  /** Cumulative inscriptions at checkpoint time. */
  readonly inscriptionsAt: BN;
  /** Unix timestamp when the checkpoint was created. */
  readonly createdAt: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Tools
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface ToolDescriptorData
 * @description On-chain tool schema registry PDA.
 *
 * Each published tool stores hashed metadata (description, input/output schemas)
 * and tracks invocation count. Tools support versioning via `previousVersion`
 * back-links.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link ToolHttpMethod} for HTTP method variants.
 * @see {@link ToolCategory} for category variants.
 */
export interface ToolDescriptorData {
  readonly bump: number;
  /** Agent PDA that owns this tool. */
  readonly agent: PublicKey;
  /** SHA-256 hash of the tool name (PDA seed). */
  readonly toolNameHash: number[]; // [u8; 32]
  /** Human-readable tool name. */
  readonly toolName: string;
  /** SHA-256 hash of the protocol identifier. */
  readonly protocolHash: number[]; // [u8; 32]
  /** Schema version. */
  readonly version: number;
  /** SHA-256 hash of the tool description. */
  readonly descriptionHash: number[]; // [u8; 32]
  /** SHA-256 hash of the input JSON schema. */
  readonly inputSchemaHash: number[]; // [u8; 32]
  /** SHA-256 hash of the output JSON schema. */
  readonly outputSchemaHash: number[]; // [u8; 32]
  /** HTTP method exposed by this tool. */
  readonly httpMethod: ToolHttpMethodKind;
  /** Discovery category. */
  readonly category: ToolCategoryKind;
  /** Total number of parameters. */
  readonly paramsCount: number;
  /** Number of required parameters. */
  readonly requiredParams: number;
  /** Whether this tool is a compound (multi-step) operation. */
  readonly isCompound: boolean;
  /** Whether this tool is currently enabled. */
  readonly isActive: boolean;
  /** Lifetime invocation counter. */
  readonly totalInvocations: BN;
  /** Unix timestamp of creation. */
  readonly createdAt: BN;
  /** Unix timestamp of the last update. */
  readonly updatedAt: BN;
  /** PDA of the previous version (zero key if first version). */
  readonly previousVersion: PublicKey;
}

// ═══════════════════════════════════════════════════════════════════
//  Escrow
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface EscrowAccountData
 * @description x402 pre-funded micropayment escrow PDA.
 *
 * An escrow is created by a consumer (depositor) for a specific agent.
 * Calls are settled against the escrow balance either per-call or in
 * batches, with optional volume-curve discounts.
 *
 * @category Types
 * @since v0.1.0
 * @deprecated Since v0.7.0 — Use {@link EscrowAccountV2Data} for V2 escrows with
 * settlement security, dispute windows, and co-signing.
 * @see {@link VolumeCurveBreakpoint} for discount curve details.
 */
export interface EscrowAccountData {
  readonly bump: number;
  /** Agent PDA this escrow is for. */
  readonly agent: PublicKey;
  /** Consumer wallet that funded the escrow. */
  readonly depositor: PublicKey;
  /** Agent's wallet that receives settlements. */
  readonly agentWallet: PublicKey;
  /** Current remaining balance (in token base units). */
  readonly balance: BN;
  /** Cumulative amount deposited. */
  readonly totalDeposited: BN;
  /** Cumulative amount settled to the agent. */
  readonly totalSettled: BN;
  /** Cumulative calls settled. */
  readonly totalCallsSettled: BN;
  /** Base price per call. */
  readonly pricePerCall: BN;
  /** Maximum number of calls this escrow funds. */
  readonly maxCalls: BN;
  /** Unix timestamp of escrow creation. */
  readonly createdAt: BN;
  /** Unix timestamp of the last settlement. */
  readonly lastSettledAt: BN;
  /** Unix timestamp when the escrow expires. */
  readonly expiresAt: BN;
  /** Volume discount breakpoints. */
  readonly volumeCurve: VolumeCurveBreakpoint[];
  /** Optional SPL token mint (null for native SOL). */
  readonly tokenMint: PublicKey | null;
  /** Decimal places for the token. */
  readonly tokenDecimals: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Attestation
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface AgentAttestationData
 * @description Web-of-trust attestation PDA.
 *
 * Attestations allow one agent or authority to vouch for another agent's
 * identity, compliance, or capabilities. They support expiration and
 * can be deactivated.
 *
 * @category Types
 * @since v0.1.0
 */
export interface AgentAttestationData {
  readonly bump: number;
  /** Agent PDA being attested. */
  readonly agent: PublicKey;
  /** Wallet of the attester. */
  readonly attester: PublicKey;
  /** Freeform attestation type (e.g. `"kyc"`, `"audit"`). */
  readonly attestationType: string;
  /** SHA-256 hash of off-chain attestation metadata. */
  readonly metadataHash: number[]; // [u8; 32]
  /** Whether the attestation is currently active. */
  readonly isActive: boolean;
  /** Unix timestamp when the attestation expires. */
  readonly expiresAt: BN;
  /** Unix timestamp of creation. */
  readonly createdAt: BN;
  /** Unix timestamp of the last update. */
  readonly updatedAt: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Memory Ledger
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface MemoryLedgerData
 * @description Unified on-chain memory ledger PDA.
 *
 * Provides a ring-buffer based memory store with Merkle-root integrity,
 * supporting sealed page archival and hash-chain verification.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link LedgerPageData} for sealed archive pages.
 */
export interface MemoryLedgerData {
  readonly bump: number;
  /** Parent session PDA. */
  readonly session: PublicKey;
  /** Authority that controls ledger writes. */
  readonly authority: PublicKey;
  /** Current number of entries in the ring buffer. */
  readonly numEntries: number;
  /** Running Merkle root across all entries. */
  readonly merkleRoot: number[]; // [u8; 32]
  /** Hash of the latest entry in the chain. */
  readonly latestHash: number[]; // [u8; 32]
  /** Total data size in bytes. */
  readonly totalDataSize: BN;
  /** Unix timestamp of ledger creation. */
  readonly createdAt: BN;
  /** Unix timestamp of the last update. */
  readonly updatedAt: BN;
  /** Number of sealed pages. */
  readonly numPages: number;
  /** Ring-buffer raw bytes. */
  readonly ring: number[]; // Vec<u8>
}

/**
 * @interface LedgerPageData
 * @description Sealed archive page PDA (write-once, never-delete).
 *
 * When a ledger’s ring buffer is full, entries are sealed into
 * immutable pages with a Merkle root snapshot for verifiability.
 *
 * @category Types
 * @since v0.1.0
 */
export interface LedgerPageData {
  readonly bump: number;
  /** Parent ledger PDA. */
  readonly ledger: PublicKey;
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Unix timestamp when the page was sealed. */
  readonly sealedAt: BN;
  /** Number of entries archived in this page. */
  readonly entriesInPage: number;
  /** Total data size of this page in bytes. */
  readonly dataSize: number;
  /** Merkle root at the time of sealing. */
  readonly merkleRootAtSeal: number[]; // [u8; 32]
  /** Raw archived data bytes. */
  readonly data: number[]; // Vec<u8>
}

// ═══════════════════════════════════════════════════════════════════
//  Escrow V2 (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface EscrowAccountV2Data
 * @description V2 escrow with triple-mode settlement security.
 * @category Types
 * @since v0.5.0
 */
export interface EscrowAccountV2Data {
  readonly bump: number;
  readonly version: number;
  readonly agent: PublicKey;
  readonly depositor: PublicKey;
  readonly agentWallet: PublicKey;
  readonly escrowNonce: BN;
  readonly balance: BN;
  readonly totalDeposited: BN;
  readonly totalSettled: BN;
  readonly totalCallsSettled: BN;
  readonly pricePerCall: BN;
  readonly maxCalls: BN;
  readonly createdAt: BN;
  readonly lastSettledAt: BN;
  readonly expiresAt: BN;
  readonly volumeCurve: VolumeCurveBreakpoint[];
  readonly tokenMint: PublicKey | null;
  readonly tokenDecimals: number;
  readonly settlementSecurity: SettlementSecurityKind;
  readonly disputeWindowSlots: BN;
  readonly settlementIndex: BN;
  readonly coSigner: PublicKey | null;
  /** @deprecated Since v0.7.0 — arbiter role replaced by automatic receipt verification */
  readonly arbiter: PublicKey | null;
  readonly pendingAmount: BN;
  readonly pendingCalls: BN;
  /** @since v0.7.0 — Number of receipt batches inscribed against this escrow */
  readonly receiptBatchCount: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Pending Settlement (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface PendingSettlementData
 * @description Dispute-window settlement lock PDA.
 * @category Types
 * @since v0.5.0
 */
export interface PendingSettlementData {
  readonly bump: number;
  readonly escrow: PublicKey;
  readonly agent: PublicKey;
  readonly agentWallet: PublicKey;
  readonly depositor: PublicKey;
  readonly settlementIndex: BN;
  readonly callsToSettle: BN;
  readonly amount: BN;
  readonly serviceHash: number[]; // [u8; 32]
  readonly createdAt: BN;
  readonly releaseSlot: BN;
  readonly isFinalized: boolean;
  readonly isDisputed: boolean;
  readonly outcome: DisputeOutcomeKind;
  /** @since v0.7.0 — Merkle root of receipts backing this settlement */
  readonly receiptMerkleRoot: number[]; // [u8; 32]
}

// ═══════════════════════════════════════════════════════════════════
//  Dispute Record (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface DisputeRecordData
 * @description On-chain dispute with automatic receipt-based resolution (v0.7).
 * @category Types
 * @since v0.5.0
 */
export interface DisputeRecordData {
  readonly bump: number;
  readonly pendingSettlement: PublicKey;
  readonly escrow: PublicKey;
  readonly depositor: PublicKey;
  readonly agent: PublicKey;
  readonly evidenceHash: number[]; // [u8; 32]
  readonly agentEvidenceHash: number[]; // [u8; 32]
  /** @deprecated Since v0.7.0 — arbiter role replaced by automatic resolution */
  readonly arbiter: PublicKey;
  readonly outcome: DisputeOutcomeKind;
  readonly createdAt: BN;
  readonly resolvedAt: BN;
  readonly resolutionHash: number[]; // [u8; 32]
  readonly slashAmount: BN;
  /** @since v0.7.0 — Category of dispute (NonDelivery=0, PartialDelivery=1, Overcharge=2, Quality=3) */
  readonly disputeType: number;
  /** @since v0.7.0 — How the dispute was resolved (Pending/Auto/Governance) */
  readonly resolutionLayer: ResolutionLayerKind;
  /** @since v0.7.0 — Bond deposited by the disputer (lamports) */
  readonly disputeBond: BN;
  /** @since v0.7.0 — Number of calls the agent proved via merkle proofs */
  readonly provenCalls: BN;
  /** @since v0.7.0 — Number of calls the agent originally claimed */
  readonly claimedCalls: BN;
  /** @since v0.7.0 — Unix timestamp by which agent must submit proof */
  readonly proofDeadline: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Receipt Batch (v0.7)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface ReceiptBatchData
 * @description Merkle root of a batch of call receipts inscribed by an agent.
 *
 * Seeds: `["sap_receipt", escrow_v2_pda, batch_index_u32_le]`
 *
 * @category Types
 * @since v0.7.0
 */
export interface ReceiptBatchData {
  readonly bump: number;
  /** Parent escrow V2 PDA */
  readonly escrow: PublicKey;
  /** Zero-based batch index */
  readonly batchIndex: number;
  /** Merkle root of the receipt batch */
  readonly merkleRoot: number[]; // [u8; 32]
  /** Number of calls in the batch */
  readonly callCount: BN;
  /** Unix timestamp for the start of the period covered */
  readonly periodStart: BN;
  /** Unix timestamp for the end of the period covered */
  readonly periodEnd: BN;
  /** Unix timestamp when the batch was inscribed */
  readonly inscribedAt: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Agent Stake (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface AgentStakeData
 * @description Collateral staking account for honest behavior.
 * @category Types
 * @since v0.5.0
 */
export interface AgentStakeData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly wallet: PublicKey;
  readonly stakedAmount: BN;
  readonly slashedAmount: BN;
  readonly lastStakeAt: BN;
  readonly unstakeRequestedAt: BN;
  readonly unstakeAmount: BN;
  readonly unstakeAvailableAt: BN;
  readonly totalDisputesWon: number;
  readonly totalDisputesLost: number;
  readonly createdAt: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Subscription (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface SubscriptionData
 * @description Recurring payment subscription PDA.
 * @category Types
 * @since v0.5.0
 */
export interface SubscriptionData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly subscriber: PublicKey;
  readonly agentWallet: PublicKey;
  readonly subId: BN;
  readonly pricePerInterval: BN;
  readonly billingInterval: BillingIntervalKind;
  readonly tokenMint: PublicKey | null;
  readonly tokenDecimals: number;
  readonly balance: BN;
  readonly totalPaid: BN;
  readonly intervalsPaid: number;
  readonly startedAt: BN;
  readonly lastClaimedAt: BN;
  readonly cancelledAt: BN;
  readonly nextDueAt: BN;
  readonly createdAt: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Counter Shard (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface CounterShardData
 * @description Sharded global counter PDA for write throughput.
 * @category Types
 * @since v0.5.0
 */
export interface CounterShardData {
  readonly bump: number;
  readonly shardIndex: number;
  readonly totalAgents: BN;
  readonly activeAgents: BN;
  readonly totalFeedbacks: BN;
  readonly totalTools: number;
  readonly totalVaults: number;
  readonly totalAttestations: number;
  readonly totalSettlements: BN;
  readonly totalDisputes: number;
  readonly totalSubscriptions: number;
  readonly lastUpdated: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Index Page (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface IndexPageData
 * @description Overflow page PDA for discovery indexes.
 * @category Types
 * @since v0.5.0
 */
export interface IndexPageData {
  readonly bump: number;
  readonly parentIndex: PublicKey;
  readonly pageIndex: number;
  readonly agents: PublicKey[];
  readonly lastUpdated: BN;
}
