/**
 * @module cli/config
 * @description CLI configuration management.
 *
 * Handles loading config from:
 *   1. Command-line flags (highest priority)
 *   2. Config file (~/.config/synapse-sap/config.json)
 *   3. Environment variables
 *   4. Sensible defaults
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface CliConfig {
  rpc: string;
  fallbackRpc?: string;
  programId?: string;
  cluster: "mainnet-beta" | "devnet" | "localnet";
  walletPath?: string;
  privateKey?: string;
  json: boolean;
  silent: boolean;
  tmpDir: string;
  logDir: string;
  profile?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Defaults
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), ".config", "synapse-sap");
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, "config.json");
const DEFAULT_LOG_DIR = path.join(os.homedir(), ".cache", "synapse-sap", "logs");
const DEFAULT_TMP_DIR = path.join(os.tmpdir(), "synapse-sap");

const CLUSTER_RPCS: Record<string, string> = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://localhost:8899",
};

// ═══════════════════════════════════════════════════════════════════
//  Config Loader
// ═══════════════════════════════════════════════════════════════════

/**
 * Load the CLI configuration from the merged sources.
 */
export function loadConfig(overrides: Partial<CliConfig> = {}): CliConfig {
  // 1. Load config file
  let fileConfig: Partial<CliConfig> = {};
  const configPath = overrides.profile
    ? path.join(DEFAULT_CONFIG_DIR, `${overrides.profile}.json`)
    : DEFAULT_CONFIG_PATH;

  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      // ignore malformed config
    }
  }

  // 2. Load env vars
  const env = process.env;
  const envConfig: Partial<CliConfig> = {};
  if (env.SOLANA_RPC_URL) envConfig.rpc = env.SOLANA_RPC_URL;
  if (env.SOLANA_FALLBACK_RPC_URL) envConfig.fallbackRpc = env.SOLANA_FALLBACK_RPC_URL;
  if (env.SAP_PROGRAM_ID) envConfig.programId = env.SAP_PROGRAM_ID;
  if (env.SOLANA_CLUSTER) envConfig.cluster = env.SOLANA_CLUSTER as CliConfig["cluster"];
  if (env.WALLET_KEYPAIR_PATH) envConfig.walletPath = env.WALLET_KEYPAIR_PATH;
  if (env.WALLET_PRIVATE_KEY) envConfig.privateKey = env.WALLET_PRIVATE_KEY;

  // 3. Merge: overrides > env > file > defaults
  const cluster = overrides.cluster ?? envConfig.cluster ?? fileConfig.cluster ?? "devnet";

  return {
    rpc: overrides.rpc ?? envConfig.rpc ?? fileConfig.rpc ?? CLUSTER_RPCS[cluster]!,
    fallbackRpc: overrides.fallbackRpc ?? envConfig.fallbackRpc ?? fileConfig.fallbackRpc,
    programId: overrides.programId ?? envConfig.programId ?? fileConfig.programId,
    cluster,
    walletPath: overrides.walletPath ?? envConfig.walletPath ?? fileConfig.walletPath,
    privateKey: overrides.privateKey ?? envConfig.privateKey ?? fileConfig.privateKey,
    json: overrides.json ?? fileConfig.json ?? false,
    silent: overrides.silent ?? fileConfig.silent ?? false,
    tmpDir: overrides.tmpDir ?? fileConfig.tmpDir ?? DEFAULT_TMP_DIR,
    logDir: fileConfig.logDir ?? DEFAULT_LOG_DIR,
    profile: overrides.profile,
  };
}

/**
 * Save config to disk.
 */
export function saveConfig(config: Partial<CliConfig>, configPath?: string): void {
  const target = configPath ?? DEFAULT_CONFIG_PATH;
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(target, JSON.stringify(config, null, 2) + "\n");
}

/**
 * Get the default config path.
 */
export function getConfigPath(): string {
  return DEFAULT_CONFIG_PATH;
}

/**
 * Get the default config dir.
 */
export function getConfigDir(): string {
  return DEFAULT_CONFIG_DIR;
}

export { DEFAULT_TMP_DIR, DEFAULT_LOG_DIR };
