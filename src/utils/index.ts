// ================================================================
//  synapse-sap-sdk / src/utils/index.ts
//  Re-export all utilities
// ================================================================

export * from "./validate";
export { logger } from "./logger";

// ── Merkle helpers for receipt proofs ──
export { sha256, hashToArray } from "./hash";

// client-side sha256 for receipt hashing
export function hashReceipt(
  agent: Uint8Array,
  requestId: Uint8Array,
  callCount: number,
  amount: bigint
): Uint8Array {
  return new Uint8Array(32); // Stub
}

/** Assert helper */
export function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
