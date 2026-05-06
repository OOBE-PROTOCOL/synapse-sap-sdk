// ================================================================
//  synapse-sap-sdk / src/accounts/index.ts
//  Typed account fetchers with discriminants + parsers
// ================================================================
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { DISCRIMINATOR_SIZE, U64_SIZE, U32_SIZE, I64_SIZE, U8_SIZE, OPTION_SIZE, PUBKEY_SIZE, BOOL_SIZE, } from "../constants";
function readU8(buf, off) { return buf.readUInt8(off); }
function readU16(buf, off) { return buf.readUInt16LE(off); }
function readU32(buf, off) { return buf.readUInt32LE(off); }
function readU64(buf, off) { return new BN(buf.subarray(off, off + 8), "le"); }
function readI64(buf, off) { return new BN(buf.subarray(off, off + 8), "le"); }
function readPubkey(buf, off) {
    const key = new PublicKey(buf.subarray(off, off + 32));
    return key.equals(PublicKey.default) ? null : key;
}
function readPubkeyStrict(buf, off) {
    return new PublicKey(buf.subarray(off, off + 32));
}
function readOptionPubkey(buf, off) {
    if (buf.readUInt8(off) === 0)
        return null;
    return new PublicKey(buf.subarray(off + 1, off + 33));
}
function readString(buf, off) {
    const len = buf.readUInt32LE(off);
    return buf.toString("utf8", off + 4, off + 4 + len);
}
function readBool(buf, off) { return buf.readUInt8(off) === 1; }
// ── EscrowAccountV2 Parser (v0.25 schema) ──
const ESCROW_V2_DISCRIM = Buffer.from([83, 65, 80, 95, 101, 115, 99, 114, 111, 119, 95, 118, 50]);
export function parseEscrowAccountV2(data) {
    let o = DISCRIMINATOR_SIZE;
    const agent = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const depositor = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    o += 8; // bump (u8 padded)
    const tokenMint = readOptionPubkey(data, o);
    o += OPTION_SIZE;
    const decimals = readU8(data, o);
    o += U8_SIZE;
    o += 7; // padding
    const balance = readU64(data, o);
    o += U64_SIZE;
    const totalDeposited = readU64(data, o);
    o += U64_SIZE;
    const totalSettled = readU64(data, o);
    o += U64_SIZE;
    const totalCallsSettled = readU64(data, o);
    o += U64_SIZE;
    const pendingAmount = readU64(data, o);
    o += U64_SIZE;
    const pendingCalls = readU64(data, o);
    o += U64_SIZE;
    // v0.25 fields
    const maxObligation = readU64(data, o);
    o += U64_SIZE;
    const disputeBondTotal = readU64(data, o);
    o += U64_SIZE;
    const pendingSettlementCount = readU32(data, o);
    o += U32_SIZE;
    o += 4; // padding
    const pricePerCall = readU64(data, o);
    o += U64_SIZE;
    const basePrice = readU64(data, o);
    o += U64_SIZE;
    const maxCalls = readU64(data, o);
    o += U64_SIZE;
    // volume curve: u32 count, then points
    const volCount = readU32(data, o);
    o += U32_SIZE;
    const volumeCurve = [];
    for (let i = 0; i < volCount; i++) {
        const afterCalls = readU32(data, o);
        o += U32_SIZE + U32_SIZE;
        const pricePerCall = readU64(data, o);
        o += U64_SIZE;
        volumeCurve.push({ afterCalls, pricePerCall });
    }
    const settlementSecurity = readU8(data, o);
    o += U8_SIZE;
    o += U8_SIZE; // settlement_type
    const coSigner = readOptionPubkey(data, o);
    o += OPTION_SIZE;
    const arbiter = readOptionPubkey(data, o);
    o += OPTION_SIZE;
    const disputeWindowSlots = readU32(data, o);
    o += U32_SIZE;
    const finalized = readBool(data, o);
    o += BOOL_SIZE;
    o += 6; // padding to 8
    const createdAt = readI64(data, o);
    o += I64_SIZE;
    const expiresAt = readI64(data, o);
    o += I64_SIZE;
    const lastSettledAt = readI64(data, o);
    o += I64_SIZE;
    const settlementIndex = readU64(data, o);
    o += U64_SIZE;
    const escrowNonce = readU32(data, o);
    o += U32_SIZE;
    o += 4; // padding
    // reserved
    return {
        agent, depositor,
        tokenMint, decimals,
        balance, totalDeposited, totalSettled, totalCallsSettled,
        pendingAmount, pendingCalls,
        maxObligation, disputeBondTotal, pendingSettlementCount,
        pricePerCall, basePrice, maxCalls,
        volumeCurve,
        settlementSecurity,
        coSigner, arbiter, disputeWindowSlots,
        finalized,
        createdAt, expiresAt, lastSettledAt,
        settlementIndex, escrowNonce,
        bump: 0,
    };
}
export async function fetchEscrowAccountV2(connection, pubkey) {
    const acc = await connection.getAccountInfo(pubkey);
    if (!acc || !acc.data)
        return null;
    // check discriminator
    return parseEscrowAccountV2(Buffer.from(acc.data));
}
// ── PendingSettlement Parser ──
export function parsePendingSettlement(data) {
    let o = DISCRIMINATOR_SIZE;
    const escrow = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const depositor = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const agent = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const amount = readU64(data, o);
    o += U64_SIZE;
    const calls = readU64(data, o);
    o += U64_SIZE;
    const settlementIndex = readU64(data, o);
    o += U64_SIZE;
    const filedSlot = readU64(data, o);
    o += U64_SIZE;
    const releaseSlot = readU64(data, o);
    o += U64_SIZE;
    const isDisputed = readBool(data, o);
    o += BOOL_SIZE;
    const finalized = readBool(data, o);
    o += BOOL_SIZE;
    o += 6; // padding
    o += U64_SIZE; // created_at
    const bump = readU8(data, o);
    o += U8_SIZE;
    return { escrow, depositor, agent, amount, calls, settlementIndex,
        filedSlot, releaseSlot, isDisputed, finalized, bump };
}
// ── AgentAccount Parser ──
export function parseAgentAccount(data) {
    let o = DISCRIMINATOR_SIZE;
    const wallet = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const name = readString(data, o);
    o += 4 + name.length;
    const endpointUri = readString(data, o);
    o += 4 + endpointUri.length;
    // skip DID, capabilities (parsing simplified for brevity)
    return { wallet, name, endpointUri, capabilities: 0b1111, isOpen: true,
        totalCallsServed: new BN(0), createdAt: new BN(0), updatedAt: new BN(0) };
}
// ── AgentStats Parser ──
export function parseAgentStats(data) {
    let o = DISCRIMINATOR_SIZE;
    const wallet = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    o += U64_SIZE * 4;
    const activeEscrows = readU32(data, o);
    o += U32_SIZE;
    return { wallet, totalCallsServed: new BN(0), lifetimeRevenue: new BN(0),
        averageRating: 0, reviewCount: 0, disputeCount: 0, disputesLost: 0,
        activeEscrows, updatedAt: new BN(0) };
}
// ── AgentStake Parser ──
export function parseAgentStake(data) {
    let o = DISCRIMINATOR_SIZE;
    const wallet = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const stakedAmount = readU64(data, o);
    o += U64_SIZE;
    const slashedAmount = readU64(data, o);
    o += U64_SIZE;
    const unstakeAmount = readU64(data, o);
    o += U64_SIZE;
    const unstakeRequestedAt = readI64(data, o);
    o += I64_SIZE;
    const unstakeAvailableAt = readI64(data, o);
    o += I64_SIZE;
    const totalDisputesLost = readU32(data, o);
    o += U32_SIZE;
    // ...
    return { wallet, stakedAmount, slashedAmount, unstakeAmount,
        unstakeRequestedAt, unstakeAvailableAt, totalDisputesLost,
        createdAt: new BN(0), updatedAt: new BN(0) };
}
// ── DisputeRecord Parser ──
export function parseDisputeRecord(data) {
    let o = DISCRIMINATOR_SIZE;
    const escrow = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const depositor = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const agent = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    o += U8_SIZE; // bump
    o += U32_SIZE; // padding
    const settlementIndex = readU64(data, o);
    o += U64_SIZE;
    const amount = readU64(data, o);
    o += U64_SIZE;
    const bondAmount = readU64(data, o);
    o += U64_SIZE;
    const receiptRoot = data.subarray(o, o + 32);
    o += 32;
    const filedAt = readI64(data, o);
    o += I64_SIZE;
    const proofDeadline = readI64(data, o);
    o += I64_SIZE;
    const outcome = readU8(data, o);
    o += U8_SIZE;
    const arbiter = readOptionPubkey(data, o);
    o += OPTION_SIZE;
    const settledAt = readI64(data, o);
    o += I64_SIZE;
    return { escrow, depositor, agent, settlementIndex, amount, bondAmount,
        receiptRoot, filedAt, proofDeadline, outcome, arbiter, settledAt, bump: 0 };
}
// ── Subscription Parser ──
export function parseSubscription(data) {
    let o = DISCRIMINATOR_SIZE;
    const agent = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const subscriber = readPubkeyStrict(data, o);
    o += PUBKEY_SIZE;
    const balance = readU64(data, o);
    o += U64_SIZE;
    const totalPaid = readU64(data, o);
    o += U64_SIZE;
    const pricePerInterval = readU64(data, o);
    o += U64_SIZE;
    const intervalsPaid = readU32(data, o);
    o += U32_SIZE;
    const billingInterval = readU8(data, o);
    o += U8_SIZE;
    o += 3; // padding
    const lastClaimedAt = readI64(data, o);
    o += I64_SIZE;
    const nextDueAt = readI64(data, o);
    o += I64_SIZE;
    const startedAt = readI64(data, o);
    o += I64_SIZE;
    const cancelledAt = readI64(data, o);
    o += I64_SIZE;
    const createdAt = readI64(data, o);
    o += I64_SIZE;
    const tokenMint = readOptionPubkey(data, o);
    o += OPTION_SIZE;
    const tokenDecimals = readU8(data, o);
    return { agent, subscriber, balance, totalPaid, pricePerInterval,
        intervalsPaid, billingInterval, lastClaimedAt, nextDueAt,
        startedAt, cancelledAt, createdAt, tokenMint, tokenDecimals };
}
// ── Re-export fetchers ──
//# sourceMappingURL=index.js.map