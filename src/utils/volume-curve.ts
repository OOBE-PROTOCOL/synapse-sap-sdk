/**
 * @module volume-curve
 * @description Client-side mirror of the on-chain `calculate_settle_amount`
 * function from `programs/synapse-agent-sap/src/instructions/escrow_v2.rs`.
 *
 * Used by {@link EscrowV2Module.settle} to pre-compute the settlement
 * `amount` so it can chain `createPendingSettlement` in the same transaction
 * as `settleCallsV2` (DisputeWindow flow). Keeping the math in one place
 * here ensures the SDK stays byte-for-byte aligned with the program; if the
 * on-chain curve algorithm ever changes, this file is the single source of
 * truth on the client.
 *
 * @category Utilities
 * @since v0.13.0
 * @packageDocumentation
 */

import { BN } from "@coral-xyz/anchor";
import type { VolumeCurveBreakpoint } from "../types/common";

const U64_MAX = new BN("18446744073709551615");

function checkedMul(a: BN, b: BN): BN {
  const r = a.mul(b);
  if (r.gt(U64_MAX)) {
    throw new Error(
      `volume-curve: u64 overflow on multiply (${a.toString()} * ${b.toString()})`,
    );
  }
  return r;
}

function checkedAdd(a: BN, b: BN): BN {
  const r = a.add(b);
  if (r.gt(U64_MAX)) {
    throw new Error(
      `volume-curve: u64 overflow on add (${a.toString()} + ${b.toString()})`,
    );
  }
  return r;
}

/**
 * @function calculateSettleAmount
 * @description Compute the lamport (or token base-unit) amount the on-chain
 * `settle_calls_v2` handler will charge for `calls` calls, given the escrow's
 * `pricePerCall`, `volumeCurve`, and the current settled+pending counter.
 *
 * Mirrors the exact algorithm of `calculate_settle_amount` in
 * `escrow_v2.rs` (v0.7+):
 *
 * ```rust
 * if curve.is_empty() { calls * base_price } else { walk-the-curve }
 * ```
 *
 * Walks the curve from `cursor = totalCallsBefore` and at each cursor
 * position picks the breakpoint price whose `afterCalls` threshold the
 * cursor has passed. Calls are charged at the active price up to the next
 * threshold, then the cursor advances and the loop repeats until all
 * `calls` are accounted for.
 *
 * @param basePrice - Escrow's `pricePerCall` (BN, u64 lamports/base-units).
 * @param curve - The escrow's `volumeCurve` array (may be empty).
 * @param totalCallsBefore - `escrow.totalCallsSettled + escrow.pendingCalls`
 *   AT THE MOMENT `settleCallsV2` runs on-chain.
 * @param calls - Number of calls being settled in this batch.
 * @returns The amount the on-chain handler will compute (BN, u64).
 *
 * @example
 * ```ts
 * import { calculateSettleAmount } from "@oobe-protocol-labs/synapse-sap-sdk";
 *
 * const amount = calculateSettleAmount(
 *   escrow.pricePerCall,
 *   escrow.volumeCurve,
 *   escrow.totalCallsSettled.add(escrow.pendingCalls),
 *   new BN(5),
 * );
 * ```
 *
 * @since v0.13.0
 */
export function calculateSettleAmount(
  basePrice: BN,
  curve: VolumeCurveBreakpoint[],
  totalCallsBefore: BN,
  calls: BN,
): BN {
  if (calls.isZero()) return new BN(0);
  if (!curve || curve.length === 0) {
    return checkedMul(calls, basePrice);
  }

  let amount = new BN(0);
  let remaining = calls.clone();
  let cursor = totalCallsBefore.clone();

  while (remaining.gtn(0)) {
    let currentPrice = basePrice;
    let nextThreshold: BN | null = null;

    for (const bp of curve) {
      const threshold = new BN(bp.afterCalls);
      if (cursor.gte(threshold)) {
        currentPrice = bp.pricePerCall;
      } else {
        nextThreshold = threshold;
        break;
      }
    }

    let callsAtPrice: BN;
    if (nextThreshold) {
      const room = nextThreshold.sub(cursor);
      callsAtPrice = BN.min(remaining, room.isNeg() ? new BN(0) : room);
      if (callsAtPrice.isZero()) {
        // Defensive: shouldn't happen because cursor < nextThreshold by
        // the `else` branch above, but guard anyway.
        callsAtPrice = remaining;
      }
    } else {
      callsAtPrice = remaining;
    }

    amount = checkedAdd(amount, checkedMul(callsAtPrice, currentPrice));
    remaining = remaining.sub(callsAtPrice);
    cursor = cursor.add(callsAtPrice);
  }

  return amount;
}
