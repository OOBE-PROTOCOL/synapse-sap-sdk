/**
 * @module plugin/schemas
 * @description Zod schemas for every SAP v2 plugin tool.
 *
 * Each schema is an `{ input, output }` pair that drives:
 *   1. Runtime validation (LLM → tool call)
 *   2. LangChain StructuredTool generation
 *   3. MCP/Vercel AI tool descriptors
 *
 * Conventions:
 *   - Solana public keys → `z.string().describe('Base58 public key …')`
 *   - BN/bigint amounts  → `z.string().describe('Amount in lamports …')`
 *   - Hashes ([u8;32])   → `z.array(z.number()).length(32)`
 *   - Tool outputs always include `txSignature` for write ops
 *
 * @category Plugin
 * @since v0.1.0
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════
//  Shared Primitives
// ═══════════════════════════════════════════════════════════════════

/** Base58-encoded Solana public key (32–44 chars). */
const pubkey = z
  .string()
  .min(32)
  .max(44)
  .describe("Solana public key (base58)");

/** Base58-encoded transaction signature. */
const txSig = z.string().describe("Transaction signature (base58)");
/** 32-byte SHA-256 hash represented as a fixed-length integer array. */
const hash32 = z.array(z.number().int().min(0).max(255)).length(32);
/** Token amount in the smallest unit, serialized as a string for BN safety. */
const lamports = z.string().describe("Amount in smallest token unit (string)");
/** Optional public key (nullable). */
const optPubkey = pubkey.nullish();

/** Standard write-operation output containing the transaction signature. */
const writeOutput = z.object({ txSignature: txSig });

// ═══════════════════════════════════════════════════════════════════
//  Nested Sub-schemas
// ═══════════════════════════════════════════════════════════════════

/** Reusable schema for an agent capability entry. */
const capabilitySchema = z.object({
  id: z.string().describe("Capability identifier (e.g. 'jupiter:swap')"),
  description: z.string().nullish().describe("Human-readable description"),
  protocolId: z.string().nullish().describe("Protocol namespace"),
  version: z.string().nullish().describe("Semver version"),
});

/** Reusable schema for a volume curve breakpoint (tiered pricing). */
const volumeBreakpointSchema = z.object({
  afterCalls: z.number().int().describe("Call threshold for this tier"),
  pricePerCall: lamports.describe("Price per call after threshold"),
});

/** Reusable schema for a pricing tier with token, settlement, and volume curve config. */
const pricingTierSchema = z.object({
  tierId: z.string().describe("Pricing tier ID (e.g. 'standard')"),
  pricePerCall: lamports,
  minPricePerCall: lamports.nullish().describe("Price floor"),
  maxPricePerCall: lamports.nullish().describe("Price ceiling"),
  rateLimit: z.number().int().describe("Calls per second"),
  maxCallsPerSession: z.number().int().describe("0 = unlimited"),
  burstLimit: z.number().int().nullish(),
  tokenType: z
    .enum(["sol", "usdc", "spl"])
    .describe("Payment token type"),
  tokenMint: optPubkey.describe("SPL token mint address (when tokenType=spl)"),
  tokenDecimals: z.number().int().nullish(),
  settlementMode: z
    .enum(["instant", "escrow", "batched", "x402"])
    .nullish()
    .describe("Settlement mode"),
  minEscrowDeposit: lamports.nullish(),
  batchIntervalSec: z.number().int().nullish(),
  volumeCurve: z.array(volumeBreakpointSchema).nullish(),
});

/** Reusable schema for a settlement entry (calls + service hash). */
const settlementSchema = z.object({
  callsToSettle: z.string().describe("Number of calls to settle"),
  serviceHash: hash32.describe("SHA-256 hash of the service rendered"),
});

// ═══════════════════════════════════════════════════════════════════
//  Agent Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-agent** protocol (8 tools).
 *
 * @name agentSchemas
 * @description Covers agent registration, updates, activation lifecycle,
 *   call reporting, reputation metrics, and on-chain data fetching.
 * @category Plugin
 * @since v0.1.0
 */
