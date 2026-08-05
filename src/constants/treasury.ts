/**
 * Treasury Wallet Configuration
 *
 * Protocol treasury wallet for revenue fee collection.
 * This wallet receives all protocol fees from:
 * - Agent registration (0.1 SOL)
 * - Escrow settlement (0.5%)
 * - Featured listings (1 SOL)
 *
 * @category Constants
 * @since v1.0.0
 */

import { PublicKey } from "@solana/web3.js";

/**
 * Treasury wallet public key
 *
 * This is the canonical treasury wallet that receives all protocol fees.
 * Fee-paying instructions must pass this account as a writable, non-signer
 * remaining account. The on-chain program rejects any other treasury.
 *
 * @example
 * ```ts
 * import { TREASURY_WALLET } from "@synapse-sap/sdk/constants";
 * console.log("Treasury:", TREASURY_WALLET.toString());
 * ```
 */
export const TREASURY_WALLET = new PublicKey(
  "J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P",
);
export const REGISTRATION_FEE_LAMPORTS = 100_000_000;

/**
 * Get treasury wallet for current network
 *
 * @returns Treasury wallet PublicKey
 *
 * @example
 * ```ts
 * import { getTreasuryWallet } from "@synapse-sap/sdk/constants";
 * const treasury = getTreasuryWallet();
 * ```
 */
export function getTreasuryWallet(): PublicKey {
  return TREASURY_WALLET;
}

/**
 * Check if provided pubkey is the treasury wallet
 *
 * @param pubkey - PublicKey to check
 * @returns true if matches treasury wallet
 *
 * @example
 * ```ts
 * import { isTreasuryWallet } from "@synapse-sap/sdk/constants";
 * if (isTreasuryWallet(somePubkey)) {
 *   console.log("This is the treasury wallet!");
 * }
 * ```
 */
export function isTreasuryWallet(pubkey: PublicKey): boolean {
  return pubkey.equals(TREASURY_WALLET);
}
