/**
 * @module constants/addresses
 * @description Pre-computed mainnet addresses for singleton PDAs and protocol infrastructure.
 *
 * These addresses are deterministic — derived from the canonical program ID
 * and fixed seeds. They are provided for convenience so consumers can
 * reference well-known accounts without re-deriving them.
 *
 * @category Constants
 * @since v0.3.1
 */

import { PublicKey } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════
//  Program & Authority
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP v2 program ID on mainnet-beta (base58).
 *
 * @name SAP_PROGRAM
 * @description The deployed and verified SAP v2 program address.
 * @category Constants
 * @since v0.3.1
 */
export const SAP_PROGRAM = new PublicKey(
  "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
);

/**
 * Upgrade authority for the SAP v2 program.
 *
 * @name SAP_UPGRADE_AUTHORITY
 * @description The wallet that holds upgrade authority over the deployed program.
 * @category Constants
 * @since v0.3.1
 */
export const SAP_UPGRADE_AUTHORITY = new PublicKey(
  "GBLQznn1QMnx64zHXcDguP9yNW9ZfYCVdrY8eDovBvPk",
);

// ═══════════════════════════════════════════════════════════════════
//  Singleton PDAs
// ═══════════════════════════════════════════════════════════════════

/**
 * **GlobalRegistry** PDA — the protocol singleton.
 *
 * Seeds: `["sap_global"]` · Bump: `255`
 *
 * Tracks total agent count, active agent count, and protocol-level
 * counters. Must be initialized once before any agent can register.
 *
 * @name GLOBAL_REGISTRY_ADDRESS
 * @category Constants
 * @since v0.3.1
 */
export const GLOBAL_REGISTRY_ADDRESS = new PublicKey(
  "9odFrYBBZq6UQC6aGyzMPNXWJQn55kMtfigzhLg6S6L5",
);

/**
 * Bump seed for the GlobalRegistry PDA.
 * @name GLOBAL_REGISTRY_BUMP
 * @category Constants
 * @since v0.3.1
 */
export const GLOBAL_REGISTRY_BUMP = 255;

// ═══════════════════════════════════════════════════════════════════
//  IDL Account (program-metadata format)
// ═══════════════════════════════════════════════════════════════════

/**
 * IDL metadata account derived via the `program-metadata` standard.
 *
 * Seeds: `["idl", program_id]` under `pmetaypqG6SiB47xMigYVMAkuHDWeSDXcv3zzDrJJvA`.
 *
 * Contains the Anchor IDL JSON, queryable by explorers like Solscan.
 *
 * @name IDL_ACCOUNT_ADDRESS
 * @category Constants
 * @since v0.3.1
 */
export const IDL_ACCOUNT_ADDRESS = new PublicKey(
  "ENs7L1NFuoP7dur8cqGGE6b98CQHfNeDZPWPSjRzhc4f",
);

/**
 * The `program-metadata` program used to store the IDL.
 *
 * @name PROGRAM_METADATA_PROGRAM
 * @category Constants
 * @since v0.3.1
 */
export const PROGRAM_METADATA_PROGRAM = new PublicKey(
  "pmetaypqG6SiB47xMigYVMAkuHDWeSDXcv3zzDrJJvA",
);

// ═══════════════════════════════════════════════════════════════════
//  Tool Category Index PDAs (pre-computed for categories 0–9)
// ═══════════════════════════════════════════════════════════════════

