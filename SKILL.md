# SKILL.md — Synapse Agent Protocol v2 (SAP) SDK

> **Complete technical reference for building, deploying, and operating AI agents on Solana.**
>
> Package: `@oobe-protocol-labs/synapse-sap-sdk`
> Program ID: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`
> Repository: [github.com/OOBE-PROTOCOL/synapse-sap-sdk](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk)

---

## Table of Contents

1. [What is SAP v2?](#1-what-is-sap-v2)
2. [Architecture Overview](#2-architecture-overview)
3. [Installation & Setup](#3-installation--setup)
4. [Quick Start](#4-quick-start)
5. [SDK Module Map](#5-sdk-module-map)
6. [Constants Reference](#6-constants-reference)
7. [Enum Reference](#7-enum-reference)
8. [PDA Derivation](#8-pda-derivation)
9. [Agent Lifecycle](#9-agent-lifecycle)
10. [Reputation & Feedback](#10-reputation--feedback)
11. [Tool Registry](#11-tool-registry)
12. [Memory System (Vault + Ledger)](#12-memory-system-vault--ledger)
13. [x402 Escrow Payments](#13-x402-escrow-payments)
14. [Attestations (Web of Trust)](#14-attestations-web-of-trust)
15. [Discovery & Indexing](#15-discovery--indexing)
16. [Plugin Adapter (52 Tools)](#16-plugin-adapter-52-tools)
17. [PostgreSQL Off-Chain Mirror](#17-postgresql-off-chain-mirror)
18. [Event System](#18-event-system)
19. [Error Hierarchy](#19-error-hierarchy)
20. [Integration with synapse-client-sdk](#20-integration-with-synapse-client-sdk)
21. [Best Practices & Patterns](#21-best-practices--patterns)
22. [Limits Reference](#22-limits-reference)
23. [Full Exports Map](#23-full-exports-map)

---

## 1. What is SAP v2?

**Solana Agent Protocol** is an on-chain infrastructure layer for autonomous AI agents.
It provides:

- **Identity** — Deterministic PDAs for agent registration, metrics, and lifecycle.
- **Reputation** — Trustless feedback scores (0–1000), aggregated on-chain.
- **Memory** — Encrypted vaults, session ledgers, ring-buffer pages.
- **Payments** — x402-based escrow with volume discounts, batch settlement, SPL tokens.
- **Discovery** — On-chain capability/protocol/category indexes for agent search.
- **Attestations** — Web-of-trust between agents.
- **Tools** — On-chain tool registry with schemas, categories, and invocation tracking.

**The Solana program** is deployed at `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ` on mainnet-beta and devnet. It contains **72 instructions**, **22 account types**, **45 events**, and **91 custom errors**.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    @oobe-protocol-labs/synapse-sap-sdk          │
├──────────┬──────────┬──────────┬───────────┬───────────────────┤
│  core/   │ modules/ │registries│  plugin/  │    postgres/      │
│          │          │          │           │                   │
│SapClient │ Agent    │Discovery │SAPPlugin  │SapPostgres        │
│SapConn.  │ Feedback │X402Reg.  │52 tools   │SapSyncEngine      │
│          │ Tools    │Session   │Zod schemas│22 tables          │
│          │ Vault    │Builder   │           │Event stream       │
│          │ Escrow   │          │           │                   │
│          │ Attest.  │          │           │                   │
│          │ Indexing │          │           │                   │
│          │ Ledger   │          │           │                   │
├──────────┴──────────┴──────────┴───────────┴───────────────────┤
│  types/  │constants/│   pda/   │  events/  │  errors/ │ utils/ │
└──────────┴──────────┴──────────┴───────────┴──────────┴────────┘
           │                                                │
           ▼                                                ▼
    Anchor Program (Solana)                          PostgreSQL
    SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ     (off-chain)
```

### Directory structure (37 source files, 11 directories)

```
src/
├── index.ts                # Barrel exports (everything)
├── core/
│   ├── client.ts           # SapClient — main entry point
│   ├── connection.ts       # SapConnection — RPC factory
│   └── index.ts
├── modules/
│   ├── base.ts             # BaseModule abstract class
│   ├── agent.ts            # Agent lifecycle (register, update, close…)
│   ├── attestation.ts      # Web-of-trust attestations
│   ├── escrow.ts           # x402 escrow payments
│   ├── feedback.ts         # Reputation feedback
│   ├── indexing.ts         # Discovery indexes (capability, protocol, category)
│   ├── ledger.ts           # MemoryLedger (ring-buffer, sealed pages)
│   ├── tools.ts            # Tool registry (publish, schema, checkpoints)
│   ├── vault.ts            # Encrypted memory vault + sessions
│   └── index.ts
├── registries/
│   ├── discovery.ts        # Agent/tool search across the network
│   ├── x402.ts             # x402 payment lifecycle
│   ├── session.ts          # Unified memory session manager
│   ├── builder.ts          # Fluent AgentBuilder
│   └── index.ts
├── plugin/
│   ├── index.ts            # SAPPlugin / createSAPPlugin
│   ├── protocols.ts        # Protocol method definitions
│   └── schemas.ts          # Zod validation schemas
├── postgres/
│   ├── adapter.ts          # SapPostgres database adapter
│   ├── sync.ts             # SapSyncEngine (periodic + WebSocket)
│   ├── schema.sql          # Full DDL (22 tables, indexes, views)
│   ├── serializers.ts      # On-chain → SQL row serializers
│   ├── types.ts            # Row types, config, table map
│   └── index.ts
├── constants/
│   ├── programs.ts         # Program IDs per cluster
│   ├── seeds.ts            # PDA seed prefixes (20 seeds)
│   └── limits.ts           # Size limits, version constants, enum values
├── pda/
│   └── index.ts            # 17 derive*() functions
├── events/
│   └── index.ts            # EventParser + 45 event types
├── errors/
│   └── index.ts            # 6 error classes
├── types/
│   ├── accounts.ts         # 22 account data interfaces
│   ├── common.ts           # Shared structs (Capability, PricingTier…)
│   ├── enums.ts            # 5 enum types + Kind unions
│   ├── instructions.ts     # 11 instruction arg DTOs
│   └── index.ts
├── utils/
│   ├── hash.ts             # sha256, hashToArray
│   ├── validation.ts       # assert helper
│   ├── serialization.ts    # Account serialization
│   └── index.ts
└── idl/
    ├── index.ts            # IDL re-exports
    └── synapse_agent_sap.json  # Embedded Anchor IDL
```

