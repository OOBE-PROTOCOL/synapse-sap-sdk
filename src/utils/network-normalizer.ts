/**
 * @module utils/network-normalizer
 * @description Network identifier normalization for x402 payment headers.
 *
 * Solves the canonical-string mismatch between SAP clients and servers:
 * some providers accept `solana:mainnet-beta` while others require
 * the genesis-hash form `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`.
 *
 * This module provides a single source of truth for normalizing
 * network identifiers so that both clients and agents canonicalize
 * before comparing. Catches the Kamiyo "sap network mismatch" error
 * at the SDK level.
 *
 * @category Utils
 * @since v0.6.0
 */

import { SapNetwork, type SapNetworkId } from "../constants/network";

// ═══════════════════════════════════════════════════════════════════
//  Canonical Mapping
// ═══════════════════════════════════════════════════════════════════

/**
 * Bidirectional alias map: for every known network string, stores the
 * canonical SapNetworkId it resolves to, plus all known aliases.
 */
const NETWORK_ALIASES: ReadonlyMap<string, SapNetworkId> = new Map([
  // ── Mainnet ───────────────────────────────
  // Canonical: genesis-hash form
  ["solana:mainnet-beta", SapNetwork.SOLANA_MAINNET],
  ["solana:mainnet", SapNetwork.SOLANA_MAINNET],
  ["mainnet-beta", SapNetwork.SOLANA_MAINNET],
  ["mainnet", SapNetwork.SOLANA_MAINNET],
  ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", SapNetwork.SOLANA_MAINNET_GENESIS],
  ["5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", SapNetwork.SOLANA_MAINNET_GENESIS],

  // ── Devnet ────────────────────────────────
  ["solana:devnet", SapNetwork.SOLANA_DEVNET_NAMED],
  ["devnet", SapNetwork.SOLANA_DEVNET_NAMED],
  ["solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", SapNetwork.SOLANA_DEVNET],
  ["EtWTRABZaYq6iMfeYKouRu166VU2xqa1", SapNetwork.SOLANA_DEVNET],
]);

/**
 * Mainnet equivalence set: all strings that refer to Solana mainnet-beta,
 * regardless of format.
 */
const MAINNET_EQUIVALENTS = new Set<string>([
  SapNetwork.SOLANA_MAINNET,
  SapNetwork.SOLANA_MAINNET_GENESIS,
  "solana:mainnet",
  "mainnet-beta",
  "mainnet",
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
]);

/**
 * Devnet equivalence set.
 */
const DEVNET_EQUIVALENTS = new Set<string>([
  SapNetwork.SOLANA_DEVNET,
  SapNetwork.SOLANA_DEVNET_NAMED,
  "devnet",
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
]);

// ═══════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════

/**
 * @name normalizeNetworkId
 * @description Normalize a raw network identifier string to its canonical
 * {@link SapNetworkId} form.
 *
 * Handles:
 *   - Case-insensitive matching
 *   - Stripping whitespace
 *   - Resolving genesis-hash vs. cluster-name aliases
 *   - Unknown strings are returned as-is (passthrough)
 *
 * @param raw - Raw network identifier string from headers, env vars, or config.
 * @returns The canonical {@link SapNetworkId}, or the trimmed input if unknown.
 *
 * @category Utils
 * @since v0.6.0
 *
 * @example
 * ```ts
 * import { normalizeNetworkId } from "@synapse-sap/sdk";
 *
 * normalizeNetworkId("solana:mainnet-beta");
 * // → "solana:mainnet-beta"
 *
 * normalizeNetworkId("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
 * // → "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
 *
 * normalizeNetworkId("  MAINNET  ");
 * // → "solana:mainnet-beta"
 * ```
 */
export function normalizeNetworkId(raw: string): SapNetworkId | string {
  const trimmed = raw.trim();
  // Exact match first
  const exact = NETWORK_ALIASES.get(trimmed);
  if (exact) return exact;

  // Case-insensitive lookup
  const lower = trimmed.toLowerCase();
  for (const [alias, canonical] of NETWORK_ALIASES) {
    if (alias.toLowerCase() === lower) return canonical;
  }

  // Passthrough for unknown networks (custom chains, etc.)
  return trimmed;
}

