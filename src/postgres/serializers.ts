/**
 * @module postgres/serializers
 * @description Transforms on-chain account data into PostgreSQL-ready row objects.
 *
 * Each serializer takes the deserialized Anchor account data and the PDA
 * address, then returns a flat key-value record suitable for SQL INSERT/UPSERT.
 *
 * @category Postgres
 * @since v0.1.0
 * @internal
 */

import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import type {
  AgentAccountData,
  AgentStatsData,
  FeedbackAccountData,
  CapabilityIndexData,
  ProtocolIndexData,
  ToolCategoryIndexData,
  GlobalRegistryData,
  MemoryVaultData,
  SessionLedgerData,
  EpochPageData,
  VaultDelegateData,
  SessionCheckpointData,
  ToolDescriptorData,
  EscrowAccountData,
  AgentAttestationData,
  MemoryLedgerData,
  LedgerPageData,
} from "../types";

// ── Helpers ──────────────────────────────────────────

/** Convert BN to string for BIGINT columns. */
const bn = (v: BN | null | undefined): string | null =>
  v ? v.toString() : null;

/** Convert PublicKey to base58 string. */
const pk = (v: PublicKey | null | undefined): string | null =>
  v ? v.toBase58() : null;

/** Convert a number[] (byte array) to Buffer for BYTEA columns. */
const bytes = (v: number[] | Uint8Array | null | undefined): Buffer | null =>
  v ? Buffer.from(v) : null;

/** Resolve Anchor enum variant to string. */
function enumVariant(v: Record<string, unknown> | null | undefined): string | null {
  if (!v) return null;
  const keys = Object.keys(v);
  return keys.length > 0 ? (keys[0] ?? null) : null;
}

/** PublicKey[] → TEXT[] */
const pks = (arr: PublicKey[]): string[] => arr.map((p) => p.toBase58());

// ═══════════════════════════════════════════════════════════════════
//  Serializers — one per account type
// ═══════════════════════════════════════════════════════════════════

