/**
 * @module utils/escrow-validation
 * @description Server-side escrow validation pipeline.
 *
 * Provides typed helpers to validate escrow state before settlement
 * and to build the correct SPL `AccountMeta[]` for token escrows.
 *
 * @category Utils
 * @since v0.6.4
 */

import {
  PublicKey,
  type Connection,
  type AccountMeta,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { findATA } from "./rpc-strategy";
import { deriveAgent, deriveEscrow } from "../pda";
import { SapError } from "../errors";
import type { EscrowAccountData } from "../types";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface SplAccountMeta
 * @description Typed SPL account metadata for escrow operations.
 * @category Utils
 * @since v0.6.4
 */
export interface SplAccountMeta {
  /** Account role in the escrow pipeline. */
  readonly kind: "escrowAta" | "depositorAta" | "tokenMint" | "tokenProgram";
  /** Account public key. */
  readonly pubkey: PublicKey;
  /** Whether this account is writable. */
  readonly writable: boolean;
}

/**
 * @interface EscrowValidationResult
 * @description Result of server-side escrow state validation.
 * @category Utils
 * @since v0.6.4
 */
export interface EscrowValidationResult {
  /** Whether the escrow is valid for settlement. */
  readonly valid: boolean;
  /** Escrow account data (if found). */
  readonly escrow: EscrowAccountData | null;
  /** Escrow PDA address. */
  readonly escrowPda: PublicKey;
  /** Agent PDA address. */
  readonly agentPda: PublicKey;
  /** Whether this is an SPL token escrow (vs SOL). */
  readonly isSplEscrow: boolean;
  /** Generated SPL account metas (empty for SOL escrows). */
  readonly splAccounts: SplAccountMeta[];
  /** Validation errors (empty when valid). */
  readonly errors: string[];
}

// ═══════════════════════════════════════════════════════════════════
//  Error
// ═══════════════════════════════════════════════════════════════════

/**
 * @name MissingEscrowAtaError
 * @description Thrown when an SPL escrow operation is missing required
 * Associated Token Accounts.
 * @category Errors
 * @since v0.6.4
 */
export class MissingEscrowAtaError extends SapError {
  /** The ATA address that is missing. */
  readonly ataAddress: string;
  /** Which side is missing: depositor or escrow. */
  readonly side: "depositor" | "escrow";

  constructor(ataAddress: string, side: "depositor" | "escrow") {
    super(
      `Missing ${side} ATA: ${ataAddress}. ` +
        `Settlement mode is Escrow/SPL but the Associated Token Account does not exist. ` +
        `The ${side} must create the ATA before escrow operations.`,
      "SAP_MISSING_ESCROW_ATA",
    );
    this.name = "MissingEscrowAtaError";
    this.ataAddress = ataAddress;
    this.side = side;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Validation
// ═══════════════════════════════════════════════════════════════════

/** Standard SPL Token program ID. */
const TOKEN_PROGRAM_ID_STR = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

/**
 * @name validateEscrowState
 * @description Validates that an escrow is in a correct state for settlement.
 *
 * Checks:
 * - Escrow PDA exists on-chain
 * - If SPL: depositor ATA exists, escrow ATA exists, token mint matches
 * - Balance >= requested settlement amount
 * - Escrow is not expired
 * - Max calls not exceeded
 *
 * @param connection  - Solana RPC connection.
 * @param agentWallet - The agent's wallet public key.
 * @param depositorWallet - The depositor's wallet public key.
 * @param fetchEscrow - Callback to fetch escrow data (avoids coupling to SapProgram).
 * @param opts
 * @param opts.callsToSettle - Number of calls to validate affordability for.
 *
 * @returns A detailed {@link EscrowValidationResult}.
 *
 * @category Utils
 * @since v0.6.4
 *
 * @example
 * ```ts
 * const result = await validateEscrowState(
 *   connection,
 *   agentWallet,
 *   depositorWallet,
 *   (pda) => client.escrow.fetchByPda(pda),
 *   { callsToSettle: 5 },
 * );
 *
 * if (!result.valid) {
 *   console.error("Escrow validation failed:", result.errors);
 * }
 * ```
 */
export async function validateEscrowState(
  connection: Connection,
  agentWallet: PublicKey,
  depositorWallet: PublicKey,
  fetchEscrow: (escrowPda: PublicKey) => Promise<EscrowAccountData | null>,
  opts?: { callsToSettle?: number },
): Promise<EscrowValidationResult> {
  const [agentPda] = deriveAgent(agentWallet);
  const [escrowPda] = deriveEscrow(agentPda, depositorWallet);
  const errors: string[] = [];

  // 1. Fetch escrow
  const escrow = await fetchEscrow(escrowPda);
  if (!escrow) {
    return {
      valid: false,
      escrow: null,
      escrowPda,
      agentPda,
      isSplEscrow: false,
      splAccounts: [],
      errors: [`Escrow not found at ${escrowPda.toBase58()}`],
    };
  }

  // 2. Check expiry
  if (escrow.expiresAt.gt(new BN(0))) {
    const now = Math.floor(Date.now() / 1000);
    if (escrow.expiresAt.lt(new BN(now))) {
      errors.push(`Escrow expired at ${escrow.expiresAt.toString()}`);
    }
  }

  // 3. Check balance / calls
  const callsToSettle = opts?.callsToSettle ?? 1;
  const costForCalls = escrow.pricePerCall.mul(new BN(callsToSettle));
  if (escrow.balance.lt(costForCalls)) {
    errors.push(
      `Insufficient balance: ${escrow.balance.toString()} < ${costForCalls.toString()} (${callsToSettle} calls × ${escrow.pricePerCall.toString()})`,
    );
  }

  // 4. Check max calls
  if (escrow.maxCalls.gt(new BN(0))) {
    const remaining = escrow.maxCalls.sub(escrow.totalCallsSettled);
    if (remaining.lt(new BN(callsToSettle))) {
      errors.push(
        `Max calls exceeded: ${remaining.toString()} remaining but needs ${callsToSettle}`,
      );
    }
  }

  // 5. Determine if SPL
  const isSplEscrow =
    escrow.tokenMint !== null &&
    escrow.tokenMint.toBase58() !== "11111111111111111111111111111111";

  // 6. Build SPL accounts (if SPL escrow)
  const splAccounts: SplAccountMeta[] = [];
  if (isSplEscrow) {
    const mint = escrow.tokenMint!;
    const depositorAta = findATA(depositorWallet, mint);
    const escrowAta = findATA(escrowPda, mint);

    // Verify depositor ATA exists
    const depositorAtaInfo = await connection.getAccountInfo(depositorAta);
    if (!depositorAtaInfo) {
      errors.push(`Depositor ATA does not exist: ${depositorAta.toBase58()}`);
    }

    // Verify escrow ATA exists
    const escrowAtaInfo = await connection.getAccountInfo(escrowAta);
    if (!escrowAtaInfo) {
      errors.push(`Escrow ATA does not exist: ${escrowAta.toBase58()}`);
    }

    // Verify mint matches
    if (depositorAtaInfo) {
      // SPL token account data: bytes 0-32 = mint
      const ataMint = depositorAtaInfo.data.subarray(0, 32);
      if (Buffer.from(ataMint).toString("hex") !== mint.toBuffer().toString("hex")) {
        errors.push(`Depositor ATA mint mismatch: expected ${mint.toBase58()}`);
      }
    }

    splAccounts.push(
      { kind: "depositorAta", pubkey: depositorAta, writable: true },
      { kind: "escrowAta", pubkey: escrowAta, writable: true },
      { kind: "tokenMint", pubkey: mint, writable: false },
      { kind: "tokenProgram", pubkey: new PublicKey(TOKEN_PROGRAM_ID_STR), writable: false },
    );
  }

  return {
    valid: errors.length === 0,
    escrow,
    escrowPda,
    agentPda,
    isSplEscrow,
    splAccounts,
    errors,
  };
}

/**
 * @name attachSplAccounts
 * @description Build the typed `SplAccountMeta[]` for an SPL token escrow operation.
 * Does NOT validate existence — use {@link validateEscrowState} for full validation.
 *
 * @param escrowPda      - The escrow PDA address.
 * @param depositorWallet - The depositor's wallet public key.
 * @param tokenMint      - The SPL token mint.
 * @returns An array of typed {@link SplAccountMeta} for SPL escrow operations.
 *
 * @category Utils
 * @since v0.6.4
 *
 * @example
 * ```ts
 * const splMetas = attachSplAccounts(escrowPda, depositorWallet, usdcMint);
 *
 * // Convert to Anchor-compatible AccountMeta[]
 * const accountMetas = splMetas.map(m => ({
 *   pubkey: m.pubkey,
 *   isWritable: m.writable,
 *   isSigner: false,
 * }));
 *
 * await client.escrow.settle(depositor, calls, hash, accountMetas);
 * ```
 */
export function attachSplAccounts(
  escrowPda: PublicKey,
  depositorWallet: PublicKey,
  tokenMint: PublicKey,
): SplAccountMeta[] {
  return [
    { kind: "depositorAta", pubkey: findATA(depositorWallet, tokenMint), writable: true },
    { kind: "escrowAta", pubkey: findATA(escrowPda, tokenMint), writable: true },
    { kind: "tokenMint", pubkey: tokenMint, writable: false },
    { kind: "tokenProgram", pubkey: new PublicKey(TOKEN_PROGRAM_ID_STR), writable: false },
  ];
}

/**
 * @name toAccountMetas
 * @description Convert typed {@link SplAccountMeta} to Anchor-compatible
 * `AccountMeta[]` for use with `.remainingAccounts()`.
 *
 * @param splMetas - Array of typed SPL account metas.
 * @returns `AccountMeta[]` compatible with Anchor's `remainingAccounts`.
 *
 * @category Utils
 * @since v0.6.4
 */
export function toAccountMetas(splMetas: SplAccountMeta[]): AccountMeta[] {
  return splMetas.map((m) => ({
    pubkey: m.pubkey,
    isWritable: m.writable,
    isSigner: false,
  }));
}
