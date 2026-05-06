"use strict";
// ================================================================
//  synapse-sap-sdk / src/pdas/index.ts
//  PDA derivation utilities — byte-perfect with on-chain seeds
// ================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentPDA = getAgentPDA;
exports.getAgentStatsPDA = getAgentStatsPDA;
exports.getAgentStakePDA = getAgentStakePDA;
exports.getEscrowV2PDA = getEscrowV2PDA;
exports.getPendingSettlementPDA = getPendingSettlementPDA;
exports.getDisputePDA = getDisputePDA;
exports.getSubscriptionPDA = getSubscriptionPDA;
exports.getVaultPDA = getVaultPDA;
exports.getSessionLedgerPDA = getSessionLedgerPDA;
exports.getEpochPagePDA = getEpochPagePDA;
exports.getVaultDelegatePDA = getVaultDelegatePDA;
exports.getToolPDA = getToolPDA;
exports.getToolCategoryIndexPDA = getToolCategoryIndexPDA;
exports.getCapabilityIndexPDA = getCapabilityIndexPDA;
exports.getProtocolIndexPDA = getProtocolIndexPDA;
exports.getGlobalPDA = getGlobalPDA;
exports.hashString = hashString;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const PROGRAM_PUBLIC_KEY = new web3_js_1.PublicKey(constants_1.PROGRAM_ID);
/** Derive Agent PDA from wallet pubkey */
function getAgentPDA(wallet) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.AGENT), wallet.toBuffer()], PROGRAM_PUBLIC_KEY);
}
/** Derive AgentStats PDA from wallet pubkey */
function getAgentStatsPDA(wallet) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.AGENT_STATS), wallet.toBuffer()], PROGRAM_PUBLIC_KEY);
}
/** Derive AgentStake PDA from wallet pubkey */
function getAgentStakePDA(wallet) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.AGENT_STAKE), wallet.toBuffer()], PROGRAM_PUBLIC_KEY);
}
/** Derive EscrowV2 PDA from agent wallet + nonce */
function getEscrowV2PDA(agent, escrowNonce) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from(constants_1.SEEDS.ESCROW_V2),
        agent.toBuffer(),
        Buffer.from(new Uint32Array([escrowNonce]).buffer),
    ], PROGRAM_PUBLIC_KEY);
}
/** Derive PendingSettlement PDA from escrow + settlement_index */
function getPendingSettlementPDA(escrow, settlementIndex) {
    const idxBuf = typeof settlementIndex === "number"
        ? Buffer.from(new Uint32Array([settlementIndex]).buffer)
        : settlementIndex.toArrayLike(Buffer, "le", 4);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.PENDING_SETTLE), escrow.toBuffer(), idxBuf], PROGRAM_PUBLIC_KEY);
}
/** Derive Dispute PDA from escrow + settlement_index */
function getDisputePDA(escrow, settlementIndex) {
    const idxBuf = typeof settlementIndex === "number"
        ? Buffer.from(new Uint32Array([settlementIndex]).buffer)
        : settlementIndex.toArrayLike(Buffer, "le", 4);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.DISPUTE), escrow.toBuffer(), idxBuf], PROGRAM_PUBLIC_KEY);
}
/** Derive Subscription PDA from agent + subscriber + nonce */
function getSubscriptionPDA(agent, subscriber, nonce) {
    return web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from(constants_1.SEEDS.SUBSCRIPTION),
        agent.toBuffer(),
        subscriber.toBuffer(),
        Buffer.from(new Uint32Array([nonce]).buffer),
    ], PROGRAM_PUBLIC_KEY);
}
/** Derive Vault PDA from agent pubkey */
function getVaultPDA(agent) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.VAULT), agent.toBuffer()], PROGRAM_PUBLIC_KEY);
}
/** Derive SessionLedger PDA from vault + session number */
function getSessionLedgerPDA(vault, session) {
    const sessionBuf = typeof session === "number"
        ? Buffer.from(new Uint32Array([session]).buffer)
        : session.toArrayLike(Buffer, "le", 4);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.SESSION), vault.toBuffer(), sessionBuf], PROGRAM_PUBLIC_KEY);
}
/** Derive EpochPage PDA from vault + epoch */
function getEpochPagePDA(vault, epoch) {
    const epochBuf = typeof epoch === "number"
        ? Buffer.from(new Uint32Array([epoch]).buffer)
        : epoch.toArrayLike(Buffer, "le", 4);
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.EPOCH_PAGE), vault.toBuffer(), epochBuf], PROGRAM_PUBLIC_KEY);
}
/** Derive VaultDelegate PDA from vault + delegate */
function getVaultDelegatePDA(vault, delegate) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.VAULT_DELEGATE), vault.toBuffer(), delegate.toBuffer()], PROGRAM_PUBLIC_KEY);
}
/** Derive Tool PDA from agent + tool_name */
function getToolPDA(agent, toolName) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.TOOL), agent.toBuffer(), Buffer.from(toolName)], PROGRAM_PUBLIC_KEY);
}
/** Derive ToolCategoryIndex PDA from category u8 */
function getToolCategoryIndexPDA(category) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.TOOL_CAT_IDX), Buffer.from([category])], PROGRAM_PUBLIC_KEY);
}
/** Derive CapabilityIndex PDA from capability_hash (32 bytes) */
function getCapabilityIndexPDA(capabilityHash) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.CAPABILITY_IDX), Buffer.from(capabilityHash)], PROGRAM_PUBLIC_KEY);
}
/** Derive ProtocolIndex PDA from protocol_hash (32 bytes) */
function getProtocolIndexPDA(protocolHash) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.PROTOCOL_IDX), Buffer.from(protocolHash)], PROGRAM_PUBLIC_KEY);
}
/** Derive GlobalConfig PDA (singleton) */
function getGlobalPDA() {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.SEEDS.GLOBAL)], PROGRAM_PUBLIC_KEY);
}
// ── Re-export convenience ──
/** Convert a string to a 32-byte hash for capability/protocol indices */
function hashString(s) {
    // On-chain uses SHA-256; SDK can compute with crypto or just use the same 
    // For now, we use sha256 import from solana-sha256-hasher or crypto
    // We'll provide a fallback in utils
    return new Uint8Array(32); // placeholder - filled by utils.hasher
}
//# sourceMappingURL=index.js.map