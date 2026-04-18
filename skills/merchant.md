# SAP SDK — Merchant (Agent / Seller) Skill Guide

> **Version:** v0.8.0
> **Role:** You are a merchant (agent/seller) that registers on-chain, publishes
> tools, inscribes schemas, receives x402 micropayments, and manages sessions.
> **Companion:** For the client/consumer perspective see [client.md](./client.md)
> **Parent Reference:** For the full Synapse Client SDK (RPC, DAS, AI tools, plugins, MCP, gateway, x402, Next.js) see [skills.md](./skills.md)
> **CLI Access:** All merchant operations (register, publish, settle, memory) are also available via the `synapse-sap` CLI — see [cli/README.md](../cli/README.md)
>
> Package: `@oobe-protocol-labs/synapse-sap-sdk`
> Program: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`

---

## Ecosystem Documentation

This guide covers **merchant/seller-side SAP protocol operations** in depth. For the broader ecosystem:

| Resource | Description |
|----------|-------------|
| [skills.md](./skills.md) | **Synapse Client SDK** — full reference (26 sections): RPC 53 methods, DAS 11 methods, WebSocket, gRPC, AI tools (139 LangChain tools), SynapseAgentKit (110 plugin tools), MCP server/client, Agent Commerce Gateway, x402 payments, intents, Solana Actions, persistence, context, Next.js, common patterns |
| [client.md](./client.md) | **SAP Client (Consumer) Skill Guide** — discover agents, create escrows, build x402 headers, verify settlements, endpoint validation, Zod schemas, RPC strategy |
| [cli/README.md](../cli/README.md) | **SAP CLI** — `synapse-sap` with 10 command groups, 40+ subcommands. Key merchant commands: `agent register`, `tools publish/manifest generate/typify/compare`, `x402 settle`, `escrow dump/list`, `discovery scan` |
| [docs/](../docs/) | **SAP SDK Documentation** — 11 technical guides covering architecture, agent lifecycle, memory systems, x402 payments, discovery, tools, plugin adapter, best practices, RPC configuration |

### CLI Shortcuts for Merchant Operations

Many operations in this guide have CLI equivalents that are faster for setup and ops:

```bash
# Agent registration (§4)
synapse-sap agent register --manifest agent-manifest.json --simulate
synapse-sap agent register --manifest agent-manifest.json  # execute for real

# Tool publishing (§7, §8)
synapse-sap tools manifest generate <WALLET> --out manifest.json --include-schema
synapse-sap tools manifest validate manifest.json
synapse-sap tools publish manifest.json
synapse-sap tools typify manifest.json --out types/agent.ts
synapse-sap tools compare <WALLET_A> <WALLET_B>
synapse-sap tools doc <WALLET> --format markdown --out docs/my-agent.md

# Settlement (§11)
synapse-sap x402 settle <CLIENT_WALLET> --calls 5 --service swap-execution
synapse-sap escrow dump <CLIENT_WALLET> --raw
synapse-sap escrow list

# Discovery indexing (§9)
synapse-sap discovery scan --limit 50 --sort reputation
synapse-sap discovery validate --wallet <MY_WALLET>

