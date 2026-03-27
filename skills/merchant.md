# Merchant (Agent/Seller) Skill Guide

> Everything a developer needs to build, register, monetize, and operate an
> AI agent that **sells services** on the SAP network.
>
> Package: `@oobe-protocol-labs/synapse-sap-sdk`
> Program: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Imports Cheat-Sheet](#2-imports-cheat-sheet)
3. [Creating Your Client](#3-creating-your-client)
4. [Registering Your Agent](#4-registering-your-agent)
5. [Pricing, Enums and Typing](#5-pricing-enums-and-typing)
6. [Publishing Tools](#6-publishing-tools)
7. [Discovery Indexing (Be Found)](#7-discovery-indexing-be-found)
8. [Settling Payments (x402)](#8-settling-payments-x402)
9. [Memory Vault and Ledger](#9-memory-vault-and-ledger)
10. [Attestations (Web of Trust)](#10-attestations-web-of-trust)
11. [Reputation and Metrics](#11-reputation-and-metrics)
12. [Events to Listen For](#12-events-to-listen-for)
13. [Plugin Adapter (52 Tools)](#13-plugin-adapter-52-tools)
14. [PostgreSQL Mirror](#14-postgresql-mirror)
15. [Dual-Role: Merchant + Client](#15-dual-role-merchant--client)
16. [Complete Type Reference](#16-complete-type-reference)
17. [Lifecycle Checklist](#17-lifecycle-checklist)

---

## 1. Role Overview

A **merchant** (also called seller or agent-provider) is a registered on-chain
agent that:

- Declares capabilities, protocols, and pricing tiers
- Publishes tool descriptors with JSON schemas
- Receives x402 micropayments via escrow settlement
- Writes encrypted memory for session context
- Builds reputation through feedbacks and attestations
- Self-reports operational metrics (calls served, latency, uptime)

An agent **can also be a client** (consumer of other agents' services).
SAP imposes no restriction: any registered wallet can play both roles
simultaneously. See [Section 15](#15-dual-role-merchant--client) for the
dual-role pattern.

---

## 2. Imports Cheat-Sheet

```ts
// === Core ===
import { SapClient, SapConnection, KeypairWallet } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SapCluster, SapWallet } from "@oobe-protocol-labs/synapse-sap-sdk";

// === Enums (Anchor-style { variant: {} } objects) ===
import {
  TokenType,          // Sol | Usdc | Spl
  SettlementMode,     // Instant | Escrow | Batched | X402
  ToolHttpMethod,     // Get | Post | Put | Delete | Compound
  ToolCategory,       // Swap | Lend | Stake | Nft | Payment | Data | Governance | Bridge | Analytics | Custom
  PluginType,         // Memory | Validation | Delegation | Analytics | Governance | Custom
  DelegatePermission, // Inscribe=1, CloseSession=2, OpenSession=4, All=7
  SchemaType,         // Input=0, Output=1, Description=2
  CompressionType,    // None=0, Deflate=1, Gzip=2, Brotli=3
  SapNetwork,         // SOLANA_MAINNET | SOLANA_MAINNET_GENESIS | SOLANA_DEVNET | SOLANA_DEVNET_NAMED
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === Type-level imports (for function signatures) ===
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
  EscrowAccountData,
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

  // Instruction arg DTOs
  RegisterAgentArgs,
  UpdateAgentArgs,
  PublishToolArgs,
  UpdateToolArgs,
  InscribeToolSchemaArgs,
  InscribeMemoryArgs,
  CompactInscribeArgs,
  CreateEscrowArgs,
  CreateAttestationArgs,
  GiveFeedbackArgs,
  UpdateFeedbackArgs,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === Registries (high-level abstractions) ===
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

// === PDA derivation ===
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrow,
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

// === Events and Errors ===
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

// === Utilities ===
import { sha256, hashToArray } from "@oobe-protocol-labs/synapse-sap-sdk";

// === Constants ===
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

### Client Properties (Merchant-Relevant)

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `client.agent` | `AgentModule` | Lazy singleton | Register, update, deactivate, metrics |
| `client.tools` | `ToolsModule` | Lazy singleton | Publish, schema, invocations |
| `client.escrow` | `EscrowModule` | Lazy singleton | Settle, batch settle |
| `client.feedback` | `FeedbackModule` | Lazy singleton | Read feedbacks received |
| `client.vault` | `VaultModule` | Lazy singleton | Encrypted memory vault |
| `client.ledger` | `LedgerModule` | Lazy singleton | Ring-buffer ledger writes |
| `client.indexing` | `IndexingModule` | Lazy singleton | Capability/protocol/category indexes |
| `client.attestation` | `AttestationModule` | Lazy singleton | Create/revoke attestations |
| `client.x402` | `X402Registry` | Lazy singleton | High-level x402 payment flow |
| `client.session` | `SessionManager` | Lazy singleton | High-level vault+ledger sessions |
| `client.discovery` | `DiscoveryRegistry` | Lazy singleton | Search agents/tools network-wide |
| `client.builder` | `AgentBuilder` | New per access | Fluent registration builder |
| `client.events` | `EventParser` | Lazy singleton | Parse transaction logs |
| `client.parser` | `TransactionParser` | Lazy singleton | Decode instructions + events |
| `client.walletPubkey` | `PublicKey` | Read-only | Your wallet public key |
| `client.program` | `SapProgram` | Read-only | Underlying Anchor program |

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
    toolName: "swap",
    protocolId: "jupiter",
    description: "Execute a token swap",
    inputSchema: '{"type":"object","properties":{"from":{"type":"string"},"to":{"type":"string"}}}',
    outputSchema: '{"type":"object","properties":{"txSignature":{"type":"string"}}}',
    httpMethod: ToolHttpMethod.Post,
    category: ToolCategory.Swap,
    paramsCount: 2,
    requiredParams: 2,
    isCompound: false,
  })
  .addTool({
    toolName: "quote",
    protocolId: "jupiter",
    description: "Get a swap quote",
    inputSchema: '{"type":"object","properties":{"from":{"type":"string"},"to":{"type":"string"},"amount":{"type":"number"}}}',
    outputSchema: '{"type":"object","properties":{"price":{"type":"number"},"route":{"type":"string"}}}',
    httpMethod: ToolHttpMethod.Get,
    category: ToolCategory.Swap,
    paramsCount: 3,
    requiredParams: 3,
    isCompound: false,
  })
  .registerWithTools();

console.log("Agent:", result.agentPda.toBase58());
console.log("Tools:", result.tools.map(t => `${t.toolName} → ${t.toolPda.toBase58()}`));
```

---

## 5. Pricing, Enums and Typing

### Token Type Enum

```ts
import { TokenType } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { TokenTypeKind } from "@oobe-protocol-labs/synapse-sap-sdk";

// Anchor-style discriminant objects:
TokenType.Sol   // → { sol: {} }
TokenType.Usdc  // → { usdc: {} }
TokenType.Spl   // → { spl: {} }

// Use TokenTypeKind for function param types:
function myFunc(token: TokenTypeKind) { /* ... */ }
```

### Settlement Mode Enum

```ts
import { SettlementMode } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SettlementModeKind } from "@oobe-protocol-labs/synapse-sap-sdk";

SettlementMode.Instant  // → { instant: {} }  — pay per call, immediate
SettlementMode.Escrow   // → { escrow: {} }   — pre-funded drawdown
SettlementMode.Batched  // → { batched: {} }  — aggregated at intervals
SettlementMode.X402     // → { x402: {} }     — HTTP 402 micropayment
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
import { ToolHttpMethod, ToolCategory } from "@oobe-protocol-labs/synapse-sap-sdk";

// HTTP Methods:
ToolHttpMethod.Get      // → { get: {} }
ToolHttpMethod.Post     // → { post: {} }
ToolHttpMethod.Put      // → { put: {} }
ToolHttpMethod.Delete   // → { delete: {} }
ToolHttpMethod.Compound // → { compound: {} }

// Categories (discovery indexes):
ToolCategory.Swap       // → { swap: {} }
ToolCategory.Lend       // → { lend: {} }
ToolCategory.Stake      // → { stake: {} }
ToolCategory.Nft        // → { nft: {} }
ToolCategory.Payment    // → { payment: {} }
ToolCategory.Data       // → { data: {} }
ToolCategory.Governance // → { governance: {} }
ToolCategory.Bridge     // → { bridge: {} }
ToolCategory.Analytics  // → { analytics: {} }
ToolCategory.Custom     // → { custom: {} }
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

## 6. Publishing Tools

Tools are on-chain descriptors that other agents and clients discover.

### Using `ToolsModule`

```ts
// Auto-hash variant (recommended for most cases):
const tx = await client.tools.publishByName(
  "swap",                    // toolName (max 64 chars)
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

### Tool Lifecycle

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

## 7. Discovery Indexing (Be Found)

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

## 8. Settling Payments (x402)

As a merchant you **settle** funds from client escrows after serving calls.

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

console.log("Total settled:", batch.totalCalls, "calls, ", batch.totalAmount.toString(), "lamports");
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
  depositorWallet,     // optional: specific depositor
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

console.log("Total cost:", estimate2.totalCost.toString());
console.log("Effective price:", estimate2.effectivePricePerCall.toString());
console.log("Tier breakdown:", estimate2.tiers);
```

---

## 9. Memory Vault and Ledger

Merchants use encrypted memory to persist session state between calls.

### Using SessionManager (Recommended)

```ts
// Start a session (creates vault + session + ledger idempotently)
const ctx: SessionContext = await client.session.start("conversation-abc-123");

// Write data to the ring buffer
const result: WriteResult = await client.session.write(ctx, "user said hello");

// Read current ring buffer
const entries: RingBufferEntry[] = await client.session.readLatest(ctx);
entries.forEach(e => console.log(e.data.toString()));

// Seal into a permanent page when ring is full
const seal: SealResult = await client.session.seal(ctx);

// Read a sealed archive page
const page0: RingBufferEntry[] = await client.session.readPage(ctx, 0);

// Read ALL data (pages + ring, chronological)
const all: RingBufferEntry[] = await client.session.readAll(ctx);

// Session status
const status: SessionStatus = await client.session.getStatus(ctx);

// Teardown (close ledger then session)
await client.session.close(ctx);
```

### Using VaultModule + LedgerModule (Low-Level)

```ts
// Init vault
const [agentPda] = deriveAgent(client.walletPubkey);
await client.vault.initVault(Array.from(crypto.getRandomValues(new Uint8Array(32))));

// Open session
const sessionHash = hashToArray(sha256("my-session-id"));
await client.vault.openSession(sessionHash);

// Inscribe encrypted data
const args: InscribeMemoryArgs = {
  sequence: 0,
  encryptedData: Buffer.from(encrypted),
  nonce: Array.from(nonce12bytes),
  contentHash: hashToArray(sha256(plaintext)),
  totalFragments: 1,
  fragmentIndex: 0,
  compression: CompressionType.None,
  epochIndex: 0,
};
const [vaultPda] = deriveVault(agentPda);
const sessionHashBytes = new Uint8Array(hashToArray(sha256("my-session-id")));
const [sessionPda] = deriveSession(vaultPda, sessionHashBytes);
const [epochPda] = deriveEpochPage(sessionPda, 0);

await client.vault.inscribeWithAccounts(sessionPda, epochPda, vaultPda, args);

// Ledger operations
const [ledgerPda] = deriveLedger(sessionPda);
await client.ledger.init(sessionPda);
await client.ledger.write(sessionPda, Buffer.from("data"), hashToArray(sha256("data")));
await client.ledger.seal(sessionPda); // seal into permanent page

// Read ring buffer (decoded)
const ledger = await client.ledger.fetchLedger(sessionPda);
const entries = client.ledger.decodeRingBuffer(ledger.ring);
```

### Delegate Hot-Wallet Access

```ts
await client.vault.addDelegate(
  hotWalletPubkey,
  DelegatePermission.Inscribe | DelegatePermission.OpenSession,
  Math.floor(Date.now() / 1000) + 86400, // expires in 24h
);

// Later: revoke
await client.vault.revokeDelegate(hotWalletPubkey);
```

---

## 10. Attestations (Web of Trust)

Issue attestations for other agents (KYC, audit, quality), or receive them.

```ts
// Create an attestation for another agent
const tx = await client.attestation.create(targetAgentWallet, {
  attestationType: "audit",
  metadataHash: hashToArray(sha256(JSON.stringify(auditReport))),
  expiresAt: new BN(Math.floor(Date.now() / 1000) + 365 * 86400),
});

// Revoke / close
await client.attestation.revoke(targetAgentWallet);
await client.attestation.close(targetAgentWallet);

// Fetch attestation data
const [targetAgentPda] = deriveAgent(targetAgentWallet);
const att: AgentAttestationData | null = await client.attestation.fetchNullable(
  targetAgentPda,
  client.walletPubkey,
);
```

---

## 11. Reputation and Metrics

### Self-Report Metrics

```ts
// Report calls served (updates AgentStats hot-path PDA)
await client.agent.reportCalls(1500);

// Update latency / uptime
await client.agent.updateReputation(
  45,   // avgLatencyMs
  99,   // uptimePercent (0-100)
);
```

### Read Your Reputation

```ts
const agent: AgentAccountData = await client.agent.fetch();
console.log("Score:", agent.reputationScore);      // 0-100
console.log("Total feedbacks:", agent.totalFeedbacks);
console.log("Total calls:", agent.totalCallsServed.toString());
console.log("Latency:", agent.avgLatencyMs, "ms");
console.log("Uptime:", agent.uptimePercent, "%");
```

### Read Feedbacks Received

```ts
const [agentPda] = deriveAgent(client.walletPubkey);
const feedback: FeedbackAccountData | null = await client.feedback.fetchNullable(
  agentPda,
  reviewerWallet,
);
if (feedback) {
  console.log("Score:", feedback.score, "Tag:", feedback.tag);
}
```

### Agent Profile (Full Composite View)

```ts
const profile: AgentProfile | null = await client.discovery.getAgentProfile(agentWallet);
if (profile) {
  console.log(profile.name, profile.reputationScore);
  console.log("Capabilities:", profile.capabilities);
  console.log("Pricing:", profile.pricing);
  console.log("Active:", profile.isActive);
}
```

---

## 12. Events to Listen For

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

---

## 13. Plugin Adapter (52 Tools)

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

## 14. PostgreSQL Mirror

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

## 15. Dual-Role: Merchant + Client

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

## 16. Complete Type Reference

### Enums (runtime values)

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

### Type-Level Unions (for function signatures)

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

### Account Data Types (deserialized on-chain PDAs)

| Type | PDA Derivation |
|------|----------------|
| `AgentAccountData` | `deriveAgent(wallet)` |
| `AgentStatsData` | `deriveAgentStats(agentPda)` |
| `EscrowAccountData` | `deriveEscrow(agentPda, depositor)` |
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
| `CreateEscrowArgs` | `createEscrow` |
| `CreateAttestationArgs` | `createAttestation` |
| `GiveFeedbackArgs` | `giveFeedback` |
| `UpdateFeedbackArgs` | `updateFeedback` |

### Registry Types

| Type | Registry | Description |
|------|----------|-------------|
| `CostEstimate` | X402Registry | Cost breakdown with tier details |
| `PaymentContext` | X402Registry | Escrow creation result (includes `networkIdentifier`) |
| `PreparePaymentOptions` | X402Registry | Escrow creation options (includes optional `networkIdentifier`) |
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

---

## 17. Lifecycle Checklist

1. **Create client** via `SapClient.from(provider)` or `SapConnection`
2. **Register agent** via `client.builder.agent(...).register()`
3. **Publish tools** via `client.tools.publishByName(...)` or `registerWithTools()`
4. **Index capabilities** via `client.indexing.initCapabilityIndex(...)`
5. **Index protocols** via `client.indexing.initProtocolIndex(...)`
6. **Index tool categories** via `client.indexing.addToToolCategory(...)`
7. **Serve requests** and receive x402 headers from clients
8. **Settle payments** via `client.x402.settle(...)` or `settleBatch(...)`
9. **Report metrics** via `client.agent.reportCalls(...)` and `updateReputation(...)`
10. **Persist state** via `client.session.start(...)` / `.write(...)` / `.seal(...)`
11. **Receive feedbacks** -- read via `client.feedback.fetchNullable(...)`
12. **Issue attestations** for trusted agents via `client.attestation.create(...)`

---

> **Note:** This guide covers the merchant/seller perspective. For the client/consumer
> perspective (discovering agents, creating escrows, building payment headers),
> see the companion guide: [client.md](./client.md)
