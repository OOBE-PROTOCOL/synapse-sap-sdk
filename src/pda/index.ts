/**
 * @module pda
 * @description Deterministic PDA derivation for every SAP v2 account.
 *
 * Each function returns `[PublicKey, bump]` and is pure — no network
 * calls. All results are memoizable by the caller.
 *
 * Seeds mirror the Rust `#[account(seeds = [...])]` definitions exactly.
 *
 * @category PDA
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { deriveAgent, deriveEscrow } from "@synapse-sap/sdk/pda";
 *
 * const [agentPda, bump] = deriveAgent(walletPublicKey);
 * const [escrowPda] = deriveEscrow(agentPda, depositor);
 * ```
 */

import { PublicKey } from "@solana/web3.js";
import { SAP_PROGRAM_ID, SEEDS } from "../constants";

/**
 * Tuple returned by all PDA derivation functions.
 *
 * @name PdaResult
 * @description A readonly tuple of `[pda, bump]` where `pda` is the derived
 *   `PublicKey` and `bump` is the canonical bump seed (`u8`).
 * @category PDA
 * @since v0.1.0
 */
type PdaResult = readonly [pda: PublicKey, bump: number];

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Thin wrapper around `PublicKey.findProgramAddressSync`.
 *
 * @name findPda
 * @description Derives a PDA from the given seed buffers and program ID.
 * @param seeds  - Array of seed `Buffer`s / `Uint8Array`s.
 * @param programId - The program to derive against (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} The derived `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 */
const findPda = (
  seeds: Array<Buffer | Uint8Array>,
  programId: PublicKey = SAP_PROGRAM_ID,
): PdaResult => PublicKey.findProgramAddressSync(seeds, programId);

/**
 * Encode a seed string as a UTF-8 `Buffer`.
 *
 * @name toSeedBuf
 * @description Converts a string seed prefix to a `Buffer` suitable for PDA derivation.
 * @param s - The seed string to encode.
 * @returns {Buffer} UTF-8 encoded buffer.
 * @category PDA
 * @since v0.1.0
 */
const toSeedBuf = (s: string): Buffer => Buffer.from(s);

/**
 * Encode an unsigned 32-bit integer as a little-endian `Buffer`.
 *
 * @name u32le
 * @description Produces a 4-byte LE buffer for numeric PDA seed segments (e.g., epoch index, page index).
 * @param n - The number to encode.
 * @returns {Buffer} 4-byte little-endian buffer.
 * @category PDA
 * @since v0.1.0
 */
const u32le = (n: number): Buffer => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n, 0);
  return buf;
};

// ═════════════════════════════════════════════
//  Core PDAs
// ═════════════════════════════════════════════

/**
 * Derive the **GlobalRegistry** PDA.
 *
 * Seeds: `["sap_global"]`
 *
 * @name deriveGlobalRegistry
 * @description Returns the singleton global registry address used by the SAP program.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see GlobalRegistry account type
 */
export const deriveGlobalRegistry = (
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.GLOBAL)], programId);

/**
 * Derive the **AgentAccount** PDA for a given wallet.
 *
 * Seeds: `["sap_agent", wallet]`
 *
 * @name deriveAgent
 * @description Computes the unique agent PDA owned by `wallet`.
 * @param wallet    - The agent owner’s wallet `PublicKey`.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see AgentAccount
 */
export const deriveAgent = (
  wallet: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.AGENT), wallet.toBuffer()], programId);

/**
 * Derive the **AgentStats** PDA for a given agent.
 *
 * Seeds: `["sap_stats", agent_pda]`
 *
 * @name deriveAgentStats
 * @description Computes the stats account PDA associated with an agent.
 * @param agentPda  - The agent’s on-chain PDA.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see AgentStats
 */
export const deriveAgentStats = (
  agentPda: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.STATS), agentPda.toBuffer()], programId);

// ═════════════════════════════════════════════
//  Feedback
// ═════════════════════════════════════════════

/**
 * Derive the **Feedback** PDA for a reviewer on a specific agent.
 *
 * Seeds: `["sap_feedback", agent_pda, reviewer_wallet]`
 *
 * @name deriveFeedback
 * @description Computes the feedback account PDA scoped to a reviewer–agent pair.
 * @param agentPda  - The target agent’s PDA.
 * @param reviewer  - The reviewer’s wallet `PublicKey`.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see FeedbackAccount
 */
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

/**
 * Derive the **CapabilityIndex** PDA for a hashed capability string.
 *
 * Seeds: `["sap_cap_idx", capability_hash]`
 *
 * @name deriveCapabilityIndex
 * @description Computes the capability index PDA used to look up agents by capability.
 * @param capabilityHash - SHA-256 hash of the capability string (32 bytes).
 * @param programId      - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see CapabilityIndex
 */
export const deriveCapabilityIndex = (
  capabilityHash: Uint8Array,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.CAPABILITY_INDEX), Buffer.from(capabilityHash)],
    programId,
  );

/**
 * Derive the **ProtocolIndex** PDA for a hashed protocol string.
 *
 * Seeds: `["sap_proto_idx", protocol_hash]`
 *
 * @name deriveProtocolIndex
 * @description Computes the protocol index PDA used to look up agents by protocol.
 * @param protocolHash - SHA-256 hash of the protocol string (32 bytes).
 * @param programId    - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see ProtocolIndex
 */
export const deriveProtocolIndex = (
  protocolHash: Uint8Array,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.PROTOCOL_INDEX), Buffer.from(protocolHash)],
    programId,
  );

/**
 * Derive the **ToolCategoryIndex** PDA for a tool category discriminant.
 *
 * Seeds: `["sap_tool_cat", category_u8]`
 *
 * @name deriveToolCategoryIndex
 * @description Computes the tool category index PDA used to look up tools by category.
 * @param category  - The `u8` category discriminant (see {@link TOOL_CATEGORY_VALUES}).
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see ToolCategoryIndex
 */
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

/**
 * Derive the **MemoryVault** PDA for a given agent.
 *
 * Seeds: `["sap_vault", agent_pda]`
 *
 * @name deriveVault
 * @description Computes the memory vault PDA owned by the specified agent.
 * @param agentPda  - The agent’s on-chain PDA.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see MemoryVault
 */
export const deriveVault = (
  agentPda: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.VAULT), agentPda.toBuffer()], programId);

/**
 * Derive the **Session** PDA for a vault and session hash.
 *
 * Seeds: `["sap_session", vault_pda, session_hash]`
 *
 * @name deriveSession
 * @description Computes the session PDA scoped to a vault and unique session identifier.
 * @param vaultPda    - The parent vault’s PDA.
 * @param sessionHash - SHA-256 hash identifying the session (32 bytes).
 * @param programId   - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see SessionAccount
 */
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

/**
 * Derive the **EpochPage** PDA for a session at a given epoch index.
 *
 * Seeds: `["sap_epoch", session_pda, epoch_index_u32_le]`
 *
 * @name deriveEpochPage
 * @description Computes the epoch page PDA for paginated memory inscriptions.
 * @param sessionPda - The parent session’s PDA.
 * @param epochIndex - Zero-based epoch page index.
 * @param programId  - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see EpochPage
 */
export const deriveEpochPage = (
  sessionPda: PublicKey,
  epochIndex: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.EPOCH), sessionPda.toBuffer(), u32le(epochIndex)],
    programId,
  );

/**
 * Derive the **VaultDelegate** PDA for a delegate on a vault.
 *
 * Seeds: `["sap_delegate", vault_pda, delegate_pubkey]`
 *
 * @name deriveVaultDelegate
 * @description Computes the delegate authorization PDA granting a wallet write access to a vault.
 * @param vaultPda  - The parent vault’s PDA.
 * @param delegate  - The delegate’s wallet `PublicKey`.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see VaultDelegate
 */
export const deriveVaultDelegate = (
  vaultPda: PublicKey,
  delegate: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.DELEGATE), vaultPda.toBuffer(), delegate.toBuffer()],
    programId,
  );

/**
 * Derive the **Checkpoint** PDA for a session at a given checkpoint index.
 *
 * Seeds: `["sap_checkpoint", session_pda, checkpoint_index_u32_le]`
 *
 * @name deriveCheckpoint
 * @description Computes the checkpoint PDA storing a Merkle snapshot of session state.
 * @param sessionPda      - The parent session’s PDA.
 * @param checkpointIndex - Zero-based checkpoint index.
 * @param programId       - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see Checkpoint
 */
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

/**
 * Derive the **Tool** PDA for an agent and tool name hash.
 *
 * Seeds: `["sap_tool", agent_pda, tool_name_hash]`
 *
 * @name deriveTool
 * @description Computes the tool registration PDA scoped to an agent and tool identifier.
 * @param agentPda     - The owning agent’s PDA.
 * @param toolNameHash - SHA-256 hash of the tool name (32 bytes).
 * @param programId    - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see ToolAccount
 */
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

/**
 * Derive the **Escrow** PDA for an agent–depositor pair.
 *
 * Seeds: `["sap_escrow", agent_pda, depositor_wallet]`
 *
 * @name deriveEscrow
 * @description Computes the escrow PDA holding deposited funds for service payments.
 * @param agentPda  - The service-providing agent’s PDA.
 * @param depositor - The depositor’s wallet `PublicKey`.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see EscrowAccount
 */
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

/**
 * Derive the **Attestation** PDA for an attester on a specific agent.
 *
 * Seeds: `["sap_attest", agent_pda, attester_wallet]`
 *
 * @name deriveAttestation
 * @description Computes the attestation PDA recording a third-party’s trust assertion.
 * @param agentPda  - The attested agent’s PDA.
 * @param attester  - The attester’s wallet `PublicKey`.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see AttestationAccount
 */
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

/**
 * Derive the **MemoryLedger** PDA for a session.
 *
 * Seeds: `["sap_ledger", session_pda]`
 *
 * @name deriveLedger
 * @description Computes the ledger PDA that tracks append-only entries for a session.
 * @param sessionPda - The parent session’s PDA.
 * @param programId  - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see MemoryLedger
 */
export const deriveLedger = (
  sessionPda: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.LEDGER), sessionPda.toBuffer()], programId);

/**
 * Derive the **LedgerPage** PDA for a ledger at a given page index.
 *
 * Seeds: `["sap_page", ledger_pda, page_index_u32_le]`
 *
 * @name deriveLedgerPage
 * @description Computes the ledger page PDA for paginated ledger data storage.
 * @param ledgerPda - The parent ledger’s PDA.
 * @param pageIndex - Zero-based page index.
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.1.0
 * @see LedgerPage
 */
export const deriveLedgerPage = (
  ledgerPda: PublicKey,
  pageIndex: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.LEDGER_PAGE), ledgerPda.toBuffer(), u32le(pageIndex)],
    programId,
  );

// ═════════════════════════════════════════════
//  Memory Buffer (legacy)
// ═════════════════════════════════════════════

/**
 * Derive the **MemoryBuffer** PDA for a session at a given page index.
 *
 * Seeds: `["sap_buffer", session_pda, page_index_u32_le]`
 *
 * @name deriveBuffer
 * @description Computes the buffer page PDA for chunked memory writes within a session.
 * @param sessionPda - The parent session's PDA.
 * @param pageIndex  - Zero-based page index.
 * @param programId  - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.3.1
 * @see MemoryBuffer
 */
export const deriveBuffer = (
  sessionPda: PublicKey,
  pageIndex: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.BUFFER), sessionPda.toBuffer(), u32le(pageIndex)],
    programId,
  );

// ═════════════════════════════════════════════
//  Session Digest
// ═════════════════════════════════════════════

/**
 * Derive the **SessionDigest** PDA for a session.
 *
 * Seeds: `["sap_digest", session_pda]`
 *
 * @name deriveDigest
 * @description Computes the digest PDA that stores a compact hash summary of a session.
 * @param sessionPda - The parent session's PDA.
 * @param programId  - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.3.1
 * @see SessionDigest
 */
export const deriveDigest = (
  sessionPda: PublicKey,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda([toSeedBuf(SEEDS.DIGEST), sessionPda.toBuffer()], programId);

// ═════════════════════════════════════════════
//  Plugin
// ═════════════════════════════════════════════

/**
 * Derive the **PluginConfig** PDA for an agent and plugin type.
 *
 * Seeds: `["sap_plugin", agent_pda, plugin_type_u8]`
 *
 * @name derivePlugin
 * @description Computes the plugin configuration PDA scoped to an agent and plugin type.
 * @param agentPda   - The owning agent's PDA.
 * @param pluginType - The `u8` plugin type discriminant.
 * @param programId  - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.3.1
 * @see PluginConfig
 */
export const derivePlugin = (
  agentPda: PublicKey,
  pluginType: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.PLUGIN), agentPda.toBuffer(), Buffer.from([pluginType])],
    programId,
  );

// ═════════════════════════════════════════════
//  Legacy Memory (entry + chunk)
// ═════════════════════════════════════════════

/**
 * Derive the **MemoryEntry** PDA for an agent and entry hash.
 *
 * Seeds: `["sap_memory", agent_pda, entry_hash]`
 *
 * @name deriveMemoryEntry
 * @description Computes the memory entry PDA for legacy key-value memory storage.
 * @param agentPda  - The owning agent's PDA.
 * @param entryHash - SHA-256 hash of the entry key (32 bytes).
 * @param programId - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.3.1
 * @see MemoryEntry
 */
export const deriveMemoryEntry = (
  agentPda: PublicKey,
  entryHash: Uint8Array,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [toSeedBuf(SEEDS.MEMORY), agentPda.toBuffer(), Buffer.from(entryHash)],
    programId,
  );

/**
 * Derive the **MemoryChunk** PDA for a memory entry at a given chunk index.
 *
 * Seeds: `["sap_mem_chunk", memory_entry_pda, chunk_index_u8]`
 *
 * @name deriveMemoryChunk
 * @description Computes the chunk PDA for fragmented memory entry data.
 * @param memoryEntryPda - The parent memory entry's PDA.
 * @param chunkIndex     - Zero-based chunk index (0–255).
 * @param programId      - Override program ID (defaults to {@link SAP_PROGRAM_ID}).
 * @returns {PdaResult} `[pda, bump]` tuple.
 * @category PDA
 * @since v0.3.1
 * @see MemoryChunk
 */
export const deriveMemoryChunk = (
  memoryEntryPda: PublicKey,
  chunkIndex: number,
  programId = SAP_PROGRAM_ID,
): PdaResult =>
  findPda(
    [
      toSeedBuf(SEEDS.MEMORY_CHUNK),
      memoryEntryPda.toBuffer(),
      Buffer.from([chunkIndex]),
    ],
    programId,
  );
