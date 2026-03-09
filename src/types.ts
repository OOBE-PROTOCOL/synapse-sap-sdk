/**
 * @module types
 * @description Strongly-typed domain models for SAP v2.
 *
 * Every type mirrors the onchain Rust struct / enum exactly.
 * Use these for instruction arguments, account deserialization,
 * and client-side validation.
 */

import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";

// ═══════════════════════════════════════════════════════════════════
//  Enums (mirrors Rust enum discriminants)
// ═══════════════════════════════════════════════════════════════════

/** Token type accepted for agent pricing / escrow. */
export const TokenType = {
  Sol: { sol: {} },
  Usdc: { usdc: {} },
  Spl: { spl: {} },
} as const;

export type TokenTypeKind = (typeof TokenType)[keyof typeof TokenType];

/** Plugin extension type (legacy, feature-gated). */
export const PluginType = {
  Memory: { memory: {} },
  Validation: { validation: {} },
  Delegation: { delegation: {} },
  Analytics: { analytics: {} },
  Governance: { governance: {} },
  Custom: { custom: {} },
} as const;

export type PluginTypeKind = (typeof PluginType)[keyof typeof PluginType];

/** Settlement mode for agent pricing tiers. */
export const SettlementMode = {
  Instant: { instant: {} },
  Escrow: { escrow: {} },
  Batched: { batched: {} },
  X402: { x402: {} },
} as const;

export type SettlementModeKind =
  (typeof SettlementMode)[keyof typeof SettlementMode];

/** HTTP method for tool descriptors. */
export const ToolHttpMethod = {
  Get: { get: {} },
  Post: { post: {} },
  Put: { put: {} },
  Delete: { delete: {} },
  Compound: { compound: {} },
} as const;

export type ToolHttpMethodKind =
  (typeof ToolHttpMethod)[keyof typeof ToolHttpMethod];

/** Tool category for cross-agent discovery. */
export const ToolCategory = {
  Swap: { swap: {} },
  Lend: { lend: {} },
  Stake: { stake: {} },
  Nft: { nft: {} },
  Payment: { payment: {} },
  Data: { data: {} },
  Governance: { governance: {} },
  Bridge: { bridge: {} },
  Analytics: { analytics: {} },
  Custom: { custom: {} },
} as const;

export type ToolCategoryKind =
  (typeof ToolCategory)[keyof typeof ToolCategory];

// ═══════════════════════════════════════════════════════════════════
//  Helper Structs (instruction arguments)
// ═══════════════════════════════════════════════════════════════════

/** Agent capability descriptor (e.g. "jupiter:swap"). */
export interface Capability {
  readonly id: string;
  readonly description: string | null;
  readonly protocolId: string | null;
  readonly version: string | null;
}

/** Volume curve breakpoint for tiered pricing (ERC-8004-style). */
export interface VolumeCurveBreakpoint {
  readonly afterCalls: number;
  readonly pricePerCall: BN;
}

/** Pricing tier for agent services. */
export interface PricingTier {
  readonly tierId: string;
  readonly pricePerCall: BN;
  readonly minPricePerCall: BN | null;
  readonly maxPricePerCall: BN | null;
  readonly rateLimit: number;
  readonly maxCallsPerSession: number;
  readonly burstLimit: number | null;
  readonly tokenType: TokenTypeKind;
  readonly tokenMint: PublicKey | null;
  readonly tokenDecimals: number | null;
  readonly settlementMode: SettlementModeKind | null;
  readonly minEscrowDeposit: BN | null;
  readonly batchIntervalSec: number | null;
  readonly volumeCurve: VolumeCurveBreakpoint[] | null;
}

/** Reference to an active plugin PDA. */
export interface PluginRef {
  readonly pluginType: PluginTypeKind;
  readonly pda: PublicKey;
}

/** Individual settlement entry for batch settlement. */
export interface Settlement {
  readonly callsToSettle: BN;
  readonly serviceHash: number[]; // [u8; 32]
}

// ═══════════════════════════════════════════════════════════════════
//  Account Data (deserialized onchain accounts)
// ═══════════════════════════════════════════════════════════════════

