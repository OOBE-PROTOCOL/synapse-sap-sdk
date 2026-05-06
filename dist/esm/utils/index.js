// ================================================================
//  synapse-sap-sdk / src/utils/index.ts
//  Re-export all utilities
// ================================================================
export * from "./validate";
// ── Merkle helpers for receipt proofs ──
export function sha256(data) {
    return crypto.subtle.digest("SHA-256", data).then(b => new Uint8Array(b));
}
// client-side sha256 for receipt hashing
export function hashReceipt(agent, requestId, callCount, amount) {
    return new Uint8Array(32); // Stub
}
//# sourceMappingURL=index.js.map