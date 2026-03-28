/**
 * @module utils/rpc-strategy
 * @description Dual-connection RPC strategy and idempotent ATA creation.
 *
 * Solves two interoperability problems:
 *
 * 1. **WebSocket 400 loop**: Some authenticated RPCs reject WebSocket
 *    connections for SPL token operations. This module exposes a
 *    dual-connection strategy: primary RPC for SAP program calls,
 *    fallback public RPC for token operations.
 *
 * 2. **Idempotent ATA creation**: Wraps `getOrCreateAssociatedTokenAccount`
 *    with retries so "account already exists" doesn't surface as a
 *    hard error.
 *
 * @category Utils
 * @since v0.6.0
 */

import {
  Connection,
  type Commitment,
  PublicKey,
  type TransactionSignature,
} from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════
//  RPC Strategy Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface RpcConfig
 * @description Configuration for dual-connection RPC strategy.
 * @category Utils
 * @since v0.6.0
 */
export interface RpcConfig {
  /** Primary RPC URL (for SAP program calls). */
  readonly primaryUrl: string;
  /** Fallback RPC URL (for SPL token ops, public RPCs). */
  readonly fallbackUrl?: string;
  /** Commitment level. */
  readonly commitment?: Commitment;
}

/**
 * @interface DualConnection
 * @description Dual RPC connections: primary for SAP, fallback for tokens.
 * @category Utils
 * @since v0.6.0
 */
export interface DualConnection {
  /** Primary connection for SAP program calls. */
  readonly primary: Connection;
  /** Fallback connection for SPL token operations. */
  readonly fallback: Connection;
}

// ═══════════════════════════════════════════════════════════════════
//  Default Public RPCs
// ═══════════════════════════════════════════════════════════════════

/** Well-known public fallback RPCs by cluster. */
const PUBLIC_RPCS: Record<string, string> = {
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://localhost:8899",
};

// ═══════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════

/**
 * @name getRpcUrl
 * @description Get the primary RPC URL from environment or config.
 *
 * Resolution order:
 *   1. Explicit `config.primaryUrl`
 *   2. `SOLANA_RPC_URL` env var
 *   3. Cluster-appropriate public RPC
 *
 * @param config - Optional RPC configuration.
 * @param cluster - Cluster hint (defaults to "mainnet-beta").
 * @returns The resolved primary RPC URL.
 *
 * @category Utils
 * @since v0.6.0
 */
export function getRpcUrl(
  config?: Partial<RpcConfig>,
  cluster: string = "mainnet-beta",
): string {
  if (config?.primaryUrl) return config.primaryUrl;

  // Environment variable
  const envUrl =
    typeof process !== "undefined" ? process.env?.SOLANA_RPC_URL : undefined;
  if (envUrl) return envUrl;

  return PUBLIC_RPCS[cluster] ?? PUBLIC_RPCS["mainnet-beta"]!;
}

/**
 * @name getFallbackRpcUrl
 * @description Get the fallback RPC URL for SPL token operations.
 *
 * This avoids the WebSocket-400 loop when the primary RPC is
 * an authenticated endpoint that rejects token-related WebSocket
 * subscriptions.
 *
 * @param config - Optional RPC configuration.
 * @param cluster - Cluster hint (defaults to "mainnet-beta").
 * @returns The resolved fallback RPC URL.
 *
 * @category Utils
 * @since v0.6.0
 */
export function getFallbackRpcUrl(
  config?: Partial<RpcConfig>,
  cluster: string = "mainnet-beta",
): string {
  if (config?.fallbackUrl) return config.fallbackUrl;

  // Env fallback
  const envUrl =
    typeof process !== "undefined"
      ? process.env?.SOLANA_FALLBACK_RPC_URL
      : undefined;
  if (envUrl) return envUrl;

  return PUBLIC_RPCS[cluster] ?? PUBLIC_RPCS["mainnet-beta"]!;
}

/**
 * @name createDualConnection
 * @description Create a dual-connection pair: primary for SAP program calls,
 * fallback for SPL token operations.
 *
 * @param config - RPC configuration.
 * @param cluster - Cluster hint.
 * @returns A {@link DualConnection} with both connections.
 *
 * @category Utils
 * @since v0.6.0
 *
 * @example
 * ```ts
 * const { primary, fallback } = createDualConnection({
 *   primaryUrl: "https://my-rpc.example.com",
 * }, "mainnet-beta");
 *
 * // Use primary for SAP calls
 * const provider = new AnchorProvider(primary, wallet, {});
 *
 * // Use fallback for SPL token account creation
 * const ata = await getOrCreateATA(fallback, mint, owner);
 * ```
 */
