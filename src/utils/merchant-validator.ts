/**
 * @module utils/merchant-validator
 * @description Standard Synapse merchant middleware for x402 settlement.
 *
 * Reads `X-Payment-*` headers from incoming HTTP requests, validates
 * the escrow on-chain, auto-generates the correct `AccountMeta[]`,
 * and throws explicit errors (e.g. {@link MissingEscrowAtaError})
 * instead of letting the program return a generic crash.
 *
 * Designed for agents like Syra/Invoica that receive x402 payments.
 *
 * @category Utils
 * @since v0.6.4
 */

import {
  type PublicKey,
  type Connection,
  type AccountMeta,
} from "@solana/web3.js";
import { PublicKey as PK } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  validateEscrowState,
  toAccountMetas,
  MissingEscrowAtaError,
} from "./escrow-validation";
import type {
  EscrowValidationResult,
} from "./escrow-validation";
import { SapValidationError } from "../errors";
import type { EscrowAccountData } from "../types";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface ParsedX402Headers
 * @description Parsed and typed x402 payment headers from incoming HTTP request.
 * @category Utils
 * @since v0.6.4
 */
export interface ParsedX402Headers {
  /** x402 protocol identifier — must be "SAP-x402". */
  readonly protocol: string;
  /** Escrow PDA address. */
  readonly escrowPda: PublicKey;
  /** Agent PDA address. */
  readonly agentPda: PublicKey;
  /** Depositor wallet address. */
  readonly depositorWallet: PublicKey;
  /** Max calls allowed. */
  readonly maxCalls: BN;
  /** Price per call. */
  readonly pricePerCall: BN;
  /** SAP program ID. */
  readonly programId: PublicKey;
  /** Network identifier. */
  readonly network: string;
}

/**
 * @interface MerchantValidationResult
 * @description Complete validation result for merchant-side x402 processing.
 * @category Utils
 * @since v0.6.4
 */
export interface MerchantValidationResult {
  /** Whether the escrow is valid and ready for settlement. */
  readonly valid: boolean;
  /** Parsed x402 headers. */
  readonly headers: ParsedX402Headers;
  /** Full escrow validation result. */
  readonly escrowValidation: EscrowValidationResult;
  /** Pre-built AccountMeta[] for settlement TX (empty for SOL escrows). */
  readonly accountMetas: AccountMeta[];
  /** All validation errors. */
  readonly errors: string[];
}

// ═══════════════════════════════════════════════════════════════════
//  Header parsing
// ═══════════════════════════════════════════════════════════════════

/** Required x402 headers. */
const REQUIRED_HEADERS = [
  "X-Payment-Protocol",
  "X-Payment-Escrow",
  "X-Payment-Agent",
  "X-Payment-Depositor",
  "X-Payment-MaxCalls",
  "X-Payment-PricePerCall",
  "X-Payment-Program",
  "X-Payment-Network",
] as const;

/**
 * @name parseX402Headers
 * @description Parse and validate x402 headers from an HTTP request.
 *
 * @param headers - HTTP headers object (case-insensitive key lookup).
 * @returns Parsed x402 headers.
 * @throws {SapValidationError} If required headers are missing or malformed.
 *
 * @category Utils
 * @since v0.6.4
 */
