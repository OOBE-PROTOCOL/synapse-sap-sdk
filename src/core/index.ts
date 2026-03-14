/**
 * @module core
 * @description Core infrastructure — client creation and RPC connection.
 *
 * @example
 * ```ts
 * import { SapClient, SapConnection } from "@synapse-sap/sdk";
 *
 * // From Anchor provider
 * const client = SapClient.from(provider);
 *
 * // From RPC URL + keypair (synapse-client-sdk compatible)
 * const conn = SapConnection.devnet();
 * const client2 = conn.fromKeypair(keypair);
 * ```
 */

export { SapClient } from "./client";
export { SapConnection, KeypairWallet } from "./connection";
export type { SapCluster, SapConnectionConfig, SapWallet } from "./connection";
