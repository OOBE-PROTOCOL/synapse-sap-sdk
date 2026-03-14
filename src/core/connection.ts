/**
 * @module core/connection
 * @description RPC connection factory for SAP v2 SDK.
 *
 * Provides a high-level, synapse-client-sdk–compatible entry point
 * for creating {@link SapClient} instances from an RPC URL and wallet.
 *
 * @category Core
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SapConnection } from "@synapse-sap/sdk";
 *
 * // Quick start — RPC URL + Keypair
 * const sap = SapConnection.fromKeypair("https://api.devnet.solana.com", keypair);
 * const agent = await sap.client.agent.fetch();
 *
 * // Or build step-by-step
 * const conn = new SapConnection({
 *   rpcUrl: "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=xxx",
 *   cluster: "mainnet-beta",
 *   commitment: "confirmed",
 * });
 * const client = conn.createClient(wallet);
 * ```
 */

import {
  Connection,
  type Commitment,
  Keypair,
  type PublicKey,
  type Transaction,
  type VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  SAP_PROGRAM_ID,
  MAINNET_SAP_PROGRAM_ID,
  DEVNET_SAP_PROGRAM_ID,
  LOCALNET_SAP_PROGRAM_ID,
} from "../constants";
import { SapClient } from "./client";

// ═══════════════════════════════════════════════════════════════════
//  Wallet interface (replaces Anchor's Wallet which is not
//  exported from the ESM bundle of @coral-xyz/anchor)
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface SapWallet
 * @description Minimal wallet/signer interface compatible with
 * Anchor's `AnchorProvider`. Avoids importing `Wallet` from
 * `@coral-xyz/anchor` which is absent in ESM builds.
 * @category Core
 * @since v0.4.1
 */
export interface SapWallet {
  readonly publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

/**
 * @name KeypairWallet
 * @description Simple wallet wrapper around a `Keypair`.
 * Drop-in replacement for Anchor's `NodeWallet` / `Wallet` class.
 * @category Core
 * @since v0.4.1
 */
export class KeypairWallet implements SapWallet {
  readonly publicKey: PublicKey;