export const agentSchemas = {
  registerAgent: {
    input: z.object({
      name: z.string().max(64).describe("Agent display name (max 64 chars)"),
      description: z
        .string()
        .max(512)
        .describe("Agent description (max 512 chars)"),
      capabilities: z
        .array(capabilitySchema)
        .describe("List of capabilities this agent offers"),
      pricing: z
        .array(pricingTierSchema)
        .describe("Pricing tiers for agent services"),
      protocols: z
        .array(z.string())
        .describe("Protocol IDs this agent supports"),
      agentId: z.string().nullish().describe("Optional DID-style agent ID"),
      agentUri: z
        .string()
        .url()
        .nullish()
        .describe("Optional agent metadata URI"),
      x402Endpoint: z
        .string()
        .url()
        .nullish()
        .describe("x402 payment endpoint URL"),
    }),
    output: writeOutput,
  },

  updateAgent: {
    input: z.object({
      name: z.string().max(64).nullish(),
      description: z.string().max(512).nullish(),
      capabilities: z.array(capabilitySchema).nullish(),
      pricing: z.array(pricingTierSchema).nullish(),
      protocols: z.array(z.string()).nullish(),
      agentId: z.string().nullish(),
      agentUri: z.string().url().nullish(),
      x402Endpoint: z.string().url().nullish(),
    }),
    output: writeOutput,
  },

  deactivateAgent: {
    input: z.object({}),
    output: writeOutput,
  },

  reactivateAgent: {
    input: z.object({}),
    output: writeOutput,
  },

  reportCalls: {
    input: z.object({
      callsServed: z.number().int().positive().describe("Number of calls served"),
    }),
    output: writeOutput,
  },

  updateReputation: {
    input: z.object({
      avgLatencyMs: z.number().int().min(0).describe("Average latency in ms"),
      uptimePercent: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe("Uptime percentage (0-100)"),
    }),
    output: writeOutput,
  },

  fetchAgent: {
    input: z.object({
      wallet: pubkey.nullish().describe("Agent wallet (defaults to caller)"),
    }),
    output: z.object({
      name: z.string(),
      description: z.string(),
      isActive: z.boolean(),
      reputationScore: z.number(),
      totalCallsServed: z.string(),
      totalFeedbacks: z.number(),
      avgLatencyMs: z.number(),
      uptimePercent: z.number(),
      wallet: pubkey,
      agentId: z.string().nullish(),
      x402Endpoint: z.string().nullish(),
      capabilities: z.array(capabilitySchema),
      pricing: z.array(pricingTierSchema),
      protocols: z.array(z.string()),
    }),
  },

  fetchGlobalRegistry: {
    input: z.object({}),
    output: z.object({
      totalAgents: z.string(),
      activeAgents: z.string(),
      totalFeedbacks: z.string(),
      totalCapabilities: z.number(),
      totalProtocols: z.number(),
      totalTools: z.number(),
      totalVaults: z.number(),
      totalEscrows: z.number(),
      totalAttestations: z.number(),
      authority: pubkey,
    }),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Feedback Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-feedback** protocol (4 tools).
 *
 * @name feedbackSchemas
 * @description Covers giving, updating, revoking, and fetching on-chain
 *   feedback entries tied to agent identity PDAs.
 * @category Plugin
 * @since v0.1.0
 */
export const feedbackSchemas = {
  giveFeedback: {
    input: z.object({
      agentWallet: pubkey.describe("Wallet of the agent to review"),
      score: z
        .number()
        .int()
        .min(1)
        .max(5)
        .describe("Feedback score (1-5)"),
      tag: z
        .string()
        .max(32)
        .describe("Short tag (e.g. 'reliable', 'fast', 'accurate')"),
      commentHash: hash32
        .nullish()
        .describe("Optional SHA-256 hash of off-chain comment"),
    }),
    output: writeOutput,
  },

  updateFeedback: {
    input: z.object({
      agentWallet: pubkey.describe("Wallet of the reviewed agent"),
      newScore: z.number().int().min(1).max(5).describe("Updated score (1-5)"),
      newTag: z.string().max(32).nullish().describe("Updated tag"),
      commentHash: hash32.nullish(),
    }),
    output: writeOutput,
  },

  revokeFeedback: {
    input: z.object({
      agentWallet: pubkey.describe("Wallet of the reviewed agent"),
    }),
    output: writeOutput,
  },

  fetchFeedback: {
    input: z.object({
      agentWallet: pubkey.describe("Wallet of the reviewed agent"),
      reviewer: pubkey.nullish().describe("Reviewer wallet (defaults to caller)"),
    }),
    output: z.object({
      agent: pubkey,
      reviewer: pubkey,
      score: z.number(),
      tag: z.string(),
      isRevoked: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Attestation Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-attestation** protocol (3 tools).
 *
 * @name attestationSchemas
 * @description Covers creating, revoking, and fetching on-chain attestations
 *   between agents in the SAP Web of Trust.
 * @category Plugin
 * @since v0.1.0
 */
export const attestationSchemas = {
  createAttestation: {
    input: z.object({
      agentWallet: pubkey.describe("Wallet of the agent to attest"),
      attestationType: z
        .string()
        .max(32)
        .describe(
          "Type of attestation (e.g. 'identity', 'capability', 'compliance')"
        ),
      metadataHash: hash32.describe(
        "SHA-256 hash of attestation metadata"
      ),
      expiresAt: z
        .string()
        .describe("Unix timestamp (seconds) when attestation expires"),
    }),
    output: writeOutput,
  },

  revokeAttestation: {
    input: z.object({
      agentWallet: pubkey.describe("Wallet of the attested agent"),
    }),
    output: writeOutput,
  },

  fetchAttestation: {
    input: z.object({
      agentWallet: pubkey.describe("Wallet of the attested agent"),
      attester: pubkey
        .nullish()
        .describe("Attester wallet (defaults to caller)"),
    }),
    output: z.object({
      agent: pubkey,
      attester: pubkey,
      attestationType: z.string(),
      isActive: z.boolean(),
      expiresAt: z.string(),
      createdAt: z.string(),
    }),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Escrow Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-escrow** protocol (6 tools).
 *
 * @name escrowSchemas
 * @description Covers escrow creation, deposits, settlement (single and batch),
 *   withdrawal, and account data fetching for x402 micropayments.
 * @category Plugin
 * @since v0.1.0
 */
export const escrowSchemas = {
  createEscrow: {
    input: z.object({
      agentWallet: pubkey.describe("Agent wallet to deposit escrow for"),
      pricePerCall: lamports.describe("Base price per call"),
      maxCalls: z.string().describe("Maximum calls allowed"),
      initialDeposit: lamports.describe("Initial deposit amount"),
      expiresAt: z.string().describe("Expiry timestamp (unix seconds)"),
      volumeCurve: z.array(volumeBreakpointSchema).default([]),
      tokenMint: optPubkey.describe(
        "SPL token mint (null = native SOL)"
      ),
      tokenDecimals: z
        .number()
        .int()
        .default(9)
        .describe("Token decimals (9=SOL, 6=USDC)"),
    }),
    output: writeOutput,
  },

  depositEscrow: {
    input: z.object({
      agentWallet: pubkey.describe("Agent wallet of the escrow"),
      amount: lamports.describe("Additional deposit amount"),
    }),
    output: writeOutput,
  },

  settleEscrow: {
    input: z.object({
      depositorWallet: pubkey.describe("Depositor (client) wallet"),
      callsToSettle: z.string().describe("Number of calls to settle"),
      serviceHash: hash32.describe("SHA-256 hash of the service rendered"),
      priorityFeeMicroLamports: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe("Priority fee in microlamports per CU (0 = none, 5000 = recommended)"),
      computeUnits: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe("Compute unit limit (default 200k, recommended 100k for settle)"),
      skipPreflight: z
        .boolean()
        .nullish()
        .describe("Skip Solana simulation before submitting (saves ~400ms)"),
    }),
    output: writeOutput,
  },

  withdrawEscrow: {
    input: z.object({
      agentWallet: pubkey.describe("Agent wallet of the escrow"),
      amount: lamports.describe("Amount to withdraw"),
    }),
    output: writeOutput,
  },

  batchSettle: {
    input: z.object({
      depositorWallet: pubkey.describe("Depositor (client) wallet"),
      settlements: z
        .array(settlementSchema)
        .min(1)
        .max(10)
        .describe("Up to 10 settlement entries"),
      priorityFeeMicroLamports: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe("Priority fee in microlamports per CU (0 = none, 5000 = recommended)"),
      computeUnits: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe("Compute unit limit (default 200k, recommended 300k for batch)"),
      skipPreflight: z
        .boolean()
        .nullish()
        .describe("Skip Solana simulation before submitting (saves ~400ms)"),
    }),
    output: writeOutput,
  },

  fetchEscrow: {
    input: z.object({
      agentWallet: pubkey.describe("Agent wallet"),
      depositor: pubkey.nullish().describe("Depositor wallet (defaults to caller)"),
    }),
    output: z.object({
      agent: pubkey,
      depositor: pubkey,
      agentWallet: pubkey,
      balance: z.string(),
      totalDeposited: z.string(),
      totalSettled: z.string(),
      totalCallsSettled: z.string(),
      pricePerCall: z.string(),
      maxCalls: z.string(),
      expiresAt: z.string(),
      tokenDecimals: z.number(),
      tokenMint: z.string().nullish(),
    }),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Tools Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-tools** protocol (7 tools).
 *
 * @name toolsSchemas
 * @description Covers tool publishing, schema inscription, updates,
 *   activation lifecycle, invocation reporting, and descriptor fetching.
 * @category Plugin
 * @since v0.1.0
 */
export const toolsSchemas = {
  publishToolByName: {
    input: z.object({
      toolName: z.string().max(64).describe("Tool name (e.g. 'swap')"),
      protocolId: z.string().describe("Protocol ID (e.g. 'jupiter')"),
      description: z
        .string()
        .max(256)
        .describe("Tool description for LLM consumption"),
      inputSchema: z
        .string()
        .describe("JSON schema string for tool input"),
      outputSchema: z
        .string()
        .describe("JSON schema string for tool output"),
      httpMethod: z
        .enum(["get", "post", "put", "delete", "compound"])
        .describe("HTTP method"),
      category: z
        .enum([
          "swap",
          "lend",
          "stake",
          "nft",
          "payment",
          "data",
          "governance",
          "bridge",
          "analytics",
          "custom",
        ])
        .describe("Tool category for discovery"),
      paramsCount: z.number().int().describe("Total parameter count"),
      requiredParams: z.number().int().describe("Required parameter count"),
      isCompound: z
        .boolean()
        .default(false)
        .describe("Whether tool chains multiple actions"),
    }),
    output: writeOutput,
  },

  inscribeToolSchema: {
    input: z.object({
      toolName: z.string().describe("Tool name"),
      schemaType: z
        .enum(["input", "output", "description"])
        .describe("Schema type to inscribe"),
      schemaData: z.string().describe("Schema content (JSON string)"),
      compression: z
        .enum(["none", "deflate", "gzip", "brotli"])
        .default("none")
        .describe("Compression algorithm"),
    }),
    output: writeOutput,
  },

  updateTool: {
    input: z.object({
      toolName: z.string().describe("Tool name to update"),
      httpMethod: z
        .enum(["get", "post", "put", "delete", "compound"])
        .nullish(),
      category: z
        .enum([
          "swap",
          "lend",
          "stake",
          "nft",
          "payment",
          "data",
          "governance",
          "bridge",
          "analytics",
          "custom",
        ])
        .nullish(),
      paramsCount: z.number().int().nullish(),
      requiredParams: z.number().int().nullish(),
    }),
    output: writeOutput,
  },

  deactivateTool: {
    input: z.object({
      toolName: z.string().describe("Tool name to deactivate"),
    }),
    output: writeOutput,
  },

  reactivateTool: {
    input: z.object({
      toolName: z.string().describe("Tool name to reactivate"),
    }),
    output: writeOutput,
  },

  reportInvocations: {
    input: z.object({
      toolName: z.string().describe("Tool name"),
      invocations: z
        .number()
        .int()
        .positive()
        .describe("Number of invocations to report"),
    }),
    output: writeOutput,
  },

  fetchTool: {
    input: z.object({
      agentWallet: pubkey.describe("Agent wallet that published the tool"),
      toolName: z.string().describe("Tool name"),
    }),
    output: z.object({
      toolName: z.string(),
      version: z.number(),
      isActive: z.boolean(),
      totalInvocations: z.string(),
      paramsCount: z.number(),
      requiredParams: z.number(),
      isCompound: z.boolean(),
      agent: pubkey,
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Vault Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-vault** protocol (10 tools).
 *
 * @name vaultSchemas
 * @description Covers vault initialization, session management, encrypted
 *   memory inscription, nonce rotation, delegate authorization, and
 *   vault/session data fetching.
 * @category Plugin
 * @since v0.1.0
 */
export const vaultSchemas = {
  initVault: {
    input: z.object({
      vaultNonce: hash32.describe(
        "32-byte encryption nonce for vault initialization"
      ),
    }),
    output: writeOutput,
  },

  openSession: {
    input: z.object({
      sessionHash: hash32.describe(
        "32-byte session identifier hash"
      ),
    }),
    output: writeOutput,
  },

  inscribeMemory: {
    input: z.object({
      sessionHash: z
        .string()
        .describe("Hex-encoded session hash for PDA derivation"),
      sequence: z.number().int().describe("Sequence number within session"),
      encryptedData: z
        .string()
        .describe("Hex-encoded encrypted payload"),
      nonce: z
        .array(z.number().int().min(0).max(255))
        .length(12)
        .describe("12-byte AES-GCM nonce"),
      contentHash: hash32.describe("SHA-256 of plaintext content"),
      totalFragments: z
        .number()
        .int()
        .min(1)
        .default(1)
        .describe("Total fragments (1 = single)"),
      fragmentIndex: z.number().int().default(0).describe("Fragment index"),
      compression: z
        .number()
        .int()
        .default(0)
        .describe("Compression type (0=none, 1=deflate, 2=gzip, 3=brotli)"),
      epochIndex: z.number().int().default(0).describe("Epoch page index"),
    }),
    output: writeOutput,
  },

  closeSession: {
    input: z.object({
      sessionHash: z
        .string()
        .describe("Hex-encoded session hash for PDA derivation"),
    }),
    output: writeOutput,
  },

  closeVault: {
    input: z.object({}),
    output: writeOutput,
  },

  rotateNonce: {
    input: z.object({
      newNonce: hash32.describe("New 32-byte encryption nonce"),
    }),
    output: writeOutput,
  },

  addDelegate: {
    input: z.object({
      delegatePubkey: pubkey.describe("Wallet to authorize as delegate"),
      permissions: z
        .number()
        .int()
        .min(1)
        .max(7)
        .describe(
          "Permission bitmask (1=inscribe, 2=closeSession, 4=openSession, 7=all)"
        ),
      expiresAt: z
        .string()
        .describe("Delegation expiry (unix timestamp seconds)"),
    }),
    output: writeOutput,
  },

  revokeDelegate: {
    input: z.object({
      delegatePubkey: pubkey.describe("Delegate wallet to revoke"),
    }),
    output: writeOutput,
  },

  fetchVault: {
    input: z.object({
      agentWallet: pubkey
        .nullish()
        .describe("Agent wallet (defaults to caller)"),
    }),
    output: z.object({
      agent: pubkey,
      wallet: pubkey,
      totalSessions: z.number(),
      totalInscriptions: z.string(),
      totalBytesInscribed: z.string(),
      protocolVersion: z.number(),
      nonceVersion: z.number(),
      createdAt: z.string(),
    }),
  },

  fetchSession: {
    input: z.object({
      agentWallet: pubkey.describe("Agent wallet"),
      sessionHash: z
        .string()
        .describe("Hex-encoded session hash"),
    }),
    output: z.object({
      vault: pubkey,
      sequenceCounter: z.number(),
      totalBytes: z.string(),
      currentEpoch: z.number(),
      totalEpochs: z.number(),
      isClosed: z.boolean(),
      createdAt: z.string(),
      lastInscribedAt: z.string(),
    }),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Indexing Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-indexing** protocol (8 tools).
 *
 * @name indexingSchemas
 * @description Covers capability and protocol index creation, agent
 *   registration/removal within indexes, and index data fetching.
 * @category Plugin
 * @since v0.1.0
 */
export const indexingSchemas = {
  initCapabilityIndex: {
    input: z.object({
      capabilityId: z
        .string()
        .describe("Capability ID to index (e.g. 'jupiter:swap')"),
    }),
    output: writeOutput,
  },

  addToCapabilityIndex: {
    input: z.object({
      capabilityId: z.string().describe("Capability ID"),
    }),
    output: writeOutput,
  },

  removeFromCapabilityIndex: {
    input: z.object({
      capabilityId: z.string().describe("Capability ID"),
    }),
    output: writeOutput,
  },

  initProtocolIndex: {
    input: z.object({
      protocolId: z
        .string()
        .describe("Protocol ID to index (e.g. 'jupiter')"),
    }),
    output: writeOutput,
  },

  addToProtocolIndex: {
    input: z.object({
      protocolId: z.string().describe("Protocol ID"),
    }),
    output: writeOutput,
  },

  removeFromProtocolIndex: {
    input: z.object({
      protocolId: z.string().describe("Protocol ID"),
    }),
    output: writeOutput,
  },

  fetchCapabilityIndex: {
    input: z.object({
      capabilityId: z.string().describe("Capability ID to look up"),
    }),
    output: z.object({
      capabilityId: z.string(),
      agents: z.array(pubkey).describe("Agents registered for this capability"),
      totalPages: z.number(),
      lastUpdated: z.string(),
    }),
  },

  fetchProtocolIndex: {
    input: z.object({
      protocolId: z.string().describe("Protocol ID to look up"),
    }),
    output: z.object({
      protocolId: z.string(),
      agents: z.array(pubkey).describe("Agents registered for this protocol"),
      totalPages: z.number(),
      lastUpdated: z.string(),
    }),
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
//  Ledger Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Zod input/output schemas for the **sap-ledger** protocol (6 tools).
 *
 * @name ledgerSchemas
 * @description Covers ledger initialization, ring-buffer writes, sealing
 *   to permanent pages, ledger closure, and metadata/page fetching.
 * @category Plugin
 * @since v0.1.0
 */
export const ledgerSchemas = {
  initLedger: {
    input: z.object({
      sessionHash: z
        .string()
        .describe("Hex-encoded session hash (the session must exist)"),
      agentWallet: pubkey
        .nullish()
        .describe("Agent wallet (defaults to caller)"),
    }),
    output: writeOutput,
  },

  writeLedger: {
    input: z.object({
      sessionHash: z.string().describe("Hex-encoded session hash"),
      agentWallet: pubkey
        .nullish()
        .describe("Agent wallet (defaults to caller)"),
      data: z
        .string()
        .describe("Hex-encoded data to write to ring buffer"),
      contentHash: hash32.describe("SHA-256 of the plaintext data"),
    }),
    output: writeOutput,
  },

  sealLedger: {
    input: z.object({
      sessionHash: z.string().describe("Hex-encoded session hash"),
      agentWallet: pubkey
        .nullish()
        .describe("Agent wallet (defaults to caller)"),
    }),
    output: writeOutput,
  },

  closeLedger: {
    input: z.object({
      sessionHash: z.string().describe("Hex-encoded session hash"),
      agentWallet: pubkey
        .nullish()
        .describe("Agent wallet (defaults to caller)"),
    }),
    output: writeOutput,
  },

  fetchLedger: {
    input: z.object({
      sessionHash: z.string().describe("Hex-encoded session hash"),
      agentWallet: pubkey
        .nullish()
        .describe("Agent wallet (defaults to caller)"),
    }),
    output: z.object({
      session: pubkey,
      authority: pubkey,
      numEntries: z.number(),
      totalDataSize: z.string(),
      numPages: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  },

  fetchLedgerPage: {
    input: z.object({
      sessionHash: z.string().describe("Hex-encoded session hash"),
      agentWallet: pubkey
        .nullish()
        .describe("Agent wallet (defaults to caller)"),
      pageIndex: z.number().int().describe("Page index"),
    }),
    output: z.object({
      ledger: pubkey,
      pageIndex: z.number(),
      sealedAt: z.string(),
      entriesInPage: z.number(),
      dataSize: z.number(),
      data: z.array(z.number()).describe("Raw page data bytes"),
    }),
  },
} as const;