export function serializeGlobalRegistry(
  pda: string,
  d: GlobalRegistryData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    total_agents: bn(d.totalAgents),
    active_agents: bn(d.activeAgents),
    total_feedbacks: bn(d.totalFeedbacks),
    total_capabilities: d.totalCapabilities,
    total_protocols: d.totalProtocols,
    last_registered_at: bn(d.lastRegisteredAt),
    initialized_at: bn(d.initializedAt),
    authority: pk(d.authority),
    total_tools: d.totalTools,
    total_vaults: d.totalVaults,
    total_escrows: d.totalEscrows,
    total_attestations: d.totalAttestations,
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeAgent(
  pda: string,
  d: AgentAccountData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    version: d.version,
    wallet: pk(d.wallet),
    name: d.name,
    description: d.description,
    agent_id: d.agentId,
    agent_uri: d.agentUri,
    x402_endpoint: d.x402Endpoint,
    is_active: d.isActive,
    created_at: bn(d.createdAt),
    updated_at: bn(d.updatedAt),
    reputation_score: d.reputationScore,
    total_feedbacks: d.totalFeedbacks,
    reputation_sum: bn(d.reputationSum),
    total_calls_served: bn(d.totalCallsServed),
    avg_latency_ms: d.avgLatencyMs,
    uptime_percent: d.uptimePercent,
    capabilities: JSON.stringify(d.capabilities),
    pricing: JSON.stringify(
      d.pricing.map((t) => ({
        ...t,
        pricePerCall: t.pricePerCall?.toString(),
        minPricePerCall: t.minPricePerCall?.toString(),
        maxPricePerCall: t.maxPricePerCall?.toString(),
        minEscrowDeposit: t.minEscrowDeposit?.toString(),
        tokenMint: t.tokenMint ? pk(t.tokenMint) : null,
        tokenType: enumVariant(t.tokenType as Record<string, unknown>),
        settlementMode: enumVariant(
          t.settlementMode as Record<string, unknown> | null,
        ),
        volumeCurve: t.volumeCurve?.map((v) => ({
          afterCalls: v.afterCalls,
          pricePerCall: v.pricePerCall?.toString(),
        })),
      })),
    ),
    protocols: d.protocols,
    active_plugins: JSON.stringify(
      d.activePlugins.map((p) => ({
        pluginType: enumVariant(p.pluginType as Record<string, unknown>),
        pda: pk(p.pda),
      })),
    ),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeAgentStats(
  pda: string,
  d: AgentStatsData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    agent: pk(d.agent),
    wallet: pk(d.wallet),
    total_calls_served: bn(d.totalCallsServed),
    is_active: d.isActive,
    updated_at: bn(d.updatedAt),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeFeedback(
  pda: string,
  d: FeedbackAccountData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    agent: pk(d.agent),
    reviewer: pk(d.reviewer),
    score: d.score,
    tag: d.tag,
    comment_hash: bytes(d.commentHash),
    created_at: bn(d.createdAt),
    updated_at: bn(d.updatedAt),
    is_revoked: d.isRevoked,
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeCapabilityIndex(
  pda: string,
  d: CapabilityIndexData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    capability_id: d.capabilityId,
    capability_hash: bytes(d.capabilityHash),
    agents: pks(d.agents),
    total_pages: d.totalPages,
    last_updated: bn(d.lastUpdated),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeProtocolIndex(
  pda: string,
  d: ProtocolIndexData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    protocol_id: d.protocolId,
    protocol_hash: bytes(d.protocolHash),
    agents: pks(d.agents),
    total_pages: d.totalPages,
    last_updated: bn(d.lastUpdated),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeVault(
  pda: string,
  d: MemoryVaultData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    agent: pk(d.agent),
    wallet: pk(d.wallet),
    vault_nonce: bytes(d.vaultNonce),
    total_sessions: d.totalSessions,
    total_inscriptions: bn(d.totalInscriptions),
    total_bytes_inscribed: bn(d.totalBytesInscribed),
    created_at: bn(d.createdAt),
    protocol_version: d.protocolVersion,
    nonce_version: d.nonceVersion,
    last_nonce_rotation: bn(d.lastNonceRotation),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeSession(
  pda: string,
  d: SessionLedgerData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    vault: pk(d.vault),
    session_hash: bytes(d.sessionHash),
    sequence_counter: d.sequenceCounter,
    total_bytes: bn(d.totalBytes),
    current_epoch: d.currentEpoch,
    total_epochs: d.totalEpochs,
    created_at: bn(d.createdAt),
    last_inscribed_at: bn(d.lastInscribedAt),
    is_closed: d.isClosed,
    merkle_root: bytes(d.merkleRoot),
    total_checkpoints: d.totalCheckpoints,
    tip_hash: bytes(d.tipHash),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeEpochPage(
  pda: string,
  d: EpochPageData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    session: pk(d.session),
    epoch_index: d.epochIndex,
    start_sequence: d.startSequence,
    inscription_count: d.inscriptionCount,
    total_bytes: d.totalBytes,
    first_ts: bn(d.firstTs),
    last_ts: bn(d.lastTs),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeDelegate(
  pda: string,
  d: VaultDelegateData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    vault: pk(d.vault),
    delegate: pk(d.delegate),
    permissions: d.permissions,
    expires_at: bn(d.expiresAt),
    created_at: bn(d.createdAt),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeTool(
  pda: string,
  d: ToolDescriptorData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    agent: pk(d.agent),
    tool_name_hash: bytes(d.toolNameHash),
    tool_name: d.toolName,
    protocol_hash: bytes(d.protocolHash),
    version: d.version,
    description_hash: bytes(d.descriptionHash),
    input_schema_hash: bytes(d.inputSchemaHash),
    output_schema_hash: bytes(d.outputSchemaHash),
    http_method: enumVariant(d.httpMethod as Record<string, unknown>),
    category: enumVariant(d.category as Record<string, unknown>),
    params_count: d.paramsCount,
    required_params: d.requiredParams,
    is_compound: d.isCompound,
    is_active: d.isActive,
    total_invocations: bn(d.totalInvocations),
    created_at: bn(d.createdAt),
    updated_at: bn(d.updatedAt),
    previous_version: pk(d.previousVersion),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeCheckpoint(
  pda: string,
  d: SessionCheckpointData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    session: pk(d.session),
    checkpoint_index: d.checkpointIndex,
    merkle_root: bytes(d.merkleRoot),
    sequence_at: d.sequenceAt,
    epoch_at: d.epochAt,
    total_bytes_at: bn(d.totalBytesAt),
    inscriptions_at: bn(d.inscriptionsAt),
    created_at: bn(d.createdAt),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeEscrow(
  pda: string,
  d: EscrowAccountData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    agent: pk(d.agent),
    depositor: pk(d.depositor),
    agent_wallet: pk(d.agentWallet),
    balance: bn(d.balance),
    total_deposited: bn(d.totalDeposited),
    total_settled: bn(d.totalSettled),
    total_calls_settled: bn(d.totalCallsSettled),
    price_per_call: bn(d.pricePerCall),
    max_calls: bn(d.maxCalls),
    created_at: bn(d.createdAt),
    last_settled_at: bn(d.lastSettledAt),
    expires_at: bn(d.expiresAt),
    volume_curve: JSON.stringify(
      d.volumeCurve.map((v) => ({
        afterCalls: v.afterCalls,
        pricePerCall: v.pricePerCall?.toString(),
      })),
    ),
    token_mint: pk(d.tokenMint),
    token_decimals: d.tokenDecimals,
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeToolCategoryIndex(
  pda: string,
  d: ToolCategoryIndexData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    category: enumVariant({ [d.category]: {} } as Record<string, unknown>) ?? String(d.category),
    tools: pks(d.tools),
    total_pages: d.totalPages,
    last_updated: bn(d.lastUpdated),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeAttestation(
  pda: string,
  d: AgentAttestationData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    agent: pk(d.agent),
    attester: pk(d.attester),
    attestation_type: d.attestationType,
    metadata_hash: bytes(d.metadataHash),
    is_active: d.isActive,
    expires_at: bn(d.expiresAt),
    created_at: bn(d.createdAt),
    updated_at: bn(d.updatedAt),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeLedger(
  pda: string,
  d: MemoryLedgerData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    session: pk(d.session),
    authority: pk(d.authority),
    num_entries: d.numEntries,
    merkle_root: bytes(d.merkleRoot),
    latest_hash: bytes(d.latestHash),
    total_data_size: bn(d.totalDataSize),
    created_at: bn(d.createdAt),
    updated_at: bn(d.updatedAt),
    num_pages: d.numPages,
    ring: bytes(d.ring),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}

export function serializeLedgerPage(
  pda: string,
  d: LedgerPageData,
  slot: number,
): Record<string, unknown> {
  return {
    pda,
    bump: d.bump,
    ledger: pk(d.ledger),
    page_index: d.pageIndex,
    sealed_at: bn(d.sealedAt),
    entries_in_page: d.entriesInPage,
    data_size: d.dataSize,
    merkle_root_at_seal: bytes(d.merkleRootAtSeal),
    data: bytes(d.data),
    slot,
    synced_at: new Date(),
    raw_data: JSON.parse(JSON.stringify(d)),
  };
}