  constructor(readonly payer: Keypair) {
    this.publicKey = payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if ("partialSign" in tx) {
      (tx as Transaction).partialSign(this.payer);
    } else {
      (tx as VersionedTransaction).sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    for (const tx of txs) {
      await this.signTransaction(tx);
    }
    return txs;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapCluster
 * @description Supported Solana cluster names used to select the RPC endpoint
 * and corresponding SAP program ID.
 * @category Core
 * @since v0.1.0
 */
export type SapCluster = "mainnet-beta" | "devnet" | "localnet";

/**
 * @interface SapConnectionConfig
 * @description Configuration object used to initialise a {@link SapConnection}.
 * @category Core
 * @since v0.1.0
 * @see {@link SapConnection}
 */
export interface SapConnectionConfig {
  /**
   * @property {string} rpcUrl
   * @description Solana JSON-RPC endpoint URL (e.g. `https://api.devnet.solana.com`).
   */
  rpcUrl: string;

  /**
   * @property {string} [wsUrl]
   * @description WebSocket endpoint URL. When omitted the SDK derives it
   * automatically from {@link rpcUrl} by swapping the protocol scheme.
   */
  wsUrl?: string;

  /**
   * @property {Commitment} [commitment]
   * @description Commitment level for queries and transaction confirmations.
   * Defaults to `"confirmed"` when not provided.
   */
  commitment?: Commitment;

  /**
   * @property {SapCluster} [cluster]
   * @description Cluster hint (`mainnet-beta` | `devnet` | `localnet`).
   * When omitted the SDK infers it from {@link rpcUrl} via
   * {@link SapConnection.detectCluster}.
   */
  cluster?: SapCluster;
}

// ═══════════════════════════════════════════════════════════════════
//  Implementation
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapConnection
 * @description Lightweight RPC connection wrapper that creates
 * properly-configured {@link SapClient} instances.
 *
 * Compatible with the `synapse-client-sdk` connection model:
 * start from an RPC URL, attach a wallet, get a typed client.
 *
 * @category Core
 * @since v0.1.0
 * @see {@link SapClient}
 * @see {@link SapConnectionConfig}
 *
 * @example
 * ```ts
 * // Factory shortcut for devnet
 * const conn = SapConnection.devnet();
 * const client = conn.createClient(wallet);
 *
 * // One-liner with Keypair
 * const { client } = SapConnection.fromKeypair(
 *   "https://api.devnet.solana.com",
 *   keypair,
 * );
 * ```
 */
export class SapConnection {
  /**
   * @readonly
   * @description Raw Solana {@link Connection}. Exposed for advanced
   * use-cases that need direct RPC access.
   */
  readonly connection: Connection;

  /**
   * @readonly
   * @description The resolved Solana cluster for this connection,
   * either explicitly provided or auto-detected from the RPC URL.
   */
  readonly cluster: SapCluster;

  /**
   * @readonly
   * @description Commitment level used for all queries and
   * transaction confirmations on this connection.
   */
  readonly commitment: Commitment;

  /**
   * @readonly
   * @description The SAP on-chain program {@link PublicKey} resolved
   * for the current {@link cluster}.
   * @see {@link SapConnection.programIdForCluster}
   */
  readonly programId: PublicKey;

  constructor(config: SapConnectionConfig) {
    this.commitment = config.commitment ?? "confirmed";
    this.cluster = config.cluster ?? SapConnection.detectCluster(config.rpcUrl);
    this.programId = SapConnection.programIdForCluster(this.cluster);

    this.connection = new Connection(config.rpcUrl, {
      commitment: this.commitment,
      wsEndpoint: config.wsUrl,
    });
  }

  // ─────────────────────────────────────────────
  //  Factory helpers
  // ─────────────────────────────────────────────

  /**
   * Create a {@link SapConnection} for **devnet** with sensible defaults.
   *
   * @static
   * @param {Commitment} [commitment="confirmed"] — Commitment level.
   * @returns {SapConnection} A connection targeting Solana devnet.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const conn = SapConnection.devnet();
   * ```
   */
  static devnet(commitment: Commitment = "confirmed"): SapConnection {
    return new SapConnection({
      rpcUrl: "https://api.devnet.solana.com",
      cluster: "devnet",
      commitment,
    });
  }

  /**
   * Create a {@link SapConnection} for **mainnet-beta** with sensible defaults.
   *
   * @static
   * @param {string} [rpcUrl="https://api.mainnet-beta.solana.com"] — Custom RPC URL.
   * @param {Commitment} [commitment="confirmed"] — Commitment level.
   * @returns {SapConnection} A connection targeting Solana mainnet-beta.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const conn = SapConnection.mainnet("https://my-rpc.example.com");
   * ```
   */
  static mainnet(
    rpcUrl = "https://api.mainnet-beta.solana.com",
    commitment: Commitment = "confirmed",
  ): SapConnection {
    return new SapConnection({ rpcUrl, cluster: "mainnet-beta", commitment });
  }

  /**
   * Create a {@link SapConnection} for **localnet** (`localhost:8899`).
   *
   * @static
   * @param {Commitment} [commitment="confirmed"] — Commitment level.
   * @returns {SapConnection} A connection targeting a local validator.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const conn = SapConnection.localnet();
   * ```
   */
  static localnet(commitment: Commitment = "confirmed"): SapConnection {
    return new SapConnection({
      rpcUrl: "http://localhost:8899",
      cluster: "localnet",
      commitment,
    });
  }

  /**
   * One-liner: create a {@link SapConnection} + {@link SapClient} from
   * an RPC URL and a `Keypair`. Perfect for scripts and CLI tools.
   *
   * @static
   * @param {string} rpcUrl — Solana JSON-RPC endpoint.
   * @param {Keypair} keypair — Signer keypair.
   * @param {object} [opts] — Optional overrides.
   * @param {Commitment} [opts.commitment] — Commitment level.
   * @param {SapCluster} [opts.cluster] — Explicit cluster hint.
   * @returns {SapConnection & { readonly client: SapClient }} Connection with an attached client.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const { client, connection } = SapConnection.fromKeypair(
   *   "https://api.devnet.solana.com",
   *   Keypair.generate(),
   * );
   * ```
   */
  static fromKeypair(
    rpcUrl: string,
    keypair: Keypair,
    opts?: { commitment?: Commitment; cluster?: SapCluster },
  ): SapConnection & { readonly client: SapClient } {
    const conn = new SapConnection({
      rpcUrl,
      commitment: opts?.commitment,
      cluster: opts?.cluster,
    });
    const client = conn.createClient(new KeypairWallet(keypair));
    return Object.assign(conn, { client });
  }

  // ─────────────────────────────────────────────
  //  Client creation
  // ─────────────────────────────────────────────

  /**
   * Create a {@link SapClient} from a {@link SapWallet} (signer).
   *
   * @param {SapWallet} wallet — A wallet/signer implementing {@link SapWallet}.
   * @returns {SapClient} A fully-configured SAP client.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const client = conn.createClient(new KeypairWallet(keypair));
   * ```
   */
  createClient(wallet: SapWallet): SapClient {
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: this.commitment,
    });
    return SapClient.from(provider, this.programId);
  }

  /**
   * Create a {@link SapClient} from a raw {@link Keypair}.
   *
   * @param {Keypair} keypair — The signer keypair.
   * @returns {SapClient} A fully-configured SAP client.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const client = conn.fromKeypair(Keypair.generate());
   * ```
   */
  fromKeypair(keypair: Keypair): SapClient {
    return this.createClient(new KeypairWallet(keypair));
  }

  // ─────────────────────────────────────────────
  //  Utility methods
  // ─────────────────────────────────────────────

  /**
   * Request an airdrop (devnet / localnet only).
   *
   * @param {PublicKey} to — Recipient public key.
   * @param {number} solAmount — Amount of SOL to airdrop.
   * @returns {Promise<string>} The confirmed transaction signature.
   * @throws {Error} If the airdrop request or confirmation fails (e.g. on mainnet).
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const sig = await conn.airdrop(wallet.publicKey, 2);
   * ```
   */
  async airdrop(to: PublicKey, solAmount: number): Promise<string> {
    const sig = await this.connection.requestAirdrop(
      to,
      solAmount * LAMPORTS_PER_SOL,
    );
    await this.connection.confirmTransaction(sig, this.commitment);
    return sig;
  }

  /**
   * Get the SOL balance of an address in **lamports**.
   *
   * @param {PublicKey} address — The account to query.
   * @returns {Promise<number>} Balance in lamports.
   * @since v0.1.0
   */
  async getBalance(address: PublicKey): Promise<number> {
    return this.connection.getBalance(address, this.commitment);
  }

  /**
   * Get the SOL balance of an address in **SOL** (human-readable).
   *
   * @param {PublicKey} address — The account to query.
   * @returns {Promise<number>} Balance in SOL.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * const sol = await conn.getBalanceSol(wallet.publicKey);
   * console.log(`Balance: ${sol} SOL`);
   * ```
   */
  async getBalanceSol(address: PublicKey): Promise<number> {
    const lamports = await this.getBalance(address);
    return lamports / LAMPORTS_PER_SOL;
  }

  // ─────────────────────────────────────────────
  //  Internal helpers
  // ─────────────────────────────────────────────

  /**
   * Infer the {@link SapCluster} from an RPC URL by inspecting
   * well-known substrings (`devnet`, `localhost`, `:8899`).
   *
   * @static
   * @param {string} rpcUrl — The RPC endpoint to inspect.
   * @returns {SapCluster} The detected cluster, defaulting to `"mainnet-beta"`.
   * @since v0.1.0
   */
  static detectCluster(rpcUrl: string): SapCluster {
    const lower = rpcUrl.toLowerCase();
    if (lower.includes("devnet")) return "devnet";
    if (
      lower.includes("localhost") ||
      lower.includes("127.0.0.1") ||
      lower.includes(":8899")
    )
      return "localnet";
    return "mainnet-beta";
  }

  /**
   * Map a {@link SapCluster} to the canonical SAP on-chain program ID.
   *
   * @static
   * @param {SapCluster} cluster — Target cluster.
   * @returns {PublicKey} The program {@link PublicKey} for the given cluster.
   * @since v0.1.0
   * @see {@link SAP_PROGRAM_ID}
   */
  static programIdForCluster(cluster: SapCluster): PublicKey {
    switch (cluster) {
      case "mainnet-beta":
        return MAINNET_SAP_PROGRAM_ID;
      case "devnet":
        return DEVNET_SAP_PROGRAM_ID;
      case "localnet":
        return LOCALNET_SAP_PROGRAM_ID;
      default:
        return SAP_PROGRAM_ID;
    }
  }
}
