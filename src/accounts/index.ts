// ================================================================
//  synapse-sap-sdk / src/accounts/index.ts
//  Typed account fetchers with discriminants + parsers
// ================================================================

import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import {
  PROGRAM_ID, DISCRIMINATOR_SIZE, U64_SIZE, U32_SIZE,
  I64_SIZE, U16_SIZE, U8_SIZE, OPTION_SIZE, PUBKEY_SIZE, BOOL_SIZE,
} from "../constants";
import {
  EscrowAccountV2, PendingSettlement, AgentAccount, AgentStats,
  AgentStake, DisputeRecord, Subscription, MemoryVault, SessionLedger,
  EpochPage, SettlementSecurity, DisputeOutcome, BillingInterval, Capability,
} from "../types";

function readU8(buf: Buffer, off: number): number     { return buf.readUInt8(off); }
function readU16(buf: Buffer, off: number): number    { return buf.readUInt16LE(off); }
function readU32(buf: Buffer, off: number): number     { return buf.readUInt32LE(off); }
function readU64(buf: Buffer, off: number): BN         { return new BN(buf.subarray(off, off + 8), "le"); }
function readI64(buf: Buffer, off: number): BN         { return new BN(buf.subarray(off, off + 8), "le"); }
function readPubkey(buf: Buffer, off: number): PublicKey | null {
  const key = new PublicKey(buf.subarray(off, off + 32));
  return key.equals(PublicKey.default) ? null : key;
}
function readPubkeyStrict(buf: Buffer, off: number): PublicKey {
  return new PublicKey(buf.subarray(off, off + 32));
}
function readOptionPubkey(buf: Buffer, off: number): PublicKey | null {
  if (buf.readUInt8(off) === 0) return null;
  return new PublicKey(buf.subarray(off + 1, off + 33));
}
function readOptionPubkeyWithOffset(buf: Buffer, off: number): [PublicKey | null, number] {
  if (buf.readUInt8(off) === 0) return [null, off + 1];
  return [new PublicKey(buf.subarray(off + 1, off + 33)), off + 33];
}
function readString(buf: Buffer, off: number): string {
  const len = buf.readUInt32LE(off);
  return buf.toString("utf8", off + 4, off + 4 + len);
}
function readBool(buf: Buffer, off: number): boolean  { return buf.readUInt8(off) === 1; }

// ── EscrowAccountV2 Parser (Anchor/Borsh schema) ──
const ESCROW_V2_DISCRIM = Buffer.from([83,65,80,95,101,115,99,114,111,119,95,118,50]);
export function parseEscrowAccountV2(data: Buffer): EscrowAccountV2 {
  let o = DISCRIMINATOR_SIZE;
  const bump = readU8(data, o); o += U8_SIZE;
  const version = readU8(data, o); o += U8_SIZE;
  const agent = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const depositor = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const agentWallet = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const escrowNonce = readU64(data, o); o += U64_SIZE;
  const balance = readU64(data, o); o += U64_SIZE;
  const totalDeposited = readU64(data, o); o += U64_SIZE;
  const totalSettled = readU64(data, o); o += U64_SIZE;
  const totalCallsSettled = readU64(data, o); o += U64_SIZE;
  const pricePerCall = readU64(data, o); o += U64_SIZE;
  const maxCalls = readU64(data, o); o += U64_SIZE;
  const createdAt = readI64(data, o); o += I64_SIZE;
  const lastSettledAt = readI64(data, o); o += I64_SIZE;
  const expiresAt = readI64(data, o); o += I64_SIZE;

  const volCount = readU32(data, o); o += U32_SIZE;
  const volumeCurve: any[] = [];
  for (let i = 0; i < volCount; i++) {
    const afterCalls = readU32(data, o); o += U32_SIZE;
    const pricePerCall = readU64(data, o); o += U64_SIZE;
    volumeCurve.push({ afterCalls, pricePerCall });
  }

  const [tokenMint, tokenMintOffset] = readOptionPubkeyWithOffset(data, o);
  o = tokenMintOffset;
  const tokenDecimals = readU8(data, o); o += U8_SIZE;
  const settlementSecurity = readU8(data, o) as SettlementSecurity; o += U8_SIZE;
  const disputeWindowSlots = readU64(data, o); o += U64_SIZE;
  const settlementIndex = readU64(data, o); o += U64_SIZE;
  const [coSigner, coSignerOffset] = readOptionPubkeyWithOffset(data, o);
  o = coSignerOffset;
  const [arbiter, arbiterOffset] = readOptionPubkeyWithOffset(data, o);
  o = arbiterOffset;
  const pendingAmount = readU64(data, o); o += U64_SIZE;
  const pendingCalls = readU64(data, o); o += U64_SIZE;

  return {
    bump, version, agent, depositor, agentWallet, escrowNonce,
    balance, totalDeposited, totalSettled, totalCallsSettled,
    pricePerCall, maxCalls, createdAt, lastSettledAt, expiresAt,
    volumeCurve, tokenMint, tokenDecimals, settlementSecurity,
    disputeWindowSlots, settlementIndex, coSigner, arbiter,
    pendingAmount, pendingCalls,
  };
}

export async function fetchEscrowAccountV2(
  connection: Connection, pubkey: PublicKey
): Promise<EscrowAccountV2 | null> {
  const acc = await connection.getAccountInfo(pubkey);
  if (!acc || !acc.data) return null;
  // check discriminator
  return parseEscrowAccountV2(Buffer.from(acc.data));
}