/**
 * Pre-computed Tool Category Index PDAs for each `ToolCategory` variant.
 *
 * Seeds: `["sap_tool_cat", category_byte]`
 *
 * Each entry corresponds to a `ToolCategory` enum discriminant:
 *
 * | Index | Category   | Address                                            |
 * |-------|------------|----------------------------------------------------|
 * | 0     | Swap       | `5H8yn9RuRgZWqkDiWbKNaCHzTMjqSpwbNQKMPLtUXx2G`   |
 * | 1     | Lend       | `5Lqqk6VtFWnYq3h4Ae4FuUAKnFzw1Nm1DaSdt2cjcTDj`   |
 * | 2     | Stake      | `kC8oAiVUcFMXEnmMNu1h2sdAc3dWKcwV5qVKRFYMmQD`    |
 * | 3     | Nft        | `2zNWR9J3znvGQ5J6xDfJyZkd12Gi66mjErRDkgPeKbyF`   |
 * | 4     | Payment    | `Eh7MwxJYWRN8bzAmY3ZPTRXYjWpWypokBf1STixu2dy9`   |
 * | 5     | Data       | `AwpVxehQUZCVTAJ9icZfS6oRbF66jNo32duXaL11B5df`   |
 * | 6     | Governance | `2573WjZzV9QtbqtM6Z86YGivkk1kdvJa4gK3tZRQ2jkN`   |
 * | 7     | Bridge     | `664nyr6kBeeFiE1ij5gtdncNCVHrXqrk2uBhnKmUREvK`   |
 * | 8     | Analytics  | `4DFsiTZ6h6RoCZuUeMTpaoQguepnPUMJBLJuwwjKg5GL`   |
 * | 9     | Custom     | `3Nk5dvFWEyWPEArdG9cCdab6C6ym36mSWUSB8HzN35ZM`   |
 *
 * @name TOOL_CATEGORY_ADDRESSES
 * @category Constants
 * @since v0.3.1
 */
export const TOOL_CATEGORY_ADDRESSES = {
  Swap: new PublicKey("5H8yn9RuRgZWqkDiWbKNaCHzTMjqSpwbNQKMPLtUXx2G"),
  Lend: new PublicKey("5Lqqk6VtFWnYq3h4Ae4FuUAKnFzw1Nm1DaSdt2cjcTDj"),
  Stake: new PublicKey("kC8oAiVUcFMXEnmMNu1h2sdAc3dWKcwV5qVKRFYMmQD"),
  Nft: new PublicKey("2zNWR9J3znvGQ5J6xDfJyZkd12Gi66mjErRDkgPeKbyF"),
  Payment: new PublicKey("Eh7MwxJYWRN8bzAmY3ZPTRXYjWpWypokBf1STixu2dy9"),
  Data: new PublicKey("AwpVxehQUZCVTAJ9icZfS6oRbF66jNo32duXaL11B5df"),
  Governance: new PublicKey("2573WjZzV9QtbqtM6Z86YGivkk1kdvJa4gK3tZRQ2jkN"),
  Bridge: new PublicKey("664nyr6kBeeFiE1ij5gtdncNCVHrXqrk2uBhnKmUREvK"),
  Analytics: new PublicKey("4DFsiTZ6h6RoCZuUeMTpaoQguepnPUMJBLJuwwjKg5GL"),
  Custom: new PublicKey("3Nk5dvFWEyWPEArdG9cCdab6C6ym36mSWUSB8HzN35ZM"),
} as const;

/**
 * Array-indexed version of {@link TOOL_CATEGORY_ADDRESSES}.
 *
 * `TOOL_CATEGORY_ADDRESS_LIST[0]` = Swap, `[1]` = Lend, etc.
 *
 * @name TOOL_CATEGORY_ADDRESS_LIST
 * @category Constants
 * @since v0.3.1
 */
export const TOOL_CATEGORY_ADDRESS_LIST: readonly PublicKey[] = [
  TOOL_CATEGORY_ADDRESSES.Swap,
  TOOL_CATEGORY_ADDRESSES.Lend,
  TOOL_CATEGORY_ADDRESSES.Stake,
  TOOL_CATEGORY_ADDRESSES.Nft,
  TOOL_CATEGORY_ADDRESSES.Payment,
  TOOL_CATEGORY_ADDRESSES.Data,
  TOOL_CATEGORY_ADDRESSES.Governance,
  TOOL_CATEGORY_ADDRESSES.Bridge,
  TOOL_CATEGORY_ADDRESSES.Analytics,
  TOOL_CATEGORY_ADDRESSES.Custom,
] as const;