export function parseX402Headers(
  headers: Record<string, string | string[] | undefined>,
): ParsedX402Headers {
  // Normalize to case-insensitive
  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(headers)) {
    const val = Array.isArray(value) ? value[0] : value;
    if (val !== undefined) {
      normalized.set(key.toLowerCase(), val);
    }
  }

  // Validate required headers present
  const missing: string[] = [];
  for (const h of REQUIRED_HEADERS) {
    if (!normalized.has(h.toLowerCase())) {
      missing.push(h);
    }
  }
  if (missing.length > 0) {
    throw new SapValidationError(
      `Missing required x402 headers: ${missing.join(", ")}`,
      "x402-headers",
    );
  }

  const get = (key: string): string => normalized.get(key.toLowerCase())!;

  // Validate protocol
  const protocol = get("X-Payment-Protocol");
  if (protocol !== "SAP-x402") {
    throw new SapValidationError(
      `Invalid X-Payment-Protocol: "${protocol}" (expected "SAP-x402")`,
      "X-Payment-Protocol",
    );
  }

  // Parse PublicKeys
  let escrowPda: PublicKey;
  let agentPda: PublicKey;
  let depositorWallet: PublicKey;
  let programId: PublicKey;
  try {
    escrowPda = new PK(get("X-Payment-Escrow"));
    agentPda = new PK(get("X-Payment-Agent"));
    depositorWallet = new PK(get("X-Payment-Depositor"));
    programId = new PK(get("X-Payment-Program"));
  } catch {
    throw new SapValidationError(
      "Malformed public key in x402 headers",
      "x402-headers",
    );
  }

  // Parse numeric values
  const maxCallsStr = get("X-Payment-MaxCalls");
  const pricePerCallStr = get("X-Payment-PricePerCall");
  let maxCalls: BN;
  let pricePerCall: BN;
  try {
    maxCalls = new BN(maxCallsStr);
    pricePerCall = new BN(pricePerCallStr);
  } catch {
    throw new SapValidationError(
      "Invalid numeric value in X-Payment-MaxCalls or X-Payment-PricePerCall",
      "x402-headers",
    );
  }

  return {
    protocol,
    escrowPda,
    agentPda,
    depositorWallet,
    maxCalls,
    pricePerCall,
    programId,
    network: get("X-Payment-Network"),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Merchant Validator
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapMerchantValidator
 * @description Standard Synapse merchant middleware for x402 payment validation.
 *
 * Reads `X-Payment-*` headers, validates escrow state on-chain, generates
 * correct `AccountMeta[]` for SPL token escrows, and throws explicit errors
 * (e.g. {@link MissingEscrowAtaError}) when ATA accounts are missing.
 *
 * @category Utils
 * @since v0.6.4
 *
 * @example
 * ```ts
 * const validator = new SapMerchantValidator(connection, fetchEscrow);
 *
 * // Express.js integration
 * app.post("/api/v1/chat", async (req, res) => {
 *   try {
 *     const validation = await validator.validateRequest(req.headers, {
 *       callsToSettle: 1,
 *     });
 *
 *     if (!validation.valid) {
 *       return res.status(402).json({ errors: validation.errors });
 *     }
 *
 *     // Process request...
 *
 *     // Settle payment using pre-built account metas
 *     await client.escrow.settle(
 *       validation.headers.depositorWallet,
 *       1,
 *       serviceHash,
 *       validation.accountMetas,
 *     );
 *
 *     res.json({ result: "..." });
 *   } catch (err) {
 *     if (err instanceof MissingEscrowAtaError) {
 *       return res.status(402).json({
 *         error: err.message,
 *         side: err.side,
 *         ata: err.ataAddress,
 *       });
 *     }
 *     throw err;
 *   }
 * });
 * ```
 */
export class SapMerchantValidator {
  private readonly connection: Connection;
  private readonly fetchEscrow: (
    escrowPda: PublicKey,
  ) => Promise<EscrowAccountData | null>;

  /**
   * @param connection  - Solana RPC connection.
   * @param fetchEscrow - Callback to fetch escrow account data by PDA.
   *   Typically `(pda) => client.escrow.fetchByPda(pda).catch(() => null)`.
   */
  constructor(
    connection: Connection,
    fetchEscrow: (
      escrowPda: PublicKey,
    ) => Promise<EscrowAccountData | null>,
  ) {
    this.connection = connection;
    this.fetchEscrow = fetchEscrow;
  }

  /**
   * @name validateRequest
   * @description Full validation pipeline for an incoming x402 request.
   *
   * Steps:
   * 1. Parse `X-Payment-*` headers
   * 2. Fetch escrow on-chain
   * 3. Validate escrow state (balance, expiry, max calls)
   * 4. If SPL escrow: validate ATAs exist and mint matches
   * 5. Build `AccountMeta[]` for settlement TX
   *
   * @param headers - HTTP headers from the incoming request.
   * @param opts
   * @param opts.callsToSettle     - Number of calls to validate affordability for (default: 1).
   * @param opts.throwOnMissingAta - Throw {@link MissingEscrowAtaError} instead of returning errors (default: true).
   *
   * @returns A complete {@link MerchantValidationResult}.
   *
   * @throws {SapValidationError} If headers are missing or malformed.
   * @throws {MissingEscrowAtaError} If SPL ATAs are missing and `throwOnMissingAta` is true.
   *
   * @category Utils
   * @since v0.6.4
   */
  async validateRequest(
    headers: Record<string, string | string[] | undefined>,
    opts?: {
      callsToSettle?: number;
      throwOnMissingAta?: boolean;
    },
  ): Promise<MerchantValidationResult> {
    // 1. Parse headers
    const parsed = parseX402Headers(headers);

    // 2. Validate escrow state
    const escrowValidation = await validateEscrowState(
      this.connection,
      parsed.agentPda,       // agentWallet derived inside validate
      parsed.depositorWallet,
      this.fetchEscrow,
      { callsToSettle: opts?.callsToSettle ?? 1 },
    );

    // 3. Check for ATA errors and optionally throw
    const throwOnMissingAta = opts?.throwOnMissingAta !== false;
    if (throwOnMissingAta && escrowValidation.isSplEscrow) {
      for (const error of escrowValidation.errors) {
        if (error.includes("Depositor ATA does not exist")) {
          const ataAddr = error.split(": ")[1] ?? "unknown";
          throw new MissingEscrowAtaError(ataAddr, "depositor");
        }
        if (error.includes("Escrow ATA does not exist")) {
          const ataAddr = error.split(": ")[1] ?? "unknown";
          throw new MissingEscrowAtaError(ataAddr, "escrow");
        }
      }
    }

    // 4. Build account metas
    const accountMetas = toAccountMetas(escrowValidation.splAccounts);

    return {
      valid: escrowValidation.valid,
      headers: parsed,
      escrowValidation,
      accountMetas,
      errors: escrowValidation.errors,
    };
  }

  /**
   * @name validateEscrow
   * @description Validate escrow from pre-parsed headers (convenience method).
   * Call this when you've already parsed the headers yourself.
   *
   * @param headers - Pre-parsed x402 headers.
   * @param opts
   * @returns The escrow validation result with pre-built account metas.
   *
   * @category Utils
   * @since v0.6.4
   */
  async validateEscrow(
    headers: ParsedX402Headers,
    opts?: { callsToSettle?: number },
  ): Promise<EscrowValidationResult> {
    return validateEscrowState(
      this.connection,
      headers.agentPda,
      headers.depositorWallet,
      this.fetchEscrow,
      opts,
    );
  }
}