---

## 3. Installation & Setup

```bash
# npm
npm install @oobe-protocol-labs/synapse-sap-sdk

# yarn
yarn add @oobe-protocol-labs/synapse-sap-sdk

# Peer dependencies (required)
npm install @coral-xyz/anchor @solana/web3.js

# Optional peers
npm install pg    # PostgreSQL adapter
npm install zod   # Plugin schema validation
```

### Environment variables (`.env.example`)

```env
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com
WALLET_KEYPAIR_PATH=~/.config/solana/id.json
DATABASE_URL=postgresql://user:pass@localhost:5432/sap_db
```

---

## 4. Quick Start

### From Anchor Provider

```ts
import { AnchorProvider } from "@coral-xyz/anchor";
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";

const provider = AnchorProvider.env();
const client = SapClient.from(provider);

// Register an agent
await client.agent.register({
  name: "SwapBot",
  description: "AI-powered Jupiter swap agent",
  agentUri: "https://api.swapbot.ai",
  x402Endpoint: "https://api.swapbot.ai/.well-known/x402",
});
```

### From RPC URL + Keypair (synapse-client-sdk compatible)

```ts
import { SapConnection } from "@oobe-protocol-labs/synapse-sap-sdk";
import { Keypair } from "@solana/web3.js";
import fs from "fs";

const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync("~/.config/solana/id.json", "utf-8")))
);

const conn = SapConnection.fromKeypair("https://api.devnet.solana.com", keypair);
// conn.client is now a fully configured SapClient
await conn.client.agent.register({ name: "MyAgent", description: "..." });
```

### With SapConnection factory

```ts
import { SapConnection } from "@oobe-protocol-labs/synapse-sap-sdk";

// Preset clusters
const devnet = SapConnection.devnet();
const mainnet = SapConnection.mainnet();

// Custom RPC
const custom = new SapConnection({
  rpcUrl: "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=YOUR_KEY",
  cluster: "mainnet-beta",
  commitment: "confirmed",
});
```

---

## 5. SDK Module Map

### Core

| Class | Import | Purpose |
|-------|--------|---------|
| `SapClient` | `@.../synapse-sap-sdk` | Root entry point, lazy module accessors |
| `SapConnection` | `@.../synapse-sap-sdk` | RPC factory, cluster presets |

### Modules (Low-level)

| Module | Accessor | Key Methods |
|--------|----------|-------------|
| `AgentModule` | `client.agent` | `register`, `update`, `deactivate`, `reactivate`, `close`, `reportCalls`, `updateReputation`, `fetch`, `fetchNullable` |
| `FeedbackModule` | `client.feedback` | `give`, `update`, `revoke`, `close`, `fetch`, `fetchNullable` |
| `ToolsModule` | `client.tools` | `publish`, `publishByName`, `inscribeSchema`, `update`, `deactivate`, `reactivate`, `close`, `reportInvocations`, `createCheckpoint`, `restoreCheckpoint` |
| `VaultModule` | `client.vault` | `initVault`, `openSession`, `inscribe`, `compactInscribe`, `closeSession`, `closeVault`, `addDelegate`, `revokeDelegate`, `inscribeDelegated`, `rotateNonce` |
| `EscrowModule` | `client.escrow` | `create`, `deposit`, `settle`, `withdraw`, `close`, `settleBatch` |
| `AttestationModule` | `client.attestation` | `create`, `revoke`, `close`, `fetch`, `fetchNullable` |
| `LedgerModule` | `client.ledger` | `init`, `write`, `seal`, `close`, `decodeRingBuffer`, `fetch`, `fetchNullable` |
| `IndexingModule` | `client.indexing` | `registerCapability`, `registerProtocol`, `registerToolCategory`, `removeCapability`, `removeProtocol`, `removeToolCategory` |

### Registries (High-level)

| Registry | Accessor | Purpose |
|----------|----------|---------|
| `DiscoveryRegistry` | `client.discovery` | `findAgentsByProtocol`, `findAgentsByCapability`, `getAgentProfile`, `getNetworkOverview`, `estimateCost` |
| `X402Registry` | `client.x402` | `preparePayment`, `buildPaymentHeaders`, `settle`, `settleAndWithdraw`, `getBalance` |
| `SessionManager` | `client.session` | `start`, `write`, `readLatest`, `seal`, `getStatus` |
| `AgentBuilder` | `client.builder` | Fluent `.agent()`, `.description()`, `.addCapability()`, `.addPricingTier()`, `.register()` |

### Plugin

| Export | Purpose |
|--------|---------|
| `createSAPPlugin(client)` | Returns a `SAPPlugin` with 52 tools for AI agent frameworks |
| `SAP_PROTOCOLS` | Protocol method definitions |

---

## 6. Constants Reference

All constants are importable from `@oobe-protocol-labs/synapse-sap-sdk/constants` or the root package.

### Program IDs

```ts
import {
  SAP_PROGRAM_ADDRESS,       // "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ"
  SAP_PROGRAM_ID,            // PublicKey (default — mainnet alias)
  MAINNET_SAP_PROGRAM_ID,    // PublicKey
  DEVNET_SAP_PROGRAM_ID,     // PublicKey
  LOCALNET_SAP_PROGRAM_ID,   // PublicKey
} from "@oobe-protocol-labs/synapse-sap-sdk";
```

### PDA Seeds

```ts
import { SEEDS } from "@oobe-protocol-labs/synapse-sap-sdk";
```

