/**
 * @module plugin/protocols
 * @description Protocol definitions + method registries for the SAP v2 plugin.
 *
 * Each protocol maps 1:1 to a SAP SDK domain module.
 * Methods carry Zod-typed input/output + LLM-friendly descriptions.
 *
 * Follows the `SynapsePlugin.protocols` contract exactly.
 *
 * @category Plugin
 * @since v0.1.0
 */

import {
  agentSchemas,
  feedbackSchemas,
  attestationSchemas,
  escrowSchemas,
  toolsSchemas,
  vaultSchemas,
  indexingSchemas,
  ledgerSchemas,
} from "./schemas";

// ═══════════════════════════════════════════════════════════════════
//  Types (locally defined — mirrors SynapsePlugin interfaces)
// ═══════════════════════════════════════════════════════════════════

import type { z } from "zod";

/**
 * A single tool method exposed by a protocol.
 *
 * @interface ProtocolMethod
 * @name ProtocolMethod
 * @description Defines a callable tool within a SAP protocol domain,
 *   including its name, LLM-friendly description, Zod input/output schemas,
 *   and parent protocol identifier.
 * @category Plugin
 * @since v0.1.0
 */
export interface ProtocolMethod {
  readonly name: string;
  readonly description: string;
  readonly input: z.ZodTypeAny;
  readonly output: z.ZodTypeAny;
  readonly protocol: string;
}

/**
 * A protocol group containing typed methods.
 *
 * @interface PluginProtocol
 * @name PluginProtocol
 * @description Groups related tool methods under a named protocol domain
 *   (e.g. `"sap-agent"`, `"sap-escrow"`). Each protocol maps 1:1 to a
 *   SapClient domain module.
 * @category Plugin
 * @since v0.1.0
 */
