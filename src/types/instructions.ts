/**
 * @module types/instructions
 * @description Instruction argument DTOs and helper enumerations.
 *
 * These interfaces map 1:1 to the Anchor instruction argument structs.
 * Use them when calling SDK module methods.
 *
 * @category Types
 * @since v0.1.0
 */

import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import type { Capability, PricingTier, VolumeCurveBreakpoint } from "./common";

// ═══════════════════════════════════════════════════════════════════
//  Agent Instructions
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface RegisterAgentArgs
 * @description Arguments for the `registerAgent` instruction.
 *
 * Creates a new on-chain agent identity with the given profile,
 * capabilities, pricing tiers, and protocol support.
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { TokenType } from "@synapse-sap/sdk";
 *
 * const args: RegisterAgentArgs = {
 *   name: "My Agent",
 *   description: "A helpful Solana agent",
 *   capabilities: [{ id: "jupiter:swap", description: null, protocolId: "jupiter", version: "1.0" }],
 *   pricing: [],
 *   protocols: ["solana-agent-protocol"],
 * };
 * ```
 */
export interface RegisterAgentArgs {
  /** Agent display name. */
  readonly name: string;
  /** Agent description. */
  readonly description: string;
  /** Capabilities the agent exposes. */
  readonly capabilities: Capability[];
  /** Pricing tiers for the agent's services. */
  readonly pricing: PricingTier[];
  /** Supported protocol identifiers. */
  readonly protocols: string[];
  /** Optional off-chain agent identifier. */
  readonly agentId?: string | null;
  /** Optional URI to extended metadata. */
  readonly agentUri?: string | null;
  /** Optional x402 payment endpoint. */
  readonly x402Endpoint?: string | null;
}

/**
 * @interface UpdateAgentArgs
 * @description Arguments for the `updateAgent` instruction.
 *
 * All fields are optional — pass only the fields you want to change.
 * `null` values are ignored on-chain.
 *
 * @category Types
 * @since v0.1.0
 */
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

// ═══════════════════════════════════════════════════════════════════
//  Feedback Instructions
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface GiveFeedbackArgs
 * @description Arguments for the `giveFeedback` instruction.
 *
 * Submits a reputation score and tag for the target agent.
 * Each reviewer can only submit one feedback per agent.
 *
 * @category Types
 * @since v0.1.0
 */
export interface GiveFeedbackArgs {
  /** Reputation score (1–100). */
  readonly score: number;
  /** Freeform tag / category for the feedback. */
  readonly tag: string;
  /** Optional SHA-256 hash of an off-chain comment. */
  readonly commentHash?: number[] | null; // [u8; 32]
}

/**
 * @interface UpdateFeedbackArgs
 * @description Arguments for the `updateFeedback` instruction.
 *
 * Allows the original reviewer to revise their score and/or tag.
 *
 * @category Types
 * @since v0.1.0
 */
export interface UpdateFeedbackArgs {
  /** Updated reputation score (1–100). */
  readonly newScore: number;
  /** Updated tag (optional). */
  readonly newTag?: string | null;
  /** Updated off-chain comment hash (optional). */
  readonly commentHash?: number[] | null; // [u8; 32]
}

// ═══════════════════════════════════════════════════════════════════
//  Tool Instructions
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface PublishToolArgs
 * @description Arguments for the `publishTool` instruction.
 *
 * Registers a new tool descriptor on-chain with hashed metadata.
 * Hash fields are SHA-256 digests of the corresponding off-chain content.
 *
 * @category Types
 * @since v0.1.0
 */
export interface PublishToolArgs {
  /** Human-readable tool name. */
  readonly toolName: string;
  /** SHA-256 hash of the tool name (PDA seed). */
  readonly toolNameHash: number[];    // [u8; 32]
  /** SHA-256 hash of the protocol identifier. */
  readonly protocolHash: number[];    // [u8; 32]
  /** SHA-256 hash of the tool description. */
  readonly descriptionHash: number[]; // [u8; 32]
  /** SHA-256 hash of the input JSON schema. */
  readonly inputSchemaHash: number[]; // [u8; 32]
  /** SHA-256 hash of the output JSON schema. */
  readonly outputSchemaHash: number[];// [u8; 32]
  /** HTTP method discriminant index. */
  readonly httpMethod: number;
  /** Tool category discriminant index. */
  readonly category: number;
  /** Total number of parameters. */
  readonly paramsCount: number;
  /** Number of required parameters. */
  readonly requiredParams: number;
  /** Whether the tool is a compound (multi-step) operation. */
  readonly isCompound: boolean;
}

/**
 * @interface UpdateToolArgs
 * @description Arguments for the `updateTool` instruction.
 *
 * All fields are optional — only pass the fields to update.
 *
 * @category Types
 * @since v0.1.0
 */
export interface UpdateToolArgs {
  readonly descriptionHash?: number[] | null;
  readonly inputSchemaHash?: number[] | null;
  readonly outputSchemaHash?: number[] | null;
  readonly httpMethod?: number | null;
  readonly category?: number | null;
  readonly paramsCount?: number | null;
  readonly requiredParams?: number | null;
}

/**
 * @interface InscribeToolSchemaArgs
 * @description Arguments for the `inscribeToolSchema` instruction.
 *
 * Writes a tool’s JSON schema (input, output, or description) on-chain
 * as an inscription, with optional compression.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link SchemaType} for schema type discriminants.
 * @see {@link CompressionType} for compression discriminants.
 */
export interface InscribeToolSchemaArgs {
  /** Schema type discriminant (input / output / description). */
  readonly schemaType: number;
  /** Raw (optionally compressed) schema bytes. */
  readonly schemaData: Buffer;
  /** SHA-256 hash of the uncompressed schema. */
  readonly schemaHash: number[]; // [u8; 32]
  /** Compression algorithm discriminant. */
  readonly compression: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Memory Vault Instructions
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface InscribeMemoryArgs
 * @description Arguments for the `inscribeMemory` instruction.
 *
 * Writes an encrypted memory fragment into a vault session.
 * Supports multi-fragment inscriptions and epoch-based partitioning.
 *
 * @category Types
 * @since v0.1.0
 */
export interface InscribeMemoryArgs {
  /** Sequence number within the session. */
  readonly sequence: number;
  /** NaCl-encrypted payload. */
  readonly encryptedData: Buffer;
  /** Encryption nonce (12 bytes). */
  readonly nonce: number[];      // [u8; 12]
  /** SHA-256 hash of the plaintext content. */
  readonly contentHash: number[];// [u8; 32]
  /** Total fragments in this inscription. */
  readonly totalFragments: number;
  /** Zero-based index of this fragment. */
  readonly fragmentIndex: number;
  /** Compression algorithm discriminant. */
  readonly compression: number;
  /** Target epoch index. */
  readonly epochIndex: number;
}

/**
 * @interface CompactInscribeArgs
 * @description Arguments for the `compactInscribe` instruction.
 *
 * A simplified inscription variant that omits fragmentation and epoch
 * fields — ideal for small, single-fragment payloads.
 *
 * @category Types
 * @since v0.1.0
 */
export interface CompactInscribeArgs {
  /** Sequence number within the session. */
  readonly sequence: number;
  /** NaCl-encrypted payload. */
  readonly encryptedData: Buffer;
  /** Encryption nonce (12 bytes). */
  readonly nonce: number[];       // [u8; 12]
  /** SHA-256 hash of the plaintext content. */
  readonly contentHash: number[]; // [u8; 32]
}

// ═══════════════════════════════════════════════════════════════════
//  Escrow Instructions
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface CreateEscrowArgs
 * @description Arguments for the `createEscrow` instruction.
 *
 * Creates a pre-funded escrow account for micropayments to an agent,
 * optionally with volume-based discount breakpoints.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link VolumeCurveBreakpoint} for discount curve details.
 */
export interface CreateEscrowArgs {
  /** Base price per call in token base units. */
  readonly pricePerCall: BN;
  /** Maximum number of calls the escrow should fund. */
  readonly maxCalls: BN;
  /** Initial deposit amount. */
  readonly initialDeposit: BN;
  /** Unix timestamp when the escrow expires. */
  readonly expiresAt: BN;
  /** Volume discount breakpoints (pass `[]` for none). */
  readonly volumeCurve: VolumeCurveBreakpoint[];
  /** SPL token mint (pass `null` for native SOL). */
  readonly tokenMint: PublicKey | null;
  /** Decimal places for the token. */
  readonly tokenDecimals: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Attestation Instructions
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface CreateAttestationArgs
 * @description Arguments for the `createAttestation` instruction.
 *
 * Issues a web-of-trust attestation for a target agent.
 *
 * @category Types
 * @since v0.1.0
 */
export interface CreateAttestationArgs {
  /** Freeform attestation type (e.g. `"kyc"`, `"audit"`). */
  readonly attestationType: string;
  /** SHA-256 hash of off-chain attestation metadata. */
  readonly metadataHash: number[]; // [u8; 32]
  /** Unix timestamp when the attestation expires. */
  readonly expiresAt: BN;
}

// ═══════════════════════════════════════════════════════════════════
//  Permission & Schema Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * @name DelegatePermission
 * @description Bitmask constants for vault delegate permissions.
 *
 * Combine with bitwise OR to grant multiple permissions.
 *
 * | Bit | Value | Permission          |
 * | --- | ----- | ------------------- |
 * | 0   | 1     | Inscribe memories   |
 * | 1   | 2     | Close sessions      |
 * | 2   | 4     | Open sessions       |
 * | —   | 7     | All permissions     |
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { DelegatePermission } from "@synapse-sap/sdk";
 *
 * // Grant inscribe + open session
 * const perms = DelegatePermission.Inscribe | DelegatePermission.OpenSession;
 * ```
 */