| Key | Seed String | Account Type |
|-----|-------------|--------------|
| `SEEDS.GLOBAL` | `"sap_global"` | `GlobalRegistry` |
| `SEEDS.AGENT` | `"sap_agent"` | `AgentAccount` |
| `SEEDS.STATS` | `"sap_stats"` | `AgentStats` |
| `SEEDS.FEEDBACK` | `"sap_feedback"` | `FeedbackAccount` |
| `SEEDS.CAPABILITY_INDEX` | `"sap_cap_idx"` | `CapabilityIndex` |
| `SEEDS.PROTOCOL_INDEX` | `"sap_proto_idx"` | `ProtocolIndex` |
| `SEEDS.TOOL_CATEGORY` | `"sap_tool_cat"` | `ToolCategoryIndex` |
| `SEEDS.TOOL` | `"sap_tool"` | `ToolDescriptor` |
| `SEEDS.VAULT` | `"sap_vault"` | `MemoryVault` |
| `SEEDS.SESSION` | `"sap_session"` | `SessionLedger` |
| `SEEDS.EPOCH` | `"sap_epoch"` | `EpochPage` |
| `SEEDS.DELEGATE` | `"sap_delegate"` | `VaultDelegate` |
| `SEEDS.CHECKPOINT` | `"sap_checkpoint"` | `SessionCheckpoint` |
| `SEEDS.MEMORY` | `"sap_memory"` | `MemoryEntry` |
| `SEEDS.MEMORY_CHUNK` | `"sap_mem_chunk"` | `MemoryChunk` |
| `SEEDS.PLUGIN` | `"sap_plugin"` | `PluginSlot` |
| `SEEDS.ESCROW` | `"sap_escrow"` | `EscrowAccount` |
| `SEEDS.ATTESTATION` | `"sap_attest"` | `AgentAttestation` |
| `SEEDS.LEDGER` | `"sap_ledger"` | `MemoryLedger` |
| `SEEDS.LEDGER_PAGE` | `"sap_page"` | `LedgerPage` |

### Size Limits

```ts
import { LIMITS } from "@oobe-protocol-labs/synapse-sap-sdk";
```

| Constant | Value | Description |
|----------|-------|-------------|
| `LIMITS.MAX_NAME_LEN` | `64` | Max agent name bytes |
| `LIMITS.MAX_DESC_LEN` | `256` | Max description bytes |
| `LIMITS.MAX_URI_LEN` | `256` | Max URI bytes (agentUri, x402Endpoint) |
| `LIMITS.MAX_AGENT_ID_LEN` | `128` | Max DID-style identifier bytes |
| `LIMITS.MAX_CAPABILITIES` | `10` | Max capabilities per agent |
| `LIMITS.MAX_PRICING_TIERS` | `5` | Max pricing tiers per agent |
| `LIMITS.MAX_PROTOCOLS` | `5` | Max protocol strings per agent |
| `LIMITS.MAX_PLUGINS` | `5` | Max active plugins per agent |
| `LIMITS.MAX_VOLUME_CURVE_POINTS` | `5` | Max volume curve breakpoints |
| `LIMITS.MAX_TAG_LEN` | `32` | Max feedback tag bytes |
| `LIMITS.MAX_AGENTS_PER_INDEX` | `100` | Max agents in a discovery index |
| `LIMITS.MAX_TOOL_NAME_LEN` | `32` | Max tool name bytes |
| `LIMITS.MAX_TOOLS_PER_CATEGORY` | `100` | Max tools in a category index |
| `LIMITS.MAX_ATTESTATION_TYPE_LEN` | `32` | Max attestation type bytes |
| `LIMITS.MAX_INSCRIPTION_SIZE` | `750` | Max encrypted data per inscription |
| `LIMITS.INSCRIPTIONS_PER_EPOCH` | `1000` | Max inscriptions per epoch page |
| `LIMITS.RING_CAPACITY` | `4096` | Ring buffer capacity (MemoryLedger) |
| `LIMITS.MAX_LEDGER_WRITE_SIZE` | `750` | Max ledger write per call |
| `LIMITS.MAX_BATCH_SETTLEMENTS` | `10` | Max settlements in a batch |
| `LIMITS.MAX_FEEDBACK_SCORE` | `1000` | Feedback score range: 0–1000 |

### Protocol Versions

```ts
import { AGENT_VERSION, VAULT_PROTOCOL_VERSION } from "@oobe-protocol-labs/synapse-sap-sdk";

AGENT_VERSION;            // 1
VAULT_PROTOCOL_VERSION;   // 1
```

### Numeric Enum Maps

```ts
import { TOOL_CATEGORY_VALUES, HTTP_METHOD_VALUES } from "@oobe-protocol-labs/synapse-sap-sdk";

TOOL_CATEGORY_VALUES.Swap;     // 0
TOOL_CATEGORY_VALUES.Lend;     // 1
TOOL_CATEGORY_VALUES.Custom;   // 9

HTTP_METHOD_VALUES.Get;        // 0
HTTP_METHOD_VALUES.Post;       // 1
HTTP_METHOD_VALUES.Compound;   // 4
```

---

## 7. Enum Reference

All enums follow Anchor's variant-object pattern: `{ variantName: {} }`.

```ts
import {
  TokenType,
  PluginType,
  SettlementMode,
  ToolHttpMethod,
  ToolCategory,
} from "@oobe-protocol-labs/synapse-sap-sdk";
```

### TokenType

| Variant | Value | Description |
|---------|-------|-------------|
| `TokenType.Sol` | `{ sol: {} }` | Native SOL |
| `TokenType.Usdc` | `{ usdc: {} }` | USDC stablecoin |
| `TokenType.Spl` | `{ spl: {} }` | Arbitrary SPL token (requires `tokenMint`) |

### SettlementMode

| Variant | Value | Description |
|---------|-------|-------------|
| `SettlementMode.Instant` | `{ instant: {} }` | Pay-per-call, settled immediately |
| `SettlementMode.Escrow` | `{ escrow: {} }` | Pre-funded escrow drawdown |
| `SettlementMode.Batched` | `{ batched: {} }` | Aggregated at intervals |
| `SettlementMode.X402` | `{ x402: {} }` | HTTP 402-based micropayments |

### ToolHttpMethod

| Variant | Value | Description |
|---------|-------|-------------|
| `ToolHttpMethod.Get` | `{ get: {} }` | GET request |
| `ToolHttpMethod.Post` | `{ post: {} }` | POST request |
| `ToolHttpMethod.Put` | `{ put: {} }` | PUT request |
| `ToolHttpMethod.Delete` | `{ delete: {} }` | DELETE request |
| `ToolHttpMethod.Compound` | `{ compound: {} }` | Multi-step operation |

### ToolCategory

| Variant | Value | Description |
|---------|-------|-------------|
| `ToolCategory.Swap` | `{ swap: {} }` | Token swap / DEX |
| `ToolCategory.Lend` | `{ lend: {} }` | Lending protocols |
| `ToolCategory.Stake` | `{ stake: {} }` | Staking / validators |
| `ToolCategory.Nft` | `{ nft: {} }` | NFT operations |
| `ToolCategory.Payment` | `{ payment: {} }` | Payment & invoicing |
| `ToolCategory.Data` | `{ data: {} }` | Data feeds / oracles |
| `ToolCategory.Governance` | `{ governance: {} }` | DAO operations |
| `ToolCategory.Bridge` | `{ bridge: {} }` | Cross-chain bridges |
| `ToolCategory.Analytics` | `{ analytics: {} }` | On-chain analytics |
| `ToolCategory.Custom` | `{ custom: {} }` | User-defined |