export interface PluginProtocol {
  readonly id: string;
  readonly name: string;
  readonly methods: ProtocolMethod[];
  readonly requiresClient: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Build an array of {@link ProtocolMethod} from a schema map and descriptions.
 *
 * @name buildMethods
 * @description Converts a record of `{ input, output }` Zod schema pairs
 *   and a matching description record into the `ProtocolMethod[]` array
 *   consumed by {@link PluginProtocol.methods}.
 * @param protocolId - Protocol identifier (e.g. `"sap-agent"`)
 * @param schemas - Record mapping method names to `{ input, output }` Zod schemas
 * @param descriptions - Record mapping method names to human-readable descriptions
 * @returns Array of fully typed {@link ProtocolMethod} objects
 * @internal
 * @since v0.1.0
 */
function buildMethods<
  T extends Record<string, { input: z.ZodTypeAny; output: z.ZodTypeAny }>,
>(
  protocolId: string,
  schemas: T,
  descriptions: Record<keyof T, string>,
): ProtocolMethod[] {
  return Object.entries(schemas).map(([name, schema]) => ({
    name,
    description: descriptions[name as keyof T] as string,
    input: schema.input,
    output: schema.output,
    protocol: protocolId,
  }));
}

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-agent (8 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP Agent Identity protocol — 8 tools for on-chain agent registration,
 * updates, activation lifecycle, call reporting, and reputation metrics.
 *
 * @name sapAgentProtocol
 * @description Covers `registerAgent`, `updateAgent`, `deactivateAgent`,
 *   `reactivateAgent`, `reportCalls`, `updateReputation`, `fetchAgent`,
 *   and `fetchGlobalRegistry`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapAgentProtocol: PluginProtocol = {
  id: "sap-agent",
  name: "SAP Agent Identity",
  requiresClient: true,
  methods: buildMethods("sap-agent", agentSchemas, {
    registerAgent:
      "Register a new AI agent identity on Solana with capabilities, pricing tiers, and x402 endpoint",
    updateAgent:
      "Update an existing agent's metadata, capabilities, or pricing tiers",
    deactivateAgent: "Deactivate an agent — marks it inactive for discovery",
    reactivateAgent: "Reactivate a previously deactivated agent",
    reportCalls:
      "Self-report the number of calls served (updates AgentStats)",
    updateReputation:
      "Update self-reported latency and uptime metrics for reputation scoring",
    fetchAgent:
      "Fetch full agent identity data from on-chain PDA (name, reputation, capabilities, pricing)",
    fetchGlobalRegistry:
      "Fetch the SAP GlobalRegistry — network-wide stats (total agents, tools, vaults, escrows)",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-feedback (4 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP Trustless Reputation protocol — 4 tools for on-chain feedback
 * (give, update, revoke, fetch) tied to agent identity PDAs.
 *
 * @name sapFeedbackProtocol
 * @description Covers `giveFeedback`, `updateFeedback`, `revokeFeedback`,
 *   and `fetchFeedback`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapFeedbackProtocol: PluginProtocol = {
  id: "sap-feedback",
  name: "SAP Trustless Reputation",
  requiresClient: true,
  methods: buildMethods("sap-feedback", feedbackSchemas, {
    giveFeedback:
      "Leave on-chain feedback for an agent (score 1-5, tag, optional comment hash)",
    updateFeedback:
      "Update an existing feedback entry (only original reviewer can update)",
    revokeFeedback:
      "Revoke a feedback entry — excluded from reputation calculations",
    fetchFeedback:
      "Fetch a specific feedback entry between a reviewer and an agent",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-attestation (3 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP Web of Trust protocol — 3 tools for creating, revoking, and
 * fetching on-chain attestations between agents.
 *
 * @name sapAttestationProtocol
 * @description Covers `createAttestation`, `revokeAttestation`,
 *   and `fetchAttestation`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapAttestationProtocol: PluginProtocol = {
  id: "sap-attestation",
  name: "SAP Web of Trust",
  requiresClient: true,
  methods: buildMethods("sap-attestation", attestationSchemas, {
    createAttestation:
      "Create an on-chain attestation vouching for an agent (identity, capability, compliance)",
    revokeAttestation:
      "Revoke a previously issued attestation (original attester only)",
    fetchAttestation:
      "Fetch an attestation between an attester and an agent",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-escrow (6 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP x402 Escrow protocol — 6 tools for creating, depositing into,
 * settling, withdrawing from, batch-settling, and fetching escrow accounts.
 *
 * @name sapEscrowProtocol
 * @description Covers `createEscrow`, `depositEscrow`, `settleEscrow`,
 *   `withdrawEscrow`, `batchSettle`, and `fetchEscrow`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapEscrowProtocol: PluginProtocol = {
  id: "sap-escrow",
  name: "SAP x402 Escrow",
  requiresClient: true,
  methods: buildMethods("sap-escrow", escrowSchemas, {
    createEscrow:
      "Create a pre-funded escrow account for agent micropayments (SOL or SPL tokens, with volume curve)",
    depositEscrow:
      "Deposit additional funds into an existing escrow account",
    settleEscrow:
      "Agent settles N calls — claims funds proportional to calls × price (agent owner only)",
    withdrawEscrow:
      "Client withdraws remaining funds from their escrow account",
    batchSettle:
      "Batch settlement — up to 10 settlements in a single transaction (agent owner only)",
    fetchEscrow:
      "Fetch escrow account data (balance, settled amounts, pricing, expiry)",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-tools (7 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP Tool Registry protocol — 7 tools for publishing, updating,
 * deactivating/reactivating tool descriptors and reporting invocations.
 *
 * @name sapToolsProtocol
 * @description Covers `publishToolByName`, `inscribeToolSchema`, `updateTool`,
 *   `deactivateTool`, `reactivateTool`, `reportInvocations`, and `fetchTool`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapToolsProtocol: PluginProtocol = {
  id: "sap-tools",
  name: "SAP Tool Registry",
  requiresClient: true,
  methods: buildMethods("sap-tools", toolsSchemas, {
    publishToolByName:
      "Publish a tool descriptor on-chain with name, protocol, schema hashes, HTTP method, and category",
    inscribeToolSchema:
      "Inscribe full JSON schema into transaction logs (zero rent — data lives in TX history)",
    updateTool:
      "Update a tool's schema hashes and bump its version number",
    deactivateTool: "Deactivate a tool — still discoverable but marked unavailable",
    reactivateTool: "Reactivate a previously deactivated tool",
    reportInvocations:
      "Report tool invocation count for analytics and discovery ranking",
    fetchTool:
      "Fetch a tool descriptor (schema hashes, version, invocation count, category)",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-vault (10 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP Encrypted Memory Vault protocol — 10 tools for vault lifecycle,
 * session management, encrypted memory inscription, nonce rotation,
 * and delegate authorization.
 *
 * @name sapVaultProtocol
 * @description Covers `initVault`, `openSession`, `inscribeMemory`,
 *   `closeSession`, `closeVault`, `rotateNonce`, `addDelegate`,
 *   `revokeDelegate`, `fetchVault`, and `fetchSession`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapVaultProtocol: PluginProtocol = {
  id: "sap-vault",
  name: "SAP Encrypted Memory Vault",
  requiresClient: true,
  methods: buildMethods("sap-vault", vaultSchemas, {
    initVault:
      "Initialize an encrypted memory vault for the caller's agent (AES-256-GCM nonce)",
    openSession:
      "Open a new conversation session within a vault (identified by session hash)",
    inscribeMemory:
      "Inscribe encrypted data into the Solana transaction log (zero rent — permanent, immutable)",
    closeSession:
      "Close a session — no more inscriptions allowed, session is finalized",
    closeVault:
      "Close the MemoryVault PDA and reclaim rent (all sessions must be closed first)",
    rotateNonce:
      "Rotate the vault encryption nonce (increments nonceVersion, logs old hash)",
    addDelegate:
      "Authorize a delegate (hot wallet) for vault operations with permission bitmask and expiry",
    revokeDelegate: "Revoke a delegate's vault authorization",
    fetchVault:
      "Fetch vault metadata (session count, inscription count, nonce version)",
    fetchSession:
      "Fetch session data (sequence counter, epoch info, closure status, merkle root)",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-indexing (8 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP Discovery Indexes protocol — 8 tools for creating and managing
 * capability and protocol indexes used for agent discovery.
 *
 * @name sapIndexingProtocol
 * @description Covers `initCapabilityIndex`, `addToCapabilityIndex`,
 *   `removeFromCapabilityIndex`, `initProtocolIndex`, `addToProtocolIndex`,
 *   `removeFromProtocolIndex`, `fetchCapabilityIndex`, and `fetchProtocolIndex`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapIndexingProtocol: PluginProtocol = {
  id: "sap-indexing",
  name: "SAP Discovery Indexes",
  requiresClient: true,
  methods: buildMethods("sap-indexing", indexingSchemas, {
    initCapabilityIndex:
      "Create a new capability index and register the caller's agent as the first entry",
    addToCapabilityIndex:
      "Add the caller's agent to an existing capability index (e.g. 'jupiter:swap')",
    removeFromCapabilityIndex:
      "Remove the caller's agent from a capability index",
    initProtocolIndex:
      "Create a new protocol index and register the caller's agent",
    addToProtocolIndex:
      "Add the caller's agent to an existing protocol index (e.g. 'jupiter')",
    removeFromProtocolIndex:
      "Remove the caller's agent from a protocol index",
    fetchCapabilityIndex:
      "Fetch all agents registered for a given capability ID",
    fetchProtocolIndex:
      "Fetch all agents registered for a given protocol ID",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  Protocol: sap-ledger (6 tools)
// ═══════════════════════════════════════════════════════════════════

/**
 * SAP Unified Memory Ledger protocol — 6 tools for initializing,
 * writing to, sealing, closing, and fetching ring-buffer ledgers
 * and their sealed archive pages.
 *
 * @name sapLedgerProtocol
 * @description Covers `initLedger`, `writeLedger`, `sealLedger`,
 *   `closeLedger`, `fetchLedger`, and `fetchLedgerPage`.
 * @category Plugin
 * @since v0.1.0
 */
export const sapLedgerProtocol: PluginProtocol = {
  id: "sap-ledger",
  name: "SAP Unified Memory Ledger",
  requiresClient: true,
  methods: buildMethods("sap-ledger", ledgerSchemas, {
    initLedger:
      "Create a MemoryLedger with 4KB ring buffer (~0.032 SOL rent) for a session",
    writeLedger:
      "Write data to the ring buffer + transaction log simultaneously (zero additional rent)",
    sealLedger:
      "Seal the ring buffer into a permanent write-once LedgerPage (~0.031 SOL rent)",
    closeLedger:
      "Close the ledger PDA and reclaim ~0.032 SOL rent",
    fetchLedger:
      "Fetch ledger metadata (entry count, data size, page count, merkle root)",
    fetchLedgerPage:
      "Fetch a sealed LedgerPage (permanent archive with data and merkle proof)",
  }),
};

// ═══════════════════════════════════════════════════════════════════
//  All protocols (ordered)
// ═══════════════════════════════════════════════════════════════════

/**
 * Ordered array of all 8 SAP v2 plugin protocols.
 *
 * @name SAP_PROTOCOLS
 * @description Contains agent, feedback, attestation, escrow, tools,
 *   vault, indexing, and ledger protocols (52 tools total).
 * @category Plugin
 * @since v0.1.0
 */
export const SAP_PROTOCOLS: readonly PluginProtocol[] = [
  sapAgentProtocol,
  sapFeedbackProtocol,
  sapAttestationProtocol,
  sapEscrowProtocol,
  sapToolsProtocol,
  sapVaultProtocol,
  sapIndexingProtocol,
  sapLedgerProtocol,
] as const;
