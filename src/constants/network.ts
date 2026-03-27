/**
 * @module constants/network
 * @description Solana network identifiers for x402 payment headers.
 *
 * x402 providers validate the `X-Payment-Network` header against their
 * own network identifier. Some providers (e.g. Coinbase, Phantom) accept
 * the human-readable cluster name (`solana:mainnet-beta`), while others
 * (e.g. Kamiyo, Helius x402) require the Solana genesis-hash form
 * (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`).
 *
 * Use {@link SapNetwork} to select the correct format, or pass any
 * custom string where needed.
 *
 * @category Constants
 * @since v0.4.3
 *
 * @example
 * ```ts
 * import { SapNetwork } from "@synapse-sap/sdk";
 *
 * // Standard cluster name (default)
 * const ctx = await x402.preparePayment(agentWallet, {
 *   pricePerCall: 1000, deposit: 100_000,
 *   networkIdentifier: SapNetwork.SOLANA_MAINNET,
 * });
 *
 * // Genesis-hash form for providers that require it
 * const ctx2 = await x402.preparePayment(agentWallet, {
 *   pricePerCall: 1000, deposit: 100_000,
 *   networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS,
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════════
//  SAP Network Identifiers
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapNetwork
 * @description Network identifier strings for x402 `X-Payment-Network` headers.
 *
 * Two mainnet forms exist because x402 providers disagree on the canonical
 * identifier:
 *
 * | Constant                | Value                                        | Accepted by          |
 * |-------------------------|----------------------------------------------|----------------------|
 * | `SOLANA_MAINNET`        | `solana:mainnet-beta`                        | Coinbase, Phantom    |
 * | `SOLANA_MAINNET_GENESIS`| `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`   | Kamiyo, Helius x402  |
 * | `SOLANA_DEVNET`         | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`   | Devnet providers     |
 * | `SOLANA_DEVNET_NAMED`   | `solana:devnet`                              | Local / test flows   |
 *
 * If your provider requires a different format, pass a raw string instead.
 *
 * @category Constants
 * @since v0.4.3
 */
export const SapNetwork = {
  /**
   * Mainnet-beta, human-readable cluster name.
   * Default value used by the SDK prior to v0.4.3.
   */
  SOLANA_MAINNET: "solana:mainnet-beta",

  /**
   * Mainnet-beta, genesis-hash form (CAIP-2 compliant).
   * Required by Kamiyo, Helius x402, and other providers that validate
   * against the Solana genesis hash.
   */
  SOLANA_MAINNET_GENESIS: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",

  /**
   * Devnet, genesis-hash form (CAIP-2 compliant).
   */
  SOLANA_DEVNET: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",

  /**
   * Devnet, human-readable cluster name.
   * Useful for local development and test validators.
   */
  SOLANA_DEVNET_NAMED: "solana:devnet",
} as const;

/**
 * @name SapNetworkId
 * @description Union type of all known {@link SapNetwork} values.
 * Accept `SapNetworkId | string` where custom identifiers are allowed.
 */
export type SapNetworkId = (typeof SapNetwork)[keyof typeof SapNetwork];