### PluginType

| Variant | Value | Description |
|---------|-------|-------------|
| `PluginType.Memory` | `{ memory: {} }` | Encrypted memory/vault |
| `PluginType.Validation` | `{ validation: {} }` | Custom validation |
| `PluginType.Delegation` | `{ delegation: {} }` | Hot-wallet delegation |
| `PluginType.Analytics` | `{ analytics: {} }` | Metrics & analytics |
| `PluginType.Governance` | `{ governance: {} }` | DAO participation |
| `PluginType.Custom` | `{ custom: {} }` | User-defined |

---

## 8. PDA Derivation

All 17 derive functions return `[PublicKey, bump]` and require no network calls.

```ts
import {
  deriveGlobalRegistry,
  deriveAgent,
  deriveAgentStats,
  deriveFeedback,
  deriveCapabilityIndex,
  deriveProtocolIndex,
  deriveToolCategoryIndex,
  deriveVault,
  deriveSession,
  deriveEpochPage,
  deriveVaultDelegate,
  deriveCheckpoint,
  deriveTool,
  deriveEscrow,
  deriveAttestation,
  deriveLedger,
  deriveLedgerPage,
} from "@oobe-protocol-labs/synapse-sap-sdk";
```

### Derivation Seeds

| Function | Seeds | Example |
|----------|-------|---------|
| `deriveGlobalRegistry()` | `["sap_global"]` | `deriveGlobalRegistry()` |
| `deriveAgent(wallet)` | `["sap_agent", wallet]` | `deriveAgent(walletPubkey)` |
| `deriveAgentStats(agent)` | `["sap_stats", agentPda]` | `deriveAgentStats(agentPda)` |
| `deriveFeedback(agent, reviewer)` | `["sap_feedback", agent, reviewer]` | `deriveFeedback(agentPda, reviewerWallet)` |
| `deriveCapabilityIndex(hash)` | `["sap_cap_idx", hash]` | `deriveCapabilityIndex(sha256Hash)` |
| `deriveProtocolIndex(hash)` | `["sap_proto_idx", hash]` | `deriveProtocolIndex(sha256Hash)` |
| `deriveToolCategoryIndex(category)` | `["sap_tool_cat", category]` | `deriveToolCategoryIndex(categoryByte)` |
| `deriveVault(agent, nonce)` | `["sap_vault", agent, nonce]` | `deriveVault(agentPda, 0)` |
| `deriveSession(vault, sessionId)` | `["sap_session", vault, sessionId]` | `deriveSession(vaultPda, "conv-123")` |
| `deriveEpochPage(session, epoch)` | `["sap_epoch", session, epoch]` | `deriveEpochPage(sessionPda, 0)` |
| `deriveVaultDelegate(vault, delegate)` | `["sap_delegate", vault, delegate]` | `deriveVaultDelegate(vaultPda, delegateWallet)` |
| `deriveCheckpoint(session, tag)` | `["sap_checkpoint", session, tag]` | `deriveCheckpoint(sessionPda, "v1")` |
| `deriveTool(agent, toolName)` | `["sap_tool", agent, toolName]` | `deriveTool(agentPda, "jupiter-swap")` |
| `deriveEscrow(agent, depositor)` | `["sap_escrow", agent, depositor]` | `deriveEscrow(agentPda, depositorWallet)` |
| `deriveAttestation(attester, subject)` | `["sap_attest", attester, subject]` | `deriveAttestation(attesterPda, subjectPda)` |
| `deriveLedger(session)` | `["sap_ledger", session]` | `deriveLedger(sessionPda)` |
| `deriveLedgerPage(ledger, page)` | `["sap_page", ledger, page]` | `deriveLedgerPage(ledgerPda, 0)` |

---

## 9. Agent Lifecycle

### Register

```ts
await client.agent.register({
  name: "SwapBot",
  description: "AI-powered Jupiter swap agent",
  agentId: "did:sap:SwapBot",
  agentUri: "https://api.swapbot.ai",
  x402Endpoint: "https://api.swapbot.ai/.well-known/x402",
  capabilities: [
    { name: "jupiter:swap", version: 1, metadata: '{"dex":"jupiter"}' },
    { name: "raydium:pool", version: 1, metadata: "" },
  ],
  pricing: [
    {
      tierId: "standard",
      pricePerCall: new BN(1_000_000),    // 0.001 SOL
      tokenType: TokenType.Sol,
      settlementMode: SettlementMode.Escrow,
      rateLimit: 60,
      maxCallsPerEpoch: new BN(10_000),
    },
  ],
  protocols: ["jupiter", "raydium"],
});
```

### Fluent Builder

```ts
await client.builder
  .agent("SwapBot")
  .description("AI-powered swap agent")
  .agentUri("https://api.swapbot.ai")
  .x402Endpoint("https://api.swapbot.ai/.well-known/x402")
  .addCapability("jupiter:swap", { protocol: "jupiter" })
  .addCapability("raydium:pool", { protocol: "raydium" })
  .addPricingTier({
    tierId: "standard",
    pricePerCall: 1_000_000,
    rateLimit: 60,
  })
  .register();
```

### Update

```ts
await client.agent.update({
  name: "SwapBot v2",
  description: "Upgraded swap agent with multi-dex support",
});
```

### Deactivate / Reactivate / Close

```ts
await client.agent.deactivate();
await client.agent.reactivate();
await client.agent.close();  // Reclaims rent
```

### Fetch Agent Data

```ts
const [agentPda] = deriveAgent(walletPubkey);
const data = await client.agent.fetch(agentPda);
// data: AgentAccountData — name, description, reputationScore, isActive, etc.
```

---

## 10. Reputation & Feedback

