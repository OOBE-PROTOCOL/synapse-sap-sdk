/**
 * @module constants/seeds
 * @description PDA seed prefix constants.
 *
 * Every seed string mirrors the Rust `#[account(seeds = [...])]` definitions.
 *
 * @category Constants
 * @since v0.1.0
 */

// ═══════════════════════════════════════════════════════════════════
//  PDA Seed Prefixes
// ═══════════════════════════════════════════════════════════════════

/**
 * PDA seed prefix lookup table.
 *
 * Each key corresponds to an on-chain account type, and the value is the
 * UTF-8 string used as the first seed segment in
 * `PublicKey.findProgramAddressSync`.
 *
 * @name SEEDS
 * @description Maps logical account names to their Rust-defined PDA seed prefix strings.
 * @category Constants
 * @since v0.1.0
 * @example
 * ```ts
 * import { SEEDS } from "@synapse-sap/sdk/constants";
 *
 * Buffer.from(SEEDS.AGENT); // => "sap_agent"
 * ```
 * @see {@link SeedKey}
 */
export const SEEDS = {
  AGENT: "sap_agent",
  FEEDBACK: "sap_feedback",
  CAPABILITY_INDEX: "sap_cap_idx",
  PROTOCOL_INDEX: "sap_proto_idx",
  GLOBAL: "sap_global",
  PLUGIN: "sap_plugin",
  MEMORY: "sap_memory",
  MEMORY_CHUNK: "sap_mem_chunk",
  VAULT: "sap_vault",
  SESSION: "sap_session",
  EPOCH: "sap_epoch",
  DELEGATE: "sap_delegate",
  TOOL: "sap_tool",
  CHECKPOINT: "sap_checkpoint",
  ESCROW: "sap_escrow",
  STATS: "sap_stats",
  TOOL_CATEGORY: "sap_tool_cat",
  ATTESTATION: "sap_attest",
  LEDGER: "sap_ledger",
  LEDGER_PAGE: "sap_page",
} as const;

/**
 * Union type of all valid keys in the {@link SEEDS} object.
 *
 * @name SeedKey
 * @description String literal union derived from `keyof typeof SEEDS`.
 * @category Constants
 * @since v0.1.0
 * @see {@link SEEDS}
 */
export type SeedKey = keyof typeof SEEDS;
