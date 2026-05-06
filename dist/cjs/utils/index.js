"use strict";
// ================================================================
//  synapse-sap-sdk / src/utils/index.ts
//  Re-export all utilities
// ================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.hashReceipt = hashReceipt;
__exportStar(require("./validate"), exports);
// ── Merkle helpers for receipt proofs ──
function sha256(data) {
    return crypto.subtle.digest("SHA-256", data).then(b => new Uint8Array(b));
}
// client-side sha256 for receipt hashing
function hashReceipt(agent, requestId, callCount, amount) {
    return new Uint8Array(32); // Stub
}
//# sourceMappingURL=index.js.map