```ts
import { deriveFeedback } from "@oobe-protocol-labs/synapse-sap-sdk";

// Give feedback (0–1000 score)
await client.feedback.give({
  agent: agentPda,
  score: 850,
  tag: "swap-quality",
});

// Update existing feedback
await client.feedback.update({
  agent: agentPda,
  score: 920,
  tag: "swap-quality-v2",
});

// Fetch feedback
const [feedbackPda] = deriveFeedback(agentPda, reviewerWallet);
const fb = await client.feedback.fetch(feedbackPda);
// fb: { score: 920, tag: "swap-quality-v2", reviewer, agent, ... }

// Revoke & close
await client.feedback.revoke({ agent: agentPda });
await client.feedback.close({ agent: agentPda });
```

---

## 11. Tool Registry

### Publish a Tool

```ts
await client.tools.publish({
  agent: agentPda,
  toolName: "jupiter-swap",
  httpMethod: ToolHttpMethod.Post,
  category: ToolCategory.Swap,
  paramsCount: 3,
  requiredParams: 2,
  isCompound: false,
});
```

### Publish by Name (auto-derives PDA)

```ts
await client.tools.publishByName(agentPda, "raydium-pool", {
  httpMethod: ToolHttpMethod.Post,
  category: ToolCategory.Swap,
  paramsCount: 4,
  requiredParams: 2,
});
```

### Inscribe Schema (attach JSON Schema)

```ts
const schema = JSON.stringify({
  type: "object",
  properties: {
    inputMint: { type: "string" },
    outputMint: { type: "string" },
    amount: { type: "number" },
  },
  required: ["inputMint", "outputMint", "amount"],
});

await client.tools.inscribeSchema({
  agent: agentPda,
  toolName: "jupiter-swap",
  schemaData: Buffer.from(schema),
  schemaType: SchemaType.Json,
  compressionType: CompressionType.None,
});
```

### Checkpoints

```ts
// Save current state
await client.tools.createCheckpoint(sessionPda, "v1");

// Restore to checkpoint
await client.tools.restoreCheckpoint(sessionPda, "v1");
```

---

## 12. Memory System (Vault + Ledger)

### Vault Flow (encrypted, session-based)

```ts
// 1. Initialize vault
await client.vault.initVault(0); // nonce = 0

// 2. Open session
const [vaultPda] = deriveVault(agentPda, 0);
await client.vault.openSession(vaultPda, "conversation-123");

// 3. Inscribe encrypted data
const [sessionPda] = deriveSession(vaultPda, "conversation-123");
await client.vault.inscribe(sessionPda, encryptedData, contentHash);

// 4. Compact inscribe (with accounts)
await client.vault.compactInscribe(sessionPda, encryptedData, contentHash);

// 5. Close session & vault
await client.vault.closeSession(sessionPda);
await client.vault.closeVault(vaultPda);
```

### Delegation

```ts
// Grant delegate access
await client.vault.addDelegate(vaultPda, delegateWallet, permissions);

// Inscribe as delegate
await client.vault.inscribeDelegated(sessionPda, encryptedData, contentHash);

// Revoke
await client.vault.revokeDelegate(vaultPda, delegateWallet);
```

### Ledger Flow (ring-buffer, unified)

```ts
// 1. Init ledger
const [sessionPda] = deriveSession(vaultPda, "conversation-123");
await client.ledger.init(sessionPda);

// 2. Write data
await client.ledger.write(sessionPda, data, contentHash);

// 3. Seal page (freeze current page)
const [ledgerPda] = deriveLedger(sessionPda);
await client.ledger.seal(ledgerPda, 0);

// 4. Read ring buffer
const entries = await client.ledger.decodeRingBuffer(ledgerPda);
// entries: { data, contentHash, timestamp, slot }[]
```

### Session Manager (high-level)

```ts
// Start a session (auto-creates vault + session + ledger)
const ctx = await client.session.start("conversation-123");

// Write data
await client.session.write(ctx, "Hello from agent");

// Read latest entries
const messages = await client.session.readLatest(ctx);

// Seal the session
await client.session.seal(ctx);

// Check status
const status = await client.session.getStatus(ctx);
```

---

## 13. x402 Escrow Payments

### Create Escrow

```ts
await client.escrow.create(agentWallet, {
  pricePerCall: new BN(1_000_000),     // 0.001 SOL
  maxCalls: new BN(1_000),
  expiresAt: new BN(Date.now() / 1000 + 86400), // 24h
  tokenMint: null,                      // SOL
  tokenDecimals: 9,
  volumeCurve: [
    { afterCalls: 100, pricePerCall: new BN(800_000) },
    { afterCalls: 500, pricePerCall: new BN(600_000) },
  ],
});
```

### Deposit

```ts
await client.escrow.deposit(agentPda, depositorWallet, new BN(100_000_000)); // 0.1 SOL
```

### Settle

```ts
await client.escrow.settle(depositorWallet, 5, serviceDataHash);
// Settles 5 calls worth of payment from escrow to agent
```

### Batch Settlement

```ts
await client.escrow.settleBatch([
  { depositor: wallet1, callCount: 3, serviceData: hash1 },
  { depositor: wallet2, callCount: 7, serviceData: hash2 },
]);
```

### x402 Flow (high-level)

```ts
// Consumer side
const ctx = await client.x402.preparePayment(agentWallet, {
  callCount: 10,
  tokenType: TokenType.Sol,
});

// Build HTTP headers for the API call
const headers = client.x402.buildPaymentHeaders(ctx);

// Agent side — settle after service delivery
const receipt = await client.x402.settle(depositorWallet, 1, serviceData);

// Check balance
const balance = await client.x402.getBalance(agentPda, depositorWallet);
```

---

## 14. Attestations (Web of Trust)

```ts
import { deriveAttestation } from "@oobe-protocol-labs/synapse-sap-sdk";

// Create attestation (agent → agent)
await client.attestation.create({
  subject: subjectAgentPda,
  attestationType: "capability-verified",
  data: Buffer.from(JSON.stringify({ capability: "jupiter:swap", verified: true })),
});

// Revoke
await client.attestation.revoke(subjectAgentPda);

// Fetch
const [attestPda] = deriveAttestation(attesterPda, subjectPda);
const att = await client.attestation.fetch(attestPda);
// att: { attester, subject, attestationType, data, isRevoked, ... }
```

---

## 15. Discovery & Indexing

### Register to Indexes

```ts
// Register agent capability for discovery
await client.indexing.registerCapability(agentPda, "jupiter:swap");

// Register protocol
await client.indexing.registerProtocol(agentPda, "jupiter");

// Register tool category
await client.indexing.registerToolCategory(toolPda, ToolCategory.Swap);
```

### Discover Agents

