/**
 * @module constants/programs
 * @description SAP v2 program IDs for each Solana cluster.
 *
 * The canonical program address is shared across mainnet, devnet,
 * and localnet. If you deploy a custom instance, override the
 * program ID in `SapClient.from(provider, customProgramId)`.
 *
 * @category Constants
 * @since v0.1.0
 */

import { PublicKey } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════
//  Program Address
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP v2 program address string (base58).
 *
 * Vanity keypair derived from the `SAPTU7a…` prefix.
 *
 * @name SAP_PROGRAM_ADDRESS
 * @description The canonical on-chain program address shared by all Solana clusters.
 * @category Constants
 * @since v0.1.0
 * @see {@link SAP_PROGRAM_ID}
 */
export const SAP_PROGRAM_ADDRESS =
  "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ";

// ═══════════════════════════════════════════════════════════════════
//  Per-Network PublicKeys
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP v2 mainnet-beta program ID.
 *
 * @name MAINNET_SAP_PROGRAM_ID
 * @description `PublicKey` instance of {@link SAP_PROGRAM_ADDRESS} for mainnet-beta.
 * @category Constants
 * @since v0.1.0
 * @see {@link SAP_PROGRAM_ADDRESS}
 */
export const MAINNET_SAP_PROGRAM_ID = new PublicKey(SAP_PROGRAM_ADDRESS);

/**
 * SAP v2 devnet program ID.
 *
 * @name DEVNET_SAP_PROGRAM_ID
 * @description `PublicKey` instance of {@link SAP_PROGRAM_ADDRESS} for devnet.
 * @category Constants
 * @since v0.1.0
 * @see {@link SAP_PROGRAM_ADDRESS}
 */
export const DEVNET_SAP_PROGRAM_ID = new PublicKey(SAP_PROGRAM_ADDRESS);

/**
 * Localnet / solana-test-validator program ID.
 *
 * Override with your own keypair if deploying locally at a different address.
 *
 * @name LOCALNET_SAP_PROGRAM_ID
 * @description `PublicKey` instance of {@link SAP_PROGRAM_ADDRESS} for localnet / `solana-test-validator`.
 * @category Constants
 * @since v0.1.0
 * @see {@link SAP_PROGRAM_ADDRESS}
 */
export const LOCALNET_SAP_PROGRAM_ID = new PublicKey(SAP_PROGRAM_ADDRESS);

/**
 * Default program ID used by `SapClient.from()` when no explicit ID is provided.
 *
 * Alias for {@link MAINNET_SAP_PROGRAM_ID}.
 *
 * @name SAP_PROGRAM_ID
 * @description Convenience alias pointing to the mainnet-beta program ID.
 * @category Constants
 * @since v0.1.0
 * @see {@link MAINNET_SAP_PROGRAM_ID}
 */
export const SAP_PROGRAM_ID = MAINNET_SAP_PROGRAM_ID;
