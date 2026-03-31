/**
 * @module utils/priority-fee
 * @description Compute budget and priority fee utilities for SAP transactions.
 *
 * Solana transactions that include a priority fee (via the Compute Budget program)
 * land faster because validators prefer higher-fee transactions. This module
 * provides a clean, composable API for building priority-fee instructions
 * that can be prepended to any Anchor method builder via `.preInstructions()`.
 *
 * Typical use: x402 settlement transactions where the receiving agent's RPC
 * has a short confirmation window (e.g., 30 seconds).
 *
 * @category Utils
 * @since v0.6.2
 *
 * @example
 * ```ts
 * import { buildPriorityFeeIxs, DEFAULT_SETTLE_PRIORITY } from "@synapse-sap/sdk";
 *
 * // Append to any Anchor method builder:
 * await program.methods
 *   .settleCalls(calls, hash)
 *   .accounts({ ... })
 *   .preInstructions(buildPriorityFeeIxs({ priorityFeeMicroLamports: 5000 }))
 *   .rpc({ skipPreflight: true });
 * ```
 */

import {
  ComputeBudgetProgram,
  type TransactionInstruction,
} from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

/**
 * Default priority fee for settlement transactions (in microlamports).
 * 5000 µL ≈ 0.0005 SOL per 200k CU — fast enough for most agent RPCs.
 *
 * @since v0.6.2
 */
export const DEFAULT_SETTLE_PRIORITY_FEE = 5_000;

/**
 * Default compute unit limit for settlement transactions.
 * `settle_calls` uses ~60k CU; 100k provides a safe margin.
 *
 * @since v0.6.2
 */
export const DEFAULT_SETTLE_COMPUTE_UNITS = 100_000;

/**
 * Default compute unit limit for batch settlement transactions.
 * `settle_batch` with 10 entries uses ~200k CU; 300k provides margin.
 *
 * @since v0.6.2
 */
export const DEFAULT_BATCH_SETTLE_COMPUTE_UNITS = 300_000;

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface PriorityFeeConfig
 * @description Configuration for building compute budget instructions.
 * @category Utils
 * @since v0.6.2
 */
export interface PriorityFeeConfig {
  /**
   * Priority fee in microlamports per compute unit.
   * Higher values = faster confirmation.
   *
   * Common values:
   * - `1000` — low priority (~0.0001 SOL)
   * - `5000` — medium priority (~0.0005 SOL) ← recommended for settle
   * - `50000` — high priority (~0.005 SOL)
   * - `0` — no priority fee (default Solana behavior)
   *
   * @default 0
   */
  readonly priorityFeeMicroLamports?: number;

  /**
   * Maximum compute units the transaction may consume.
   * Setting an explicit limit avoids overpaying for unused CU.
   *
   * @default 200_000 (Solana default)
   */
  readonly computeUnits?: number;
}

/**
 * @interface SettleOptions
 * @description Options for x402 settlement transactions.
 * Controls priority fees, compute budget, and RPC behavior
 * to optimize confirmation speed for time-sensitive settlements.
 *
 * @category Registries
 * @since v0.6.2
 *
 * @example
 * ```ts
 * // Fast settlement with priority fee
 * const receipt = await x402.settle(depositor, 1, "data", {
 *   priorityFeeMicroLamports: 5000,
 *   computeUnits: 100_000,
 *   skipPreflight: true,
 * });
 *
 * // Use the convenience preset
 * import { FAST_SETTLE_OPTIONS } from "@synapse-sap/sdk";
 * const receipt = await x402.settle(depositor, 1, "data", FAST_SETTLE_OPTIONS);
 * ```
 */
export interface SettleOptions extends PriorityFeeConfig {
  /**
   * Skip Solana simulation before submitting.
   * Saves ~400ms but loses pre-flight error detection.
   *
   * Recommended for settlements where the escrow state
   * has already been pre-fetched and validated.
   *
   * @default false
   */
  readonly skipPreflight?: boolean;