```ts
// Find agents by protocol
const agents = await client.discovery.findAgentsByProtocol("jupiter");
// agents: DiscoveredAgent[]

// Find by capability
const swappers = await client.discovery.findAgentsByCapability("jupiter:swap");

// Get full profile
const profile = await client.discovery.getAgentProfile(walletPubkey);
// profile: { agent, stats, tools, feedbacks, attestations, ... }

// Get network overview
const overview = await client.discovery.getNetworkOverview();
// overview: { totalAgents, activeAgents, totalTools, totalFeedbacks, ... }

// Estimate cost
const cost = await client.discovery.estimateCost(agentPda, 100);
// cost: { totalCost, pricePerCall, tier, volumeDiscount }
```

---

## 16. Plugin Adapter (52 Tools)

The plugin adapter wraps the entire SDK into 52 tool functions compatible with AI agent frameworks (LangChain, Vercel AI, etc.).

```ts
import { createSAPPlugin } from "@oobe-protocol-labs/synapse-sap-sdk/plugin";

const plugin = createSAPPlugin(client);

// plugin.tools — array of 52 tool definitions
// plugin.meta  — { name, version, description }

// Each tool has:
// - name: string
// - description: string
// - schema: ZodSchema (input validation)
// - execute(input): Promise<result>

// Example: use with LangChain
const tools = plugin.tools.map(t => new DynamicTool({
  name: t.name,
  description: t.description,
  func: async (input) => JSON.stringify(await t.execute(JSON.parse(input))),
}));
```

### Tool Categories (52 total)

- **Agent** (7): register, update, deactivate, reactivate, close, fetch, reportCalls
- **Feedback** (5): give, update, revoke, close, fetch
- **Tools** (8): publish, inscribeSchema, update, deactivate, reactivate, close, reportInvocations, createCheckpoint
- **Vault** (9): initVault, openSession, inscribe, compactInscribe, closeSession, closeVault, addDelegate, revokeDelegate, inscribeDelegated
- **Escrow** (6): create, deposit, settle, withdraw, close, settleBatch
- **Attestation** (4): create, revoke, close, fetch
- **Ledger** (5): init, write, seal, close, decodeRingBuffer
- **Indexing** (4): registerCapability, registerProtocol, registerToolCategory, removeCapability
- **Discovery** (4): findByProtocol, findByCapability, getProfile, getOverview

---

## 17. PostgreSQL Off-Chain Mirror

Mirror all 22 on-chain account types to PostgreSQL for off-chain querying, analytics, and dashboards.

### Setup

```ts
import { SapPostgres, SapSyncEngine } from "@oobe-protocol-labs/synapse-sap-sdk/postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const pg = new SapPostgres(pool, client);

// Run DDL migrations (idempotent)
await pg.migrate();
```

### One-Shot Sync

```ts
const result = await pg.syncAll({
  onProgress: (step, total, type) => {
    console.log(`[${step}/${total}] Syncing ${type}...`);
  },
});
// result: { agents: 42, tools: 85, escrows: 120, ..., totalRecords: 1234, durationMs: 4500 }
```

### Periodic Sync (cron-style)

```ts
const sync = new SapSyncEngine(pg, client);

// Sync every 60 seconds
sync.start(60_000);

// Check status
sync.isRunning();  // true

// Stop
await sync.stop();
```

### Real-time Event Streaming

```ts
// Subscribe to SAP program logs via WebSocket
await sync.startEventStream();

// Events are inserted into sap_events table in real-time
// Stop streaming
await sync.stopEventStream();
```

### Query Helpers

```ts
// Fetch agent by PDA or wallet
const agent = await pg.getAgent("7xKXtg2CW87d97TXJSDpbD...");

// Active agents sorted by reputation
const top = await pg.getActiveAgents(50);

// Escrow balance
const balance = await pg.getEscrowBalance(agentPda, depositorWallet);

// Agent tools
const tools = await pg.getAgentTools(agentPda);

// Recent events
const events = await pg.getRecentEvents(100, "PaymentSettledEvent");

// Sync status per account type
const cursors = await pg.getSyncStatus();

// Raw SQL
const { rows } = await pg.query(
  "SELECT * FROM sap_agents WHERE reputation_score > $1 ORDER BY total_calls_served DESC",
  [800]
);
```

### Database Schema (22 tables)

| Table | Source Account | Key Columns |
|-------|---------------|-------------|
| `sap_global_registry` | `GlobalRegistry` | authority, total_agents, active_agents |
| `sap_agents` | `AgentAccount` | wallet, name, is_active, reputation_score, capabilities (JSONB) |
| `sap_agent_stats` | `AgentStats` | agent, total_calls, avg_latency, uptime |
| `sap_feedbacks` | `FeedbackAccount` | agent, reviewer, score (0–1000), tag |
| `sap_tools` | `ToolDescriptor` | agent, tool_name, http_method, category |
| `sap_escrows` | `EscrowAccount` | agent, depositor, balance, volume_curve (JSONB) |
| `sap_attestations` | `AgentAttestation` | attester, subject, attestation_type, is_revoked |
| `sap_memory_vaults` | `MemoryVault` | agent, nonce, protocol_version |
| `sap_sessions` | `SessionLedger` | vault, session_id, total_inscriptions |
| `sap_epoch_pages` | `EpochPage` | session, epoch_number, inscriptions_count |
| `sap_vault_delegates` | `VaultDelegate` | vault, delegate, permissions |
| `sap_checkpoints` | `SessionCheckpoint` | session, tag, data_hash |
| `sap_memory_ledgers` | `MemoryLedger` | session, num_entries, total_data_size |
| `sap_ledger_pages` | `LedgerPage` | ledger, page_number, is_sealed |
| `sap_capability_indexes` | `CapabilityIndex` | capability_hash, agents (TEXT[]) |
| `sap_protocol_indexes` | `ProtocolIndex` | protocol_hash, agents (TEXT[]) |
| `sap_tool_category_indexes` | `ToolCategoryIndex` | category, tools (TEXT[]) |
| `sap_plugin_slots` | `PluginSlot` | agent, plugin_type, pda |
| `sap_memory_entries` | `MemoryEntry` | vault, session, encrypted_data (BYTEA) |
| `sap_memory_chunks` | `MemoryChunk` | entry, chunk_index, data (BYTEA) |
| `sap_memory_buffers` | `MemoryBuffer` | vault, data (BYTEA) |
| `sap_memory_digests` | `MemoryDigest` | vault, digest_hash |
| `sap_events` | _(event log)_ | event_name, tx_signature, slot, data (JSONB) |
| `sap_sync_cursors` | _(sync tracking)_ | account_type, last_slot, last_signature |