/** AgentAccount PDA — core agent identity. */
export interface AgentAccountData {
  readonly bump: number;
  readonly version: number;
  readonly wallet: PublicKey;
  readonly name: string;
  readonly description: string;
  readonly agentId: string | null;
  readonly agentUri: string | null;
  readonly x402Endpoint: string | null;
  readonly isActive: boolean;
  readonly createdAt: BN;
  readonly updatedAt: BN;
  readonly reputationScore: number;
  readonly totalFeedbacks: number;
  readonly reputationSum: BN;
  readonly totalCallsServed: BN;
  readonly avgLatencyMs: number;
  readonly uptimePercent: number;
  readonly capabilities: Capability[];
  readonly pricing: PricingTier[];
  readonly protocols: string[];
  readonly activePlugins: PluginRef[];
}

/** FeedbackAccount PDA — trustless reputation entry. */
export interface FeedbackAccountData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly reviewer: PublicKey;
  readonly score: number;
  readonly tag: string;
  readonly commentHash: number[] | null; // [u8; 32]
  readonly createdAt: BN;
  readonly updatedAt: BN;
  readonly isRevoked: boolean;
}

/** CapabilityIndex PDA — scalable discovery by capability. */
export interface CapabilityIndexData {
  readonly bump: number;
  readonly capabilityId: string;
  readonly capabilityHash: number[]; // [u8; 32]
  readonly agents: PublicKey[];
  readonly totalPages: number;
  readonly lastUpdated: BN;
}

/** ProtocolIndex PDA — scalable discovery by protocol. */
export interface ProtocolIndexData {
  readonly bump: number;
  readonly protocolId: string;
  readonly protocolHash: number[]; // [u8; 32]
  readonly agents: PublicKey[];
  readonly totalPages: number;
  readonly lastUpdated: BN;
}

/** GlobalRegistry PDA — network-wide stats singleton. */
export interface GlobalRegistryData {
  readonly bump: number;
  readonly totalAgents: BN;
  readonly activeAgents: BN;
  readonly totalFeedbacks: BN;
  readonly totalCapabilities: number;
  readonly totalProtocols: number;
  readonly lastRegisteredAt: BN;
  readonly initializedAt: BN;
  readonly authority: PublicKey;
  readonly totalTools: number;
  readonly totalVaults: number;
  readonly totalEscrows: number;
  readonly totalAttestations: number;
}

/** MemoryVault PDA — encrypted inscription vault. */
export interface MemoryVaultData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly wallet: PublicKey;
  readonly vaultNonce: number[]; // [u8; 32]
  readonly totalSessions: number;
  readonly totalInscriptions: BN;
  readonly totalBytesInscribed: BN;
  readonly createdAt: BN;
  readonly protocolVersion: number;
  readonly nonceVersion: number;
  readonly lastNonceRotation: BN;
}

/** SessionLedger PDA — compact session index. */
export interface SessionLedgerData {
  readonly bump: number;
  readonly vault: PublicKey;
  readonly sessionHash: number[]; // [u8; 32]
  readonly sequenceCounter: number;
  readonly totalBytes: BN;
  readonly currentEpoch: number;
  readonly totalEpochs: number;
  readonly createdAt: BN;
  readonly lastInscribedAt: BN;
  readonly isClosed: boolean;
  readonly merkleRoot: number[]; // [u8; 32]
  readonly totalCheckpoints: number;
  readonly tipHash: number[]; // [u8; 32]
}

/** EpochPage PDA — per-epoch scan target. */
export interface EpochPageData {
  readonly bump: number;
  readonly session: PublicKey;
  readonly epochIndex: number;
  readonly startSequence: number;
  readonly inscriptionCount: number;
  readonly totalBytes: number;
  readonly firstTs: BN;
  readonly lastTs: BN;
}

/** VaultDelegate PDA — hot wallet authorization. */
export interface VaultDelegateData {
  readonly bump: number;
  readonly vault: PublicKey;
  readonly delegate: PublicKey;
  readonly permissions: number;
  readonly expiresAt: BN;
  readonly createdAt: BN;
}

