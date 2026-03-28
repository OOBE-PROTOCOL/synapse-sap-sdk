/**
 * @module cli/context
 * @description CLI execution context — loads wallet, creates SapClient,
 * and provides shared utilities for all commands.
 */

import * as fs from "fs";
import * as path from "path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SapConnection, KeypairWallet } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { CliConfig } from "./config";
import { log } from "./logger";

// ═══════════════════════════════════════════════════════════════════
//  Context
// ═══════════════════════════════════════════════════════════════════

export interface CliContext {
  readonly config: CliConfig;
  readonly connection: SapConnection;
  readonly client: SapClient;
  readonly wallet: Keypair;
}

/**
 * Load a Keypair from the configured path or base58 key.
 */
export function loadKeypair(config: CliConfig): Keypair {
  // Try base58 private key first
  if (config.privateKey) {
    const decoded = Buffer.from(config.privateKey, "base64");
    if (decoded.length === 64) {
      return Keypair.fromSecretKey(decoded);
    }
    // Try JSON array format
    try {
      const arr = JSON.parse(config.privateKey);
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch {
      throw new Error("Invalid WALLET_PRIVATE_KEY format");
    }
  }

  // Try keypair file path
  const kpPath = config.walletPath ?? path.join(
    process.env.HOME ?? "~",
    ".config",
    "solana",
    "id.json",
  );

  const resolvedPath = kpPath.startsWith("~")
    ? path.join(process.env.HOME ?? "", kpPath.slice(1))
    : kpPath;

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Keypair file not found: ${resolvedPath}\n` +
      "Set WALLET_KEYPAIR_PATH or use --keypair <path>",
    );
  }

  const raw = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

/**
 * Build the full CLI execution context.
 */
export function buildContext(config: CliConfig): CliContext {
  const wallet = loadKeypair(config);

  const sapConn = new SapConnection({
    rpcUrl: config.rpc,
    cluster: config.cluster,
  });

  const programId = config.programId
    ? new PublicKey(config.programId)
    : undefined;

  const client = programId
    ? sapConn.createClient(new KeypairWallet(wallet))
    : sapConn.createClient(new KeypairWallet(wallet));

  log.debug(`Wallet: ${wallet.publicKey.toBase58()}`);
  log.debug(`Cluster: ${config.cluster}`);
  log.debug(`RPC: ${config.rpc}`);

  return { config, connection: sapConn, client, wallet };
}

/**
 * Parse a wallet string — either a base58 pubkey or a keypair file path.
 */
export function parseWallet(input: string): PublicKey {
  try {
    return new PublicKey(input);
  } catch {
    // Try reading as keypair file
    if (fs.existsSync(input)) {
      const raw = JSON.parse(fs.readFileSync(input, "utf-8"));
      const kp = Keypair.fromSecretKey(Uint8Array.from(raw));
      return kp.publicKey;
    }
    throw new Error(`Invalid wallet address or keypair path: ${input}`);
  }
}