### Views

- `sap_active_agents` — Active agents with reputation > 0
- `sap_escrow_balances` — Escrow balances joined with agent info
- `sap_agent_tools` — Tools joined with owning agent

---

## 18. Event System

### Parse Events from Transaction Logs

```ts
import { EventParser, SAP_EVENT_NAMES } from "@oobe-protocol-labs/synapse-sap-sdk";

const parser = client.events;

// Parse logs from a confirmed transaction
const events = parser.parseLogs(txLogs);

// Filter by name
const settled = parser.filterByName(events, "PaymentSettledEvent");

for (const event of settled) {
  console.log(event.data); // { agent, depositor, amount, callCount, ... }
}
```

### Event Names (45 total)

Key events include:
- `RegisteredEvent` — Agent registered
- `UpdatedEvent` — Agent updated
- `DeactivatedEvent` — Agent deactivated
- `FeedbackGivenEvent` — Feedback submitted
- `ToolPublishedEvent` — Tool published
- `MemoryInscribedEvent` — Data inscribed to vault
- `PaymentSettledEvent` — Escrow payment settled
- `EscrowCreatedEvent` — Escrow account created
- `AttestationCreatedEvent` — Attestation issued
- `LedgerEntryEvent` — Ledger write completed
- `DelegateAddedEvent` — Vault delegate granted
- `SessionOpenedEvent` — Memory session started
- `CheckpointCreatedEvent` — Session checkpoint saved

---

## 19. Error Hierarchy

```ts
import {
  SapError,                  // Base class
  SapValidationError,        // Client-side validation failure
  SapRpcError,               // RPC / network error
  SapAccountNotFoundError,   // Account not found on-chain
  SapTimeoutError,           // Transaction timeout
  SapPermissionError,        // Unauthorized operation
} from "@oobe-protocol-labs/synapse-sap-sdk";
```

```
SapError (base)
├── SapValidationError       — Input validation failed
├── SapRpcError              — Network/RPC failure (includes status code)
├── SapAccountNotFoundError  — PDA account does not exist
├── SapTimeoutError          — Transaction confirmation timeout
└── SapPermissionError       — Signer lacks authority
```

The on-chain program defines 91 custom errors (e.g., `AgentNotActive`, `EscrowInsufficientBalance`, `MaxCapabilitiesReached`, etc.) which are surfaced through `SapRpcError.logs`.

---

## 20. Integration with synapse-client-sdk

The `@oobe-protocol-labs/synapse-sap-sdk` is designed to work seamlessly alongside `synapse-client-sdk` — the general-purpose Solana client toolkit from OOBE Protocol.

### Shared Connection Pattern

```ts
import { SapConnection } from "@oobe-protocol-labs/synapse-sap-sdk";

// Both SDKs can share the same RPC connection
const conn = new SapConnection({
  rpcUrl: "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=YOUR_KEY",
  cluster: "mainnet-beta",
  commitment: "confirmed",
});

// Create SAP client from the connection
const sapClient = conn.createClient(wallet);

// The underlying provider/connection can be shared with synapse-client-sdk
const provider = conn.provider;
```

### Using Together

```ts
// synapse-client-sdk handles general Solana operations
// synapse-sap-sdk handles SAP-specific protocol operations

// 1. Use synapse-client-sdk for wallet/connection management
// 2. Pass the provider to SapClient for protocol operations

import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";

// Reuse the same Anchor provider from synapse-client-sdk 
const sapClient = SapClient.from(provider);

// Now you have full SAP v2 access
await sapClient.agent.register({ name: "MyAgent", description: "..." });
await sapClient.escrow.create(agentWallet, { ... });
await sapClient.session.start("conv-123");
```

### Complementary Flow

```
synapse-client-sdk               synapse-sap-sdk
──────────────────                ───────────────
Connection management    ──►     SapClient.from(provider)
Wallet / keypair         ──►     Agent registration
Transaction helpers      ──►     Escrow payments
RPC utilities            ──►     Memory vault operations
                                 Tool registry
                                 Discovery & indexing
                                 PostgreSQL sync
```

---

## 21. Best Practices & Patterns

### 1. Always Validate Before Sending

```ts
import { LIMITS } from "@oobe-protocol-labs/synapse-sap-sdk";

// Client-side validation prevents wasted transactions
if (name.length > LIMITS.MAX_NAME_LEN) throw new Error("Name too long");
if (capabilities.length > LIMITS.MAX_CAPABILITIES) throw new Error("Too many capabilities");
if (score > LIMITS.MAX_FEEDBACK_SCORE) throw new Error("Score out of range");
```

### 2. Use PDA Derivation (Not Hardcoded Addresses)

```ts
// ✅ Correct — deterministic, portable
const [agentPda] = deriveAgent(walletPubkey);
const [escrowPda] = deriveEscrow(agentPda, depositorWallet);

// ❌ Wrong — hardcoded addresses break across environments
const agentPda = new PublicKey("7xKXtg...");
```

### 3. Use Nullable Fetchers for Optional Accounts

```ts
// fetchNullable returns null instead of throwing
const agent = await client.agent.fetchNullable(agentPda);
if (!agent) {
  console.log("Agent not registered yet");
}

// fetch throws SapAccountNotFoundError if missing
try {
  const agent = await client.agent.fetch(agentPda);
} catch (e) {
  if (e instanceof SapAccountNotFoundError) { ... }
}
```

### 4. Use the Builder for Complex Registrations

```ts
// Builder is cleaner for multi-cap, multi-tier agents
await client.builder
  .agent("MultiDexBot")
  .description("...")
  .addCapability("jupiter:swap", { protocol: "jupiter" })
  .addCapability("raydium:swap", { protocol: "raydium" })
  .addPricingTier({ tierId: "basic", pricePerCall: 500_000, rateLimit: 30 })
  .addPricingTier({ tierId: "premium", pricePerCall: 200_000, rateLimit: 120 })
  .register();
```

### 5. Handle Volume Discounts in Escrow