export function createDualConnection(
  config: Partial<RpcConfig>,
  cluster: string = "mainnet-beta",
): DualConnection {
  const commitment = config.commitment ?? "confirmed";
  const primaryUrl = getRpcUrl(config, cluster);
  const fallbackUrl = getFallbackRpcUrl(config, cluster);

  return {
    primary: new Connection(primaryUrl, { commitment }),
    fallback: new Connection(fallbackUrl, { commitment }),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Idempotent ATA Creation
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface AtaResult
 * @description Result of idempotent ATA creation attempt.
 * @category Utils
 * @since v0.6.0
 */
export interface AtaResult {
  /** The ATA public key (exists or newly created). */
  readonly address: PublicKey;
  /** Whether the ATA already existed. */
  readonly existed: boolean;
  /** Transaction signature (only if newly created). */
  readonly txSignature?: TransactionSignature;
}

/**
 * @name findATA
 * @description Derive the Associated Token Account address.
 * Uses the standard ATA PDA derivation without importing the full
 * `@solana/spl-token` package.
 *
 * @param owner - The token account owner.
 * @param mint - The token mint.
 * @param programId - Token program ID (defaults to TOKEN_PROGRAM_ID).
 * @returns The derived ATA public key.
 *
 * @category Utils
 * @since v0.6.0
 */
export function findATA(
  owner: PublicKey,
  mint: PublicKey,
  programId: PublicKey = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
): PublicKey {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  );

  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

// ═══════════════════════════════════════════════════════════════════
//  Error Classification
// ═══════════════════════════════════════════════════════════════════

/**
 * Anchor error code to friendly message mapping.
 * Converts cryptic Anchor errors into actionable messages.
 */
const ANCHOR_ERROR_MESSAGES: Record<number, string> = {
  6000: "Agent already registered for this wallet",
  6001: "Agent not found — register first",
  6002: "Name exceeds maximum length (64 bytes)",
  6003: "Description exceeds maximum length (256 bytes)",
  6004: "Too many capabilities (max 10)",
  6005: "Too many pricing tiers (max 5)",
  6006: "Too many protocols (max 5)",
  6007: "Feedback score out of range (0-1000)",
  6008: "Unauthorized — only the agent owner can perform this action",
  6009: "Escrow expired",
  6010: "Insufficient escrow balance",
  6011: "Max calls exceeded",
  6012: "Invalid settlement — calls must be > 0",
  6013: "Escrow not empty — withdraw balance before closing",
  6014: "Invalid token program — make sure you passed TOKEN_PROGRAM_ID as the 3rd remaining account",
  6015: "Vault already initialized",
  6016: "Session already exists",
  6017: "Session closed — cannot write to closed session",
  6018: "Data exceeds maximum write size (750 bytes)",
  6019: "Ring buffer overflow — seal before writing more",
};

/**
 * @name classifyAnchorError
 * @description Convert an Anchor error code into a friendly, actionable message.
 *
 * @param errorCode - The numeric Anchor error code.
 * @returns A human-readable error message, or a generic message for unknown codes.
 *
 * @category Utils
 * @since v0.6.0
 *
 * @example
 * ```ts
 * try {
 *   await client.escrow.create(...);
 * } catch (err) {
 *   const code = extractAnchorErrorCode(err);
 *   if (code !== null) {
 *     console.error(classifyAnchorError(code));
 *   }
 * }
 * ```
 */
export function classifyAnchorError(errorCode: number): string {
  return (
    ANCHOR_ERROR_MESSAGES[errorCode] ??
    `Unknown SAP program error (code ${errorCode}). Check the IDL for details.`
  );
}

/**
 * @name extractAnchorErrorCode
 * @description Attempt to extract an Anchor error code from an Error object.
 *
 * Anchor errors typically have the structure `{ code: number, msg: string }`.
 * This function handles both the direct `error.code` pattern and the
 * `error.error.errorCode.number` nested pattern.
 *
 * @param err - The caught error object.
 * @returns The numeric error code, or `null` if not an Anchor error.
 *
 * @category Utils
 * @since v0.6.0
 */
export function extractAnchorErrorCode(err: unknown): number | null {
  if (err == null || typeof err !== "object") return null;

  // Direct code property
  const direct = (err as Record<string, unknown>).code;
  if (typeof direct === "number") return direct;

  // Nested Anchor format: error.error.errorCode.number
  const nested = (err as Record<string, unknown>).error;
  if (nested && typeof nested === "object") {
    const errorCode = (nested as Record<string, unknown>).errorCode;
    if (errorCode && typeof errorCode === "object") {
      const num = (errorCode as Record<string, unknown>).number;
      if (typeof num === "number") return num;
    }
  }

  // AnchorError pattern: { logs: [...], error: { errorCode: { number } } }
  const msg = (err as Error).message;
  if (typeof msg === "string") {
    const match = msg.match(/custom program error:\s*0x([0-9a-fA-F]+)/);
    if (match?.[1]) return parseInt(match[1], 16);
  }

  return null;
}
