/**
 * @module cli/context
 * @description CLI execution context — v0.14.0 aligned.
 */
import * as fs from "fs";
import * as path from "path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SapClient, createSapClient, Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { CliConfig } from "./config";
import { log } from "./logger";

export interface CliContext {
  readonly config: CliConfig;
  readonly client: SapClient;
  readonly wallet: Keypair;
  readonly programId: PublicKey;
}

export function loadKeypair(config: CliConfig): Keypair {
  if (config.privateKey) {
    const pk = config.privateKey.trim();
    try {
      const arr = JSON.parse(pk);
      if (Array.isArray(arr)) return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch { /* fall through */ }
    try {
      const decoded = Buffer.from(pk, "base64");
      if (decoded.length === 64) return Keypair.fromSecretKey(decoded);
    } catch { /* fall through */ }
    throw new Error("Invalid private key format");
  }

  const kpPath = config.walletPath ?? path.join(
    process.env.HOME ?? "~", ".config", "solana", "id.json"
  );
  const resolved = kpPath.startsWith("~")
    ? path.join(process.env.HOME ?? "", kpPath.slice(1))
    : kpPath;

  if (!fs.existsSync(resolved)) {
    throw new Error(`Keypair not found: ${resolved}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(resolved, "utf-8"))));
}

export function buildContext(config: CliConfig): CliContext {
  const wallet = loadKeypair(config);
  const client = createSapClient(config.rpc, {
    publicKey: wallet.publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as any);
  const programId = new PublicKey(config.programId);

  log.debug(`Wallet: ${wallet.publicKey.toBase58()}`);
  log.debug(`RPC: ${config.rpc}`);
  return { config, client, wallet, programId };
}

export function parseWallet(input: string): PublicKey {
  try {
    return new PublicKey(input);
  } catch {
    if (fs.existsSync(input)) {
      const raw = JSON.parse(fs.readFileSync(input, "utf-8"));
      return Keypair.fromSecretKey(Uint8Array.from(raw)).publicKey;
    }
    throw new Error(`Invalid wallet: ${input}`);
  }
}
