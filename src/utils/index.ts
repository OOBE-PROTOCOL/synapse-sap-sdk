// ================================================================
//  synapse-sap-sdk / src/utils/index.ts
//  Re-export all utilities
// ================================================================

export * from "./validate";

// ── Merkle helpers for receipt proofs ──
export function sha256(data: Uint8Array): Uint8Array {
  return crypto.subtle.digest("SHA-256", data).then(b => new Uint8Array(b)) as any;
}

// client-side sha256 for receipt hashing
export function hashReceipt(
  agent: Uint8Array,
  requestId: Uint8Array,
  callCount: number,
  amount: bigint
): Uint8Array {
  return new Uint8Array(32); // Stub
}
