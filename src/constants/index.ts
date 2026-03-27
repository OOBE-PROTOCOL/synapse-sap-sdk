/**
 * @module constants
 * @description Protocol constants mirroring the on-chain Rust program.
 *
 * Organized into:
 * - **programs** — Network-specific program IDs
 * - **seeds** — PDA seed prefix strings
 * - **limits** — Size constraints, versions, enum numeric values
 *
 * @category Constants
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import {
 *   MAINNET_SAP_PROGRAM_ID,
 *   DEVNET_SAP_PROGRAM_ID,
 *   SEEDS,
 *   LIMITS,
 * } from "@synapse-sap/sdk/constants";
 * ```
 */

// ── Program IDs ──────────────────────────────────────
export {
  SAP_PROGRAM_ADDRESS,
  MAINNET_SAP_PROGRAM_ID,
  DEVNET_SAP_PROGRAM_ID,
  LOCALNET_SAP_PROGRAM_ID,
  SAP_PROGRAM_ID,
} from "./programs";

// ── PDA Seeds ────────────────────────────────────────
export { SEEDS } from "./seeds";
export type { SeedKey } from "./seeds";

// ── Limits & Versions ────────────────────────────────
export {
  LIMITS,
  AGENT_VERSION,
  VAULT_PROTOCOL_VERSION,
  TOOL_CATEGORY_VALUES,
  HTTP_METHOD_VALUES,
} from "./limits";
// ── Network Identifiers (x402) ───────────────────────────────
export { SapNetwork } from "./network";
export type { SapNetworkId } from "./network";

// ── Mainnet Addresses ────────────────────────────────────────
export {
  SAP_PROGRAM,
  SAP_UPGRADE_AUTHORITY,
  GLOBAL_REGISTRY_ADDRESS,
  GLOBAL_REGISTRY_BUMP,
  IDL_ACCOUNT_ADDRESS,
  PROGRAM_METADATA_PROGRAM,
  TOOL_CATEGORY_ADDRESSES,
  TOOL_CATEGORY_ADDRESS_LIST,
} from "./addresses";