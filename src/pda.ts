/**
 * @module pda
 * @description Deterministic PDA derivation for every SAP v2 account.
 *
 * Each function returns `[PublicKey, bump]` and is pure — no network
 * calls. All results are memoizable by the caller.
 *
 * Seeds mirror the Rust `#[account(seeds = [...])]` definitions exactly.
 */

import { PublicKey } from "@solana/web3.js";
import { SAP_PROGRAM_ID, SEEDS } from "./constants";

type PdaResult = readonly [pda: PublicKey, bump: number];

// ── Helpers ──────────────────────────────────────────────────────

const findPda = (
  seeds: Array<Buffer | Uint8Array>,
  programId: PublicKey = SAP_PROGRAM_ID,
): PdaResult => PublicKey.findProgramAddressSync(seeds, programId);

const toSeedBuf = (s: string): Buffer => Buffer.from(s);
const u32le = (n: number): Buffer => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n, 0);
  return buf;
};

// ═════════════════════════════════════════════
//  Core PDAs
// ═════════════════════════════════════════════

/** `["sap_global"]` */
export const deriveGlobalRegistry = (
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.GLOBAL)], programId);

/** `["sap_agent", wallet]` */
export const deriveAgent = (
  wallet: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.AGENT), wallet.toBuffer()], programId);

/** `["sap_stats", agent_pda]` */
export const deriveAgentStats = (
  agentPda: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.STATS), agentPda.toBuffer()], programId);

// ═════════════════════════════════════════════
//  Feedback
// ═════════════════════════════════════════════

/** `["sap_feedback", agent_pda, reviewer_wallet]` */
export const deriveFeedback = (
  agentPda: PublicKey,
  reviewer: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.FEEDBACK), agentPda.toBuffer(), reviewer.toBuffer()],
    programId,
  );

// ═════════════════════════════════════════════
//  Indexing
// ═════════════════════════════════════════════

/** `["sap_cap_idx", capability_hash]` */
export const deriveCapabilityIndex = (
  capabilityHash: Uint8Array,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.CAPABILITY_INDEX), Buffer.from(capabilityHash)],
    programId,
  );

/** `["sap_proto_idx", protocol_hash]` */
export const deriveProtocolIndex = (
  protocolHash: Uint8Array,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.PROTOCOL_INDEX), Buffer.from(protocolHash)],
    programId,
  );

/** `["sap_tool_cat", category_u8]` */
export const deriveToolCategoryIndex = (
  category: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.TOOL_CATEGORY), Buffer.from([category])],
    programId,
  );

// ═════════════════════════════════════════════
//  Memory Vault
// ═════════════════════════════════════════════

/** `["sap_vault", agent_pda]` */
export const deriveVault = (
  agentPda: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.VAULT), agentPda.toBuffer()], programId);

/** `["sap_session", vault_pda, session_hash]` */
export const deriveSession = (
  vaultPda: PublicKey,
  sessionHash: Uint8Array,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [
      toSeedBuf(SEEDS.SESSION),
      vaultPda.toBuffer(),
      Buffer.from(sessionHash),
    ],
    programId,
  );

/** `["sap_epoch", session_pda, epoch_index_u32_le]` */
export const deriveEpochPage = (
  sessionPda: PublicKey,
  epochIndex: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.EPOCH), sessionPda.toBuffer(), u32le(epochIndex)],
    programId,
  );

/** `["sap_delegate", vault_pda, delegate_pubkey]` */
export const deriveVaultDelegate = (
  vaultPda: PublicKey,
  delegate: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.DELEGATE), vaultPda.toBuffer(), delegate.toBuffer()],
    programId,
  );

/** `["sap_checkpoint", session_pda, checkpoint_index_u32_le]` */
export const deriveCheckpoint = (
  sessionPda: PublicKey,
  checkpointIndex: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [
      toSeedBuf(SEEDS.CHECKPOINT),
      sessionPda.toBuffer(),
      u32le(checkpointIndex),
    ],
    programId,
  );

// ═════════════════════════════════════════════
//  Tools
// ═════════════════════════════════════════════

/** `["sap_tool", agent_pda, tool_name_hash]` */
export const deriveTool = (
  agentPda: PublicKey,
  toolNameHash: Uint8Array,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.TOOL), agentPda.toBuffer(), Buffer.from(toolNameHash)],
    programId,
  );

// ═════════════════════════════════════════════
//  Escrow
// ═════════════════════════════════════════════

/** `["sap_escrow", agent_pda, depositor_wallet]` */
export const deriveEscrow = (
  agentPda: PublicKey,
  depositor: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.ESCROW), agentPda.toBuffer(), depositor.toBuffer()],
    programId,
  );

// ═════════════════════════════════════════════
//  Attestation
// ═════════════════════════════════════════════

/** `["sap_attest", agent_pda, attester_wallet]` */
export const deriveAttestation = (
  agentPda: PublicKey,
  attester: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.ATTESTATION), agentPda.toBuffer(), attester.toBuffer()],
    programId,
  );

// ═════════════════════════════════════════════
//  Memory Ledger
// ═════════════════════════════════════════════

/** `["sap_ledger", session_pda]` */
export const deriveLedger = (
  sessionPda: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.LEDGER), sessionPda.toBuffer()], programId);

/** `["sap_page", ledger_pda, page_index_u32_le]` */
export const deriveLedgerPage = (
  ledgerPda: PublicKey,
  pageIndex: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.LEDGER_PAGE), ledgerPda.toBuffer(), u32le(pageIndex)],
    programId,
  );