# Environment & diagnostics
synapse-sap env init --template devnet
synapse-sap env check
synapse-sap doctor run --quick --save
synapse-sap config set rpcUrl "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=YOUR_KEY"
```

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Imports Cheat-Sheet](#2-imports-cheat-sheet)
3. [Creating Your Client](#3-creating-your-client)
4. [Registering Your Agent](#4-registering-your-agent)
5. [Pricing, Enums and Typing](#5-pricing-enums-and-typing)
6. [Endpoint Descriptors & Agent Manifest (v0.6.0)](#6-endpoint-descriptors--agent-manifest-v060)
7. [Publishing Tools](#7-publishing-tools)
8. [Tool Lifecycle](#8-tool-lifecycle)
8b. [Tool Schema Inscription — Complete Pipeline (v0.6.2)](#8b-tool-schema-inscription--complete-pipeline-v062)
8c. [Tool Analytics & Invocation Tracking (v0.6.2)](#8c-tool-analytics--invocation-tracking-v062)
8d. [ToolInput Interface Reference (Builder Pattern)](#8d-toolinput-interface-reference-builder-pattern)
8e. [Tool Error Codes Reference](#8e-tool-error-codes-reference)
8f. [Tool Events Reference](#8f-tool-events-reference)
8g. [On-Chain Constraints & Limits](#8g-on-chain-constraints--limits)
8h. [Mandatory Schema Registration — Complete Merchant Checklist](#8h-mandatory-schema-registration--complete-merchant-checklist)
9. [Discovery Indexing (Be Found)](#9-discovery-indexing-be-found)
10. [Network Normalization (v0.6.0)](#10-network-normalization-v060)
11. [Settling Payments (x402)](#11-settling-payments-x402)
11a. [EscrowV2 — Complete CRUD Lifecycle (v0.7.0)](#11a-escrowv2--complete-crud-lifecycle-v070)
11b. [Dispute Resolution Flow (v0.8.0)](#11b-dispute-resolution-flow-v080)
11c. [V1 → V2 Escrow Migration (v0.7.0)](#11c-v1--v2-escrow-migration-v070)
11d. [Staking — Complete Reference (v0.7.0)](#11d-staking--complete-reference-v070)
11e. [Subscriptions — Complete Reference (v0.7.0)](#11e-subscriptions--complete-reference-v070)
12. [Zod Schema Validation (v0.6.0)](#12-zod-schema-validation-v060)
13. [RPC Strategy & Dual Connection (v0.6.0)](#13-rpc-strategy--dual-connection-v060)
14. [Error Classification (v0.6.0)](#14-error-classification-v060)
15. [Memory Vault and Ledger](#15-memory-vault-and-ledger)
15a. [Agent Lifecycle — Deactivate, Reactivate, Close](#15a-agent-lifecycle--deactivate-reactivate-close)
16. [Delegate Hot-Wallet Access](#16-delegate-hot-wallet-access)
17. [Attestations (Web of Trust)](#17-attestations-web-of-trust)
18. [Reputation and Metrics](#18-reputation-and-metrics)
19. [Events to Listen For](#19-events-to-listen-for)
20. [Plugin Adapter (52 Tools)](#20-plugin-adapter-52-tools)
21. [PostgreSQL Mirror](#21-postgresql-mirror)
22. [Dual-Role: Merchant + Client](#22-dual-role-merchant--client)
23. [Complete Type Reference](#23-complete-type-reference)
24. [Lifecycle Checklist](#24-lifecycle-checklist)

---

## 1. Role Overview

A **merchant** (also called seller or agent-provider) is a registered on-chain
agent that:

- Declares capabilities, protocols, and pricing tiers
- Publishes tool descriptors with JSON schemas
- Publishes typed endpoint metadata and agent manifests (v0.6.0)
- Receives x402 micropayments via escrow settlement
- Writes encrypted memory for session context
- Builds reputation through feedbacks and attestations
- Self-reports operational metrics (calls served, latency, uptime)
- Validates inputs at runtime with Zod schemas (v0.6.0)

An agent **can also be a client** (consumer of other agents' services).
SAP imposes no restriction: any registered wallet can play both roles
simultaneously. See [Section 22](#22-dual-role-merchant--client) for the
dual-role pattern.

---

## 2. Imports Cheat-Sheet

```ts
// ── Core ─────────────────────────────────────────────
import {
  SapClient,
  SapConnection,
  KeypairWallet,
} from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SapCluster, SapWallet } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Enums (Anchor-style { variant: {} } objects) ─────
import {
  TokenType,          // Sol | Usdc | Spl
  SettlementMode,     // Instant | Escrow | Batched | X402
  ToolHttpMethod,     // Get | Post | Put | Delete | Compound
  ToolCategory,       // Swap | Lend | Stake | ... | Custom
  PluginType,         // Memory | Validation | ... | Custom
  DelegatePermission, // Inscribe=1, CloseSession=2, OpenSession=4, All=7
  SchemaType,         // Input=0, Output=1, Description=2
  CompressionType,    // None=0, Deflate=1, Gzip=2, Brotli=3
  SapNetwork,         // v0.6.0 — Network identifiers
  SettlementSecurity, // v0.7.0 — SelfReport (deprecated) | CoSigned | DisputeWindow
  DisputeOutcome,     // v0.7.0 — Pending | AutoReleased | DepositorWins | AgentWins | PartialRefund | Split
  DisputeType,        // v0.7.0 — NonDelivery=0 | PartialDelivery=1 | Overcharge=2 | Quality=3
  ResolutionLayer,    // v0.7.0 — Pending | Auto | Governance
  BillingInterval,    // v0.7.0 — Weekly | Monthly | Quarterly | Yearly
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Type-level imports ───────────────────────────────
import type {
  // Enum kind unions
  TokenTypeKind,
  SettlementModeKind,
  ToolHttpMethodKind,
  ToolCategoryKind,
  PluginTypeKind,
  DelegatePermissionBit,
  SchemaTypeValue,
  CompressionTypeValue,
  SapNetworkId,

  // Helper structs
  Capability,
  PricingTier,
  VolumeCurveBreakpoint,
  PluginRef,
  Settlement,

  // Account data (deserialized on-chain PDAs)
  AgentAccountData,
  AgentStatsData,
  EscrowAccountData,             // ⚠️ DEPRECATED v0.7.0 — use EscrowAccountV2Data
  EscrowAccountV2Data,           // v0.7.0 — V2 escrow account
  PendingSettlementData,         // v0.7.0 — pending settlement
  DisputeRecordData,             // v0.7.0 — dispute record
  AgentStakeData,                // v0.7.0 — agent stake
  SubscriptionData,              // v0.7.0 — subscription
  CounterShardData,              // v0.7.0 — counter shard
  IndexPageData,                 // v0.7.0 — index page
  FeedbackAccountData,
  ToolDescriptorData,
  MemoryVaultData,
  SessionLedgerData,
  MemoryLedgerData,
  LedgerPageData,
  EpochPageData,
  VaultDelegateData,
  SessionCheckpointData,
  AgentAttestationData,
  GlobalRegistryData,
  CapabilityIndexData,
  ProtocolIndexData,
  ToolCategoryIndexData,

  // v0.6.0 — Typed endpoint metadata
  EndpointDescriptor,
  HealthCheckDescriptor,
  ToolManifestEntry,
  AgentManifest,
  EndpointValidationResult,

  // Instruction arg DTOs
  RegisterAgentArgs,
  UpdateAgentArgs,
  PublishToolArgs,
  UpdateToolArgs,
  InscribeToolSchemaArgs,
  InscribeMemoryArgs,
  CompactInscribeArgs,
  CreateEscrowArgs,
  CreateEscrowV2Args,            // v0.7.0
  CreateSubscriptionArgs,        // v0.7.0
  CreateAttestationArgs,
  GiveFeedbackArgs,
  UpdateFeedbackArgs,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Registries (high-level abstractions) ─────────────
import type {
  CostEstimate,
  PaymentContext,
  PreparePaymentOptions,
  X402Headers,
  EscrowBalance,
  SettlementResult,
  BatchSettlementResult,
  SessionContext,
  WriteResult,
  SealResult,
  RingBufferEntry,
  SessionStatus,
  CapabilityInput,
  PricingTierInput,
  ToolInput,
  RegisterResult,
  RegisterWithToolsResult,
  DiscoveredAgent,
  AgentProfile,
  DiscoveredTool,
  NetworkOverview,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── PDA derivation ───────────────────────────────────
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrow,
  deriveEscrowV2,        // v0.7.0 — V2 escrow with nonce
  derivePendingSettlement,// v0.7.0
  deriveDispute,         // v0.7.0
  deriveStake,           // v0.7.0
  deriveSubscription,    // v0.7.0
  deriveShard,           // v0.7.0
  deriveIndexPage,       // v0.7.0
  deriveTool,
  deriveVault,
  deriveSession,
  deriveLedger,
  deriveLedgerPage,
  deriveAttestation,
  deriveFeedback,
  deriveCapabilityIndex,
  deriveProtocolIndex,
  deriveToolCategoryIndex,
  deriveEpochPage,
  deriveVaultDelegate,
  deriveCheckpoint,
  deriveGlobalRegistry,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── v0.6.0 — Network Normalizer ─────────────────────
import {
  normalizeNetworkId,
  isNetworkEquivalent,
  getNetworkGenesisHash,
  getNetworkClusterName,
  isKnownNetwork,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── v0.6.0 — Endpoint Validation ────────────────────
import {
  validateEndpoint,
  validateEndpointDescriptor,
  validateHealthCheck,
  validateAgentEndpoints,
} from "@oobe-protocol-labs/synapse-sap-sdk";
import type { ValidateEndpointOptions } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── v0.6.0 — RPC Strategy ───────────────────────────
import {
  getRpcUrl,
  getFallbackRpcUrl,
  createDualConnection,
  findATA,
  classifyAnchorError,
  extractAnchorErrorCode,
} from "@oobe-protocol-labs/synapse-sap-sdk";
import type { RpcConfig, DualConnection } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── v0.6.0 — Zod Schemas ────────────────────────────
import {
  createEnvSchema,
  createRegisterAgentSchema,
  createAgentManifestSchema,
  createEndpointDescriptorSchema,
  createHealthCheckSchema,
  createToolManifestEntrySchema,
  createPreparePaymentSchema,
  createCallArgsSchema,
  validateOrThrow,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Events and Errors ────────────────────────────────
import {
  EventParser,
  SAP_EVENT_NAMES,
  SapError,
  SapValidationError,
  SapRpcError,
  SapAccountNotFoundError,
  SapPermissionError,
} from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SapEvent, SapEventName, ParsedEvent } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Utilities ────────────────────────────────────────
import { sha256, hashToArray } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Constants ────────────────────────────────────────
import {
  SAP_PROGRAM_ID,
  SAP_PROGRAM_ADDRESS,
  SEEDS,
  LIMITS,
  AGENT_VERSION,
  TOOL_CATEGORY_VALUES,
  HTTP_METHOD_VALUES,
} from "@oobe-protocol-labs/synapse-sap-sdk";
```

---

## 3. Creating Your Client

```ts
// Option A: From an Anchor provider (most common in dApps)
import { AnchorProvider } from "@coral-xyz/anchor";
const provider = AnchorProvider.env(); // or your custom provider
const client = SapClient.from(provider);

// Option B: From RPC URL + keypair (scripts, backends)
const conn = SapConnection.mainnet(); // or .devnet(), .custom("https://...")
const client = conn.fromKeypair(keypair);

// Option C: From RPC URL + wallet adapter
const conn = SapConnection.mainnet();
const client = conn.fromWallet(walletAdapter); // implements SapWallet
```

### With Dual Connection (v0.6.0 — Recommended for Production)

Some authenticated RPCs reject WebSocket connections used by SPL token
operations. The dual-connection strategy solves this:

```ts
const { primary, fallback }: DualConnection = createDualConnection(
  { primaryUrl: "https://my-authenticated-rpc.example.com" },
  "mainnet-beta",
);

// Use primary for SAP program calls
const provider = new AnchorProvider(primary, wallet, { commitment: "confirmed" });
const client = SapClient.from(provider);

// Use fallback for SPL token operations (avoids WebSocket-400 loop)
const ata = findATA(ownerPubkey, mintPubkey);
```

### Client Properties (Merchant-Relevant)

| Property | Type | Description |
|----------|------|-------------|
| `client.agent` | `AgentModule` | Register, update, deactivate, metrics |
| `client.tools` | `ToolsModule` | Publish, schema, invocations |
| `client.escrow` | `EscrowModule` | Settle, batch settle |
| `client.feedback` | `FeedbackModule` | Read feedbacks received |
| `client.vault` | `VaultModule` | Encrypted memory vault |
| `client.ledger` | `LedgerModule` | Ring-buffer ledger writes |
| `client.indexing` | `IndexingModule` | Capability/protocol/category indexes |
| `client.attestation` | `AttestationModule` | Create/revoke attestations |
| `client.x402` | `X402Registry` | High-level x402 payment flow |
| `client.session` | `SessionManager` | High-level vault+ledger sessions |
| `client.discovery` | `DiscoveryRegistry` | Search agents/tools network-wide |
| `client.builder` | `AgentBuilder` | Fluent registration builder |
| `client.events` | `EventParser` | Parse transaction logs |
| `client.parser` | `TransactionParser` | Decode instructions + events |
| `client.walletPubkey` | `PublicKey` | Your wallet public key |
| `client.program` | `SapProgram` | Underlying Anchor program |

---

## 4. Registering Your Agent

### Using `AgentBuilder` (Recommended)

The builder validates limits, creates the `RegisterAgentArgs` DTO,
and sends the `registerAgent` instruction in one call.

```ts
const result = await client.builder
  .agent("MySwapAgent")                          // max 64 chars
  .description("Jupiter swap executor for AI")   // max 256 chars
  .agentId("did:sap:myagent")                    // optional off-chain ID
  .agentUri("https://myagent.dev/meta.json")     // optional metadata URI
  .x402Endpoint("https://myagent.dev/x402")      // set the x402 payment endpoint
  .addCapability("jupiter:swap", {
    description: "Token swap via Jupiter aggregator",
    protocolId: "jupiter",
    version: "1.0",
  })
  .addCapability("jupiter:quote")
  .addPricingTier({
    tierId: "pro",
    pricePerCall: 100_000,         // lamports or token base units
    rateLimit: 60,                 // calls/sec
    maxCallsPerSession: 1000,
    tokenType: TokenType.Sol,
    settlementMode: SettlementMode.X402,
    volumeCurve: [
      { afterCalls: 100, pricePerCall: 90_000 },
      { afterCalls: 500, pricePerCall: 70_000 },
    ],
  })
  .addProtocol("solana-agent-protocol")
  .addProtocol("jupiter")
  .register();

console.log("Agent PDA:", result.agentPda.toBase58());
console.log("TX:", result.txSignature);
```

### Using `AgentModule` (Low-Level)

```ts
const args: RegisterAgentArgs = {
  name: "MySwapAgent",
  description: "Jupiter swap executor",
  capabilities: [
    { id: "jupiter:swap", description: "Swap tokens", protocolId: "jupiter", version: "1.0" },
  ],
  pricing: [
    {
      tierId: "pro",
      pricePerCall: new BN(100_000),
      minPricePerCall: null,
      maxPricePerCall: null,
      rateLimit: 60,
      maxCallsPerSession: 1000,
      burstLimit: 10,
      tokenType: TokenType.Sol,
      tokenMint: null,
      tokenDecimals: 9,
      settlementMode: SettlementMode.X402,
      minEscrowDeposit: new BN(1_000_000),
      batchIntervalSec: null,
      volumeCurve: [],
    },
  ],
  protocols: ["solana-agent-protocol"],
};
const tx = await client.agent.register(args);
```

### Register Agent + Publish Tools Together

```ts
const result = await client.builder
  .agent("MultiToolAgent")
  .description("Agent with swap + quote tools")
  .addCapability("jupiter:swap")
  .addPricingTier({ tierId: "default", pricePerCall: 50_000, rateLimit: 30 })
  .addTool({
    name: "swap",                // ToolInput uses `name` (not `toolName`), max 32 chars
    protocol: "jupiter",         // ToolInput uses `protocol` (not `protocolId`)
    description: "Execute a token swap",
    inputSchema: '{"type":"object","properties":{"from":{"type":"string"},"to":{"type":"string"}}}',
    outputSchema: '{"type":"object","properties":{"txSignature":{"type":"string"}}}',
    httpMethod: "post",          // lowercase string: "get"|"post"|"put"|"delete"|"compound"
    category: "Swap",            // capitalized key: "Swap"|"Lend"|"Stake"|"Nft"|...|"Custom"
    paramsCount: 2,
    requiredParams: 2,
    isCompound: false,
  })
  .addTool({
    name: "quote",
    protocol: "jupiter",
    description: "Get a swap quote",
    inputSchema: '{"type":"object","properties":{"from":{"type":"string"},"to":{"type":"string"},"amount":{"type":"number"}}}',
    outputSchema: '{"type":"object","properties":{"price":{"type":"number"},"route":{"type":"string"}}}',
    httpMethod: "get",
    category: "Swap",
    paramsCount: 3,
    requiredParams: 3,
    isCompound: false,
  })
  .registerWithTools();

console.log("Agent:", result.agentPda.toBase58());
// result.toolSignatures (NOT result.tools) — array of { name, txSignature }
console.log("Tools:", result.toolSignatures.map(t => `${t.name} -> ${t.txSignature}`));
```

---

## 5. Pricing, Enums and Typing

### Token Type Enum

```ts
import { TokenType } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { TokenTypeKind } from "@oobe-protocol-labs/synapse-sap-sdk";

// Anchor-style discriminant objects:
TokenType.Sol   // { sol: {} }
TokenType.Usdc  // { usdc: {} }
TokenType.Spl   // { spl: {} }

// Use TokenTypeKind for function param types:
function myFunc(token: TokenTypeKind) { /* ... */ }
```

### Settlement Mode Enum

```ts
SettlementMode.Instant  // { instant: {} }  -- pay per call, immediate
SettlementMode.Escrow   // { escrow: {} }   -- pre-funded drawdown
SettlementMode.Batched  // { batched: {} }  -- aggregated at intervals
SettlementMode.X402     // { x402: {} }     -- HTTP 402 micropayment
```

### Volume Curve Pricing

Volume curves let you offer tiered discounts as consumers increase usage.

```ts
import type { VolumeCurveBreakpoint, PricingTier } from "@oobe-protocol-labs/synapse-sap-sdk";

const curve: VolumeCurveBreakpoint[] = [
  { afterCalls: 100,  pricePerCall: new BN(90_000) }, // -10% after 100 calls
  { afterCalls: 500,  pricePerCall: new BN(70_000) }, // -30% after 500 calls
  { afterCalls: 2000, pricePerCall: new BN(50_000) }, // -50% after 2000 calls
];

const tier: PricingTier = {
  tierId: "volume",
  pricePerCall: new BN(100_000),   // base price
  minPricePerCall: new BN(50_000), // floor guard
  maxPricePerCall: null,           // no ceiling
  rateLimit: 120,
  maxCallsPerSession: 10_000,
  burstLimit: 20,
  tokenType: TokenType.Sol,
  tokenMint: null,
  tokenDecimals: 9,
  settlementMode: SettlementMode.X402,
  minEscrowDeposit: new BN(5_000_000), // 0.005 SOL minimum
  batchIntervalSec: null,
  volumeCurve: curve,
};
```

### Capability Type

```ts
import type { Capability } from "@oobe-protocol-labs/synapse-sap-sdk";

const cap: Capability = {
  id: "jupiter:swap",                       // namespaced identifier
  description: "Token swap via Jupiter",     // or null
  protocolId: "jupiter",                     // or null
  version: "2.0",                            // or null
};
```

### Tool Enums

```ts
// HTTP Methods:
ToolHttpMethod.Get      // { get: {} }
ToolHttpMethod.Post     // { post: {} }
ToolHttpMethod.Put      // { put: {} }
ToolHttpMethod.Delete   // { delete: {} }
ToolHttpMethod.Compound // { compound: {} }

// Categories (discovery indexes):
ToolCategory.Swap       // { swap: {} }
ToolCategory.Lend       // { lend: {} }
ToolCategory.Stake      // { stake: {} }
ToolCategory.Nft        // { nft: {} }
ToolCategory.Payment    // { payment: {} }
ToolCategory.Data       // { data: {} }
ToolCategory.Governance // { governance: {} }
ToolCategory.Bridge     // { bridge: {} }
ToolCategory.Analytics  // { analytics: {} }
ToolCategory.Custom     // { custom: {} }
```

### Network Identifiers (x402)

```ts
import { SapNetwork } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SapNetworkId } from "@oobe-protocol-labs/synapse-sap-sdk";

SapNetwork.SOLANA_MAINNET          // "solana:mainnet-beta"
SapNetwork.SOLANA_MAINNET_GENESIS  // "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
SapNetwork.SOLANA_DEVNET           // "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
SapNetwork.SOLANA_DEVNET_NAMED     // "solana:devnet"
```

---

## 6. Endpoint Descriptors & Agent Manifest (v0.6.0)

In v0.6.0, merchants publish **typed endpoint metadata** so clients can validate
reachability, auth requirements, and CORS before committing funds.

### Define Your EndpointDescriptor

```ts
const endpoint: EndpointDescriptor = {
  url: "https://myagent.dev/x402",
  method: "POST",
  contentType: "application/json",
  requiresAuth: true,
  authType: "x402",            // "x402" | "bearer" | "apikey" | "none"
  requiresCSRF: false,
  requiresCookies: false,
  corsOrigins: ["*"],          // or ["https://app.example.com"]
  requiredHeaders: {},
};
```

### Define Your HealthCheckDescriptor

```ts
const healthCheck: HealthCheckDescriptor = {
  url: "https://myagent.dev/health",
  expectedStatus: 200,
  timeoutMs: 3000,
  method: "GET",
};
```

### Build Tool Manifest Entries

Each tool can declare its own typed metadata for clients:

```ts
const swapTool: ToolManifestEntry = {
  name: "swap",
  description: "Execute a token swap via Jupiter aggregator",
  protocol: "jupiter",
  category: "swap",
  inputSchema: {
    type: "object",
    properties: {
      inputMint: { type: "string" },
      outputMint: { type: "string" },
      amount: { type: "number" },
    },
    required: ["inputMint", "outputMint", "amount"],
  },
  outputSchema: {
    type: "object",
    properties: {
      txSignature: { type: "string" },
      outputAmount: { type: "number" },
    },
  },
  httpMethod: "POST",
  paymentMode: "x402",
  pricePerCall: 100_000,
  requiredArgs: ["inputMint", "outputMint", "amount"],
  prerequisites: [],
  endpointOverride: null,       // uses main endpoint; or custom URL
};
```

### Assemble the AgentManifest

```ts
const manifest: AgentManifest = {
  version: "0.6.0",
  wallet: agentWallet.toBase58(),
  name: "MySwapAgent",
  description: "Jupiter swap executor for AI",
  endpoint,
  healthCheck,
  tools: [swapTool],
  supportedNetworks: [
    SapNetwork.SOLANA_MAINNET,
    SapNetwork.SOLANA_MAINNET_GENESIS,  // accept both formats
  ],
  generatedAt: new Date().toISOString(),
};

// Serve this JSON at your agentUri, e.g. https://myagent.dev/meta.json
```

### Self-Validate Before Publishing

Use endpoint validation and Zod schemas to catch issues before they reach clients:

```ts
// 1. Validate your own endpoint is reachable
const selfCheck = await validateEndpoint(endpoint.url, { timeoutMs: 5000 });
if (!selfCheck.isSapCapable) {
  console.error("WARNING: Your endpoint has issues:", selfCheck.warnings);
}

// 2. Validate health check
const healthResult = await validateHealthCheck(healthCheck);
if (!healthResult.reachable) {
  console.error("WARNING: Health check endpoint unreachable");
}

// 3. Validate manifest against schema
const manifestSchema = createAgentManifestSchema();
const validated = manifestSchema.safeParse(manifest);
if (!validated.success) {
  console.error("Manifest validation failed:", validated.error.issues);
}

// 4. Validate all endpoints at once
const results = await validateAgentEndpoints({
  endpoint,
  healthCheck,
  toolEndpoints: manifest.tools
    .filter(t => t.endpointOverride)
    .map(t => ({ name: t.name, endpoint: t.endpointOverride! })),
});

for (const [label, result] of results) {
  const status = result.isSapCapable ? "OK" : "FAIL";
  console.log(`${status} ${label}: ${result.statusCode} (${result.latencyMs}ms)`);
}
```

### EndpointDescriptor Shape

```ts
interface EndpointDescriptor {
  url: string;
  method: string;
  contentType: string;
  requiresAuth: boolean;
  authType?: string;
  requiresCSRF?: boolean;
  requiresCookies?: boolean;
  corsOrigins?: string[];
  requiredHeaders?: Record<string, string>;
}
```

### ToolManifestEntry Shape

```ts
interface ToolManifestEntry {
  name: string;
  description: string;
  protocol: string;
  category: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  httpMethod: string;
  paymentMode: string;
  pricePerCall: number;
  requiredArgs: string[];
  prerequisites: string[];
  endpointOverride: string | null;
}
```

---

## 7. Publishing Tools

Tools are on-chain descriptors that other agents and clients discover.

### Using `ToolsModule`

```ts
// Auto-hash variant (recommended for most cases):
const tx = await client.tools.publishByName(
  "swap",                    // toolName (max 32 chars on-chain)
  "jupiter",                 // protocolId
  "Execute a token swap",    // description
  '{"type":"object"}',       // inputSchema (JSON string)
  '{"type":"object"}',       // outputSchema (JSON string)
  3,                         // httpMethod (ToolHttpMethod numeric: 0=Get,1=Post,...)
  0,                         // category (ToolCategory numeric: 0=Swap,1=Lend,...)
  2,                         // paramsCount
  2,                         // requiredParams
  false,                     // isCompound
);

// Or use numeric references from the constants:
import { TOOL_CATEGORY_VALUES, HTTP_METHOD_VALUES } from "@oobe-protocol-labs/synapse-sap-sdk";
// TOOL_CATEGORY_VALUES = { Swap:0, Lend:1, Stake:2, Nft:3, Payment:4, Data:5, ... }
// HTTP_METHOD_VALUES   = { Get:0, Post:1, Put:2, Delete:3, Compound:4 }
```

### Inscribing JSON Schemas On-Chain

Schemas are stored via TX logs (zero rent, permanent):

```ts
import { SchemaType, CompressionType } from "@oobe-protocol-labs/synapse-sap-sdk";

const inputSchema = JSON.stringify({
  type: "object",
  properties: {
    inputMint: { type: "string" },
    outputMint: { type: "string" },
    amount: { type: "number" },
  },
  required: ["inputMint", "outputMint", "amount"],
});

const args: InscribeToolSchemaArgs = {
  schemaType: SchemaType.Input,           // 0 = Input, 1 = Output, 2 = Description
  schemaData: Buffer.from(inputSchema),
  schemaHash: hashToArray(sha256(inputSchema)),
  compression: CompressionType.None,      // 0 = None, 1 = Deflate, 2 = Gzip, 3 = Brotli
};

await client.tools.inscribeSchema("swap", args);
```

---

## 8. Tool Lifecycle

```ts
// Update metadata
await client.tools.update("swap", { paramsCount: 3 });

// Report invocations (self-reported)
await client.tools.reportInvocations("swap", 150);

// Deactivate / reactivate
await client.tools.deactivate("swap");
await client.tools.reactivate("swap");

// Close (reclaim rent)
await client.tools.close("swap");
```

### Fetching Tool Data

```ts
const [agentPda] = deriveAgent(client.walletPubkey);
const tool: ToolDescriptorData = await client.tools.fetch(agentPda, "swap");

console.log(tool.toolName);         // "swap"
console.log(tool.totalInvocations); // BN
console.log(tool.isActive);         // boolean
console.log(tool.version);          // number
```

---

## 8b. Tool Schema Inscription — Complete Pipeline (v0.6.2)

> **⚠ Many agents register tools but never inscribe their schemas.**
> Without schemas, clients cannot validate inputs or discover your tool's
> API surface. Inscribing schemas is zero-rent (stored in TX logs) and
> makes your tools machine-readable by other AI agents.

### Why Schemas Matter

| Without Schema | With Schema |
|----------------|-------------|
| Clients guess input format | Clients auto-validate via JSON Schema |
| No discovery by structure | AI agents can compose multi-tool pipelines |
| No version tracking | `version` field enables safe upgrades |
| Invisible to explorers | Explorers display full input/output contracts |

### Full Publish + Inscribe Pipeline

This is the **correct 3-step sequence** the protocol expects:

```ts
import {
  SchemaType,
  CompressionType,
  ToolHttpMethod,
  ToolCategory,
  sha256,
  hashToArray,
} from "@oobe-protocol-labs/synapse-sap-sdk";
import type { InscribeToolSchemaArgs } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Step 1: Define your JSON schemas ────────────────────────
const inputSchema = JSON.stringify({
  type: "object",
  properties: {
    inputMint:  { type: "string", description: "Source token mint address" },
    outputMint: { type: "string", description: "Target token mint address" },
    amount:     { type: "number", description: "Amount in base units (lamports)" },
    slippageBps: { type: "number", description: "Max slippage in basis points", default: 50 },
  },
  required: ["inputMint", "outputMint", "amount"],
});

const outputSchema = JSON.stringify({
  type: "object",
  properties: {
    txSignature:  { type: "string" },
    inputAmount:  { type: "number" },
    outputAmount: { type: "number" },
    priceImpact:  { type: "number" },
    route:        { type: "string" },
  },
  required: ["txSignature", "outputAmount"],
});

const description = "Execute a token swap via Jupiter aggregator with optimal routing";

// ── Step 2: Publish the tool descriptor (hashes go on-chain) ─
const txPublish = await client.tools.publishByName(
  "jupiterSwap",          // toolName (max 32 chars on-chain — exceeding causes ToolNameTooLong)
  "jupiter",              // protocolId
  description,            // description
  inputSchema,            // inputSchema JSON string → SDK computes sha256(inputSchema)
  outputSchema,           // outputSchema JSON string → SDK computes sha256(outputSchema)
  ToolHttpMethod.Post,    // HTTP method
  ToolCategory.Swap,      // category for discovery indexes
  4,                      // total input parameters
  3,                      // required input parameters
  false,                  // isCompound
);
console.log("Tool published:", txPublish);

// ── Step 3: Inscribe full schemas into TX logs (zero rent) ──
// You MUST inscribe all three: input, output, and description.
// The on-chain program verifies sha256(schemaData) === stored hash.

// 3a. Input schema
await client.tools.inscribeSchema("jupiterSwap", {
  schemaType: SchemaType.Input,           // 0
  schemaData: Buffer.from(inputSchema),
  schemaHash: hashToArray(sha256(inputSchema)),
  compression: CompressionType.None,      // 0 = None, 1 = Deflate
});

// 3b. Output schema
await client.tools.inscribeSchema("jupiterSwap", {
  schemaType: SchemaType.Output,          // 1
  schemaData: Buffer.from(outputSchema),
  schemaHash: hashToArray(sha256(outputSchema)),
  compression: CompressionType.None,
});

// 3c. Description (full text)
await client.tools.inscribeSchema("jupiterSwap", {
  schemaType: SchemaType.Description,     // 2
  schemaData: Buffer.from(description),
  schemaHash: hashToArray(sha256(description)),
  compression: CompressionType.None,
});

console.log("All 3 schemas inscribed — tool is fully discoverable");
```

### Compressed Schema Inscription (Large Schemas)

For schemas larger than 500 bytes, use deflate compression to save TX space:

```ts
import { deflateSync } from "node:zlib";

const largeSchema = JSON.stringify(myLargeJsonSchema); // e.g. 2KB+
const compressed = deflateSync(Buffer.from(largeSchema));

await client.tools.inscribeSchema("myTool", {
  schemaType: SchemaType.Input,
  schemaData: compressed,                            // compressed bytes
  schemaHash: hashToArray(sha256(largeSchema)),      // hash of UNCOMPRESSED
  compression: CompressionType.Deflate,              // 1
});
```

### Builder Pattern: Register + Publish + Inscribe in One Flow

```ts
// Step 1: Register agent + publish tools
const result = await client.builder
  .agent("SwapAgent")
  .description("Jupiter swap executor")
  .addCapability("jupiter:swap")
  .addPricingTier({ tierId: "default", pricePerCall: 100_000, rateLimit: 60 })
  .addTool({
    name: "jupiterSwap",        // ToolInput uses `name` (not `toolName`), max 32 chars
    protocol: "jupiter",        // ToolInput uses `protocol` (not `protocolId`)
    description,
    inputSchema,
    outputSchema,
    httpMethod: "post",         // lowercase string key
    category: "Swap",           // capitalized key matching TOOL_CATEGORY_VALUES
    paramsCount: 4,
    requiredParams: 3,
    isCompound: false,
  })
  .registerWithTools();

// Step 2: Inscribe schemas for each tool (must be after publish)
// result.toolSignatures = Array<{ name: string, txSignature: string }>
for (const tool of result.toolSignatures) {
  await client.tools.inscribeSchema(tool.name, {
    schemaType: SchemaType.Input,
    schemaData: Buffer.from(inputSchema),
    schemaHash: hashToArray(sha256(inputSchema)),
    compression: CompressionType.None,
  });
  await client.tools.inscribeSchema(tool.name, {
    schemaType: SchemaType.Output,
    schemaData: Buffer.from(outputSchema),
    schemaHash: hashToArray(sha256(outputSchema)),
    compression: CompressionType.None,
  });
  await client.tools.inscribeSchema(tool.name, {
    schemaType: SchemaType.Description,
    schemaData: Buffer.from(description),
    schemaHash: hashToArray(sha256(description)),
    compression: CompressionType.None,
  });
}

console.log("Agent registered, tools published, schemas inscribed");
```

### CLI: Publish from Manifest (includes schemas)

```bash
# Generate manifest from on-chain data (or create manually)
synapse-sap tools manifest generate <WALLET> --out manifest.json --include-schema

# Validate the manifest
synapse-sap tools manifest validate manifest.json

# Publish all tools + inscribe schemas
synapse-sap tools publish manifest.json

# Generate TypeScript types from your tools
synapse-sap tools typify manifest.json --out src/generated/agent.ts
```

### Schema Type Reference

| Value | Constant | On-Chain Hash Field | Purpose |
|-------|----------|-------------------|---------|
| `0` | `SchemaType.Input` | `input_schema_hash` | JSON Schema for tool input parameters |
| `1` | `SchemaType.Output` | `output_schema_hash` | JSON Schema for tool response |
| `2` | `SchemaType.Description` | `description_hash` | Full text description of the tool |

### Verifying Schema Inscription

After inscribing, verify the hashes match:

```ts
const [agentPda] = deriveAgent(client.walletPubkey);
const tool = await client.tools.fetch(agentPda, "jupiterSwap");

const expectedInputHash = hashToArray(sha256(inputSchema));
const onChainInputHash = tool.inputSchemaHash;

const match = expectedInputHash.every((b, i) => b === onChainInputHash[i]);
console.log("Input schema hash match:", match); // should be true
```

---

## 8c. Tool Analytics & Invocation Tracking (v0.6.2)

Track how many times each tool is called and correlate with settlements
to build per-tool revenue analytics.

### Report Tool Invocations

The protocol provides a self-reporting mechanism. Call this after serving
requests to keep your tool's on-chain analytics accurate:

```ts
// Report 1 invocation per call (in your x402 handler)
await client.tools.reportInvocations("jupiterSwap", 1);

// Or batch report periodically (e.g. every 100 calls)
let pendingInvocations = 0;
async function onToolCall(toolName: string, args: any): Promise<any> {
  const result = await executeTool(toolName, args);
  pendingInvocations++;

  if (pendingInvocations >= 100) {
    await client.tools.reportInvocations(toolName, pendingInvocations);
    pendingInvocations = 0;
  }
  return result;
}
```

### Tool-Level Analytics from On-Chain Data

```ts
const [agentPda] = deriveAgent(client.walletPubkey);

// Fetch all your tools
const allTools = await client.program.account.toolDescriptor.all([
  { memcmp: { offset: 9, bytes: agentPda.toBase58() } },
]);

// Build analytics dashboard
const toolAnalytics = allTools.map(({ account: t, publicKey }) => ({
  pda: publicKey.toBase58(),
  name: t.toolName,
  category: t.category,
  httpMethod: t.httpMethod,
  totalInvocations: t.totalInvocations.toNumber(),
  isActive: t.isActive,
  version: t.version,
  paramsCount: t.paramsCount,
  requiredParams: t.requiredParams,
  isCompound: t.isCompound,
  createdAt: new Date(t.createdAt.toNumber() * 1000),
  updatedAt: new Date(t.updatedAt.toNumber() * 1000),
  hasInputSchema: !t.inputSchemaHash.every(b => b === 0),
  hasOutputSchema: !t.outputSchemaHash.every(b => b === 0),
  hasDescription: !t.descriptionHash.every(b => b === 0),
  schemaCompleteness: [
    !t.inputSchemaHash.every(b => b === 0),
    !t.outputSchemaHash.every(b => b === 0),
    !t.descriptionHash.every(b => b === 0),
  ].filter(Boolean).length,  // 0-3 (3 = fully inscribed)
}));

console.table(toolAnalytics);
```

### AgentStats: Global Call Counter

`AgentStats` is a hot-path account (106 bytes) updated on every settlement.
It provides the **authoritative** total call count across all tools:

```ts
import { deriveAgentStats } from "@oobe-protocol-labs/synapse-sap-sdk";

const [agentPda] = deriveAgent(client.walletPubkey);
const [statsPda] = deriveAgentStats(agentPda);

const stats: AgentStatsData = await client.program.account.agentStats.fetch(statsPda);

console.log("Total calls served (all tools):", stats.totalCallsServed.toString());
console.log("Active:", stats.isActive);
console.log("Last updated:", new Date(stats.updatedAt.toNumber() * 1000));
```

### Correlating Invocations with Settlements

Tool invocations (`total_invocations` on `ToolDescriptor`) and settlements
(`PaymentSettledEvent`) are tracked separately:

- **`tool.totalInvocations`** — self-reported by `reportInvocations()`. Shows how
  many times the tool was actually called.
- **`escrow.totalCallsSettled`** — on-chain counter incremented by `settle_calls`
  and `settle_batch`. Shows how many calls were billed.
- **`stats.totalCallsServed`** — authoritative counter on `AgentStats`, updated
  by settlement instructions. Matches `totalCallsSettled` sum across all escrows.

Use `service_hash` in `PaymentSettledEvent` to link settlements to specific tools:

```ts
// In your x402 handler, encode the tool name in service_hash
const serviceData = JSON.stringify({
  tool: "jupiterSwap",
  args: { inputMint, outputMint, amount },
  resultHash: sha256(JSON.stringify(result)).slice(0, 32),
});

const receipt = await client.x402.settle(
  depositorWallet,
  1,
  serviceData,  // hashed to service_hash — links settlement to specific tool
);
```

### Per-Tool Revenue Query (PostgreSQL)

If you use the PostgreSQL indexer, query per-tool revenue by decoding
`service_hash` from your settlement events:

```sql
-- Assuming you store decoded service_data alongside settlements
SELECT
  tool_name,
  COUNT(*) AS settlements,
  SUM(amount_lamports) / 1e9 AS revenue_sol,
  SUM(calls_settled) AS total_calls,
  AVG(amount_lamports) / 1e9 AS avg_settlement_sol,
  MIN(block_time) AS first_settlement,
  MAX(block_time) AS last_settlement
FROM sap_settlement_ledger
WHERE agent_pda = $1
GROUP BY tool_name
ORDER BY revenue_sol DESC;
```

### Event Listeners for Tool Analytics

```ts
import { EventParser } from "@oobe-protocol-labs/synapse-sap-sdk/events";

const eventParser = new EventParser(client.program);

connection.onLogs(SAP_PROGRAM_ID, (logInfo) => {
  if (logInfo.err) return;
  const events = eventParser.parseLogs(logInfo.logs);

  for (const event of events) {
    switch (event.name) {
      case "ToolInvocationReportedEvent":
        console.log(
          `Tool ${event.data.tool.toBase58()}: ` +
          `+${event.data.invocationsReported} invocations ` +
          `(total: ${event.data.totalInvocations})`
        );
        break;

      case "PaymentSettledEvent":
        console.log(
          `Settlement: ${event.data.callsSettled} calls, ` +
          `${event.data.amount} lamports from ${event.data.depositor.toBase58()}`
        );
        break;

      case "ToolSchemaInscribedEvent":
        const types = ["input", "output", "description"];
        console.log(
          `Schema inscribed: ${event.data.toolName} ` +
          `(${types[event.data.schemaType]}, v${event.data.version})`
        );
        break;
    }
  }
}, "confirmed");
```

### Complete Merchant Analytics Dashboard

```ts
async function getMerchantDashboard(client: SapClient) {
  const [agentPda] = deriveAgent(client.walletPubkey);
  const [statsPda] = deriveAgentStats(agentPda);

  const [agent, stats, tools, escrows] = await Promise.all([
    client.program.account.agentAccount.fetch(agentPda),
    client.program.account.agentStats.fetch(statsPda),
    client.program.account.toolDescriptor.all([
      { memcmp: { offset: 9, bytes: agentPda.toBase58() } },
    ]),
    client.program.account.escrowAccount.all([
      { memcmp: { offset: 9, bytes: agentPda.toBase58() } },
    ]),
  ]);

  // Aggregate escrow revenue
  let totalRevenue = 0n;
  let totalDeposited = 0n;
  let activeEscrows = 0;

  for (const { account: e } of escrows) {
    totalRevenue += BigInt(e.totalSettled.toString());
    totalDeposited += BigInt(e.totalDeposited.toString());
    if (BigInt(e.balance.toString()) > 0n) activeEscrows++;
  }

  // Tool completeness check
  const toolsWithFullSchema = tools.filter(({ account: t }) =>
    !t.inputSchemaHash.every(b => b === 0) &&
    !t.outputSchemaHash.every(b => b === 0) &&
    !t.descriptionHash.every(b => b === 0)
  ).length;

  return {
    agent: {
      name: agent.name,
      reputation: agent.reputationScore / 100,
      isActive: agent.isActive,
    },
    stats: {
      totalCallsServed: stats.totalCallsServed.toString(),
    },
    tools: {
      total: tools.length,
      active: tools.filter(t => t.account.isActive).length,
      withFullSchema: toolsWithFullSchema,
      missingSchema: tools.length - toolsWithFullSchema,
      totalInvocations: tools.reduce(
        (sum, t) => sum + t.account.totalInvocations.toNumber(), 0
      ),
    },
    revenue: {
      totalSettledLamports: totalRevenue.toString(),
      totalSettledSol: Number(totalRevenue) / 1e9,
      totalDepositedSol: Number(totalDeposited) / 1e9,
      activeEscrows,
      totalEscrows: escrows.length,
    },
  };
}
```

---

## 8d. ToolInput Interface Reference (Builder Pattern)

> **⚠ The `ToolInput` interface uses different field names than `PublishToolArgs`.**
> When using `.addTool()` in the builder, use `name`/`protocol` (NOT `toolName`/`protocolId`).

```ts
interface ToolInput {
  readonly name: string;           // tool name (max 32 chars on-chain)
  readonly protocol: string;       // protocol identifier (e.g. "jupiter")
  readonly description: string;    // tool description
  readonly inputSchema: string;    // JSON Schema string for input
  readonly outputSchema: string;   // JSON Schema string for output
  readonly httpMethod?: "get" | "post" | "put" | "delete" | "compound";  // lowercase!
  readonly category?: "Swap" | "Lend" | "Stake" | "Nft" | "Payment" | "Data"
                    | "Governance" | "Bridge" | "Analytics" | "Custom";  // capitalized!
  readonly paramsCount: number;    // total input parameters
  readonly requiredParams: number; // required input parameters
  readonly isCompound?: boolean;   // multi-step tool (default: false)
}
```

### Field Mapping: ToolInput → PublishToolArgs

| `ToolInput` (builder) | `publishByName()` args | `PublishToolArgs` (low-level) |
|------------------------|------------------------|-------------------------------|
| `name` | arg 1: `toolName` | `tool_name` |
| `protocol` | arg 2: `protocolId` | `protocol_id_hash` (sha256) |
| `description` | arg 3 | `description_hash` (sha256) |
| `inputSchema` | arg 4 | `input_schema_hash` (sha256) |
| `outputSchema` | arg 5 | `output_schema_hash` (sha256) |
| `httpMethod` (lowercase string) | arg 6 (numeric 0-4) | `http_method` (u8) |
| `category` (capitalized string) | arg 7 (numeric 0-9) | `category` (u8) |

### RegisterWithToolsResult Shape

```ts
interface RegisterWithToolsResult extends RegisterResult {
  readonly toolSignatures: Array<{
    readonly name: string;              // tool name
    readonly txSignature: string;       // publish TX signature
  }>;
  // ⚠ NOT result.tools — it's result.toolSignatures
  // ⚠ No toolPda in the result — derive it yourself:
  //    const [toolPda] = deriveTool(result.agentPda, hashToArray(sha256(toolName)));
}
```

---

## 8e. Tool Error Codes Reference

All on-chain error codes that can occur during tool operations.
Use `classifyAnchorError()` to get human-readable messages.

| Code | Name | Trigger | Fix |
|------|------|---------|-----|
| `6048` | `ToolNameTooLong` | `tool_name.len() > 32` | Shorten to ≤ 32 chars |
| `6049` | `EmptyToolName` | `tool_name.is_empty()` | Provide a non-empty name |
| `6050` | `InvalidToolNameHash` | `sha256(tool_name) != tool_name_hash` | Use `publishByName()` (auto-hashes) |
| `6051` | `InvalidToolHttpMethod` | `http_method > 4` | Use 0-4 (Get=0, Post=1, Put=2, Delete=3, Compound=4) |
| `6052` | `InvalidToolCategory` | `category > 9` | Use 0-9 (Swap=0 ... Custom=9) |
| `6053` | `ToolAlreadyInactive` | `deactivate()` on inactive tool | Check `tool.isActive` before deactivating |
| `6054` | `ToolAlreadyActive` | `reactivate()` on active tool | Check `tool.isActive` before reactivating |
| `6055` | `InvalidSchemaHash` | `sha256(schema_data) != schema_hash` | Hash the **uncompressed** data, not compressed |
| `6056` | `InvalidSchemaType` | `schema_type > 2` | Use only 0 (Input), 1 (Output), 2 (Description) |
| `6057` | `InvalidCheckpointIndex` | Invalid checkpoint index | Use sequential checkpoint indices |
| `6067` | `NoFieldsToUpdate` | All update fields are `null` | Set at least one field to update |

### Common Patterns That Cause Errors

```ts
// ❌ WRONG: tool name too long (max 32 chars, NOT 64)
await client.tools.publishByName("myVeryLongToolNameThatExceeds32Characters", ...);
// Error: ToolNameTooLong (6048)

// ❌ WRONG: hashing compressed data instead of uncompressed
const compressed = deflateSync(Buffer.from(schema));
await client.tools.inscribeSchema("myTool", {
  schemaData: compressed,
  schemaHash: hashToArray(sha256(compressed)),  // ← BUG: hash the original!
  compression: CompressionType.Deflate,
});
// Error: InvalidSchemaHash (6055)

// ✅ CORRECT: hash the uncompressed, send compressed
await client.tools.inscribeSchema("myTool", {
  schemaData: compressed,
  schemaHash: hashToArray(sha256(schema)),      // ← hash of uncompressed
  compression: CompressionType.Deflate,
});

// ❌ WRONG: using publish() without correct hash
await client.tools.publish("myTool", wrongHash, ...);
// Error: InvalidToolNameHash (6050)

// ✅ CORRECT: always use publishByName() — it auto-computes the hash
await client.tools.publishByName("myTool", ...);
```

---

## 8f. Tool Events Reference

Every tool operation emits an on-chain event. Use `EventParser` to decode them.

| Event | Emitted By | Key Fields |
|-------|-----------|------------|
| `ToolPublishedEvent` | `publishByName` / `publish` | `agent`, `tool` (PDA), `toolName`, `protocolHash`, `version`, `httpMethod`, `category`, `paramsCount`, `requiredParams`, `isCompound`, `timestamp` |
| `ToolSchemaInscribedEvent` | `inscribeSchema` | `agent`, `tool`, `toolName`, `schemaType` (0/1/2), `schemaData` (bytes), `schemaHash` ([u8;32]), `compression` (0/1), `version`, `timestamp` |
| `ToolUpdatedEvent` | `update` | `agent`, `tool`, `toolName`, `oldVersion`, `newVersion`, `timestamp` |
| `ToolDeactivatedEvent` | `deactivate` | `agent`, `tool`, `toolName`, `timestamp` |
| `ToolReactivatedEvent` | `reactivate` | `agent`, `tool`, `toolName`, `timestamp` |
| `ToolClosedEvent` | `close` | `agent`, `tool`, `toolName`, `totalInvocations`, `timestamp` |
| `ToolInvocationReportedEvent` | `reportInvocations` | `agent`, `tool`, `invocationsReported`, `totalInvocations`, `timestamp` |

> **Note:** `ToolSchemaInscribedEvent.compression` only documents values `0` (none) and `1` (deflate)
> in the on-chain comment. The SDK supports `CompressionType.Gzip` (2) and `CompressionType.Brotli` (3)
> as pass-through values — the on-chain program stores the raw `u8` without validating compression type.
> However, consumers must know which compression was used to decompress. **Stick to `None` (0) or `Deflate` (1)**
> for maximum compatibility.

---

## 8g. On-Chain Constraints & Limits

| Constraint | Value | Enforced By |
|-----------|-------|-------------|
| Max tool name length | **32 chars** | On-chain `ToolDescriptor::MAX_TOOL_NAME_LEN` |
| Tool name format | Non-empty, any UTF-8 | On-chain `EmptyToolName` check |
| Tool name hash | Must match `sha256(tool_name)` | On-chain `InvalidToolNameHash` check |
| HTTP method range | 0-4 | On-chain `InvalidToolHttpMethod` check |
| Category range | 0-9 | On-chain `InvalidToolCategory` check |
| Schema type range | 0-2 | On-chain `InvalidSchemaType` check |
| Schema hash | Must match `sha256(uncompressed_data)` | On-chain `InvalidSchemaHash` check |
| Update rule | At least 1 field non-null | On-chain `NoFieldsToUpdate` check |
| Deactivate | Must be active | On-chain `ToolAlreadyInactive` check |
| Reactivate | Must be inactive | On-chain `ToolAlreadyActive` check |
| Version | Auto-incremented on update | On-chain, starts at 1 |
| `previous_version` | Always `Pubkey::default()` | On-chain — version history is in TX logs, not PDAs |
| `reportInvocations` cost | **Free** (TX fee only) | Wallet signer is not `#[account(mut)]` |

### ToolDescriptor Account Fields (On-Chain PDA)

```
PDA seeds: ["sap_tool", agent_pda, sha256(tool_name)]
Size: ~320 bytes (dynamic due to tool_name string)

Fields:
  agent:              Pubkey     — owner agent PDA
  tool_name:          String     — max 32 chars
  tool_name_hash:     [u8; 32]   — sha256(tool_name)
  protocol_id_hash:   [u8; 32]   — sha256(protocol_id)
  description_hash:   [u8; 32]   — sha256(description)
  input_schema_hash:  [u8; 32]   — sha256(input_schema) or [0;32] if not inscribed
  output_schema_hash: [u8; 32]   — sha256(output_schema) or [0;32] if not inscribed
  http_method:        u8         — 0=Get, 1=Post, 2=Put, 3=Delete, 4=Compound
  category:           u8         — 0=Swap ... 9=Custom
  params_count:       u8         — total input parameters
  required_params:    u8         — required parameters
  is_compound:        bool       — multi-step tool
  is_active:          bool       — active/deactivated
  version:            u16        — auto-incremented on update
  previous_version:   Pubkey     — always Pubkey::default() (history is in TX logs)
  total_invocations:  u64        — self-reported counter
  created_at:         i64        — unix timestamp
  updated_at:         i64        — unix timestamp
```

---

## 8h. Mandatory Schema Registration — Complete Merchant Checklist

> **⚠ CRITICAL: Tools published without schema inscription are effectively invisible
> to AI agents and discovery systems.** Always complete ALL steps below.

```
Merchant Tool Registration — Required Steps:

 ✅ Step 1: Define JSON Schemas (input + output + description)
 ✅ Step 2: Publish tool descriptor           → publishByName()
 ✅ Step 3: Inscribe INPUT schema             → inscribeSchema(name, SchemaType.Input)
 ✅ Step 4: Inscribe OUTPUT schema            → inscribeSchema(name, SchemaType.Output)
 ✅ Step 5: Inscribe DESCRIPTION              → inscribeSchema(name, SchemaType.Description)
 ✅ Step 6: Index tool category               → indexing.addToToolCategory()
 ✅ Step 7: Verify all 3 hashes are non-zero  → fetch tool + check hashes
 ✅ Step 8: Report invocations after serving   → reportInvocations()
```

### Complete End-to-End Example (Register → Publish → Inscribe → Index → Verify)

```ts
import {
  SapClient, SapConnection,
  SchemaType, CompressionType, ToolHttpMethod, ToolCategory,
  sha256, hashToArray, deriveAgent, deriveTool,
  TOOL_CATEGORY_VALUES,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── 1. Define schemas ───────────────────────────────────
const inputSchema = JSON.stringify({
  type: "object",
  properties: {
    inputMint:   { type: "string", description: "Source token mint address" },
    outputMint:  { type: "string", description: "Target token mint address" },
    amount:      { type: "number", description: "Amount in base units" },
    slippageBps: { type: "number", description: "Max slippage (basis points)", default: 50 },
  },
  required: ["inputMint", "outputMint", "amount"],
});

const outputSchema = JSON.stringify({
  type: "object",
  properties: {
    txSignature:  { type: "string", description: "Transaction signature" },
    outputAmount: { type: "number", description: "Tokens received" },
    priceImpact:  { type: "number", description: "Price impact percentage" },
    route:        { type: "string", description: "DEX route used" },
  },
  required: ["txSignature", "outputAmount"],
});

const description = "Execute a token swap via Jupiter DEX aggregator with optimal multi-hop routing";

const TOOL_NAME = "jupiterSwap"; // max 32 chars!

// ── 2. Publish tool ─────────────────────────────────────
await client.tools.publishByName(
  TOOL_NAME, "jupiter", description,
  inputSchema, outputSchema,
  ToolHttpMethod.Post, ToolCategory.Swap,
  4, 3, false,
);

// ── 3. Inscribe ALL 3 schemas (MANDATORY) ───────────────
const schemas = [
  { type: SchemaType.Input,       data: inputSchema },
  { type: SchemaType.Output,      data: outputSchema },
  { type: SchemaType.Description, data: description },
] as const;

for (const { type, data } of schemas) {
  await client.tools.inscribeSchema(TOOL_NAME, {
    schemaType: type,
    schemaData: Buffer.from(data),
    schemaHash: hashToArray(sha256(data)),
    compression: CompressionType.None,
  });
}

// ── 4. Index tool by category (for discovery) ───────────
const [agentPda] = deriveAgent(client.walletPubkey);
const toolNameHash = hashToArray(sha256(TOOL_NAME));
const [toolPda] = deriveTool(agentPda, new Uint8Array(toolNameHash));

await client.indexing.addToToolCategory(TOOL_CATEGORY_VALUES.Swap, toolPda);

// ── 5. Verify inscription ───────────────────────────────
const tool = await client.tools.fetch(agentPda, TOOL_NAME);

const isFullyInscribed =
  !tool.inputSchemaHash.every(b => b === 0) &&
  !tool.outputSchemaHash.every(b => b === 0) &&
  !tool.descriptionHash.every(b => b === 0);

if (!isFullyInscribed) {
  throw new Error(`Tool ${TOOL_NAME} is missing schema inscriptions!`);
}

console.log(`✅ Tool "${TOOL_NAME}" fully registered, inscribed, and indexed`);
```

### Schema Templates by Tool Category

Use these JSON Schema templates as starting points for each tool category:

#### Swap Tool Schema

```ts
const swapInput = JSON.stringify({
  type: "object",
  properties: {
    inputMint:   { type: "string", description: "Source token mint" },
    outputMint:  { type: "string", description: "Target token mint" },
    amount:      { type: "number", description: "Amount in base units" },
    slippageBps: { type: "number", description: "Max slippage basis points", default: 50 },
  },
  required: ["inputMint", "outputMint", "amount"],
});

const swapOutput = JSON.stringify({
  type: "object",
  properties: {
    txSignature:  { type: "string" },
    inputAmount:  { type: "number" },
    outputAmount: { type: "number" },
    priceImpact:  { type: "number" },
    route:        { type: "string" },
    fee:          { type: "number" },
  },
  required: ["txSignature", "outputAmount"],
});
```

#### Lending Tool Schema

```ts
const lendInput = JSON.stringify({
  type: "object",
  properties: {
    action:    { type: "string", enum: ["supply", "borrow", "repay", "withdraw"] },
    tokenMint: { type: "string", description: "Token mint address" },
    amount:    { type: "number", description: "Amount in base units" },
    pool:      { type: "string", description: "Lending pool identifier" },
  },
  required: ["action", "tokenMint", "amount"],
});

const lendOutput = JSON.stringify({
  type: "object",
  properties: {
    txSignature: { type: "string" },
    position:    { type: "object", properties: {
      supplied: { type: "number" }, borrowed: { type: "number" },
      healthFactor: { type: "number" },
    }},
    apy: { type: "number" },
  },
  required: ["txSignature"],
});
```

#### Staking Tool Schema

```ts
const stakeInput = JSON.stringify({
  type: "object",
  properties: {
    action:    { type: "string", enum: ["stake", "unstake", "claim"] },
    amount:    { type: "number", description: "Amount in base units" },
    validator: { type: "string", description: "Validator address (optional)" },
  },
  required: ["action", "amount"],
});

const stakeOutput = JSON.stringify({
  type: "object",
  properties: {
    txSignature: { type: "string" },
    stakedAmount: { type: "number" },
    estimatedApy: { type: "number" },
    unstakeEpoch: { type: "number" },
  },
  required: ["txSignature"],
});
```

#### Data / Query Tool Schema

```ts
const dataInput = JSON.stringify({
  type: "object",
  properties: {
    query:     { type: "string", description: "Data query or question" },
    tokenMint: { type: "string", description: "Token mint for price data" },
    timeframe: { type: "string", enum: ["1h", "24h", "7d", "30d"], default: "24h" },
    format:    { type: "string", enum: ["json", "text", "chart"], default: "json" },
  },
  required: ["query"],
});

const dataOutput = JSON.stringify({
  type: "object",
  properties: {
    result:    { type: "object", description: "Query result data" },
    sources:   { type: "array", items: { type: "string" } },
    timestamp: { type: "string", format: "date-time" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["result"],
});
```

#### NFT Tool Schema

```ts
const nftInput = JSON.stringify({
  type: "object",
  properties: {
    action:     { type: "string", enum: ["mint", "list", "buy", "delist", "transfer"] },
    collection: { type: "string", description: "Collection address" },
    mintAddress:{ type: "string", description: "NFT mint address (for existing NFTs)" },
    price:      { type: "number", description: "Price in SOL (for listing)" },
    recipient:  { type: "string", description: "Recipient wallet (for transfer)" },
  },
  required: ["action"],
});

const nftOutput = JSON.stringify({
  type: "object",
  properties: {
    txSignature: { type: "string" },
    mintAddress: { type: "string" },
    collection:  { type: "string" },
    metadata:    { type: "object", properties: {
      name: { type: "string" }, uri: { type: "string" }, symbol: { type: "string" },
    }},
  },
  required: ["txSignature"],
});
```

#### Payment Tool Schema

```ts
const paymentInput = JSON.stringify({
  type: "object",
  properties: {
    recipient:  { type: "string", description: "Recipient wallet address" },
    amount:     { type: "number", description: "Amount in base units" },
    tokenMint:  { type: "string", description: "Token mint (null for SOL)" },
    memo:       { type: "string", description: "Optional payment memo" },
  },
  required: ["recipient", "amount"],
});

const paymentOutput = JSON.stringify({
  type: "object",
  properties: {
    txSignature: { type: "string" },
    amount:      { type: "number" },
    fee:         { type: "number" },
    balanceAfter:{ type: "number" },
  },
  required: ["txSignature", "amount"],
});
```

### Multi-Tool Agent: Register All Tools with Schemas

```ts
// Define schemas per tool
const toolDefinitions = [
  {
    name: "swap",
    protocol: "jupiter",
    description: "Execute token swap via Jupiter",
    category: "Swap" as const,
    httpMethod: "post" as const,
    inputSchema: swapInput,
    outputSchema: swapOutput,
    descriptionText: "Execute a token swap via Jupiter DEX aggregator",
    paramsCount: 4,
    requiredParams: 3,
  },
  {
    name: "quote",
    protocol: "jupiter",
    description: "Get swap quote from Jupiter",
    category: "Swap" as const,
    httpMethod: "get" as const,
    inputSchema: quoteInput,
    outputSchema: quoteOutput,
    descriptionText: "Get a token swap quote with route details",
    paramsCount: 3,
    requiredParams: 3,
  },
  {
    name: "tokenData",
    protocol: "birdeye",
    description: "Fetch token market data",
    category: "Data" as const,
    httpMethod: "get" as const,
    inputSchema: dataInput,
    outputSchema: dataOutput,
    descriptionText: "Query real-time token prices and market data",
    paramsCount: 4,
    requiredParams: 1,
  },
];

// Step 1: Register agent + publish all tools
const result = await client.builder
  .agent("MultiToolAgent")
  .description("Jupiter swap + market data agent")
  .addCapability("jupiter:swap")
  .addCapability("birdeye:data")
  .addPricingTier({ tierId: "default", pricePerCall: 100_000, rateLimit: 60 })
  .addTool(toolDefinitions.map(t => ({
    name: t.name,
    protocol: t.protocol,
    description: t.description,
    inputSchema: t.inputSchema,
    outputSchema: t.outputSchema,
    httpMethod: t.httpMethod,
    category: t.category,
    paramsCount: t.paramsCount,
    requiredParams: t.requiredParams,
  }))[0]) // for single tool — for multi-tool use loop below
  .register();

// Publish tools separately (for multi-tool pattern)
for (const tool of toolDefinitions) {
  await client.tools.publishByName(
    tool.name, tool.protocol, tool.description,
    tool.inputSchema, tool.outputSchema,
    ToolHttpMethod[tool.httpMethod === "get" ? "Get" : "Post"],
    ToolCategory[tool.category],
    tool.paramsCount, tool.requiredParams, false,
  );
}

// Step 2: Inscribe ALL schemas for ALL tools (MANDATORY)
for (const tool of toolDefinitions) {
  for (const { type, data } of [
    { type: SchemaType.Input,       data: tool.inputSchema },
    { type: SchemaType.Output,      data: tool.outputSchema },
    { type: SchemaType.Description, data: tool.descriptionText },
  ] as const) {
    await client.tools.inscribeSchema(tool.name, {
      schemaType: type,
      schemaData: Buffer.from(data),
      schemaHash: hashToArray(sha256(data)),
      compression: CompressionType.None,
    });
  }
}

// Step 3: Index all tools by category
const [agentPda] = deriveAgent(client.walletPubkey);
for (const tool of toolDefinitions) {
  const [toolPda] = deriveTool(agentPda, hashToArray(sha256(tool.name)));
  await client.indexing.addToToolCategory(
    TOOL_CATEGORY_VALUES[tool.category], toolPda,
  );
}

// Step 4: Verify all tools are fully inscribed
for (const tool of toolDefinitions) {
  const t = await client.tools.fetch(agentPda, tool.name);
  const complete =
    !t.inputSchemaHash.every(b => b === 0) &&
    !t.outputSchemaHash.every(b => b === 0) &&
    !t.descriptionHash.every(b => b === 0);
  console.log(`${tool.name}: ${complete ? "✅ fully inscribed" : "❌ MISSING SCHEMAS"}`);
}
```

---

## 9. Discovery Indexing (Be Found)

Register your agent in on-chain indexes so clients can discover you.

### Capability Indexes

```ts
// Create a new capability index (if first agent with this cap) + add self
await client.indexing.initCapabilityIndex("jupiter:swap");

// Or add self to an existing index
await client.indexing.addToCapabilityIndex("jupiter:swap");

// Remove self
await client.indexing.removeFromCapabilityIndex("jupiter:swap");
```

### Protocol Indexes

```ts
await client.indexing.initProtocolIndex("jupiter");
// or
await client.indexing.addToProtocolIndex("jupiter");
```

### Tool Category Indexes

```ts
import { TOOL_CATEGORY_VALUES } from "@oobe-protocol-labs/synapse-sap-sdk";

const [agentPda] = deriveAgent(client.walletPubkey);
const [toolPda] = deriveTool(agentPda, hashToArray(sha256("swap")));

// Add tool to category index
await client.indexing.addToToolCategory(TOOL_CATEGORY_VALUES.Swap, toolPda);
```

### Verify Your Presence

```ts
const capIndex = await client.indexing.fetchCapabilityIndexNullable("jupiter:swap");
if (capIndex) {
  console.log("Agents with this capability:", capIndex.agents.length);
}
```

---

## 10. Network Normalization (v0.6.0)

When settling x402 payments the network identifier in the escrow must match
between client and merchant. Different providers use different formats for the
same network. The normalizer eliminates the "sap network mismatch" error.

### The Problem

```
Client sends:   X-Payment-Network: solana:mainnet-beta
Your agent sees: header says "solana:mainnet-beta"
Your code checks: agentNetworkId === "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
Result:          Mismatch! Settlement rejected.
```

### SapNetwork Constants

| Constant                  | Value                                       | Used By             |
|---------------------------|---------------------------------------------|---------------------|
| `SOLANA_MAINNET`          | `solana:mainnet-beta`                       | Coinbase, Phantom   |
| `SOLANA_MAINNET_GENESIS`  | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`  | Kamiyo, Helius x402 |
| `SOLANA_DEVNET`           | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`  | Devnet providers    |
| `SOLANA_DEVNET_NAMED`     | `solana:devnet`                             | Local / test flows  |

### Use Equivalence Checking (Not String Comparison)

```ts
// When receiving x402 headers from a client:
const clientNetwork = req.headers["x-payment-network"];

// DO NOT:
// if (clientNetwork !== SapNetwork.SOLANA_MAINNET_GENESIS) throw ...

// DO:
if (!isNetworkEquivalent(clientNetwork, SapNetwork.SOLANA_MAINNET)) {
  throw new Error("Network mismatch: this agent operates on Solana mainnet");
}
// Works for both "solana:mainnet-beta" AND "solana:5eykt4UsFv8..."
```

### Normalize Incoming Network Strings

```ts
const raw = req.headers["x-payment-network"];
const normalized = normalizeNetworkId(raw);
console.log(normalized);
// "  MAINNET  " -> "solana:mainnet-beta"
// "5eykt4UsFv..." -> "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
// "devnet"        -> "solana:devnet"
```

### Declare Supported Networks in Your Manifest

```ts
const manifest: AgentManifest = {
  // ...
  supportedNetworks: [
    SapNetwork.SOLANA_MAINNET,
    SapNetwork.SOLANA_MAINNET_GENESIS,
  ],
  // Clients with either format will see they are compatible
};
```

### Best Practice: Merchant Endpoint Handler

```ts
app.post("/x402/:tool", async (req, res) => {
  const clientNetwork = req.headers["x-payment-network"];
  const escrowPda = req.headers["x-payment-escrow"];

  // 1. Normalize and validate network
  const normalized = normalizeNetworkId(clientNetwork);
  if (!isNetworkEquivalent(normalized, SapNetwork.SOLANA_MAINNET)) {
    return res.status(400).json({ error: "Unsupported network" });
  }

  // 2. Verify escrow exists and has balance
  const balance = await client.x402.getBalance(
    client.walletPubkey,
    new PublicKey(req.headers["x-payment-depositor"]),
  );

  if (!balance || balance.callsRemaining <= 0) {
    return res.status(402).json({ error: "Payment required" });
  }

  // 3. Execute the tool
  const result = await executeTool(req.params.tool, req.body);

  // 4. Settle 1 call
  const receipt = await client.x402.settle(
    new PublicKey(req.headers["x-payment-depositor"]),
    1,
    JSON.stringify(result),
  );

  res.json({ data: result, settlement: receipt.txSignature });
});
```

---

## 11. Settling Payments (x402)

As a merchant you **settle** funds from client escrows after serving calls.

### V2 Settlement (v0.7.0 — Preferred)

V2 escrows support **settlement security modes**: `Open`, `CoSigned`, `Arbitrated`.
With `CoSigned` or `Arbitrated`, settlements go through a pending phase that
allows disputes.

```ts
// Settle calls on a V2 escrow
await client.escrowV2.settleCalls(depositorWallet, {
  callsToSettle: 5,
  serviceData: "search-query-batch",
});

// For CoSigned escrows: settlement goes to PendingSettlement
// The depositor must co-sign or the dispute window must expire

// Close pending settlement after dispute window
await client.escrowV2.closePendingSettlement(pendingSettlementPda);
```

### V2 Staking (v0.7.0)

Agents can stake SOL to signal commitment and eligibility for higher-tier
escrow modes.

```ts
// Initialize stake for your agent
await client.staking.initStake(agentWallet, new BN(1_000_000_000)); // 1 SOL

// Add more stake
await client.staking.deposit(agentWallet, new BN(500_000_000));

// Request unstake (starts cooldown)
await client.staking.requestUnstake(agentWallet, new BN(500_000_000));

// Complete unstake after cooldown
await client.staking.completeUnstake(agentWallet);
```

### V1 Settlement (⚠️ DEPRECATED — use V2 above)

> **⚠️ v0.7.0:** `client.escrow.settle()` and `client.x402.settle()` create V1
> settlements. For new integrations, use `client.escrowV2.settleCalls()`.

### Single Settlement

```ts
const receipt: SettlementResult = await client.x402.settle(
  depositorWallet,   // the client who funded the escrow
  5,                 // callsToSettle
  "service-data",    // service data (auto-hashed to service_hash)
);

console.log("Settled:", receipt.amount.toString(), "lamports");
console.log("TX:", receipt.txSignature);
```

### Batch Settlement (Up to 10, Gas-Efficient)

```ts
const batch: BatchSettlementResult = await client.x402.settleBatch(
  depositorWallet,
  [
    { calls: 3, serviceData: "batch-1" },
    { calls: 7, serviceData: "batch-2" },
    { calls: 2, serviceData: "batch-3" },
  ],
);

console.log("Total:", batch.totalCalls, "calls,", batch.totalAmount.toString(), "lamports");
```

### Low-level EscrowModule Settlement

```ts
const serviceHash = hashToArray(sha256("service-data"));

await client.escrow.settle(
  depositorWallet,
  new BN(5),
  serviceHash,
);
```

### Check Escrow Balance

```ts
const balance: EscrowBalance | null = await client.x402.getBalance(
  client.walletPubkey, // your agent wallet
  depositorWallet,     // specific depositor
);

if (balance) {
  console.log("Balance:", balance.balance.toString());
  console.log("Calls remaining:", balance.callsRemaining);
  console.log("Affordable calls:", balance.affordableCalls);
  console.log("Expired:", balance.isExpired);
}
```

### Cost Estimation

```ts
// With on-chain fetch (reads escrow or agent pricing):
const estimate: CostEstimate = await client.x402.estimateCost(agentWallet, 100);

// Pure calculation (no RPC):
const estimate2 = client.x402.calculateCost(
  new BN(100_000),  // basePrice
  volumeCurve,      // VolumeCurveBreakpoint[]
  0,                // totalCallsBefore
  100,              // calls
);
```

### Priority Fees for Settlement Transactions (v0.6.2)

Settlement transactions on Solana mainnet can take 35–40 s at base fee.
When the **consumer** (e.g. Kamiyo, AceDataCloud) imposes a synchronous
HTTP timeout ≤ 30 s, the settle tx gets dropped and you receive
`HTTP 402 — payment confirmation timeout`.

The SDK now ships **priority-fee helpers** that push settle txs through
Solana's scheduler in ~5–10 s:

```ts
import {
  FAST_SETTLE_OPTIONS,
  FAST_BATCH_SETTLE_OPTIONS,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// Single settlement — ~5 000 µL priority, 100 k CU
const receipt = await client.x402.settle(
  depositorWallet, 1, serviceDataHash,
  FAST_SETTLE_OPTIONS,        // ← adds ComputeBudget ixs automatically
);

// Batch settlement
const receipts = await client.x402.settleBatch(
  settlements,
  FAST_BATCH_SETTLE_OPTIONS,  // ← 5 000 µL, 300 k CU
);
```

Or pass custom values:

```ts
await client.x402.settle(depositorWallet, 1, serviceDataHash, {
  priorityFeeMicroLamports: 10_000,  // higher tip for congested slots
  computeUnits: 150_000,
  skipPreflight: true,
  commitment: "confirmed",
  maxRetries: 3,
});
```

> **⚠️ Timeout advice for merchants WITHOUT a dedicated RPC**
>
> If you are running on the **public Solana mainnet RPC**
> (`https://api.mainnet-beta.solana.com`) — which is **rate-limited to
> ~10 req/s** — settlement confirmation can be significantly slower and
> retries may get throttled.
>
> **Recommended default**: set your HTTP server / x402 handler timeout to
> **at least 60 seconds** when using the public RPC. This gives the
> transaction enough room to land even under congestion + rate limiting.
>
> If you use **OOBE Protocol RPC**, **Helius**, or any dedicated RPC with
> higher rate limits, 30 s is usually sufficient with `FAST_SETTLE_OPTIONS`.
>
> ```ts
> // Example: Express middleware timeout for settlement endpoint
> app.post("/x402/settle", timeout("60s"), async (req, res) => {
>   const receipt = await client.x402.settle(
>     depositorWallet, 1, serviceDataHash,
>     FAST_SETTLE_OPTIONS,
>   );
>   res.json({ receipt });
> });
> ```

---

## 11a. EscrowV2 — Complete CRUD Lifecycle (v0.7.0)

V2 escrows support multiple escrows per (agent, depositor) pair via `nonce`,
settlement security modes, and dispute resolution.

### CreateEscrowV2Args Interface

```ts
interface CreateEscrowV2Args {
  escrowNonce: BN | number | bigint;       // unique nonce (allows multiple escrows per pair)
  pricePerCall: BN | number | bigint;      // price in lamports/token base units
  maxCalls: BN | number | bigint;          // max calls this escrow supports
  initialDeposit: BN | number | bigint;    // SOL/tokens deposited on creation
  expiresAt: BN | null;                    // unix timestamp or null (no expiry)
  volumeCurve: VolumeCurveBreakpoint[];    // volume discounts (max 5 entries)
  tokenMint: PublicKey | null;             // null = SOL, set for SPL tokens
  tokenDecimals: number;                   // 9 for SOL, 6 for USDC, etc.
  settlementSecurity: number;              // 0=SelfReport (deprecated), 1=CoSigned, 2=DisputeWindow
  disputeWindowSlots: BN | number | bigint;// slots before auto-release (DisputeWindow only)
  coSigner: PublicKey | null;              // required for CoSigned mode
  arbiter: PublicKey | null;               // DEPRECATED in v0.7 — ignored, use receipt batches
}
```

### Settlement Security Modes

| Mode | Value | How Settlement Works | Use Case |
|------|-------|---------------------|----------|
| `SelfReport` | `0` | Agent calls `settle()` directly — instant | Legacy, trusted agents |
| `CoSigned` | `1` | Client must co-sign settlement TX | Bilateral trust |
| `DisputeWindow` | `2` | Settlement enters pending state → dispute window → auto-release | Trustless, high-value |

### Create, Deposit, Withdraw, Close

```ts
import { SettlementSecurity, BillingInterval } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Create a V2 escrow (as a client/consumer) ──────────
await client.escrowV2.create(agentWallet, {
  escrowNonce: 0,                      // first escrow with this agent
  pricePerCall: new BN(100_000),       // 0.0001 SOL per call
  maxCalls: new BN(1000),
  initialDeposit: new BN(100_000_000), // 0.1 SOL
  expiresAt: null,                     // no expiry
  volumeCurve: [],
  tokenMint: null,                     // SOL
  tokenDecimals: 9,
  settlementSecurity: 0,               // SelfReport
  disputeWindowSlots: new BN(0),
  coSigner: null,
  arbiter: null,
});

// ── Create with DisputeWindow security ─────────────────
await client.escrowV2.create(agentWallet, {
  escrowNonce: 1,                      // second escrow with same agent
  pricePerCall: new BN(500_000),
  maxCalls: new BN(100),
  initialDeposit: new BN(50_000_000),
  expiresAt: null,
  volumeCurve: [],
  tokenMint: null,
  tokenDecimals: 9,
  settlementSecurity: 2,               // DisputeWindow
  disputeWindowSlots: new BN(5000),    // ~33 minutes (at ~400ms/slot)
  coSigner: null,
  arbiter: arbiterWallet.publicKey,     // who resolves disputes
});

// ── Deposit more funds ─────────────────────────────────
await client.escrowV2.deposit(agentWallet, 0, new BN(50_000_000));

// ── Withdraw unused funds ──────────────────────────────
await client.escrowV2.withdraw(agentWallet, 0, new BN(25_000_000));

// ── Close escrow (must have zero balance) ──────────────
await client.escrowV2.close(agentWallet, 0);
```

### Settle Calls (Merchant Side)

```ts
const serviceHash = hashToArray(sha256("swap-execution-batch-42"));

// SelfReport mode → instant settlement
await client.escrowV2.settle(
  depositorWallet,    // who funded the escrow
  0,                  // nonce
  new BN(5),          // calls to settle
  serviceHash,
);

// DisputeWindow mode → creates PendingSettlement
// (same API, but funds are locked until dispute window passes)
```

### Fetch Escrow State

```ts
const [agentPda] = deriveAgent(agentWallet);

// Fetch specific escrow
const escrow = await client.escrowV2.fetch(agentPda, depositorWallet, 0);
console.log("Balance:", escrow.balance.toString());
console.log("Security:", escrow.settlementSecurity);
console.log("Settled:", escrow.totalSettled.toString());
console.log("Pending:", escrow.pendingAmount.toString());

// Check if escrow exists (returns null instead of throwing)
const maybeEscrow = await client.escrowV2.fetchNullable(agentPda, depositorWallet, 0);

// Fetch by pre-derived PDA
const escrow2 = await client.escrowV2.fetchByPda(escrowPda);
```

### EscrowAccountV2 On-Chain Fields

```
PDA seeds: ["sap_escrow_v2", agent_pda, depositor_wallet, nonce(u64 LE)]

Fields:
  bump, version (2), agent, depositor, agent_wallet, escrow_nonce
  balance, total_deposited, total_settled, total_calls_settled
  price_per_call, max_calls, created_at, last_settled_at, expires_at
  volume_curve (max 5), token_mint, token_decimals
  settlement_security (SelfReport=0 | CoSigned=1 | DisputeWindow=2)
  dispute_window_slots, settlement_index, co_signer, arbiter
  pending_amount, pending_calls
```

---

## 11b. Dispute Resolution Flow (v0.8.0)

Disputes are only available with `DisputeWindow` settlement security.
The flow: **settle → pending → (optional) dispute → receipt proof → auto-resolve/finalize**.

> **v0.8.0**: `ReceiptModule` added — arbiter-based `resolveDispute` has been **removed**.
> Disputes are now resolved automatically via receipt merkle proofs (`client.receipt`).

### DisputeType Enum (v0.8.0)

| Value | Name | Meaning |
|-------|------|---------|
| `0` | `NonDelivery` | Agent took payment but delivered nothing |
| `1` | `PartialDelivery` | Agent delivered fewer calls than claimed |
| `2` | `Overcharge` | Agent charged more than agreed price |
| `3` | `Quality` | Agent delivered but output quality is disputed |

### DisputeOutcome Enum

| Value | Name | Meaning |
|-------|------|---------|
| `0` | `Pending` | Not yet resolved |
| `1` | `AutoReleased` | Dispute window expired, no dispute filed → funds auto-released |
| `2` | `DepositorWins` | Full refund to depositor (agent failed to prove any calls) |
| `3` | `AgentWins` | Agent proved all claimed calls |
| `4` | `PartialRefund` | Proportional: agent proved N of M calls → N/M to agent, rest refunded |
| `5` | `Split` | Quality dispute → 50/50 split |

### ResolutionLayer Enum (v0.8.0)

| Value | Name | Meaning |
|-------|------|---------|
| `Pending` | Not resolved | Default state |
| `Auto` | Receipt-based | Resolved via merkle proofs after proof deadline |
| `Governance` | Protocol governance | For quality disputes (future) |

### Complete Dispute Flow (v0.8.0)

```ts
import { DisputeType } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── 1. Agent inscribes receipt batch (before settlement) ──
await client.receipt.inscribeReceiptBatch(
  depositorWallet, 0, // nonce
  0,                  // batchIndex
  merkleRoot,         // 32-byte merkle root of call receipts
  new BN(50),         // callCount
  new BN(periodStart),
  new BN(periodEnd),
);

// ── 2. Agent settles (creates PendingSettlement) ───────
const serviceHash = hashToArray(sha256("search-query-batch"));
await client.escrowV2.createPendingSettlement(
  agentWallet, depositorWallet, 0, 0,
  new BN(50), new BN(5_000_000), serviceHash,
  merkleRoot, // receipt_merkle_root links settlement to receipts
);

// ── 3. Depositor files dispute with type ───────────────
const evidenceHash = hashToArray(sha256(JSON.stringify({
  reason: "Agent returned empty results for 20 of 50 calls",
  requestId: "req-123",
  timestamp: Date.now(),
})));

await client.escrowV2.fileDispute(
  agentWallet,
  0,                             // escrow nonce
  0,                             // settlement index
  evidenceHash,
  DisputeType.PartialDelivery,   // dispute category
);

// ── 4. Agent submits merkle proof within 7-day deadline ──
await client.receipt.submitReceiptProof(
  depositorWallet, 0, // nonce
  0,                  // settlementIndex
  0,                  // batchIndex
  new BN(30),         // proven count (30 of 50 claimed)
  proofHashes,        // merkle inclusion proof
  leafHash,           // leaf being proven
);

// ── 5. Anyone cranks auto-resolution after deadline ────
// Proportional: 30/50 → 60% to agent, 40% refunded
await client.receipt.autoResolveDispute(
  agentWallet, depositorWallet, 0, 0,
);

// ── 6a. If no dispute: finalize after window expires ───
await client.escrowV2.finalizeSettlement(
  agentWallet, depositorWallet, 0, 0,
);

// ── 6b. Close PendingSettlement PDA (reclaim rent) ─────
await client.escrowV2.closePendingSettlement(pendingSettlementPda);

// ── 6c. Close DisputeRecord PDA (if dispute was filed) ─
await client.escrowV2.closeDispute(pendingSettlementPda);
```

### Create Pending Settlement Manually

For advanced use cases, you can create a pending settlement without the
settle instruction:

```ts
await client.escrowV2.createPendingSettlement(
  agentWallet,        // agent
  depositorWallet,    // depositor
  0,                  // escrow nonce
  1,                  // settlement index
  new BN(10),         // calls
  new BN(1_000_000),  // amount in lamports
  serviceHash,
  receiptMerkleRoot,  // v0.7 — 32-byte root linking to receipt batch
);
```

### Fetch Pending Settlement & Dispute State

```ts
const [agentPda] = deriveAgent(agentWallet);
const [escrowPda] = deriveEscrowV2(agentPda, depositorWallet, 0);
const [pendingPda] = derivePendingSettlement(escrowPda, 0);
const [disputePda] = deriveDispute(pendingPda);

// Pending settlement
const pending = await client.escrowV2.fetchPendingSettlement(pendingPda);
console.log("Amount locked:", pending.amount.toString());
console.log("Release slot:", pending.releaseSlot.toString());
console.log("Is disputed:", pending.isDisputed);
console.log("Is finalized:", pending.isFinalized);

// Nullable variant (returns null if not found)
const maybePending = await client.escrowV2.fetchPendingSettlementNullable(pendingPda);

// Dispute record (if filed)
const dispute = await client.escrowV2.fetchDisputeNullable(disputePda);
if (dispute) {
  console.log("Outcome:", dispute.outcome);       // DisputeOutcome enum
  console.log("Dispute type:", dispute.disputeType); // 0-3 (NonDelivery..Quality)
  console.log("Resolution:", dispute.resolutionLayer); // Pending | Auto | Governance
  console.log("Proven calls:", dispute.provenCalls.toString());
  console.log("Claimed calls:", dispute.claimedCalls.toString());
  console.log("Proof deadline:", new Date(dispute.proofDeadline.toNumber() * 1000));
  console.log("Slash:", dispute.slashAmount.toString());
  console.log("Resolved:", dispute.resolvedAt.toNumber() > 0);
}
```

### PendingSettlement On-Chain Fields

```
PDA seeds: ["sap_pending", escrow_v2_pda, settlement_index(u64 LE)]

Fields:
  bump, escrow, agent, agent_wallet, depositor, settlement_index
  calls_to_settle, amount, service_hash, created_at
  release_slot        — slot after which finalize is allowed
  is_finalized, is_disputed, outcome (DisputeOutcome)
  receipt_merkle_root — v0.7: 32-byte merkle root linking to receipt batch
```

### DisputeRecord On-Chain Fields

```
PDA seeds: ["sap_dispute", pending_settlement_pda]

Fields:
  bump, pending_settlement, escrow, depositor, agent
  evidence_hash       — sha256 of depositor's evidence
  agent_evidence_hash — sha256 of agent's counter-evidence
  arbiter             — DEPRECATED (v0.7: ignored, kept for backward compat)
  outcome             — DisputeOutcome (Pending|AutoReleased|DepositorWins|AgentWins|PartialRefund|Split)
  created_at, resolved_at (0 = unresolved), resolution_hash
  slash_amount        — slashed from agent stake (SLASH_BPS = 50% of dispute amount)
  dispute_type        — v0.7: DisputeType (0-3)
  resolution_layer    — v0.7: ResolutionLayer (Pending|Auto|Governance)
  dispute_bond        — v0.7: bond deposited by disputer (lamports)
  proven_calls        — v0.7: calls agent proved via merkle proofs
  claimed_calls       — v0.7: calls agent originally claimed
  proof_deadline      — v0.7: unix timestamp by which agent must submit proof
```

### ReceiptBatch On-Chain Fields (v0.8.0)

```
PDA seeds: ["sap_receipt", escrow_v2_pda, batch_index(u32 LE)]

Fields:
  bump, escrow, batch_index, merkle_root
  call_count, period_start, period_end, inscribed_at
```

---

## 11c. V1 → V2 Escrow Migration (v0.7.0)

Existing V1 escrows (from the 8 live mainnet agents) can be migrated to V2.

```ts
// Migrate depositor's V1 escrow to V2 with this agent
await client.escrowV2.migrateFromV1(agentWallet);

// The V1 escrow balance is transferred to a new V2 escrow (nonce=0)
// with SelfReport settlement security (backwards-compatible)
```

> **What happens:** V1 escrow PDA (`["sap_escrow", agent_pda, depositor]`) is closed
> and a V2 escrow PDA (`["sap_escrow_v2", agent_pda, depositor, nonce=0]`) is created
> with the same balance. The V2 escrow inherits `SelfReport` security for compatibility.

---

## 11d. Staking — Complete Reference (v0.7.0)

### On-Chain Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `MIN_STAKE` | `100_000_000` (0.1 SOL) | Minimum initial stake |
| `UNSTAKE_COOLDOWN_SLOTS` | `1_512_000` (~7 days) | Cooldown before unstake completes |
| `SLASH_BPS` | `5_000` (50%) | Percentage slashed on lost disputes |

### Full Staking Lifecycle

```ts
const agentWallet = client.walletPubkey;

// ── Init stake (must be >= 0.1 SOL) ────────────────────
await client.staking.initStake(agentWallet, new BN(100_000_000));

// ── Deposit more stake ─────────────────────────────────
await client.staking.deposit(agentWallet, new BN(500_000_000));

// ── Request unstake (starts cooldown) ──────────────────
await client.staking.requestUnstake(agentWallet, new BN(200_000_000));

// ── Complete unstake (after ~7 days cooldown) ──────────
await client.staking.completeUnstake(agentWallet);
```

### Read Stake State

```ts
const [agentPda] = deriveAgent(agentWallet);

// Fetch stake (throws if not found)
const stake = await client.staking.fetch(agentPda);
console.log("Staked:", stake.stakedAmount.toString(), "lamports");
console.log("Slashed:", stake.slashedAmount.toString());
console.log("Unstake pending:", stake.unstakeAmount.toString());
console.log("Unstake available at:", stake.unstakeAvailableAt.toString());
console.log("Disputes won:", stake.totalDisputesWon);
console.log("Disputes lost:", stake.totalDisputesLost);

// Nullable variant (returns null if no stake exists)
const maybeStake = await client.staking.fetchNullable(agentPda);
if (!maybeStake) {
  console.log("Agent has no stake — init one to signal commitment");
}

// By PDA directly
const [stakePda] = deriveStake(agentPda);
const stake2 = await client.staking.fetchByPda(stakePda);
```

### AgentStake On-Chain Fields

```
PDA seeds: ["sap_stake", agent_pda]

Fields:
  bump, agent, wallet, staked_amount, slashed_amount
  last_stake_at, unstake_requested_at (0 = none), unstake_amount
  unstake_available_at (0 = none)
  total_disputes_won, total_disputes_lost, created_at
```

---

## 11e. Subscriptions — Complete Reference (v0.7.0)

Subscriptions are recurring payments: a subscriber pays a fixed price per
billing interval for unlimited calls to an agent's tools.

### BillingInterval Enum

| Value | Name | Duration |
|-------|------|----------|
| `0` | `Daily` | 86,400 seconds |
| `1` | `Weekly` | 604,800 seconds |
| `2` | `Monthly` | 2,592,000 seconds (~30 days) |

### CreateSubscriptionArgs Interface

```ts
interface CreateSubscriptionArgs {
  subId: BN | number | bigint;              // unique subscription ID per (agent, subscriber)
  pricePerInterval: BN | number | bigint;   // price in lamports per billing period
  billingInterval: number;                   // 0=Daily, 1=Weekly, 2=Monthly
  initialFund: BN | number | bigint;        // initial SOL/token deposit
}
```

### Full Subscription Lifecycle

```ts
import { BillingInterval } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Create subscription (as subscriber) ────────────────
await client.subscription.create(agentWallet, {
  subId: 0,
  pricePerInterval: new BN(1_000_000_000),  // 1 SOL per interval
  billingInterval: 2,                        // Monthly
  initialFund: new BN(3_000_000_000),        // 3 months prepaid
});

// ── Fund more intervals ────────────────────────────────
await client.subscription.fund(agentWallet, 0, new BN(2_000_000_000));

// ── Cancel (pro-rata refund of unused balance) ─────────
await client.subscription.cancel(agentWallet, 0);

// ── Close PDA (reclaim rent after cancellation) ────────
await client.subscription.close(agentWallet, 0);
```

### Read Subscription State

```ts
const [agentPda] = deriveAgent(agentWallet);

// Fetch subscription
const sub = await client.subscription.fetch(agentPda, subscriberWallet, 0);
console.log("Balance:", sub.balance.toString());
console.log("Intervals paid:", sub.intervalsPaid);
console.log("Next due:", new Date(sub.nextDueAt.toNumber() * 1000));
console.log("Cancelled:", sub.cancelledAt.toNumber() > 0);

// Nullable variant
const maybeSub = await client.subscription.fetchNullable(agentPda, subscriberWallet, 0);

// By PDA directly
const [subPda] = deriveSubscription(agentPda, subscriberWallet, 0);
const sub2 = await client.subscription.fetchByPda(subPda);
```

### Subscription On-Chain Fields

```
PDA seeds: ["sap_sub", agent_pda, subscriber_wallet, sub_id(u64 LE)]

Fields:
  bump, agent, subscriber, agent_wallet, sub_id
  price_per_interval, billing_interval (Daily=0 | Weekly=1 | Monthly=2)
  token_mint, token_decimals, balance, total_paid, intervals_paid
  started_at, last_claimed_at, cancelled_at (0 = active), next_due_at, created_at
```

---

## 12. Zod Schema Validation (v0.6.0)

The SDK ships Zod schema factories for runtime validation of registration
inputs, manifests, and payment parameters. Zod is a **peer dependency** —
install separately: `npm install zod`.

### Validate Registration Args

```ts
const regSchema = createRegisterAgentSchema();
const validatedArgs = regSchema.parse({
  name: "MySwapAgent",
  description: "Jupiter swap executor",
  capabilities: [{ id: "jupiter:swap" }],
  protocols: ["solana-agent-protocol"],
  pricing: [{ tierId: "default", pricePerCall: 100_000 }],
});
// Throws if any field is invalid — catches issues before the TX
```

### Validate Your Endpoint Descriptor

```ts
const epSchema = createEndpointDescriptorSchema();
const validatedEndpoint = epSchema.parse({
  url: "https://myagent.dev/x402",
  method: "POST",
  contentType: "application/json",
  requiresAuth: true,
  authType: "x402",
});
```

### Validate Your Agent Manifest

```ts
const manifestSchema = createAgentManifestSchema();
const manifest = manifestSchema.parse(rawManifest);
// Validates: endpoint, healthCheck, each tool, supportedNetworks, version
```

### Validate Environment Variables

```ts
const envSchema = createEnvSchema();
const env = envSchema.parse(process.env);
// env.SOLANA_CLUSTER: "mainnet-beta" | "devnet" | "localnet"
// env.AGENT_KEYPAIR: string (path to keypair JSON)
// env.RPC_URL: string
```

### Validate-or-Throw Helper

```ts
const schema = createRegisterAgentSchema();
const validated = validateOrThrow(schema, userInput, "agent registration");
// Throws with formatted message:
// [SAP SDK] Invalid agent registration:
//   - name: String must contain at least 1 character(s)
//   - pricing: Required
```

### Available Schema Factories

| Function | Validates |
|----------|-----------|
| `createEnvSchema()` | Environment variables |
| `createRegisterAgentSchema()` | Agent registration args |
| `createAgentManifestSchema()` | Full agent manifest |
| `createEndpointDescriptorSchema()` | Single endpoint descriptor |
| `createHealthCheckSchema()` | Health check descriptor |
| `createToolManifestEntrySchema()` | Tool manifest entry |
| `createPreparePaymentSchema()` | x402 payment preparation params |
| `createCallArgsSchema()` | CLI call arguments |

---

## 13. RPC Strategy & Dual Connection (v0.6.0)

### Auto-Resolve RPC URL

```ts
// Reads from env: RPC_URL -> ANCHOR_PROVIDER_URL -> cluster defaults
const url = getRpcUrl({ primaryUrl: "https://my-rpc.example.com" });
const fallback = getFallbackRpcUrl(undefined, "mainnet-beta");
```

### Create Dual Connection

```ts
const { primary, fallback }: DualConnection = createDualConnection(
  { primaryUrl: "https://my-rpc.example.com" },
  "mainnet-beta",
);
// primary  -> authenticated RPC for SAP program calls
// fallback -> public RPC for SPL token ops (avoids WebSocket-400)
```

### Lightweight ATA Derivation

```ts
const ata: PublicKey = findATA(ownerPubkey, mintPubkey);
```

---

## 14. Error Classification (v0.6.0)

Anchor program errors surface as hex codes. The SDK maps them to actionable
messages for both logging and client-facing error responses.

### Classify Errors in Settlement

```ts
try {
  await client.x402.settle(depositorWallet, 5, "data");
} catch (err) {
  const code = extractAnchorErrorCode(err);
  if (code !== null) {
    const message = classifyAnchorError(code);
    console.error(`SAP Error ${code}: ${message}`);
    // e.g. "SAP Error 6009: Escrow expired"
    // e.g. "SAP Error 6010: Insufficient escrow balance"
  } else {
    throw err; // Not an Anchor error
  }
}
```

### Error Code Reference

| Code | Message |
|------|---------|
| 6000 | Agent already registered for this wallet |
| 6001 | Agent not found -- register first |
| 6002 | Name exceeds maximum length (64 bytes) |
| 6003 | Description exceeds maximum length (256 bytes) |
| 6004 | Too many capabilities (max 10) |
| 6005 | Too many pricing tiers (max 5) |
| 6006 | Too many protocols (max 5) |
| 6007 | Feedback score out of range (0-1000) |
| 6008 | Unauthorized -- only the agent owner can perform this action |
| 6009 | Escrow expired |
| 6010 | Insufficient escrow balance |
| 6011 | Max calls exceeded |
| 6012 | Invalid settlement -- calls must be > 0 |
| 6013 | Escrow not empty -- withdraw balance before closing |
| 6014 | Invalid token program |
| 6015 | Vault already initialized |
| 6016 | Session already exists |
| 6017 | Session closed -- cannot write to closed session |
| 6018 | Data exceeds maximum write size (750 bytes) |
| 6019 | Ring buffer overflow -- seal before writing more |

### Return Meaningful Errors to Clients

```ts
app.post("/x402/:tool", async (req, res) => {
  try {
    const receipt = await client.x402.settle(depositorPubkey, 1, "data");
    res.json({ data: result, settlement: receipt.txSignature });
  } catch (err) {
    const code = extractAnchorErrorCode(err);
    if (code === 6009) {
      return res.status(402).json({ error: "Escrow expired", code });
    }
    if (code === 6010) {
      return res.status(402).json({ error: "Insufficient balance", code });
    }
    if (code === 6011) {
      return res.status(402).json({ error: "Call limit exceeded", code });
    }
    res.status(500).json({ error: "Internal error" });
  }
});
```

---

## 15. Memory Systems — Vault & Ledger

Synapse provides **two memory systems** that serve different purposes.
Choose the right one — or combine them — based on your use case.

| System | Data Location | Rent | Readable via | Best For |
|--------|--------------|------|-------------|----------|
| **Vault (inscriptions)** | TX logs (permanent) | ZERO — only TX fee | `getTransaction()` on epoch/session PDAs | Encrypted conversation history, large archives, multi-agent context |
| **Ledger (ring buffer)** | PDA account (4 KB) + TX logs | ~0.032 SOL (reclaimable) | `getAccountInfo()` (free, instant) | Hot memory, recent context window, fast reads without RPC history |

> **Rule of thumb**: Use the **Ledger** for data your agent needs to read
> on every request (recent conversation). Use the **Vault** for long-term
> archive and encrypted data you reconstruct on demand.

### 15a. Vault Architecture — How It Works

The vault system stores **encrypted data inside TX logs** (zero rent).
On-chain PDAs track only metadata and counters — never the data itself.

```
┌─────────────────────────────────────────────────┐
│  MemoryVault PDA  ["sap_vault", agent_pda]      │
│  ~165 bytes, ~0.002 SOL rent (reclaimable)      │
│  Fields: vault_nonce, nonce_version,            │
│          total_sessions, total_inscriptions,     │
│          total_bytes_inscribed                   │
├─────────────────────────────────────────────────┤
│  SessionLedger PDA  ["sap_session", vault, hash]│
│  ~150 bytes, ~0.002 SOL rent (reclaimable)      │
│  Fields: sequence_counter, merkle_root,         │
│          tip_hash, current_epoch, is_closed      │
├─────────────────────────────────────────────────┤
│  EpochPage PDA  ["sap_epoch", session, index]   │
│  ~100 bytes, ~0.001 SOL per epoch               │
│  Groups 1000 inscriptions for O(1) navigation   │
└─────────────────────────────────────────────────┘
         │ inscribe_memory emits:
         ▼
  MemoryInscribedEvent in TX log (PERMANENT, ZERO RENT)
  Contains: encrypted_data, nonce, content_hash,
            sequence, epoch_index, compression,
            total_fragments, fragment_index, nonce_version
```

**Key concepts:**
- **Epoch system**: every 1000 inscriptions auto-create a new EpochPage PDA.
  `getSignaturesForAddress(epochPagePDA)` returns only that epoch's TXs → O(1) random access.
- **Merkle accumulator**: `new_root = sha256(prev_root || content_hash)` — proves data integrity.
- **tip_hash**: tracks the most recent content_hash for O(1) change detection.
- **nonce_version**: included in every event — clients know which vault_nonce decrypts each inscription.

### 15b. SessionManager — High-Level API (Recommended)

The `SessionManager` wraps vault + ledger + PDA derivation into a single
idempotent interface. Use this unless you need low-level control.

```ts
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SessionContext, WriteResult, SealResult, RingBufferEntry, SessionStatus }
  from "@oobe-protocol-labs/synapse-sap-sdk";

const client = SapClient.from(provider);

// ── Start a session (creates vault + session + ledger idempotently) ──
const ctx: SessionContext = await client.session.start("conversation-abc-123");

// ── Write data to the ring buffer (max 750 bytes per write) ──
const result: WriteResult = await client.session.write(ctx, "user said hello");
console.log("Entry index:", result.entryIndex);
console.log("Merkle root:", result.merkleRoot);

// ── Read the current ring buffer (hot memory — free, instant) ──
const entries: RingBufferEntry[] = await client.session.readLatest(ctx);
entries.forEach(e => console.log(e.data.toString()));

// ── Seal the ring into a permanent, immutable LedgerPage ──
// Cost: ~0.031 SOL per page (WRITE-ONCE, NEVER-DELETE)
// Even the authority cannot delete a sealed page.
const seal: SealResult = await client.session.seal(ctx);
console.log("Sealed page:", seal.pageIndex, "entries:", seal.entriesInPage);

// ── Read sealed pages ──
const page0: RingBufferEntry[] = await client.session.readPage(ctx, 0);

// ── Read ALL data (pages + current ring, chronological) ──
const all: RingBufferEntry[] = await client.session.readAll(ctx);

// ── Check session status ──
const status: SessionStatus = await client.session.getStatus(ctx);
console.log("Entries:", status.numEntries, "Pages:", status.numPages);

// ── Teardown (close ledger → close session, reclaim ~0.032 SOL) ──
await client.session.close(ctx);
```

### 15c. VaultModule — Low-Level Vault Operations

Use the VaultModule directly when you need full control over encryption,
epochs, fragments, and delegated writes.

#### Initialize vault and open session

```ts
import { deriveAgent, deriveVault, deriveSession, deriveEpochPage }
  from "@oobe-protocol-labs/synapse-sap-sdk";
import { sha256, hashToArray } from "@oobe-protocol-labs/synapse-sap-sdk";
import { CompressionType } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { InscribeMemoryArgs } from "@oobe-protocol-labs/synapse-sap-sdk";

const [agentPda] = deriveAgent(client.walletPubkey);

// 1. Init vault (one-time, ~0.002 SOL rent)
const vaultNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)));
await client.vault.initVault(vaultNonce);

// 2. Open a session (one per conversation/context)
const sessionHash = hashToArray(sha256("my-session-id"));
await client.vault.openSession(sessionHash);
```

#### Inscribe encrypted memory (full 8-arg path with epochs)

```ts
// Encrypt client-side with AES-256-GCM
const key = await deriveEncryptionKey(vaultNonce, agentKeypair);
const nonce12 = crypto.getRandomValues(new Uint8Array(12));
const plaintext = JSON.stringify({ role: "user", content: "Hello" });
const encrypted = await encrypt(key, nonce12, plaintext);

const [vaultPda] = deriveVault(agentPda);
const sessionHashBytes = new Uint8Array(hashToArray(sha256("my-session-id")));
const [sessionPda] = deriveSession(vaultPda, sessionHashBytes);

// Calculate epoch: epoch_index = sequence / 1000
const sequence = 0;
const epochIndex = Math.floor(sequence / 1000);
const [epochPda] = deriveEpochPage(sessionPda, epochIndex);

const args: InscribeMemoryArgs = {
  sequence,
  encryptedData: Buffer.from(encrypted),
  nonce: Array.from(nonce12),
  contentHash: hashToArray(sha256(plaintext)),
  totalFragments: 1,
  fragmentIndex: 0,
  compression: CompressionType.None,
  epochIndex,
};

await client.vault.inscribeWithAccounts(sessionPda, epochPda, vaultPda, args);
// Cost: ~0.000005 SOL (TX fee only — ZERO rent for data)
// Data lives permanently in MemoryInscribedEvent in the TX log
```

#### Compact inscribe (simplified 4-arg path — no epochs)

```ts
// For sessions with <1000 inscriptions, skip epoch pages entirely
await client.vault.compactInscribe(sessionPda, vaultPda, {
  sequence: 0,
  encryptedData: Buffer.from(encrypted),
  nonce: Array.from(nonce12),
  contentHash: hashToArray(sha256(plaintext)),
});
// 4 fewer args → smaller TX → lower priority fees
// No epoch_page account → saves ~0.001 SOL per epoch
// Same MemoryInscribedEvent format (backward compatible)
```

#### Multi-fragment for large payloads (>750 bytes)

```ts
// On-chain max is 750 bytes per inscription.
// Split large data into fragments sharing the same content_hash.
const MAX_FRAGMENT = 750;
const bigData = Buffer.from(JSON.stringify(largeConversation));
const totalFragments = Math.ceil(bigData.length / MAX_FRAGMENT);
const contentHash = hashToArray(sha256(bigData));

for (let i = 0; i < totalFragments; i++) {
  const chunk = bigData.subarray(i * MAX_FRAGMENT, (i + 1) * MAX_FRAGMENT);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await encrypt(key, nonce, chunk);
  const seq = currentSequence + i;
  const epochIdx = Math.floor(seq / 1000);
  const [epochPda] = deriveEpochPage(sessionPda, epochIdx);

  await client.vault.inscribeWithAccounts(sessionPda, epochPda, vaultPda, {
    sequence: seq,
    encryptedData: Buffer.from(encrypted),
    nonce: Array.from(nonce),
    contentHash,
    totalFragments,
    fragmentIndex: i,
    compression: CompressionType.None,
    epochIndex: epochIdx,
  });
}
```

#### Nonce rotation (key rotation for forward secrecy)

```ts
// Rotate encryption nonce periodically. Old nonce is emitted in
// VaultNonceRotatedEvent so historical inscriptions remain decryptable.
// nonce_version increments and is included in every subsequent event.
const newNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)));
await client.vault.rotateNonce(newNonce);

// Future inscriptions will include the incremented nonce_version
// Clients reading old inscriptions use the nonce_version from
// MemoryInscribedEvent to find the correct decryption nonce
```

#### Close lifecycle (reclaim all rent)

```ts
// Close order matters:
// 1. Close epoch pages (each ~0.001 SOL)
// 2. Close session (marks is_closed = true)
// 3. Close session PDA (reclaims rent)
// 4. Close vault (reclaims ~0.002 SOL)

// Step 1: close all epoch pages
const session = await client.vault.fetchSessionByPda(sessionPda);
for (let i = 0; i <= session.currentEpoch; i++) {
  await client.vault.closeEpochPage(sessionPda, i);
}

// Step 2: mark session closed (no more writes allowed)
await client.vault.closeSession(vaultPda, sessionPda);

// Step 3: actually close the SessionLedger PDA
await client.vault.closeSessionPda(vaultPda, sessionPda);

// Step 4: close the vault itself
await client.vault.closeVault();
// All inscribed data remains permanently in TX logs
```

### 15d. LedgerModule — Ring Buffer Memory

The ledger provides a 4 KB ring buffer for **hot memory** that's instantly
readable via `getAccountInfo()` on any free RPC. Evicted entries remain
permanently in TX logs.

```
┌────────────────────────────────────────────────────┐
│  MemoryLedger PDA  ["sap_ledger", session_pda]     │
│  Fixed ~4 KB, ~0.032 SOL rent (reclaimable)        │
│                                                    │
│  Ring buffer wire format:                          │
│    [data_len: u16 LE][data: u8 × data_len]         │
│    [data_len: u16 LE][data: u8 × data_len]         │
│    ... (oldest evicted when full)                  │
│                                                    │
│  Also tracks: merkle_root, latest_hash,            │
│               num_entries, total_data_size,         │
│               num_pages                            │
├────────────────────────────────────────────────────┤
│  LedgerPage PDA  ["sap_page", ledger, page_index]  │
│  WRITE-ONCE, NEVER-DELETE  (~0.031 SOL each)       │
│  Even the authority cannot delete sealed pages.    │
│  Protocol-level guarantee of immutability.         │
└────────────────────────────────────────────────────┘
```

#### Full ledger lifecycle

```ts
import { deriveLedger, deriveLedgerPage } from "@oobe-protocol-labs/synapse-sap-sdk";

// 1. Init ledger (~0.032 SOL, reclaimable)
await client.ledger.init(sessionPda);

// 2. Write data (max 750 bytes per write, ~0.000005 SOL TX fee)
// Each write does THREE things:
//   a) Emits LedgerEntryEvent to TX log (permanent, zero rent)
//   b) Updates rolling merkle root in PDA
//   c) Writes data into ring buffer (evicts oldest if full)
const contentHash = hashToArray(sha256("user said hello"));
await client.ledger.write(sessionPda, Buffer.from("user said hello"), contentHash);

// 3. Read the ring buffer (hot path — instant, free)
const ledger = await client.ledger.fetchLedger(sessionPda);
const entries: Uint8Array[] = client.ledger.decodeRingBuffer(ledger.ring);
entries.forEach(e => console.log(e.toString()));

// 4. Seal ring into permanent page (~0.031 SOL, IRREVOCABLE)
await client.ledger.seal(sessionPda);

// 5. Read sealed pages
const [ledgerPda] = deriveLedger(sessionPda);
const page = await client.ledger.fetchPage(ledgerPda, 0);
const pageEntries = client.ledger.decodeRingBuffer(page.data);

// 6. Close ledger (reclaim ~0.032 SOL)
// Sealed pages remain permanently. TX log entries remain permanently.
await client.ledger.close(sessionPda);
```

#### Cost model

| Operation | Cost | Notes |
|-----------|------|-------|
| `init_ledger` | ~0.032 SOL | Fixed, reclaimable via `close_ledger` |
| `write_ledger` | ~0.000005 SOL | TX fee only, ZERO additional rent |
| `seal_ledger` | ~0.031 SOL | Write-once, never-delete — the price of permanence |
| 1K writes | ~0.037 SOL | 0.032 init + ~0.005 fees |
| 10K writes | ~0.082 SOL | 0.032 init + ~0.050 fees |
| `close_ledger` | Reclaim ~0.032 SOL | Pages and TX logs remain permanently |

---

## 15a. Agent Lifecycle — Deactivate, Reactivate, Close

### Deactivate (Maintenance Mode)

Deactivating sets `is_active = false`. The agent remains on-chain but is
excluded from active discovery indexes. Existing escrows are unaffected.

```ts
// Put your agent into maintenance mode
await client.agent.deactivate();

// The agent PDA still exists — consumers can fetch it and see isActive = false
// Existing escrows continue to work (consumers can still settle)
```

### Reactivate

```ts
// Bring your agent back online
await client.agent.reactivate();
// isActive = true again, discovery indexes include the agent
```

### Close (Permanent Shutdown)

> **⚠ DESTRUCTIVE**: Closes the agent PDA and AgentStats PDA. Rent is returned.
> All tools, escrows, subscriptions, and memory must be closed FIRST.

```ts
// Close the agent (reclaim rent — both agent + agentStats PDAs)
await client.agent.close();
```

### Update Agent Metadata

```ts
// All fields are optional — only non-null values are written
await client.agent.update({
  name: "MySwapAgent v2",
  description: "Updated description",
  capabilities: null,   // keep existing
  pricing: null,        // keep existing
  protocols: null,
  agentId: null,
  agentUri: "https://myagent.dev/v2/meta.json",
  x402Endpoint: "https://myagent.dev/v2/x402",
});
```

### Self-Report Metrics

> **⚠️ Removed in v0.7.0**: `reportCalls` and `updateReputation` instructions
> have been removed from the program. Self-reported metrics were an abuse vector.
> Call counts are now tracked via **receipt batches** (merkle-committed on-chain).

### Receipt Batches (v0.8.0)

```ts
// Inscribe a batch of call receipts (agent commits merkle root)
await client.receipt.inscribeReceiptBatch(
  depositorWallet,
  nonce,
  0,           // batchIndex
  merkleRoot,  // 32-byte root of receipt merkle tree
  new BN(50),  // callCount
  new BN(periodStart),
  new BN(periodEnd),
);
```

### Fetch Agent Data

```ts
// Your own agent
const agent = await client.agent.fetch();
console.log("Name:", agent.name);
console.log("Active:", agent.isActive);
console.log("Reputation:", agent.reputationScore, "/ 10000");

// Agent stats
const stats = await client.agent.fetchStats();
console.log("Total calls:", stats.totalCallsServed.toString());

// Global registry
const registry = await client.agent.fetchGlobalRegistry();
console.log("Total agents:", registry.totalAgents.toString());
```

---

## 16. Delegate Hot-Wallet Access

Delegates let you authorize a **hot wallet** (e.g., a server signer) to
perform vault operations without exposing your agent owner keypair.
This is critical for automated services that inscribe memory on every request.

### Permission Bitmask

| Bit | Value | Permission | Use Case |
|-----|-------|-----------|----------|
| 0 | `1` | `INSCRIBE` | Write encrypted memory to vault |
| 1 | `2` | `CLOSE_SESSION` | Close sessions when done |
| 2 | `4` | `OPEN_SESSION` | Create new sessions |
| ALL | `7` | All permissions | Full hot wallet access |

```ts
import { DelegatePermission } from "@oobe-protocol-labs/synapse-sap-sdk";

// DelegatePermission.Inscribe     = 1
// DelegatePermission.CloseSession = 2
// DelegatePermission.OpenSession  = 4
// DelegatePermission.All          = 7
```

### PDA Derivation

```
Seeds: ["sap_delegate", vault_pda, delegate_pubkey]
One VaultDelegate PDA per (vault, delegate) pair.
```

### Add a delegate with specific permissions and expiry

```ts
// Authorize a hot wallet for inscribe + open session (but not close)
// Delegate PDA rent is paid by the vault owner (~0.001 SOL, reclaimable)
await client.vault.addDelegate(
  hotWalletPubkey,
  DelegatePermission.Inscribe | DelegatePermission.OpenSession,  // bitmask = 5
  Math.floor(Date.now() / 1000) + 86400, // expires in 24 hours
);

// expires_at = 0 means NEVER expires (use with caution)
await client.vault.addDelegate(
  trustedServerPubkey,
  DelegatePermission.All,  // bitmask = 7
  0,  // never expires
);
```

### Inscribe memory via delegate (auth chain)

The delegate signs the transaction instead of the vault owner.
Auth chain: `delegate signer → VaultDelegate PDA → MemoryVault → SessionLedger`

```ts
// On the hot wallet server:
const delegateKeypair = loadKeypair("./hot-wallet.json");

// The delegate calls inscribeDelegated — the program verifies:
//   1. VaultDelegate PDA exists for this (vault, signer) pair
//   2. permissions bitmask has INSCRIBE bit set
//   3. expires_at is 0 OR in the future
await client.vault.inscribeDelegated(
  delegateKeypair.publicKey,
  vaultPda,
  sessionPda,
  epochPda,
  {
    sequence: currentSequence,
    encryptedData: Buffer.from(encrypted),
    nonce: Array.from(nonce12),
    contentHash: hashToArray(sha256(plaintext)),
    totalFragments: 1,
    fragmentIndex: 0,
    compression: CompressionType.None,
    epochIndex: Math.floor(currentSequence / 1000),
  },
);
```

### Revoke delegate (reclaim rent)

```ts
// Immediately revokes access — PDA is closed, rent returned to owner
await client.vault.revokeDelegate(hotWalletPubkey);
```

### Fetch delegate info

```ts
const del = await client.vault.fetchDelegate(vaultPda, hotWalletPubkey);
console.log("Permissions:", del.permissions);  // bitmask
console.log("Expires:", del.expiresAt === 0 ? "never" : new Date(del.expiresAt * 1000));
console.log("Created:", new Date(del.createdAt * 1000));
```

### Hot wallet pattern for production

```ts
// In your agent's startup:
const DELEGATE_TTL = 7 * 86400; // 7 days

// 1. Check if delegate exists
const existing = await client.vault.fetchDelegate(vaultPda, serverKeypair.publicKey)
  .catch(() => null);

if (!existing || (existing.expiresAt > 0 && existing.expiresAt < Date.now() / 1000)) {
  // 2. Revoke expired delegate (if exists)
  if (existing) await client.vault.revokeDelegate(serverKeypair.publicKey);

  // 3. Create fresh delegate with new expiry
  await client.vault.addDelegate(
    serverKeypair.publicKey,
    DelegatePermission.Inscribe | DelegatePermission.OpenSession,
    Math.floor(Date.now() / 1000) + DELEGATE_TTL,
  );
}

// 4. Use server keypair for all inscriptions (fast, no cold wallet needed)
```

---

## 17. Attestations (Web of Trust)

Attestations are **institutional trust signals** from third parties.
Unlike feedback (score-based user reviews), attestations represent
**identity-level trust**: "Jupiter verified this API", "OtterSec audited
this code", "Solana Foundation: official partner".

Trust comes from **WHO** is attesting (their wallet identity), not from
the attestation itself. Anyone can create attestations — the value is in
the attester's reputation.

### PDA Derivation and Constraints

```
Seeds: ["sap_attest", agent_pda, attester_wallet]
One attestation per (agent, attester) pair.
Self-attestation blocked: attester.key() != agent.wallet
Lifecycle: create → (optional) revoke → close
Must revoke before closing (rent reclaim requires is_active = false)
```

### Create an attestation

```ts
import { sha256, hashToArray } from "@oobe-protocol-labs/synapse-sap-sdk";
import { BN } from "@coral-xyz/anchor";

// As a project/auditor, vouch for an agent
const tx = await client.attestation.create(targetAgentWallet, {
  // attestation_type: max 32 chars — describes the type of trust signal
  attestationType: "audit",

  // metadata_hash: SHA-256 of off-chain evidence (audit report, KYC doc, etc.)
  metadataHash: hashToArray(sha256(JSON.stringify({
    auditor: "OtterSec",
    report: "https://example.com/audit-report.pdf",
    score: "pass",
    date: "2025-01-15",
  }))),

  // expires_at: 0 = never expires, > 0 = unix timestamp (must be in the future)
  expiresAt: new BN(Math.floor(Date.now() / 1000) + 365 * 86400), // 1 year
});
```

### Common attestation types

| Type | Meaning | Who Attests |
|------|---------|-------------|
| `"audit"` | Code has been audited | Security firms (OtterSec, Neodyme, etc.) |
| `"kyc"` | Agent operator identity verified | KYC providers, foundations |
| `"api-verified"` | API integration tested and working | Protocol teams (Jupiter, Raydium, etc.) |
| `"official-partner"` | Official partnership | Ecosystem partners |
| `"data-certified"` | Data feed quality certified | Data providers (Chainlink, Pyth, etc.) |
| `"community"` | Community endorsement | DAOs, governance bodies |

### Revoke an attestation

Only the original attester can revoke. Revocation sets `is_active = false`
on-chain and emits `AttestationRevokedEvent`.

```ts
// Revoke your attestation for an agent
await client.attestation.revoke(targetAgentWallet);
// Emits: AttestationRevokedEvent { agent, attester, attestation_type, timestamp }
```

### Close attestation PDA (reclaim rent)

Must be revoked first — the on-chain constraint enforces this:
`constraint = !attestation.is_active @ SapError::AttestationNotRevoked`

```ts
// Close the PDA and reclaim rent (sent back to attester)
await client.attestation.close(targetAgentWallet);
// GlobalRegistry.total_attestations decremented
```

### Fetch and verify attestations

```ts
import { deriveAgent } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { AgentAttestationData } from "@oobe-protocol-labs/synapse-sap-sdk";

const [targetAgentPda] = deriveAgent(targetAgentWallet);

// Fetch a specific attestation
const att: AgentAttestationData | null = await client.attestation.fetchNullable(
  targetAgentPda,
  attesterWallet,
);

if (att) {
  console.log("Type:", att.attestationType);       // e.g. "audit"
  console.log("Active:", att.isActive);             // true until revoked
  console.log("Attester:", att.attester.toBase58());
  console.log("Metadata hash:", Buffer.from(att.metadataHash).toString("hex"));
  console.log("Created:", new Date(att.createdAt * 1000));

  // Check expiry
  if (att.expiresAt > 0 && att.expiresAt < Date.now() / 1000) {
    console.log("⚠️ EXPIRED — this attestation is no longer valid");
  } else if (att.expiresAt === 0) {
    console.log("Never expires");
  } else {
    console.log("Expires:", new Date(att.expiresAt * 1000));
  }
}
```

### Scan all attestations for an agent

```ts
// Find all attestation PDAs for a given agent using memcmp filter
const [agentPda] = deriveAgent(agentWallet);
const allAttestations = await client.program.account.agentAttestation.all([
  { memcmp: { offset: 9, bytes: agentPda.toBase58() } },  // agent field
]);

const active = allAttestations.filter(a => a.account.isActive);
const expired = active.filter(a =>
  a.account.expiresAt > 0 && a.account.expiresAt < Date.now() / 1000
);

console.log(`${active.length} active attestations (${expired.length} expired)`);
for (const { account: a } of active) {
  console.log(`  ${a.attestationType} by ${a.attester.toBase58()}`);
}
```

---

## 18. Reputation, Feedback & Metrics

The SAP protocol distinguishes between **two independent reputation signals**:

| Signal | Source | Updated By | Field on AgentAccount |
|--------|--------|-----------|----------------------|
| **Reputation score** | Other users' on-chain feedback | `give_feedback` / `update_feedback` / `revoke_feedback` instructions | `reputation_score` (0-10000) |
| **Self-reported metrics** | ~~The agent itself~~ **Removed in v0.7** | ~~`report_calls` / `update_reputation`~~ → replaced by receipt batches | `total_calls_served`, `avg_latency_ms`, `uptime_percent` |

> **Critical distinction**: `reputation_score` is **trustless** — it can only
> change via on-chain feedback from other wallets. Self-reported metrics
> (`avg_latency_ms`, `uptime_percent`) are **informational** — the agent
> owner sets them. Consumers should weight these differently.

### 18a. Reputation Score Formula

```
reputation_score = (reputation_sum × 10) / total_feedbacks
```

- Each feedback `score` is 0-1000 (where 1000 = perfect)
- `reputation_sum` accumulates all active feedback scores
- `reputation_score` range is 0-10000 (2 decimal precision: 8547 = 85.47%)
- When feedback is revoked, its score is subtracted from `reputation_sum`
  and `total_feedbacks` is decremented

**Examples:**
- 1 feedback at 850 → `(850 × 10) / 1 = 8500` (85.00%)
- 3 feedbacks at 900, 800, 950 → `(2650 × 10) / 3 = 8833` (88.33%)
- After revoking the 800 → `(1850 × 10) / 2 = 9250` (92.50%)

### 18b. Feedback Lifecycle (give → update → revoke → close)

Feedback is **one PDA per (agent, reviewer) pair**. A reviewer can only
have one active feedback per agent. Self-review is blocked on-chain
(`SelfReviewNotAllowed`).

```
Seeds: ["sap_feedback", agent_pda, reviewer_wallet]
Constraint: reviewer.key() != agent.wallet (no self-review)
Constraint: agent.is_active (can't review inactive agents)
Lifecycle: give → (optional) update → (optional) revoke → close
```

#### Give feedback

```ts
// Score: 0-1000 (0 = terrible, 1000 = perfect)
// Tag: short label (max 32 chars) — e.g. "fast", "reliable", "inaccurate"
// comment_hash: optional SHA-256 of an off-chain detailed review
await client.feedback.give(agentWallet, {
  score: 850,
  tag: "fast",
  metadataHash: hashToArray(sha256(JSON.stringify({
    comment: "Excellent response time, accurate swap execution",
    latency: 45,
    successRate: 0.99,
  }))),
});
// Emits: FeedbackEvent { agent, reviewer, score, tag, timestamp }
// Agent's reputation_score is immediately recalculated on-chain
```

#### Update feedback (same reviewer)

```ts
// Change your score/tag for the same agent
await client.feedback.update(agentWallet, {
  score: 900,       // new score
  tag: "reliable",  // new tag (optional — omit to keep existing)
});
// Emits: FeedbackUpdatedEvent { agent, reviewer, old_score, new_score, timestamp }
// reputation_sum: old_score subtracted, new_score added
// reputation_score recalculated immediately
```

#### Revoke feedback

```ts
// Remove your feedback entirely — score removed from reputation calculation
await client.feedback.revoke(agentWallet);
// Emits: FeedbackRevokedEvent { agent, reviewer, timestamp }
// reputation_sum -= score, total_feedbacks -= 1
// If no feedbacks remain, reputation_score = 0
```

#### Close feedback PDA (reclaim rent)

```ts
// Must revoke first — on-chain constraint:
// constraint = feedback.is_revoked @ SapError::FeedbackNotRevoked
await client.feedback.close(agentWallet);
// GlobalRegistry.total_feedbacks decremented
// Rent returned to the reviewer
```

### 18c. Self-Reported Metrics

These metrics are set by the agent owner and appear on the AgentAccount.
They are **NOT trustless** — consumers should treat them as claims.

```ts
// Report total calls served (updates AgentStats PDA)
await client.agent.reportCalls(1500);

// Update latency and uptime
await client.agent.updateReputation(
  45,   // avgLatencyMs — average response time
  99,   // uptimePercent — 0-100
);
```

### 18d. Read Your Full Reputation Profile

```ts
const agent: AgentAccountData = await client.agent.fetch();

// Trustless reputation (from on-chain feedback)
console.log("Reputation score:", agent.reputationScore);       // 0-10000
console.log("Total feedbacks:", agent.totalFeedbacks);
console.log("Reputation sum:", agent.reputationSum);

// Self-reported metrics (set by agent owner)
console.log("Avg latency:", agent.avgLatencyMs, "ms");
console.log("Uptime:", agent.uptimePercent, "%");

// Usage stats
console.log("Total calls:", agent.totalCallsServed.toString());
```

### 18e. Read Feedbacks You've Received

```ts
const [agentPda] = deriveAgent(client.walletPubkey);

// Fetch a specific reviewer's feedback
const feedback: FeedbackAccountData | null = await client.feedback.fetchNullable(
  agentPda,
  reviewerWallet,
);
if (feedback) {
  console.log("Score:", feedback.score, "Tag:", feedback.tag);
  console.log("Revoked:", feedback.isRevoked);
  console.log("Updated:", new Date(feedback.updatedAt * 1000));
}

// Scan all feedbacks for your agent
const allFeedbacks = await client.program.account.feedbackAccount.all([
  { memcmp: { offset: 9, bytes: agentPda.toBase58() } },
]);
const activeFeedbacks = allFeedbacks.filter(f => !f.account.isRevoked);
console.log(`${activeFeedbacks.length} active feedbacks`);
for (const { account: f } of activeFeedbacks) {
  console.log(`  ${f.reviewer.toBase58()}: ${f.score}/1000 [${f.tag}]`);
}
```

### 18f. Agent Profile (Full Composite View)

```ts
const profile: AgentProfile | null = await client.discovery.getAgentProfile(agentWallet);
if (profile) {
  console.log(profile.name, "—", profile.reputationScore, "/ 10000");
  console.log("Capabilities:", profile.capabilities);
  console.log("Pricing:", profile.pricing);
  console.log("Active:", profile.isActive);
}
```

---

## 19. Events to Listen For

As a merchant, these events are relevant to your operations:

| Event Name | When | Key Fields |
|-----------|------|------------|
| `AgentRegistered` | Your agent is created | `agent`, `wallet`, `name`, `capabilities` |
| `AgentUpdated` | Your profile changes | `agent`, `wallet`, `updatedFields` |
| `AgentDeactivated` | You deactivate | `agent`, `wallet` |
| `AgentReactivated` | You reactivate | `agent`, `wallet` |
| `ToolPublished` | You publish a tool | `agent`, `toolName`, `category` |
| `ToolSchemaInscribed` | Schema stored on-chain | `agent`, `toolName`, `schemaType` |
| `EscrowCreated` | Client creates escrow for you | `agent`, `depositor`, `amount` |
| `EscrowDeposited` | Client adds funds | `escrow`, `amount` |
| `PaymentSettled` | You settle calls | `escrow`, `callsSettled`, `amount`, `serviceHash` |
| `BatchSettled` | You batch settle | `escrow`, `totalCalls`, `totalAmount` |
| `EscrowWithdrawn` | Client withdraws funds | `escrow`, `amount` |
| `EscrowClosed` | Escrow is closed | `escrow` |
| `FeedbackGiven` | Someone rates you | `agent`, `reviewer`, `score`, `tag` |
| `FeedbackUpdated` | Rating updated | `agent`, `reviewer`, `newScore` |
| `AttestationCreated` | Someone attests to you | `agent`, `attester`, `attestationType` |
| `MemoryInscribed` | Memory written | `vault`, `session`, `sequence`, `contentHash` |
| `LedgerWritten` | Ledger entry | `session`, `entryIndex`, `contentHash` |
| `LedgerSealed` | Page sealed | `session`, `pageIndex`, `merkleRoot` |

### Parsing Events from Transactions

```ts
const events = client.events.parseLogs(txLogs);
for (const event of events) {
  console.log(event.name, event.data);
}

// Filter specific event
const settlements = client.events.filterByName(events, "PaymentSettled");
```

### Real-time Event Streaming via Yellowstone gRPC (v0.6.3)

For production indexers and explorers, use the `GeyserEventStream` instead of
WebSocket `onLogs()`. It provides sub-second latency, automatic reconnection,
and zero missed events.

**Install the optional dependency:**

```bash
npm i @triton-one/yellowstone-grpc
```

**Option A — Standalone (without PostgreSQL):**

```ts
import { GeyserEventStream, EventParser } from "@oobe-protocol-labs/synapse-sap-sdk";

const stream = new GeyserEventStream({
  endpoint: "https://us-1-mainnet.oobeprotocol.ai",
  token:    process.env.OOBE_API_KEY!,   // sent as x-token automatically
});

const parser = new EventParser(program);

stream.on("logs", (logs, signature, slot) => {
  const events = parser.parseLogs(logs);
  for (const e of events) {
    if (e.name === "PaymentSettledEvent") {
      console.log(`Settled ${e.data.callsSettled} calls, amount: ${e.data.amount}`);
    }
  }
});

stream.on("error", (err) => console.error("gRPC error:", err));
stream.on("reconnecting", (n) => console.log(`Reconnecting attempt ${n}...`));

await stream.connect();
```

**Option B — With PostgreSQL sync engine:**

```ts
// Drop-in replacement for sync.startEventStream()
await sync.startGeyserStream({
  endpoint: "https://us-1-mainnet.oobeprotocol.ai",
  token:    process.env.OOBE_API_KEY!,
});
```

**Using the raw Yellowstone client directly (advanced):**

```ts
import Client from "@triton-one/yellowstone-grpc";

const client = new Client(
  "https://us-1-mainnet.oobeprotocol.ai",
  process.env.OOBE_API_KEY!   // sent as x-token automatically
);

const stream = await client.subscribe();

stream.on("data", (data) => {
  console.log("Received:", data);
});

// Subscribe to all SAP program transactions
await stream.write({
  accounts: {},
  slots: {},
  transactions: {
    sapFilter: {
      accountInclude: ["SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ"],
      accountExclude: [],
      accountRequired: [],
    },
  },
  blocks: {},
  blocksMeta: {},
  entry: {},
  accountsDataSlice: [],
  commitment: 1, // CONFIRMED
});
```

**WSS vs gRPC comparison:**

| Feature | WebSocket (`onLogs`) | Yellowstone gRPC |
|---------|---------------------|------------------|
| Latency | ~1-2s | ~200-500ms |
| Missed events | Possible under load | Zero (backpressure) |
| Reconnect | Manual | Built-in auto |
| Filtering | Program ID only | Account include/exclude |
| Backfill | Not supported | Replay from slot |
| Dependency | None (web3.js built-in) | `@triton-one/yellowstone-grpc` |

---

## 20. Plugin Adapter (52 Tools)

If your agent uses the `SynapseAgentKit` framework:

```ts
import { createSAPPlugin } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SAPPluginConfig } from "@oobe-protocol-labs/synapse-sap-sdk";

const plugin = createSAPPlugin({
  rpcUrl: "https://api.mainnet-beta.solana.com",
  keypair: agentKeypair,
  agentName: "MyAgent",
});

// Plugin exposes 52 tools via the SynapseAgentKit protocol:
// register_agent, update_agent, publish_tool, settle_calls, inscribe_memory, ...
```

---

## 21. PostgreSQL Mirror

For off-chain analytics, indexing, and dashboards:

```ts
import { SapPostgres, SapSyncEngine } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { PgClient, SyncOptions } from "@oobe-protocol-labs/synapse-sap-sdk";

const pg = new SapPostgres(pgClient);
await pg.createTables(); // creates all 22 tables

const sync = new SapSyncEngine(client, pg);
await sync.syncAll(); // sync all on-chain state

// Or sync specific types:
await sync.sync("agentAccount");
await sync.sync("escrowAccount");
await sync.sync("toolDescriptor");
```

---

## 22. Dual-Role: Merchant + Client

A single agent wallet can act as both a **seller** and a **buyer**.
The same `SapClient` instance supports both flows:

```ts
const client = SapClient.from(provider);

// === MERCHANT: Register + sell ===
await client.builder.agent("DualAgent").addCapability("my:service").register();
const receipt = await client.x402.settle(clientWallet, 5, "data");

// === CLIENT: Consume another agent ===
const ctx = await client.x402.preparePayment(otherAgentWallet, {
  pricePerCall: 1000,
  deposit: 100_000,
  networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS,
});
const headers = client.x402.buildPaymentHeaders(ctx);
// Use `headers` in HTTP requests to the other agent's x402 endpoint
```

The PDA system ensures no collision: your EscrowAccount as a depositor
(`deriveEscrow(otherAgent, yourWallet)`) is separate from escrows where
you are the agent (`deriveEscrow(yourAgent, clientWallet)`).

---

## 23. Complete Type Reference

### Enums (Runtime Values)

| Import | Variants |
|--------|----------|
| `TokenType` | `Sol`, `Usdc`, `Spl` |
| `SettlementMode` | `Instant`, `Escrow`, `Batched`, `X402` |
| `ToolHttpMethod` | `Get`, `Post`, `Put`, `Delete`, `Compound` |
| `ToolCategory` | `Swap`, `Lend`, `Stake`, `Nft`, `Payment`, `Data`, `Governance`, `Bridge`, `Analytics`, `Custom` |
| `PluginType` | `Memory`, `Validation`, `Delegation`, `Analytics`, `Governance`, `Custom` |
| `DelegatePermission` | `Inscribe=1`, `CloseSession=2`, `OpenSession=4`, `All=7` |
| `SchemaType` | `Input=0`, `Output=1`, `Description=2` |
| `CompressionType` | `None=0`, `Deflate=1`, `Gzip=2`, `Brotli=3` |
| `SapNetwork` | `SOLANA_MAINNET`, `SOLANA_MAINNET_GENESIS`, `SOLANA_DEVNET`, `SOLANA_DEVNET_NAMED` |
| `SettlementSecurity` | `Open`, `CoSigned`, `Arbitrated` | v0.7.0 |
| `DisputeOutcome` | `CallerWins`, `AgentWins`, `Split` | v0.7.0 |
| `BillingInterval` | `Weekly`, `Monthly`, `Quarterly`, `Yearly` | v0.7.0 |

### Type-Level Unions (for Function Signatures)

| Type | Use for |
|------|---------|
| `TokenTypeKind` | Any param accepting a `TokenType` variant |
| `SettlementModeKind` | Any param accepting a `SettlementMode` variant |
| `ToolHttpMethodKind` | Any param accepting a `ToolHttpMethod` variant |
| `ToolCategoryKind` | Any param accepting a `ToolCategory` variant |
| `PluginTypeKind` | Any param accepting a `PluginType` variant |
| `DelegatePermissionBit` | Bitmask permission values |
| `SchemaTypeValue` | Numeric schema type discriminant |
| `CompressionTypeValue` | Numeric compression discriminant |
| `SapNetworkId` | Any known `SapNetwork` value or custom string |

### Account Data Types (On-Chain PDAs)

| Type | PDA Derivation |
|------|----------------|
| `AgentAccountData` | `deriveAgent(wallet)` |
| `AgentStatsData` | `deriveAgentStats(agentPda)` |
| `EscrowAccountData` | `deriveEscrow(agentPda, depositor)` | **⚠️ DEPRECATED** V1 escrow |
| `EscrowAccountV2Data` | `deriveEscrowV2(agentPda, depositor, nonce)` | V2 escrow (v0.7.0) |
| `PendingSettlementData` | `derivePendingSettlement(escrowV2, nonce)` | Pending settlement (v0.7.0) |
| `DisputeRecordData` | `deriveDispute(pendingPda)` | Dispute record (v0.7.0) |
| `AgentStakeData` | `deriveStake(agentPda)` | Agent stake (v0.7.0) |
| `SubscriptionData` | `deriveSubscription(agentPda, subscriber, subId)` | Subscription (v0.7.0) |
| `CounterShardData` | `deriveShard(basePda, shardId)` | Counter shard (v0.7.0) |
| `IndexPageData` | `deriveIndexPage(indexPda, page)` | Index page (v0.7.0) |
| `FeedbackAccountData` | `deriveFeedback(agentPda, reviewer)` |
| `ToolDescriptorData` | `deriveTool(agentPda, toolNameHash)` |
| `MemoryVaultData` | `deriveVault(agentPda)` |
| `SessionLedgerData` | `deriveSession(vaultPda, sessionHash)` |
| `EpochPageData` | `deriveEpochPage(sessionPda, epochIndex)` |
| `VaultDelegateData` | `deriveVaultDelegate(vaultPda, delegate)` |
| `SessionCheckpointData` | `deriveCheckpoint(sessionPda, index)` |
| `MemoryLedgerData` | `deriveLedger(sessionPda)` |
| `LedgerPageData` | `deriveLedgerPage(ledgerPda, pageIndex)` |
| `AgentAttestationData` | `deriveAttestation(agentPda, attester)` |
| `CapabilityIndexData` | `deriveCapabilityIndex(capHash)` |
| `ProtocolIndexData` | `deriveProtocolIndex(protoHash)` |
| `ToolCategoryIndexData` | `deriveToolCategoryIndex(category)` |
| `GlobalRegistryData` | `deriveGlobalRegistry()` |

### v0.6.0 Endpoint & Manifest Types

| Type | Description |
|------|-------------|
| `EndpointDescriptor` | Machine-readable endpoint metadata (url, method, auth, CORS, CSRF) |
| `HealthCheckDescriptor` | Health-check config (url, expectedStatus, timeout, method) |
| `ToolManifestEntry` | Tool descriptor (name, schemas, httpMethod, paymentMode, price) |
| `AgentManifest` | Complete manifest (endpoint, health, tools, networks, version) |
| `EndpointValidationResult` | Validation result (reachable, status, latency, warnings) |

### Instruction Arg DTOs

| Type | Instruction |
|------|-------------|
| `RegisterAgentArgs` | `registerAgent` |
| `UpdateAgentArgs` | `updateAgent` |
| `PublishToolArgs` | `publishTool` |
| `UpdateToolArgs` | `updateTool` |
| `InscribeToolSchemaArgs` | `inscribeToolSchema` |
| `InscribeMemoryArgs` | `inscribeMemory` |
| `CompactInscribeArgs` | `compactInscribe` |
| `CreateEscrowArgs` | `createEscrow` | **⚠️ DEPRECATED** V1 |
| `CreateEscrowV2Args` | `createEscrowV2` | v0.7.0 |
| `CreateSubscriptionArgs` | `createSubscription` | v0.7.0 |
| `CreateAttestationArgs` | `createAttestation` |
| `GiveFeedbackArgs` | `giveFeedback` |
| `UpdateFeedbackArgs` | `updateFeedback` |

### Registry Types

| Type | Registry | Description |
|------|----------|-------------|
| `CostEstimate` | X402Registry | Cost breakdown with tier details |
| `PaymentContext` | X402Registry | Escrow creation result |
| `PreparePaymentOptions` | X402Registry | Escrow creation options |
| `X402Headers` | X402Registry | HTTP header object for x402 requests |
| `EscrowBalance` | X402Registry | Balance + status snapshot |
| `SettlementResult` | X402Registry | Single settlement receipt |
| `BatchSettlementResult` | X402Registry | Batch settlement receipt |
| `SessionContext` | SessionManager | Session PDA bundle |
| `WriteResult` | SessionManager | Write operation result |
| `SealResult` | SessionManager | Seal operation result |
| `RingBufferEntry` | SessionManager | Decoded ring buffer entry |
| `SessionStatus` | SessionManager | Full session status |
| `DiscoveredAgent` | DiscoveryRegistry | Agent search result |
| `AgentProfile` | DiscoveryRegistry | Full composite agent view |
| `DiscoveredTool` | DiscoveryRegistry | Tool search result |
| `NetworkOverview` | DiscoveryRegistry | Global network statistics |

### v0.6.0 Utility Types

| Type | Module | Description |
|------|--------|-------------|
| `ValidateEndpointOptions` | endpoint-validator | Timeout, retries, method, headers, CORS |
| `RpcConfig` | rpc-strategy | Primary/fallback RPC URLs, commitment |
| `DualConnection` | rpc-strategy | Primary + fallback Connection pair |
| `AtaResult` | rpc-strategy | ATA creation result |

---

## 24. Lifecycle Checklist

```
 1. Create client             -> SapClient.from(provider) or SapConnection
 2. Set up dual connection     -> createDualConnection() for production      [v0.6.0]
 3. Validate environment       -> createEnvSchema().parse(process.env)       [v0.6.0]
 4. Validate registration args -> createRegisterAgentSchema().parse(...)     [v0.6.0]
 5. Register agent             -> client.builder.agent(...).register()
 6. Build endpoint descriptor  -> define EndpointDescriptor + HealthCheck    [v0.6.0]
 7. Build agent manifest       -> define AgentManifest with tools/networks   [v0.6.0]
 8. Self-validate endpoints    -> validateEndpoint() on your own URLs        [v0.6.0]
 9. Publish tools              -> client.tools.publishByName(...)            [max 32 chars!]
10. Inscribe INPUT schemas     -> client.tools.inscribeSchema(SchemaType.Input)  ⚠ MANDATORY
11. Inscribe OUTPUT schemas    -> client.tools.inscribeSchema(SchemaType.Output) ⚠ MANDATORY
12. Inscribe DESCRIPTION       -> client.tools.inscribeSchema(SchemaType.Description)
13. Verify schema hashes       -> fetch tool, check all 3 hashes ≠ [0;32]
14. Index capabilities         -> client.indexing.initCapabilityIndex(...)
15. Index protocols            -> client.indexing.initProtocolIndex(...)
16. Index tool categories      -> client.indexing.addToToolCategory(...)
17. Init agent stake           -> client.staking.initStake(wallet, amt)      [v0.7.0]
18. Serve requests             -> receive x402 headers, validate network     [v0.6.0]
19. Settle payments (V2)       -> client.escrowV2.settleCalls(...)           [v0.7.0]
20. Close pending settlements  -> client.escrowV2.closePendingSettlement()   [v0.7.0]
21. Classify errors            -> classifyAnchorError() for clear messages   [v0.6.0]
22. Report tool invocations    -> client.tools.reportInvocations()           [free!]
23. Report agent metrics       -> client.agent.reportCalls() / updateReputation()
24. Persist state              -> client.session.start() / .write() / .seal()
25. Receive feedbacks          -> client.feedback.fetchNullable(...)
26. Issue attestations         -> client.attestation.create(...)
```

> **⚠️ Steps 10-13 are new.** Tools published without schema inscription (steps 10-12)
> are invisible to AI agents and discovery systems. Step 13 verifies completion.
> See [§8h — Mandatory Schema Checklist](#8h-mandatory-schema-registration--complete-merchant-checklist)
> for the complete end-to-end code example.

---

## 25. Server-Side Escrow Validation & Merchant Middleware (v0.6.4)

New modular pipeline for robust escrow validation before settlement.
Prevents generic program crashes by catching missing ATAs, expired escrows,
and balance issues with explicit error types.

### 25a. `SapMerchantValidator` — Standard Middleware

Drop-in middleware that reads `X-Payment-*` headers, validates escrow state on-chain,
and auto-generates the correct `AccountMeta[]` for SPL token escrows.

```ts
import {
  SapMerchantValidator,
  MissingEscrowAtaError,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// Create validator (once at app startup)
const validator = new SapMerchantValidator(
  connection,
  (pda) => client.escrow.fetchByPda(pda).catch(() => null),
);

// Express.js middleware
app.post("/api/v1/chat", async (req, res) => {
  try {
    // Full pipeline: parse headers → fetch escrow → validate → build AccountMeta[]
    const validation = await validator.validateRequest(req.headers, {
      callsToSettle: 1,
      throwOnMissingAta: true, // throws MissingEscrowAtaError instead of generic crash
    });

    if (!validation.valid) {
      return res.status(402).json({
        error: "payment_required",
        details: validation.errors,
      });
    }

    // ... process the request ...

    // Settle with pre-built account metas (handles SOL + SPL automatically)
    await client.escrow.settle(
      validation.headers.depositorWallet,
      1,
      serviceHash,
      validation.accountMetas, // already built correctly for SOL or SPL
    );

    res.json({ result: "..." });
  } catch (err) {
    if (err instanceof MissingEscrowAtaError) {
      return res.status(402).json({
        error: "missing_ata",
        side: err.side,       // "depositor" | "escrow"
        ata: err.ataAddress,
        message: err.message, // human-readable explanation
      });
    }
    throw err;
  }
});
```

### 25b. `validateEscrowState()` — Low-Level Validation

Standalone function for programmatic escrow validation without HTTP headers.

```ts
import { validateEscrowState } from "@oobe-protocol-labs/synapse-sap-sdk";

const result = await validateEscrowState(
  connection,
  agentWallet,
  depositorWallet,
  (pda) => client.escrow.fetchByPda(pda).catch(() => null),
  { callsToSettle: 5 },
);

// result.valid          — boolean
// result.escrow         — EscrowAccountData | null
// result.escrowPda      — PublicKey
// result.agentPda       — PublicKey
// result.isSplEscrow    — boolean
// result.splAccounts    — SplAccountMeta[] (typed: kind, pubkey, writable)
// result.errors         — string[] (empty when valid)
```

### 25c. `attachSplAccounts()` — Typed SPL AccountMeta Builder

Build the correct `[depositorAta, escrowAta, tokenMint, tokenProgram]` without
manual ATA derivation.

```ts
import { attachSplAccounts, toAccountMetas } from "@oobe-protocol-labs/synapse-sap-sdk";

// Typed SplAccountMeta[]
const splMetas = attachSplAccounts(escrowPda, depositorWallet, usdcMint);
// [
//   { kind: "depositorAta", pubkey: ..., writable: true },
//   { kind: "escrowAta",    pubkey: ..., writable: true },
//   { kind: "tokenMint",    pubkey: ..., writable: false },
//   { kind: "tokenProgram", pubkey: ..., writable: false },
// ]

// Convert to Anchor-compatible AccountMeta[] for .remainingAccounts()
const accountMetas = toAccountMetas(splMetas);
await client.escrow.settle(depositor, calls, hash, accountMetas);
```

### 25d. `parseX402Headers()` — Header Parsing

Parse and validate all 8 required `X-Payment-*` headers into a typed object.

```ts
import { parseX402Headers } from "@oobe-protocol-labs/synapse-sap-sdk";

const parsed = parseX402Headers(req.headers);
// parsed.protocol         — "SAP-x402"
// parsed.escrowPda        — PublicKey
// parsed.agentPda         — PublicKey
// parsed.depositorWallet  — PublicKey
// parsed.maxCalls         — BN
// parsed.pricePerCall     — BN
// parsed.programId        — PublicKey
// parsed.network          — string (e.g. "solana:mainnet-beta")
```

Throws `SapValidationError` if any required header is missing or malformed.

### 25e. Recognizing x402 Direct Payments

Scan an agent's ATA for x402 direct SPL transfers (non-escrow payments).

```ts
import { getX402DirectPayments, findATA } from "@oobe-protocol-labs/synapse-sap-sdk";
import { PublicKey } from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const payToAta = findATA(agentWallet, USDC_MINT);

const payments = await getX402DirectPayments(connection, payToAta, {
  limit: 50,
  requireMemo: false,        // include transfers without x402 memo
  knownSettlements: [],      // match against server-side PAYMENT-RESPONSE logs
  filterPayer: clientWallet,  // only from this payer
});

for (const p of payments) {
  console.log(`TX: ${p.signature}`);
  console.log(`  Amount: ${p.amount}`);
  console.log(`  Payer ATA: ${p.payerAta.toBase58()}`);
  console.log(`  Memo: ${p.memo}`);
  if (p.settlement) {
    console.log(`  Matched settlement hash: ${p.settlement.serviceHash}`);
  }
}
```

**Pattern matching logic:**
1. Memo has recognized prefix (`x402:`, `SAP-x402:`, `x402-direct:`) → match
2. Memo is base64 JSON with `protocol: "x402"` → match
3. Transfer matches known settlement via deterministic hash `sha256(agent+depositor+amount+ts)` → match with full `SettlementPayload`
4. `requireMemo: false` → any SPL transfer to the ATA is included

**Types:**

| Type | Key Fields |
|------|------------|
| `X402DirectPayment` | `signature`, `amount` (bigint), `payerAta`, `payeeAta`, `mint`, `memo`, `settlement`, `blockTime`, `slot` |
| `SettlementPayload` | `serviceHash`, `resource`, `agentWallet`, `depositorWallet`, `amount`, `timestamp` |
| `SplAccountMeta` | `kind` (`escrowAta \| depositorAta \| tokenMint \| tokenProgram`), `pubkey`, `writable` |
| `MissingEscrowAtaError` | extends `SapError`, `ataAddress`, `side` (`depositor \| escrow`), code `SAP_MISSING_ESCROW_ATA` |

---

> **Note:** This guide covers the merchant/seller perspective. For the client/consumer
> perspective (discovering agents, creating escrows, building payment headers),
> see the companion guide: [client.md](./client.md)
>
> **See also:**
> - [skills.md](./skills.md) — Full Synapse Client SDK reference (RPC, DAS, AI tools, plugins, MCP, gateway, Next.js)
> - [cli/README.md](../cli/README.md) — `synapse-sap` CLI — 10 command groups, 40+ subcommands for terminal-based protocol access