/** ToolDescriptor PDA — onchain tool schema registry. */
export interface ToolDescriptorData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly toolNameHash: number[]; // [u8; 32]
  readonly toolName: string;
  readonly protocolHash: number[]; // [u8; 32]
  readonly version: number;
  readonly descriptionHash: number[]; // [u8; 32]
  readonly inputSchemaHash: number[]; // [u8; 32]
  readonly outputSchemaHash: number[]; // [u8; 32]
  readonly httpMethod: ToolHttpMethodKind;
  readonly category: ToolCategoryKind;
  readonly paramsCount: number;
  readonly requiredParams: number;
  readonly isCompound: boolean;
  readonly isActive: boolean;
  readonly totalInvocations: BN;
  readonly createdAt: BN;
  readonly updatedAt: BN;
  readonly previousVersion: PublicKey;
}

/** SessionCheckpoint PDA — fast-sync snapshot. */
export interface SessionCheckpointData {
  readonly bump: number;
  readonly session: PublicKey;
  readonly checkpointIndex: number;
  readonly merkleRoot: number[]; // [u8; 32]
  readonly sequenceAt: number;
  readonly epochAt: number;
  readonly totalBytesAt: BN;
  readonly inscriptionsAt: BN;
  readonly createdAt: BN;
}

/** EscrowAccount PDA — x402 pre-funded micropayments. */
export interface EscrowAccountData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly depositor: PublicKey;
  readonly agentWallet: PublicKey;
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
}

/** AgentStats PDA — lightweight hot-path metrics. */
export interface AgentStatsData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly wallet: PublicKey;
  readonly totalCallsServed: BN;
  readonly isActive: boolean;
  readonly updatedAt: BN;
}

/** ToolCategoryIndex PDA — cross-agent tool discovery. */
export interface ToolCategoryIndexData {
  readonly bump: number;
  readonly category: number;
  readonly tools: PublicKey[];
  readonly totalPages: number;
  readonly lastUpdated: BN;
}

/** AgentAttestation PDA — web of trust. */
export interface AgentAttestationData {
  readonly bump: number;
  readonly agent: PublicKey;
  readonly attester: PublicKey;
  readonly attestationType: string;
  readonly metadataHash: number[]; // [u8; 32]
  readonly isActive: boolean;
  readonly expiresAt: BN;
  readonly createdAt: BN;
  readonly updatedAt: BN;
}

/** MemoryLedger PDA — unified onchain memory. */
export interface MemoryLedgerData {
  readonly bump: number;
  readonly session: PublicKey;
  readonly authority: PublicKey;
  readonly numEntries: number;
  readonly merkleRoot: number[]; // [u8; 32]
  readonly latestHash: number[]; // [u8; 32]
  readonly totalDataSize: BN;
  readonly createdAt: BN;
  readonly updatedAt: BN;
  readonly numPages: number;
  readonly ring: number[]; // Vec<u8>
}

/** LedgerPage PDA — sealed archive (write-once, never-delete). */
export interface LedgerPageData {
  readonly bump: number;
  readonly ledger: PublicKey;
  readonly pageIndex: number;
  readonly sealedAt: BN;
  readonly entriesInPage: number;
  readonly dataSize: number;
  readonly merkleRootAtSeal: number[]; // [u8; 32]
  readonly data: number[]; // Vec<u8>
}

// ═══════════════════════════════════════════════════════════════════
//  Instruction Argument DTOs
// ═══════════════════════════════════════════════════════════════════

/** Arguments for `registerAgent`. */
export interface RegisterAgentArgs {
  readonly name: string;
  readonly description: string;
  readonly capabilities: Capability[];
  readonly pricing: PricingTier[];
  readonly protocols: string[];
  readonly agentId?: string | null;
  readonly agentUri?: string | null;
  readonly x402Endpoint?: string | null;
}

