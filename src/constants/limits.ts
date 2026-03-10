/**
 * @module constants/limits
 * @description Protocol size limits, version constants, and enum numeric values.
 *
 * All values mirror the on-chain Rust constraints exactly.
 * Used for client-side validation before sending transactions.
 *
 * @category Constants
 * @since v0.1.0
 */

// ═══════════════════════════════════════════════════════════════════
//  Size Limits (mirrors Rust impl blocks)
// ═══════════════════════════════════════════════════════════════════

/**
 * Protocol size constraints mirroring the Rust `impl` blocks.
 *
 * Use these values for client-side validation before submitting
 * transactions — exceeding any limit will cause an on-chain error.
 *
 * @name LIMITS
 * @description A frozen object containing all protocol-enforced size and length bounds.
 * @category Constants
 * @since v0.1.0
 * @example
 * ```ts
 * import { LIMITS } from "@synapse-sap/sdk/constants";
 *
 * if (name.length > LIMITS.MAX_NAME_LEN) {
 *   throw new Error("Agent name too long");
 * }
 * ```
 */
export const LIMITS = {
  /** Max agent name length in bytes. */
  MAX_NAME_LEN: 64,
  /** Max agent description length in bytes. */
  MAX_DESC_LEN: 256,
  /** Max URI length (agent_uri, x402_endpoint). */
  MAX_URI_LEN: 256,
  /** Max agent DID-style identifier length. */
  MAX_AGENT_ID_LEN: 128,
  /** Max capabilities per agent. */
  MAX_CAPABILITIES: 10,
  /** Max pricing tiers per agent. */
  MAX_PRICING_TIERS: 5,
  /** Max protocol strings per agent. */
  MAX_PROTOCOLS: 5,
  /** Max active plugins per agent. */
  MAX_PLUGINS: 5,
  /** Max volume curve breakpoints per tier. */
  MAX_VOLUME_CURVE_POINTS: 5,
  /** Max feedback tag length. */
  MAX_TAG_LEN: 32,
  /** Max agents in a capability/protocol index. */
  MAX_AGENTS_PER_INDEX: 100,
  /** Max tool name length. */
  MAX_TOOL_NAME_LEN: 32,
  /** Max tools in a category index. */
  MAX_TOOLS_PER_CATEGORY: 100,
  /** Max attestation type length. */
  MAX_ATTESTATION_TYPE_LEN: 32,
  /** Max inscription size (encrypted_data per fragment). */
  MAX_INSCRIPTION_SIZE: 750,
  /** Inscriptions per epoch page. */
  INSCRIPTIONS_PER_EPOCH: 1000,
  /** Max memory chunk size (legacy). */
  MAX_CHUNK_SIZE: 900,
  /** Max write size per buffer append (legacy). */
  MAX_BUFFER_WRITE_SIZE: 750,
  /** Max total buffer page size (legacy). */
  MAX_BUFFER_TOTAL_SIZE: 10_000,
  /** Ring buffer capacity for MemoryLedger. */
  RING_CAPACITY: 4096,
  /** Max ledger write size per call. */
  MAX_LEDGER_WRITE_SIZE: 750,
  /** Max settlements in a batch. */
  MAX_BATCH_SETTLEMENTS: 10,
  /** Feedback score range: 0–1000. */
  MAX_FEEDBACK_SCORE: 1000,
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Protocol Versions
// ═══════════════════════════════════════════════════════════════════

/**
 * Current on-chain protocol version for `AgentAccount`.
 *
 * @name AGENT_VERSION
 * @description Integer version stamped into every agent account on registration.
 * @category Constants
 * @since v0.1.0
 */
export const AGENT_VERSION = 1;

/**
 * Current on-chain protocol version for `MemoryVault`.
 *
 * @name VAULT_PROTOCOL_VERSION
 * @description Integer version stamped into every vault account on initialisation.
 * @category Constants
 * @since v0.1.0
 */
export const VAULT_PROTOCOL_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════
//  Numeric Enum Values
// ═══════════════════════════════════════════════════════════════════

/**
 * Tool category to `u8` discriminant mapping.
 *
 * Mirrors the Rust `ToolCategory` enum ordinals. Use these values
 * when constructing or filtering tool-related instructions.
 *
 * @name TOOL_CATEGORY_VALUES
 * @description Frozen mapping of tool category names to their on-chain `u8` discriminants.
 * @category Constants
 * @since v0.1.0
 * @example
 * ```ts
 * import { TOOL_CATEGORY_VALUES } from "@synapse-sap/sdk/constants";
 *
 * const categoryByte = TOOL_CATEGORY_VALUES.Swap; // 0
 * ```
 */
export const TOOL_CATEGORY_VALUES = {
  Swap: 0,
  Lend: 1,
  Stake: 2,
  Nft: 3,
  Payment: 4,
  Data: 5,
  Governance: 6,
  Bridge: 7,
  Analytics: 8,
  Custom: 9,
} as const;

/**
 * HTTP method to `u8` discriminant mapping.
 *
 * Mirrors the Rust `HttpMethod` enum ordinals. Used when publishing
 * or filtering tool endpoints.
 *
 * @name HTTP_METHOD_VALUES
 * @description Frozen mapping of HTTP method names to their on-chain `u8` discriminants.
 * @category Constants
 * @since v0.1.0
 * @example
 * ```ts
 * import { HTTP_METHOD_VALUES } from "@synapse-sap/sdk/constants";
 *
 * const method = HTTP_METHOD_VALUES.Post; // 1
 * ```
 */
export const HTTP_METHOD_VALUES = {
  Get: 0,
  Post: 1,
  Put: 2,
  Delete: 3,
  Compound: 4,
} as const;