/**
 * @name isNetworkEquivalent
 * @description Check if two network identifier strings refer to the same network,
 * even if they use different formats (cluster-name vs. genesis-hash).
 *
 * This is the key function that prevents the Kamiyo "sap network mismatch"
 * error — instead of comparing strings literally, we compare their
 * canonical equivalence class.
 *
 * @param a - First network identifier.
 * @param b - Second network identifier.
 * @returns `true` if both identifiers refer to the same Solana network.
 *
 * @category Utils
 * @since v0.6.0
 *
 * @example
 * ```ts
 * import { isNetworkEquivalent } from "@synapse-sap/sdk";
 *
 * isNetworkEquivalent("solana:mainnet-beta", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
 * // → true
 *
 * isNetworkEquivalent("solana:devnet", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
 * // → true
 *
 * isNetworkEquivalent("solana:mainnet-beta", "solana:devnet");
 * // → false
 * ```
 */
export function isNetworkEquivalent(a: string, b: string): boolean {
  const normA = a.trim();
  const normB = b.trim();

  // Fast path: identical strings
  if (normA === normB) return true;

  // Check if both are in the same equivalence set
  if (MAINNET_EQUIVALENTS.has(normA) && MAINNET_EQUIVALENTS.has(normB)) return true;
  if (DEVNET_EQUIVALENTS.has(normA) && DEVNET_EQUIVALENTS.has(normB)) return true;

  // Case-insensitive match
  const lowerA = normA.toLowerCase();
  const lowerB = normB.toLowerCase();
  if (lowerA === lowerB) return true;

  // Resolve both to canonical and compare
  const canonA = normalizeNetworkId(normA);
  const canonB = normalizeNetworkId(normB);

  if (canonA === canonB) return true;

  // Final check: both resolve to the same equivalence set
  if (MAINNET_EQUIVALENTS.has(canonA) && MAINNET_EQUIVALENTS.has(canonB)) return true;
  if (DEVNET_EQUIVALENTS.has(canonA) && DEVNET_EQUIVALENTS.has(canonB)) return true;

  return false;
}

/**
 * @name getNetworkGenesisHash
 * @description Get the genesis-hash form of a network identifier.
 * Returns the genesis-hash variant for known networks, or the input as-is.
 *
 * Useful for agents that require the genesis-hash form (Kamiyo, Helius x402).
 *
 * @param networkId - Any network identifier.
 * @returns The genesis-hash form, or the input if unknown.
 *
 * @category Utils
 * @since v0.6.0
 */
export function getNetworkGenesisHash(networkId: string): string {
  const norm = normalizeNetworkId(networkId);
  if (MAINNET_EQUIVALENTS.has(networkId) || MAINNET_EQUIVALENTS.has(norm)) {
    return SapNetwork.SOLANA_MAINNET_GENESIS;
  }
  if (DEVNET_EQUIVALENTS.has(networkId) || DEVNET_EQUIVALENTS.has(norm)) {
    return SapNetwork.SOLANA_DEVNET;
  }
  return norm;
}

/**
 * @name getNetworkClusterName
 * @description Get the cluster-name form of a network identifier.
 * Returns the human-readable cluster name for known networks.
 *
 * Useful for providers that accept cluster names (Coinbase, Phantom).
 *
 * @param networkId - Any network identifier.
 * @returns The cluster-name form, or the input if unknown.
 *
 * @category Utils
 * @since v0.6.0
 */
export function getNetworkClusterName(networkId: string): string {
  const norm = normalizeNetworkId(networkId);
  if (MAINNET_EQUIVALENTS.has(networkId) || MAINNET_EQUIVALENTS.has(norm)) {
    return SapNetwork.SOLANA_MAINNET;
  }
  if (DEVNET_EQUIVALENTS.has(networkId) || DEVNET_EQUIVALENTS.has(norm)) {
    return SapNetwork.SOLANA_DEVNET_NAMED;
  }
  return norm;
}

/**
 * @name isKnownNetwork
 * @description Check if a network identifier is recognized by the SDK.
 *
 * @param networkId - The network identifier to check.
 * @returns `true` if the identifier maps to a known Solana network.
 *
 * @category Utils
 * @since v0.6.0
 */
export function isKnownNetwork(networkId: string): boolean {
  const trimmed = networkId.trim();
  return MAINNET_EQUIVALENTS.has(trimmed) || DEVNET_EQUIVALENTS.has(trimmed) ||
    NETWORK_ALIASES.has(trimmed);
}
