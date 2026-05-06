// ================================================================
//  synapse-sap-sdk / src/pdas/index.ts
//  PDA derivation utilities — byte-perfect with on-chain seeds
// ================================================================

import { PublicKey } from "@solana/web3.js";
import { SEEDS, PROGRAM_ID } from "../constants";
import BN from "bn.js";

const PROGRAM_PUBLIC_KEY = new PublicKey(PROGRAM_ID);

/** Derive Agent PDA from wallet pubkey */
export function getAgentPDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.AGENT), wallet.toBuffer()],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive AgentStats PDA from wallet pubkey */
export function getAgentStatsPDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.AGENT_STATS), wallet.toBuffer()],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive AgentStake PDA from wallet pubkey */
export function getAgentStakePDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.AGENT_STAKE), wallet.toBuffer()],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive EscrowV2 PDA from agent wallet + nonce */
export function getEscrowV2PDA(agent: PublicKey, escrowNonce: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.ESCROW_V2),
      agent.toBuffer(),
      Buffer.from(new Uint32Array([escrowNonce]).buffer),
    ],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive PendingSettlement PDA from escrow + settlement_index */
export function getPendingSettlementPDA(
  escrow: PublicKey,
  settlementIndex: BN | number
): [PublicKey, number] {
  const idxBuf = typeof settlementIndex === "number"
    ? Buffer.from(new Uint32Array([settlementIndex]).buffer)
    : settlementIndex.toArrayLike(Buffer, "le", 4);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PENDING_SETTLE), escrow.toBuffer(), idxBuf],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive Dispute PDA from escrow + settlement_index */
export function getDisputePDA(
  escrow: PublicKey,
  settlementIndex: BN | number
): [PublicKey, number] {
  const idxBuf = typeof settlementIndex === "number"
    ? Buffer.from(new Uint32Array([settlementIndex]).buffer)
    : settlementIndex.toArrayLike(Buffer, "le", 4);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.DISPUTE), escrow.toBuffer(), idxBuf],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive Subscription PDA from agent + subscriber + nonce */
export function getSubscriptionPDA(
  agent: PublicKey,
  subscriber: PublicKey,
  nonce: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.SUBSCRIPTION),
      agent.toBuffer(),
      subscriber.toBuffer(),
      Buffer.from(new Uint32Array([nonce]).buffer),
    ],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive Vault PDA from agent pubkey */
export function getVaultPDA(agent: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VAULT), agent.toBuffer()],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive SessionLedger PDA from vault + session number */
export function getSessionLedgerPDA(
  vault: PublicKey,
  session: BN | number
): [PublicKey, number] {
  const sessionBuf = typeof session === "number"
    ? Buffer.from(new Uint32Array([session]).buffer)
    : session.toArrayLike(Buffer, "le", 4);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SESSION), vault.toBuffer(), sessionBuf],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive EpochPage PDA from vault + epoch */
export function getEpochPagePDA(
  vault: PublicKey,
  epoch: BN | number
): [PublicKey, number] {
  const epochBuf = typeof epoch === "number"
    ? Buffer.from(new Uint32Array([epoch]).buffer)
    : epoch.toArrayLike(Buffer, "le", 4);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.EPOCH_PAGE), vault.toBuffer(), epochBuf],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive VaultDelegate PDA from vault + delegate */
export function getVaultDelegatePDA(
  vault: PublicKey,
  delegate: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VAULT_DELEGATE), vault.toBuffer(), delegate.toBuffer()],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive Tool PDA from agent + tool_name */
export function getToolPDA(agent: PublicKey, toolName: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.TOOL), agent.toBuffer(), Buffer.from(toolName)],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive ToolCategoryIndex PDA from category u8 */
export function getToolCategoryIndexPDA(category: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.TOOL_CAT_IDX), Buffer.from([category])],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive CapabilityIndex PDA from capability_hash (32 bytes) */
export function getCapabilityIndexPDA(capabilityHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.CAPABILITY_IDX), Buffer.from(capabilityHash)],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive ProtocolIndex PDA from protocol_hash (32 bytes) */
export function getProtocolIndexPDA(protocolHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PROTOCOL_IDX), Buffer.from(protocolHash)],
    PROGRAM_PUBLIC_KEY
  );
}

/** Derive GlobalConfig PDA (singleton) */
export function getGlobalPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.GLOBAL)],
    PROGRAM_PUBLIC_KEY
  );
}

// ── Re-export convenience ──


/** Convert a string to a 32-byte hash for capability/protocol indices */
export function hashString(s: string): Uint8Array {
  // On-chain uses SHA-256; SDK can compute with crypto or just use the same 
  // For now, we use sha256 import from solana-sha256-hasher or crypto
  // We'll provide a fallback in utils
  return new Uint8Array(32); // placeholder - filled by utils.hasher
}