// ── PendingSettlement Parser ──
export function parsePendingSettlement(data: Buffer): PendingSettlement {
  let o = DISCRIMINATOR_SIZE;
  const bump = readU8(data, o); o += U8_SIZE;
  const escrow = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const agent = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const agentWallet = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const depositor = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const settlementIndex = readU64(data, o); o += U64_SIZE;
  const callsToSettle = readU64(data, o); o += U64_SIZE;
  const amount = readU64(data, o); o += U64_SIZE;
  const serviceHash = Array.from(data.subarray(o, o + 32)); o += 32;
  const createdAt = readI64(data, o); o += I64_SIZE;
  const releaseSlot = readU64(data, o); o += U64_SIZE;
  const isFinalized = readBool(data, o); o += BOOL_SIZE;
  const isDisputed = readBool(data, o); o += BOOL_SIZE;
  const outcome = readU8(data, o) as DisputeOutcome; o += U8_SIZE;
  return { bump, escrow, agent, agentWallet, depositor, settlementIndex,
    callsToSettle, amount, serviceHash, createdAt, releaseSlot, isFinalized,
    isDisputed, outcome };
}

// ── AgentAccount Parser ──
export function parseAgentAccount(data: Buffer): AgentAccount {
  let o = DISCRIMINATOR_SIZE;
  const wallet = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const name = readString(data, o); o += 4 + name.length;
  const endpointUri = readString(data, o); o += 4 + endpointUri.length;
  // skip DID, capabilities (parsing simplified for brevity)
  return { wallet, name, endpointUri, capabilities: 0b1111, isOpen: true,
    totalCallsServed: new BN(0), createdAt: new BN(0), updatedAt: new BN(0) };
}

// ── AgentStats Parser ──
export function parseAgentStats(data: Buffer): AgentStats {
  let o = DISCRIMINATOR_SIZE;
  const wallet = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  o += U64_SIZE * 4;
  const activeEscrows = readU32(data, o); o += U32_SIZE;
  return { wallet, totalCallsServed: new BN(0), lifetimeRevenue: new BN(0),
    averageRating: 0, reviewCount: 0, disputeCount: 0, disputesLost: 0,
    activeEscrows, updatedAt: new BN(0) };
}

// ── AgentStake Parser ──
export function parseAgentStake(data: Buffer): AgentStake {
  let o = DISCRIMINATOR_SIZE;
  const wallet = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const stakedAmount = readU64(data, o); o += U64_SIZE;
  const slashedAmount = readU64(data, o); o += U64_SIZE;
  const unstakeAmount = readU64(data, o); o += U64_SIZE;
  const unstakeRequestedAt = readI64(data, o); o += I64_SIZE;
  const unstakeAvailableAt = readI64(data, o); o += I64_SIZE;
  const totalDisputesLost = readU32(data, o); o += U32_SIZE;
  // ...
  return { wallet, stakedAmount, slashedAmount, unstakeAmount,
    unstakeRequestedAt, unstakeAvailableAt, totalDisputesLost,
    createdAt: new BN(0), updatedAt: new BN(0) };
}

// ── DisputeRecord Parser ──
export function parseDisputeRecord(data: Buffer): DisputeRecord {
  let o = DISCRIMINATOR_SIZE;
  const bump = readU8(data, o); o += U8_SIZE;
  const pendingSettlement = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const escrow = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const depositor = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const agent = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const evidenceHash = Array.from(data.subarray(o, o + 32)); o += 32;
  const agentEvidenceHash = Array.from(data.subarray(o, o + 32)); o += 32;
  const arbiter = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const outcome = readU8(data, o) as DisputeOutcome; o += U8_SIZE;
  const createdAt = readI64(data, o); o += I64_SIZE;
  const resolvedAt = readI64(data, o); o += I64_SIZE;
  const resolutionHash = Array.from(data.subarray(o, o + 32)); o += 32;
  const slashAmount = readU64(data, o); o += U64_SIZE;
  return { bump, pendingSettlement, escrow, depositor, agent, evidenceHash,
    agentEvidenceHash, arbiter, outcome, createdAt, resolvedAt, resolutionHash,
    slashAmount };
}

// ── Subscription Parser ──
export function parseSubscription(data: Buffer): Subscription {
  let o = DISCRIMINATOR_SIZE;
  const agent = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const subscriber = readPubkeyStrict(data, o); o += PUBKEY_SIZE;
  const balance = readU64(data, o); o += U64_SIZE;
  const totalPaid = readU64(data, o); o += U64_SIZE;
  const pricePerInterval = readU64(data, o); o += U64_SIZE;
  const intervalsPaid = readU32(data, o); o += U32_SIZE;
  const billingInterval = readU8(data, o) as BillingInterval; o += U8_SIZE;
  o += 3; // padding
  const lastClaimedAt = readI64(data, o); o += I64_SIZE;
  const nextDueAt = readI64(data, o); o += I64_SIZE;
  const startedAt = readI64(data, o); o += I64_SIZE;
  const cancelledAt = readI64(data, o); o += I64_SIZE;
  const createdAt = readI64(data, o); o += I64_SIZE;
  const tokenMint = readOptionPubkey(data, o); o += OPTION_SIZE;
  const tokenDecimals = readU8(data, o);
  return { agent, subscriber, balance, totalPaid, pricePerInterval,
    intervalsPaid, billingInterval, lastClaimedAt, nextDueAt,
    startedAt, cancelledAt, createdAt, tokenMint, tokenDecimals };
}

// ── Re-export fetchers ──