  /**
   * Transaction commitment level override.
   * Uses the provider's default when omitted.
   *
   * - `"processed"` — fastest, least reliable
   * - `"confirmed"` — balanced (recommended)
   * - `"finalized"` — slowest, most reliable
   */
  readonly commitment?: "processed" | "confirmed" | "finalized";

  /**
   * Maximum number of RPC retry attempts.
   * @default provider default (usually 3)
   */
  readonly maxRetries?: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Presets
// ═══════════════════════════════════════════════════════════════════

/**
 * Recommended preset for fast x402 settlements.
 * Priority fee 5000 µL, 100k CU, skip preflight, confirmed commitment.
 *
 * @since v0.6.2
 */
export const FAST_SETTLE_OPTIONS: Readonly<SettleOptions> = Object.freeze({
  priorityFeeMicroLamports: DEFAULT_SETTLE_PRIORITY_FEE,
  computeUnits: DEFAULT_SETTLE_COMPUTE_UNITS,
  skipPreflight: true,
  commitment: "confirmed",
});

/**
 * Recommended preset for fast batch settlements.
 * Priority fee 5000 µL, 300k CU, skip preflight, confirmed commitment.
 *
 * @since v0.6.2
 */
export const FAST_BATCH_SETTLE_OPTIONS: Readonly<SettleOptions> = Object.freeze({
  priorityFeeMicroLamports: DEFAULT_SETTLE_PRIORITY_FEE,
  computeUnits: DEFAULT_BATCH_SETTLE_COMPUTE_UNITS,
  skipPreflight: true,
  commitment: "confirmed",
});

// ═══════════════════════════════════════════════════════════════════
//  Builder
// ═══════════════════════════════════════════════════════════════════

/**
 * @name buildPriorityFeeIxs
 * @description Build compute budget instructions for priority fee transactions.
 *
 * Returns an array of 0–2 `TransactionInstruction`s:
 * - `SetComputeUnitPrice` (if `priorityFeeMicroLamports > 0`)
 * - `SetComputeUnitLimit` (if `computeUnits` provided)
 *
 * The returned array is designed to be passed directly to
 * Anchor's `.preInstructions()` builder method.
 *
 * @param config - Priority fee configuration.
 * @returns Array of compute budget instructions (may be empty).
 *
 * @category Utils
 * @since v0.6.2
 *
 * @example
 * ```ts
 * const ixs = buildPriorityFeeIxs({
 *   priorityFeeMicroLamports: 5000,
 *   computeUnits: 100_000,
 * });
 *
 * await program.methods
 *   .settleCalls(calls, hash)
 *   .accounts({ ... })
 *   .preInstructions(ixs)
 *   .rpc({ skipPreflight: true });
 * ```
 */
export function buildPriorityFeeIxs(
  config?: PriorityFeeConfig,
): TransactionInstruction[] {
  if (!config) return [];

  const ixs: TransactionInstruction[] = [];

  const fee = config.priorityFeeMicroLamports ?? 0;
  if (fee > 0) {
    ixs.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: fee,
      }),
    );
  }

  const cu = config.computeUnits;
  if (cu !== undefined && cu > 0) {
    ixs.push(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: cu,
      }),
    );
  }

  return ixs;
}

/**
 * @name buildRpcOptions
 * @description Build Anchor `.rpc()` options from {@link SettleOptions}.
 *
 * @param opts - Settle options.
 * @returns Options object suitable for Anchor `.rpc(opts)`.
 *
 * @category Utils
 * @since v0.6.2
 * @internal
 */
export function buildRpcOptions(
  opts?: SettleOptions,
): Record<string, unknown> | undefined {
  if (!opts) return undefined;

  const rpcOpts: Record<string, unknown> = {};

  if (opts.skipPreflight !== undefined) {
    rpcOpts.skipPreflight = opts.skipPreflight;
  }
  if (opts.commitment !== undefined) {
    rpcOpts.commitment = opts.commitment;
  }
  if (opts.maxRetries !== undefined) {
    rpcOpts.maxRetries = opts.maxRetries;
  }

  return Object.keys(rpcOpts).length > 0 ? rpcOpts : undefined;
}
