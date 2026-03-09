/**
 * @module constants
 * @description Protocol constants mirroring the onchain Rust program.
 *
 * All seed strings, size limits, and protocol parameters are
 * defined here as `const` singletons — never duplicated.
 */

import { PublicKey } from "@solana/web3.js";

// ═════════════════════════════════════════════
//  Program ID
// ═════════════════════════════════════════════

/** SAP v2 program ID (mainnet / devnet). */
export const SAP_PROGRAM_ID = new PublicKey(
  "HViHGjgLaFH1g289VPb3NFkU8JPaHssVUui6XtaA6Gch",
);

// ═════════════════════════════════════════════
//  PDA Seed Prefixes
// ═════════════════════════════════════════════

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

export type SeedKey = keyof typeof SEEDS;

// ═════════════════════════════════════════════
//  Size Limits (mirrors Rust impl blocks)
// ═════════════════════════════════════════════

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

// ═════════════════════════════════════════════
//  Protocol Version
// ═════════════════════════════════════════════

/** Current protocol version for AgentAccount. */
export const AGENT_VERSION = 1;

/** Current protocol version for MemoryVault. */
export const VAULT_PROTOCOL_VERSION = 1;

// ═════════════════════════════════════════════
//  Tool Category numeric values
// ═════════════════════════════════════════════

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

export const HTTP_METHOD_VALUES = {
  Get: 0,
  Post: 1,
  Put: 2,
  Delete: 3,
  Compound: 4,
} as const;