/** Arguments for `updateAgent`. */
export interface UpdateAgentArgs {
  readonly name?: string | null;
  readonly description?: string | null;
  readonly capabilities?: Capability[] | null;
  readonly pricing?: PricingTier[] | null;
  readonly protocols?: string[] | null;
  readonly agentId?: string | null;
  readonly agentUri?: string | null;
  readonly x402Endpoint?: string | null;
}

/** Arguments for `giveFeedback`. */
export interface GiveFeedbackArgs {
  readonly score: number;
  readonly tag: string;
  readonly commentHash?: number[] | null; // [u8; 32]
}

/** Arguments for `updateFeedback`. */
export interface UpdateFeedbackArgs {
  readonly newScore: number;
  readonly newTag?: string | null;
  readonly commentHash?: number[] | null; // [u8; 32]
}

/** Arguments for `publishTool`. */
export interface PublishToolArgs {
  readonly toolName: string;
  readonly toolNameHash: number[];    // [u8; 32]
  readonly protocolHash: number[];    // [u8; 32]
  readonly descriptionHash: number[]; // [u8; 32]
  readonly inputSchemaHash: number[]; // [u8; 32]
  readonly outputSchemaHash: number[];// [u8; 32]
  readonly httpMethod: number;
  readonly category: number;
  readonly paramsCount: number;
  readonly requiredParams: number;
  readonly isCompound: boolean;
}

/** Arguments for `updateTool`. */
export interface UpdateToolArgs {
  readonly descriptionHash?: number[] | null;
  readonly inputSchemaHash?: number[] | null;
  readonly outputSchemaHash?: number[] | null;
  readonly httpMethod?: number | null;
  readonly category?: number | null;
  readonly paramsCount?: number | null;
  readonly requiredParams?: number | null;
}

/** Arguments for `inscribeMemory`. */
export interface InscribeMemoryArgs {
  readonly sequence: number;
  readonly encryptedData: Buffer;
  readonly nonce: number[];      // [u8; 12]
  readonly contentHash: number[];// [u8; 32]
  readonly totalFragments: number;
  readonly fragmentIndex: number;
  readonly compression: number;
  readonly epochIndex: number;
}

/** Arguments for `compactInscribe`. */
export interface CompactInscribeArgs {
  readonly sequence: number;
  readonly encryptedData: Buffer;
  readonly nonce: number[];       // [u8; 12]
  readonly contentHash: number[]; // [u8; 32]
}

/** Arguments for `createEscrow`. */
export interface CreateEscrowArgs {
  readonly pricePerCall: BN;
  readonly maxCalls: BN;
  readonly initialDeposit: BN;
  readonly expiresAt: BN;
  readonly volumeCurve: VolumeCurveBreakpoint[];
  readonly tokenMint: PublicKey | null;
  readonly tokenDecimals: number;
}

/** Arguments for `createAttestation`. */
export interface CreateAttestationArgs {
  readonly attestationType: string;
  readonly metadataHash: number[]; // [u8; 32]
  readonly expiresAt: BN;
}

/** Arguments for `inscribeToolSchema`. */
export interface InscribeToolSchemaArgs {
  readonly schemaType: number;
  readonly schemaData: Buffer;
  readonly schemaHash: number[]; // [u8; 32]
  readonly compression: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Delegate Permission Bitmask helpers
// ═══════════════════════════════════════════════════════════════════

/** Vault delegate permission bits. */
export const DelegatePermission = {
  Inscribe: 1,
  CloseSession: 2,
  OpenSession: 4,
  All: 7,
} as const;

export type DelegatePermissionBit =
  (typeof DelegatePermission)[keyof typeof DelegatePermission];

// ═══════════════════════════════════════════════════════════════════
//  Schema Type helpers
// ═══════════════════════════════════════════════════════════════════

/** Tool schema type discriminants. */
export const SchemaType = {
  Input: 0,
  Output: 1,
  Description: 2,
} as const;

export type SchemaTypeValue = (typeof SchemaType)[keyof typeof SchemaType];

/** Compression type discriminants. */
export const CompressionType = {
  None: 0,
  Deflate: 1,
  Gzip: 2,
  Brotli: 3,
} as const;

export type CompressionTypeValue =
  (typeof CompressionType)[keyof typeof CompressionType];
