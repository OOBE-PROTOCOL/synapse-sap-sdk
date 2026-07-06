// ================================================================
//  synapse-sap-sdk / src/pdas/index.ts
//  Legacy PDA aliases backed by the canonical ./pda module.
// ================================================================

import { PublicKey } from "@solana/web3.js";
import {
  deriveAgent,
  deriveAgentStats,
  deriveCapabilityIndex,
  deriveDispute,
  deriveEpochPage,
  deriveEscrowV2,
  deriveGlobalRegistry,
  derivePendingSettlement,
  derivePricingMenu,
  deriveProtocolIndex,
  deriveSession,
  deriveStake,
  deriveSubscription,
  deriveTool,
  deriveToolCategoryIndex,
  deriveVault,
  deriveVaultDelegate,
} from "../pda/index.js";
import { sha256 } from "../utils/hash.js";
import BN from "bn.js";

type PdaResult = readonly [pda: PublicKey, bump: number];

const toBigInt = (value: BN | number | bigint): bigint =>
  typeof value === "bigint" ? value : BN.isBN(value) ? BigInt(value.toString()) : BigInt(value);

const toU32 = (value: BN | number): number =>
  BN.isBN(value) ? value.toNumber() : value;

const numericSessionHash = (value: BN | number): Uint8Array => {
  const out = Buffer.alloc(32);
  out.writeUInt32LE(toU32(value), 0);
  return out;
};

/** Derive Agent PDA from wallet pubkey. */
export function getAgentPDA(wallet: PublicKey): PdaResult {
  return deriveAgent(wallet);
}

/** Derive AgentStats PDA from agent PDA. */
export function getAgentStatsPDA(agent: PublicKey): PdaResult {
  return deriveAgentStats(agent);
}

/** Derive AgentPricingMenu PDA from agent PDA. */
export function getPricingMenuPDA(agent: PublicKey): PdaResult {
  return derivePricingMenu(agent);
}

/** Derive AgentStake PDA from agent PDA. */
export function getAgentStakePDA(agent: PublicKey): PdaResult {
  return deriveStake(agent);
}

/** Derive EscrowV2 PDA from agent PDA, depositor wallet, and nonce. */
export function getEscrowV2PDA(
  agent: PublicKey,
  depositor: PublicKey,
  escrowNonce: BN | number | bigint = 0,
): PdaResult {
  return deriveEscrowV2(agent, depositor, toBigInt(escrowNonce));
}

/** Derive PendingSettlement PDA from escrow PDA and settlement index. */
export function getPendingSettlementPDA(
  escrow: PublicKey,
  settlementIndex: BN | number | bigint,
): PdaResult {
  return derivePendingSettlement(escrow, toBigInt(settlementIndex));
}

/** Derive Dispute PDA from pending settlement PDA. */
export function getDisputePDA(pendingSettlement: PublicKey): PdaResult {
  return deriveDispute(pendingSettlement);
}

/** Derive Subscription PDA from agent, subscriber, and subscription id. */
export function getSubscriptionPDA(
  agent: PublicKey,
  subscriber: PublicKey,
  subId: BN | number | bigint,
): PdaResult {
  return deriveSubscription(agent, subscriber, toBigInt(subId));
}

/** Derive Vault PDA from agent pubkey. */
export function getVaultPDA(agent: PublicKey): PdaResult {
  return deriveVault(agent);
}

/** Derive Session PDA from vault and 32-byte session hash. */
export function getSessionLedgerPDA(
  vault: PublicKey,
  sessionHash: Uint8Array | BN | number,
): PdaResult {
  return deriveSession(
    vault,
    sessionHash instanceof Uint8Array ? sessionHash : numericSessionHash(sessionHash),
  );
}

/** Derive EpochPage PDA from session and epoch. */
export function getEpochPagePDA(session: PublicKey, epoch: BN | number): PdaResult {
  return deriveEpochPage(session, toU32(epoch));
}

/** Derive VaultDelegate PDA from vault and delegate. */
export function getVaultDelegatePDA(vault: PublicKey, delegate: PublicKey): PdaResult {
  return deriveVaultDelegate(vault, delegate);
}

/** Derive Tool PDA from agent and a 32-byte tool-name hash. */
export function getToolPDA(agent: PublicKey, toolNameHash: Uint8Array): PdaResult {
  return deriveTool(agent, toolNameHash);
}

/** Derive ToolCategoryIndex PDA from category u8. */
export function getToolCategoryIndexPDA(category: number): PdaResult {
  return deriveToolCategoryIndex(category);
}

/** Derive CapabilityIndex PDA from capability_hash (32 bytes). */
export function getCapabilityIndexPDA(capabilityHash: Uint8Array): PdaResult {
  return deriveCapabilityIndex(capabilityHash);
}

/** Derive ProtocolIndex PDA from protocol_hash (32 bytes). */
export function getProtocolIndexPDA(protocolHash: Uint8Array): PdaResult {
  return deriveProtocolIndex(protocolHash);
}

/** Derive GlobalRegistry PDA (singleton). */
export function getGlobalPDA(): PdaResult {
  return deriveGlobalRegistry();
}

/** Convert a string to a deterministic 32-byte hash for local previews. */
export function hashString(s: string): Uint8Array {
  return sha256(s);
}