export const DelegatePermission = {
  Inscribe: 1,
  CloseSession: 2,
  OpenSession: 4,
  All: 7,
} as const;

/**
 * @name DelegatePermissionBit
 * @description Union of valid {@link DelegatePermission} bit values.
 */
export type DelegatePermissionBit =
  (typeof DelegatePermission)[keyof typeof DelegatePermission];

/**
 * @name SchemaType
 * @description Numeric discriminants for tool schema types.
 *
 * Used in the `inscribeToolSchema` instruction to specify which schema
 * is being written on-chain.
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SchemaType } from "@synapse-sap/sdk";
 *
 * const args = { schemaType: SchemaType.Input, ... };
 * ```
 */
export const SchemaType = {
  Input: 0,
  Output: 1,
  Description: 2,
} as const;

/**
 * @name SchemaTypeValue
 * @description Union of valid {@link SchemaType} discriminant values.
 */
export type SchemaTypeValue = (typeof SchemaType)[keyof typeof SchemaType];

/**
 * @name CompressionType
 * @description Numeric discriminants for compression algorithms.
 *
 * Used in inscription instructions to declare the compression format
 * of the payload so consumers can decompress correctly.
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { CompressionType } from "@synapse-sap/sdk";
 *
 * const args = { compression: CompressionType.Gzip, ... };
 * ```
 */
export const CompressionType = {
  None: 0,
  Deflate: 1,
  Gzip: 2,
  Brotli: 3,
} as const;

/**
 * @name CompressionTypeValue
 * @description Union of valid {@link CompressionType} discriminant values.
 */
export type CompressionTypeValue =
  (typeof CompressionType)[keyof typeof CompressionType];