```ts
// Volume curve gives automatic discounts at scale
await client.escrow.create(agentWallet, {
  pricePerCall: new BN(1_000_000),
  maxCalls: new BN(10_000),
  volumeCurve: [
    { afterCalls: 100,  pricePerCall: new BN(900_000) },  // -10%
    { afterCalls: 500,  pricePerCall: new BN(750_000) },  // -25%
    { afterCalls: 1000, pricePerCall: new BN(500_000) },  // -50%
  ],
});
```

### 6. Use PostgreSQL for Analytics

```ts
// Don't fetch from RPC for analytics — use PostgreSQL
const pg = new SapPostgres(pool, client);
await pg.syncAll(); // One-time sync

// Fast SQL queries instead of RPC calls
const topAgents = await pg.query(`
  SELECT name, reputation_score, total_calls_served
  FROM sap_agents
  WHERE is_active = true
  ORDER BY reputation_score DESC
  LIMIT 20
`);
```

### 7. Use Deep Imports for Tree-Shaking

```ts
// ✅ Tree-shakeable — only imports what you need
import { deriveAgent } from "@oobe-protocol-labs/synapse-sap-sdk/pda";
import { LIMITS } from "@oobe-protocol-labs/synapse-sap-sdk/constants";
import { SapPostgres } from "@oobe-protocol-labs/synapse-sap-sdk/postgres";

// Also fine — barrel import (all modules)
import { SapClient, deriveAgent, LIMITS } from "@oobe-protocol-labs/synapse-sap-sdk";
```

---

## 22. Limits Reference

Quick-reference table for all on-chain constraints:

| What | Max | Constant |
|------|-----|----------|
| Agent name | 64 bytes | `LIMITS.MAX_NAME_LEN` |
| Agent description | 256 bytes | `LIMITS.MAX_DESC_LEN` |
| Agent URI | 256 bytes | `LIMITS.MAX_URI_LEN` |
| Agent DID | 128 bytes | `LIMITS.MAX_AGENT_ID_LEN` |
| Capabilities per agent | 10 | `LIMITS.MAX_CAPABILITIES` |
| Pricing tiers per agent | 5 | `LIMITS.MAX_PRICING_TIERS` |
| Protocols per agent | 5 | `LIMITS.MAX_PROTOCOLS` |
| Plugins per agent | 5 | `LIMITS.MAX_PLUGINS` |
| Volume curve points | 5 | `LIMITS.MAX_VOLUME_CURVE_POINTS` |
| Feedback tag | 32 bytes | `LIMITS.MAX_TAG_LEN` |
| Feedback score | 0–1000 | `LIMITS.MAX_FEEDBACK_SCORE` |
| Agents per index | 100 | `LIMITS.MAX_AGENTS_PER_INDEX` |
| Tool name | 32 bytes | `LIMITS.MAX_TOOL_NAME_LEN` |
| Tools per category | 100 | `LIMITS.MAX_TOOLS_PER_CATEGORY` |
| Attestation type | 32 bytes | `LIMITS.MAX_ATTESTATION_TYPE_LEN` |
| Inscription size | 750 bytes | `LIMITS.MAX_INSCRIPTION_SIZE` |
| Inscriptions per epoch | 1000 | `LIMITS.INSCRIPTIONS_PER_EPOCH` |
| Ring buffer capacity | 4096 entries | `LIMITS.RING_CAPACITY` |
| Ledger write size | 750 bytes | `LIMITS.MAX_LEDGER_WRITE_SIZE` |
| Batch settlements | 10 | `LIMITS.MAX_BATCH_SETTLEMENTS` |

---

## 23. Full Exports Map

### Package Subpath Exports

```jsonc
{
  ".":                  "Root — everything",
  "./core":             "SapClient, SapConnection",
  "./agent":            "AgentModule",
  "./feedback":         "FeedbackModule",
  "./tools":            "ToolsModule",
  "./vault":            "VaultModule",
  "./escrow":           "EscrowModule",
  "./attestation":      "AttestationModule",
  "./ledger":           "LedgerModule",
  "./indexing":         "IndexingModule",
  "./pda":              "17 derive*() functions",
  "./types":            "All interfaces, enums, DTOs",
  "./constants":        "Program IDs, SEEDS, LIMITS",
  "./events":           "EventParser, SAP_EVENT_NAMES",
  "./errors":           "6 error classes",
  "./utils":            "sha256, hashToArray, assert",
  "./idl":              "Embedded Anchor IDL",
  "./plugin":           "SAPPlugin, createSAPPlugin",
  "./plugin/schemas":   "Zod validation schemas",
  "./registries":       "DiscoveryRegistry, X402Registry, SessionManager, AgentBuilder",
  "./registries/discovery": "DiscoveryRegistry (standalone)",
  "./registries/x402":     "X402Registry (standalone)",
  "./registries/session":  "SessionManager (standalone)",
  "./registries/builder":  "AgentBuilder (standalone)",
  "./postgres":         "SapPostgres, SapSyncEngine, serializers"
}
```

### Root Barrel Exports

From `@oobe-protocol-labs/synapse-sap-sdk`:

```ts
// Core
export { SapClient, SapConnection };

// Types (22 account interfaces + 11 instruction DTOs + 5 enums)
export type { AgentAccountData, EscrowAccountData, ToolDescriptorData, ... };
export { TokenType, SettlementMode, ToolHttpMethod, ToolCategory, PluginType };

// Constants
export { SAP_PROGRAM_ID, SEEDS, LIMITS, AGENT_VERSION, ... };

// PDA (17 functions)
export { deriveAgent, deriveEscrow, deriveTool, ... };

// Events
export { EventParser, SAP_EVENT_NAMES };

// Errors
export { SapError, SapValidationError, SapRpcError, ... };

// Modules
export { AgentModule, FeedbackModule, ToolsModule, VaultModule, ... };

// Registries
export { DiscoveryRegistry, X402Registry, SessionManager, AgentBuilder };

// Plugin
export { createSAPPlugin, SAPPlugin };

// PostgreSQL
export { SapPostgres, SapSyncEngine, SAP_TABLE_MAP };
```

---

## License

MIT — see [LICENSE](./LICENSE)

## Links

- **GitHub**: [github.com/OOBE-PROTOCOL/synapse-sap-sdk](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk)
- **npm**: [@oobe-protocol-labs/synapse-sap-sdk](https://www.npmjs.com/package/@oobe-protocol-labs/synapse-sap-sdk)
- **Program**: [SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ](https://solscan.io/account/SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ)
- **OOBE Protocol**: [oobeprotocol.ai](https://oobeprotocol.ai)
