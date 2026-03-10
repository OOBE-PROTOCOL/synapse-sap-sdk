# @synapse-sap/sdk

> TypeScript SDK for the **Synapse Agent Protocol (SAP v2)** on Solana.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-Anchor%200.32-purple.svg)](https://www.anchor-lang.com/)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Core — Client & Connection](#core--client--connection)
- [Modules (Low-Level)](#modules-low-level)
- [Registries (High-Level)](#registries-high-level)
- [Plugin (SynapseAgentKit)](#plugin-synapseagentkit)
- [PDA Derivation](#pda-derivation)
- [Events](#events)
- [Error Handling](#error-handling)
- [Utilities](#utilities)
- [Types](#types)
- [Constants](#constants)
- [Deep Imports](#deep-imports)
- [API Reference](#api-reference)
- [Development](#development)
- [License](#license)

---

## Features

- **8 domain modules** — Agent, Feedback, Indexing, Tools, Vault, Escrow, Attestation, Ledger
- **4 high-level registries** — Discovery, x402 Payments, Session Manager, Agent Builder
- **52-tool plugin adapter** — drop-in for `SynapseAgentKit` / LangChain tooling
- **SapConnection** — RPC-first entry point compatible with `synapse-client-sdk`
- **Typed errors** — `SapError`, `SapRpcError`, `SapAccountNotFoundError`, etc.
- **Serialization** — automatic `PublicKey`/`BN` → JSON-safe object conversion
- **17 PDA functions** — deterministic, pure, memoizable
- **Fully typed** — 17 account interfaces, 11 instruction DTOs, 38 decoded events
- **Dual output** — CommonJS + ESM with TypeScript declarations
- **Subpath exports** — `@synapse-sap/sdk/core`, `@synapse-sap/sdk/types`, etc.
- **Tree-shakeable** — import only what you need
- **Embedded IDL** — zero external workspace dependency; npm-ready
- **Strict TypeScript** — `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`

## Installation

```bash
# Yarn
yarn add @synapse-sap/sdk @coral-xyz/anchor @solana/web3.js

# npm
npm install @synapse-sap/sdk @coral-xyz/anchor @solana/web3.js
```

### Peer Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| `@coral-xyz/anchor` | `>=0.30.0` | Required |
| `@solana/web3.js` | `>=1.90.0` | Required |
| `zod` | `>=3.20.0` | Optional — only for plugin schemas |

---

## Quick Start

### Option A — Anchor Provider (classic)

```typescript
import { SapClient } from "@synapse-sap/sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

const provider = AnchorProvider.env();
const client = SapClient.from(provider);

// Register agent
await client.agent.register({
  name: "SwapBot",
  description: "AI-powered DEX aggregator",
  capabilities: [{ id: "jupiter:swap", description: null, protocolId: "jupiter", version: "1.0.0" }],
  pricing: [],
  protocols: ["jupiter"],
});

// Fetch agent
const agent = await client.agent.fetch();
console.log(agent.name, agent.isActive);
```

### Option B — RPC URL + Keypair (synapse-client-sdk compatible)

```typescript
import { SapConnection } from "@synapse-sap/sdk";
import { Keypair } from "@solana/web3.js";

// One-liner:
const { client } = SapConnection.fromKeypair(
  "https://api.devnet.solana.com",
  Keypair.generate(),
);

// Or step-by-step:
const conn = SapConnection.devnet();        // or .mainnet(rpcUrl), .localnet()
const client = conn.fromKeypair(myKeypair);

// Use exactly the same API:
await client.agent.register({ ... });
```

### Option C — Fluent Builder

```typescript
import { SapClient } from "@synapse-sap/sdk";

const client = SapClient.from(provider);

await client.builder
  .agent("SwapBot")
  .description("AI-powered swap agent")
  .x402Endpoint("https://api.example.com/x402")
  .addCapability("jupiter:swap", { protocol: "jupiter" })
  .addPricingTier({
    tierId: "standard",
    pricePerCall: 1000,
    rateLimit: 60,
  })
  .register();
```

---

## Architecture

### Directory Structure

```
src/
├── index.ts              # Root barrel export
│
├── core/                 # Client & connection infrastructure
│   ├── client.ts         # SapClient — Anchor program wrapper
│   ├── connection.ts     # SapConnection — RPC factory (synapse-client-sdk compat)
│   └── index.ts
│
├── types/                # On-chain type mirrors
│   ├── enums.ts          # Anchor enum variant objects
│   ├── common.ts         # Shared structs (Capability, PricingTier, …)
│   ├── accounts.ts       # 17 account data interfaces
│   ├── instructions.ts   # 11 instruction arg DTOs + helpers
│   └── index.ts
│
├── constants/            # Protocol constants
│   ├── programs.ts       # Network-specific program IDs
│   ├── seeds.ts          # 20 PDA seed prefixes
│   ├── limits.ts         # Size constraints, versions
│   └── index.ts
│
├── pda/                  # PDA derivation functions
│   └── index.ts          # 17 derive* functions
│
├── events/               # Event parsing
│   └── index.ts          # EventParser + 38 event types
│
├── errors/               # Typed SDK error classes
│   └── index.ts          # SapError hierarchy
│
├── utils/                # Shared utilities
│   ├── hash.ts           # sha256, hashToArray
│   ├── validation.ts     # assert
│   ├── serialization.ts  # serializeAccount, serializeValue
│   └── index.ts
│
├── modules/              # Low-level instruction wrappers
│   ├── base.ts           # BaseModule abstract class
│   ├── agent.ts          # Identity, reputation, lifecycle
│   ├── feedback.ts       # Trustless reviews
│   ├── indexing.ts       # Discovery indexes
│   ├── tools.ts          # Tool schema registry
│   ├── vault.ts          # Encrypted memory vault
│   ├── escrow.ts         # x402 micropayments
│   ├── attestation.ts    # Web-of-trust vouching
│   ├── ledger.ts         # Ring-buffer memory
│   └── index.ts
│
├── registries/           # High-level abstractions
│   ├── discovery.ts      # DiscoveryRegistry — findAgents*, profiles
│   ├── x402.ts           # X402Registry — pricing, headers, settlement
│   ├── session.ts        # SessionManager — vault+session+ledger lifecycle
│   ├── builder.ts        # AgentBuilder — fluent registration
│   └── index.ts
│
├── plugin/               # SynapseAgentKit adapter (52 tools)
│   ├── index.ts          # createSAPPlugin factory
│   ├── protocols.ts      # 8 protocol method registries
│   └── schemas.ts        # Zod schemas for LLM tool validation
│
└── idl/                  # Embedded Anchor IDL
    ├── index.ts          # SAP_IDL, IDL_PROGRAM_ADDRESS
    └── synapse_agent_sap.json  # 58 ix, 17 accounts, 38 events
```

### SapClient Access Tree

```
SapClient
│
│ Modules (low-level, 1:1 with program instructions):
├── .agent          → AgentModule        (identity, reputation, lifecycle)
├── .feedback       → FeedbackModule     (trustless reviews)
├── .indexing       → IndexingModule     (capability/protocol/category indexes)
├── .tools          → ToolsModule        (tool schemas, checkpoints)
├── .vault          → VaultModule        (encrypted memory, delegation)
├── .escrow         → EscrowModule       (x402 micropayments, batch settle)
├── .attestation    → AttestationModule  (web-of-trust vouching)
├── .ledger         → LedgerModule       (ring buffer, sealed pages)
├── .events         → EventParser        (decoded TX-log events)
│
│ Registries (high-level, cross-module aggregation):
├── .discovery      → DiscoveryRegistry  (findAgents*, profiles, network overview)
├── .x402           → X402Registry       (pricing, headers, settlement lifecycle)
├── .session        → SessionManager     (vault → session → ledger lifecycle)
└── .builder        → AgentBuilder       (fluent registration + tools)
```

All module and registry properties are **lazily instantiated** (created on first access).

---

## Core — Client & Connection

### SapClient

The primary entry point. Wraps an Anchor `Program` and exposes domain modules.

```typescript
import { SapClient } from "@synapse-sap/sdk";

// From AnchorProvider (auto-loads embedded IDL)
const client = SapClient.from(provider);

// From an existing Program instance
const client = SapClient.fromProgram(program);

// With custom program ID
const client = SapClient.from(provider, customProgramId);

// Access properties
client.program;       // Anchor Program instance
client.walletPubkey;  // Wallet public key
```

### SapConnection

RPC-first factory. Creates `SapClient` instances from an RPC URL — no Anchor boilerplate. Resolves the correct program ID automatically based on cluster.

```typescript
import { SapConnection } from "@synapse-sap/sdk";

// ─── Cluster shortcuts ───
const conn = SapConnection.devnet();
const conn = SapConnection.mainnet("https://my-rpc.com");
const conn = SapConnection.localnet();

// ─── Custom config ───
const conn = new SapConnection({
  rpcUrl: "https://my-rpc-provider.com",
  cluster: "mainnet-beta",
  commitment: "confirmed",
  wsUrl: "wss://my-rpc-provider.com/ws",
});

// ─── Create client ───
const client = conn.fromKeypair(keypair);
const client = conn.createClient(wallet);   // Anchor Wallet

// ─── One-liner with client attached ───
const { client, connection, cluster, programId } = SapConnection.fromKeypair(
  "https://api.devnet.solana.com",
  keypair,
);

// ─── Utility methods ───
await conn.airdrop(pubkey, 2);               // 2 SOL (devnet/localnet)
const balance = await conn.getBalanceSol(pubkey); // SOL balance
```

---

## Modules (Low-Level)

Each module wraps one protocol domain. All methods return `TransactionSignature` (the TX hash) unless documented otherwise.

### Agent

```typescript
// Register
await client.agent.register({
  name: "Bot",
  description: "AI agent",
  capabilities: [{ id: "swap", description: null, protocolId: "jupiter", version: "1.0.0" }],
  pricing: [],
  protocols: ["jupiter"],
});

// Update metadata
await client.agent.update({ name: "BotV2" });

// Report metrics
await client.agent.reportCalls(42);
await client.agent.updateReputation(150, 9950);  // 150ms latency, 99.50% uptime

// Lifecycle
await client.agent.deactivate();
await client.agent.reactivate();
await client.agent.close();

// Fetch
const agent = await client.agent.fetch(walletPubkey);
const stats = await client.agent.fetchStats(agentPda);
const registry = await client.agent.fetchGlobalRegistry();
```

### Vault (Encrypted Memory)

```typescript
// Init vault
await client.vault.initVault(Array.from(nonce));

// Open session
await client.vault.openSession(Array.from(sessionHash));

// Inscribe encrypted data (zero rent — written to TX log)
await client.vault.inscribe({
  sequence: 0,
  encryptedData: ciphertext,
  nonce: nonce,
  contentHash: hash,
  totalFragments: 1,
  fragmentIndex: 0,
  compression: 0,
  epochIndex: 0,
});

// Delegation (hot wallet)
await client.vault.addDelegate(hotWallet, 0b111, expiresAt);
await client.vault.revokeDelegate(hotWallet);

// Close
await client.vault.closeSession(vaultPda, sessionPda);
await client.vault.closeVault();
```

### Escrow (x402 Micropayments)

```typescript
// Create SOL escrow
await client.escrow.create(agentWallet, {
  pricePerCall: new BN(1_000_000),
  maxCalls: new BN(100),
  initialDeposit: new BN(100_000_000),
  expiresAt: new BN(0),
  volumeCurve: [],
  tokenMint: null,
  tokenDecimals: 9,
});

// Deposit
await client.escrow.deposit(agentWallet, new BN(50_000_000));

// Agent settles calls
await client.escrow.settle(depositorWallet, 10, serviceHash);

// Batch settlement (up to 10 per TX)
await client.escrow.settleBatch(depositorWallet, [
  { callsToSettle: new BN(5), serviceHash: hash1 },
  { callsToSettle: new BN(3), serviceHash: hash2 },
]);

// Withdraw remaining
await client.escrow.withdraw(agentWallet, new BN(10_000_000));
```

### Ledger (Ring Buffer Memory)

```typescript
// Init ledger (~0.032 SOL rent)
await client.ledger.init(sessionPda);

// Write entries (TX fee only, zero additional rent)
await client.ledger.write(sessionPda, data, contentHash);

// Seal current buffer to permanent page (~0.031 SOL)
await client.ledger.seal(sessionPda);

// Read
const ledger = await client.ledger.fetchLedger(sessionPda);
const page = await client.ledger.fetchPage(ledgerPda, 0);
const entries = client.ledger.decodeRingBuffer(ledgerData.ringBuffer);

// Close
await client.ledger.close(sessionPda);
```

### Feedback, Attestation, Tools, Indexing

```typescript
// ── Feedback ──
await client.feedback.give(agentWallet, { score: 5, tag: "fast", commentHash: null });
await client.feedback.update(agentWallet, { newScore: 4, newTag: null, commentHash: null });
await client.feedback.revoke(agentWallet);

// ── Attestation ──
await client.attestation.create(agentWallet, {
  attestationType: 1,
  metadataHash: [...hashBytes],
  expiresAt: new BN(Date.now() / 1000 + 86400 * 365),
});
await client.attestation.revoke(agentWallet);

// ── Tools ──
await client.tools.publishByName("swap", "jupiter", "Execute swap", input, output, 1, 0, 3, 2, false);
await client.tools.inscribeSchema("swap", { schemaType: 0, schemaData, schemaHash, compression: 0 });
await client.tools.update("swap", { httpMethod: 1, category: null, ... });

// ── Indexing ──
await client.indexing.initCapabilityIndex("jupiter:swap");
await client.indexing.addToCapabilityIndex("jupiter:swap");
await client.indexing.initProtocolIndex("jupiter");
await client.indexing.addToProtocolIndex("jupiter");
```

---

## Registries (High-Level)

Registries provide **cross-module orchestration** with developer-friendly APIs.

### DiscoveryRegistry

```typescript
// Find agents by protocol
const agents = await client.discovery.findAgentsByProtocol("jupiter");

// Find by capability
const swappers = await client.discovery.findAgentsByCapability("jupiter:swap");

// Get full agent profile
const profile = await client.discovery.getAgentProfile(agentWallet);
// → { agent, stats, tools, feedback, attestations }

// Find tools by category
const tools = await client.discovery.findToolsByCategory("swap");

// Network overview
const overview = await client.discovery.getNetworkOverview();
// → { totalAgents, activeAgents, totalTools, protocols, categories }
```

### X402Registry

```typescript
// Prepare payment context
const ctx = await client.x402.preparePayment(agentWallet, {
  tierId: "standard",
  maxCalls: 100,
  initialDeposit: new BN(100_000_000),
});

// Build HTTP headers (for x402 protocol)
const headers = client.x402.buildPaymentHeaders(ctx);
// → { "X-402-Token": "...", "X-402-Agent": "...", ... }

// Estimate costs
const cost = await client.x402.estimateCost(agentWallet, 50);
// → { totalLamports, perCallLamports, tierId }

// Settle
const receipt = await client.x402.settle(depositor, 5, serviceData);

// Batch settle
const results = await client.x402.batchSettle(depositor, settlements);

// Check balance
const balance = await client.x402.getBalance(agentWallet, depositorWallet);
```

### SessionManager

Manages the full `vault → session → ledger` lifecycle in one API:

```typescript
// Start a session (inits vault + opens session + inits ledger)
const ctx = await client.session.start("conversation-123");
// → { vaultPda, sessionPda, ledgerPda, sessionHash }

// Write data
const result = await client.session.write(ctx, "Hello from agent");
// → { txSignature, sequence }

// Read latest entries
const messages = await client.session.readLatest(ctx);
// → RingBufferEntry[]

// Seal to permanent storage
const seal = await client.session.seal(ctx);
// → { txSignature, pageIndex }

// Get session status
const status = await client.session.getStatus(ctx);
// → { isOpen, totalWrites, sealedPages, ringBufferUsage }

// End session
await client.session.end(ctx);
```

### AgentBuilder

Fluent builder for one-shot agent registration with tools:

```typescript
const result = await client.builder
  .agent("SwapBot")
  .description("AI-powered DEX aggregator using Jupiter")
  .x402Endpoint("https://api.mybot.com/x402")
  .addCapability("jupiter:swap", {
    protocol: "jupiter",
    description: "Execute token swaps",
  })
  .addCapability("jupiter:quote", {
    protocol: "jupiter",
    description: "Get swap quotes",
  })
  .addPricingTier({
    tierId: "standard",
    pricePerCall: 1000,
    rateLimit: 60,
    tokenType: "sol",
    settlementMode: "x402",
  })
  .addTool({
    name: "swap",
    protocolId: "jupiter",
    description: "Execute a token swap",
    category: "swap",
    httpMethod: "post",
    paramsCount: 3,
    requiredParams: 2,
  })
  .registerWithTools();
// → { agentTx, toolTxs: string[] }
```

---

## Plugin (SynapseAgentKit)

The SDK ships a 52-tool plugin that integrates with `SynapseAgentKit` and
LangChain-compatible AI agent frameworks:

```typescript
import { createSAPPlugin } from "@synapse-sap/sdk/plugin";

// Create plugin
const sapPlugin = createSAPPlugin({ provider });

// Use with SynapseAgentKit
const kit = new SynapseAgentKit({ rpcUrl })
  .use(sapPlugin);

const tools = kit.getTools(); // → 52 LangChain StructuredTool instances
```

**8 Protocol Domains × Tools:**

| Protocol | Tools |
|----------|-------|
| `sap-agent` | registerAgent, updateAgent, deactivateAgent, reactivateAgent, reportCalls, updateReputation, fetchAgent, fetchGlobalRegistry |
| `sap-feedback` | giveFeedback, updateFeedback, revokeFeedback, fetchFeedback |
| `sap-attestation` | createAttestation, revokeAttestation, fetchAttestation |
| `sap-escrow` | createEscrow, depositEscrow, settleEscrow, withdrawEscrow, batchSettle, fetchEscrow |
| `sap-tools` | publishToolByName, inscribeToolSchema, updateTool, deactivateTool, reactivateTool, reportInvocations, fetchTool |
| `sap-vault` | initVault, openSession, inscribeMemory, closeSession, closeVault, rotateNonce, addDelegate, revokeDelegate, fetchVault, fetchSession |
| `sap-indexing` | initCapabilityIndex, addToCapabilityIndex, removeFromCapabilityIndex, initProtocolIndex, addToProtocolIndex, removeFromProtocolIndex, fetchCapabilityIndex, fetchProtocolIndex |
| `sap-ledger` | initLedger, writeLedger, sealLedger, closeLedger, fetchLedger, fetchLedgerPage |

---

## PDA Derivation

All 17 PDA functions are pure (no RPC calls) and return `[PublicKey, bump]`:

```typescript
import {
  deriveAgent,
  deriveVault,
  deriveSession,
  deriveEscrow,
  deriveTool,
  deriveLedger,
  deriveAttestation,
} from "@synapse-sap/sdk/pda";

const [agentPda, bump]  = deriveAgent(walletPubkey);
const [vaultPda]        = deriveVault(agentPda);
const [sessionPda]      = deriveSession(vaultPda, sessionHashBytes);
const [escrowPda]       = deriveEscrow(agentPda, depositorPubkey);
const [toolPda]         = deriveTool(agentPda, toolNameHash);
const [ledgerPda]       = deriveLedger(sessionPda);
const [attestPda]       = deriveAttestation(agentPda, attesterPubkey);
```

**Full list:** `deriveGlobalRegistry`, `deriveAgent`, `deriveAgentStats`, `deriveFeedback`, `deriveCapabilityIndex`, `deriveProtocolIndex`, `deriveToolCategoryIndex`, `deriveVault`, `deriveSession`, `deriveEpochPage`, `deriveVaultDelegate`, `deriveCheckpoint`, `deriveTool`, `deriveEscrow`, `deriveAttestation`, `deriveLedger`, `deriveLedgerPage`

---

## Events

Decode SAP events from transaction logs:

```typescript
import { EventParser } from "@synapse-sap/sdk";

// Parse
const events = client.events.parseLogs(txLogs);

// Filter
const inscriptions = client.events.filterByName(events, "MemoryInscribedEvent");
const payments     = client.events.filterByName(events, "PaymentSettledEvent");

// 38 event types available (see API Reference)
```

---

## Error Handling

The SDK provides a typed error hierarchy for precise error handling:

```typescript
import {
  SapError,
  SapRpcError,
  SapAccountNotFoundError,
  SapValidationError,
  SapTimeoutError,
  SapPermissionError,
} from "@synapse-sap/sdk";

try {
  const agent = await client.agent.fetch();
} catch (err) {
  if (err instanceof SapAccountNotFoundError) {
    // Account doesn't exist on-chain
    console.log(`${err.accountType} not found: ${err.address}`);
  } else if (err instanceof SapRpcError) {
    // Anchor / RPC error with code and logs
    console.error(`RPC error ${err.rpcCode}:`, err.logs);
  } else if (err instanceof SapValidationError) {
    // SDK-side validation failed
    console.error(`Invalid ${err.field}:`, err.message);
  } else if (err instanceof SapTimeoutError) {
    // Transaction confirmation timeout
    console.error(`Timeout after ${err.timeoutMs}ms`);
  } else if (err instanceof SapPermissionError) {
    // Missing authority / delegate permission
    console.error(err.message);
  } else if (err instanceof SapError) {
    // Catch-all for any SAP SDK error
    console.error(`[${err.code}]`, err.message);
  }
}

// Wrapping Anchor errors
try {
  await program.methods.registerAgent(...).rpc();
} catch (e) {
  throw SapRpcError.fromAnchor(e); // extracts code + logs
}
```

---

## Utilities

```typescript
import { sha256, hashToArray, assert, serializeAccount, serializeValue } from "@synapse-sap/sdk";

// ── Hashing ──
const hash = sha256("jupiter:swap");        // Uint8Array (32 bytes)
const arr  = hashToArray(hash);             // number[] for Anchor args

// ── Assertion ──
assert(score >= 1 && score <= 5, "Score must be 1–5"); // throws RangeError

// ── Serialization (PublicKey/BN → JSON-safe) ──
const raw = await program.account.agent.fetch(pda);
const json = serializeAccount(raw);
// { authority: "GBL...", totalCalls: "42", isActive: true }

const val = serializeValue(somePublicKey);  // → "base58string"
const val = serializeValue(new BN(1000));   // → "1000"
```

---

## Types

Every on-chain type is mirrored in TypeScript:

```typescript
import type {
  // Account data
  AgentAccountData,
  EscrowAccountData,
  MemoryVaultData,
  ToolDescriptorData,

  // Instruction args
  RegisterAgentArgs,
  CreateEscrowArgs,
  InscribeMemoryArgs,

  // Helper types
  Capability,
  PricingTier,
  Settlement,
  VolumeCurveBreakpoint,
} from "@synapse-sap/sdk/types";

import {
  TokenType,          // { sol: {}, usdc: {}, spl: {} }
  SettlementMode,     // { instant: {}, escrow: {}, batched: {}, x402: {} }
  ToolCategory,       // { swap: {}, lend: {}, stake: {}, ... }
  DelegatePermission, // READ, WRITE, ADMIN bit flags
  SchemaType,         // INPUT, OUTPUT, DESCRIPTION
  CompressionType,    // NONE, DEFLATE, GZIP, BROTLI
} from "@synapse-sap/sdk/types";
```

---

## Constants

```typescript
import {
  SAP_PROGRAM_ADDRESS,       // "SAPTU7aUXk2AaAdktexae1iuxXpokxzNDBAYYhaVyQL"
  SAP_PROGRAM_ID,            // PublicKey (= devnet for now)
  MAINNET_SAP_PROGRAM_ID,    // PublicKey
  DEVNET_SAP_PROGRAM_ID,     // PublicKey
  LOCALNET_SAP_PROGRAM_ID,   // PublicKey
  SEEDS,                     // { agent: "agent", vault: "vault", ... } (20 seeds)
  LIMITS,                    // { maxNameLen: 64, maxCapabilities: 10, ... } (23 limits)
  AGENT_VERSION,             // 2
  VAULT_PROTOCOL_VERSION,    // 2
  TOOL_CATEGORY_VALUES,      // { swap: 0, lend: 1, ... }
  HTTP_METHOD_VALUES,        // { get: 0, post: 1, ... }
} from "@synapse-sap/sdk/constants";
```

---

## Deep Imports

Import individual packages for smaller bundles:

```typescript
// Core
import { SapClient, SapConnection } from "@synapse-sap/sdk/core";

// Individual modules
import { AgentModule } from "@synapse-sap/sdk/agent";
import { EscrowModule } from "@synapse-sap/sdk/escrow";

// Types only (zero runtime cost)
import type { AgentAccountData } from "@synapse-sap/sdk/types";
import type { SapCluster } from "@synapse-sap/sdk/core";

// PDA derivation
import { deriveAgent, deriveEscrow } from "@synapse-sap/sdk/pda";

// Constants
import { SEEDS, LIMITS } from "@synapse-sap/sdk/constants";

// Events
import { EventParser } from "@synapse-sap/sdk/events";

// Errors
import { SapError, SapRpcError } from "@synapse-sap/sdk/errors";

// Utilities
import { sha256, serializeAccount } from "@synapse-sap/sdk/utils";

// IDL
import { SAP_IDL } from "@synapse-sap/sdk/idl";

// Plugin
import { createSAPPlugin } from "@synapse-sap/sdk/plugin";

// Registries
import { DiscoveryRegistry } from "@synapse-sap/sdk/registries/discovery";
import { X402Registry } from "@synapse-sap/sdk/registries/x402";
import { SessionManager } from "@synapse-sap/sdk/registries/session";
import { AgentBuilder } from "@synapse-sap/sdk/registries/builder";
```

---

## API Reference

### Accounts (17 types)

| Account | Description |
|---------|-------------|
| `AgentAccountData` | Agent identity, capabilities, pricing, protocols |
| `AgentStatsData` | Call count, latency, uptime metrics |
| `GlobalRegistryData` | Protocol-wide agent counter + authority |
| `FeedbackAccountData` | Single reviewer's feedback for an agent |
| `CapabilityIndexData` | List of agents with a given capability |
| `ProtocolIndexData` | List of agents supporting a protocol |
| `ToolCategoryIndexData` | List of tools in a category |
| `ToolDescriptorData` | Tool schema, metadata, invocation stats |
| `SessionCheckpointData` | Session checkpoint for recovery |
| `MemoryVaultData` | Encrypted vault metadata + encryption nonce |
| `SessionLedgerData` | Session within a vault |
| `EpochPageData` | Finalized epoch page of inscriptions |
| `VaultDelegateData` | Delegate permissions + expiry |
| `EscrowAccountData` | x402 escrow balance + settlement state |
| `AgentAttestationData` | Attestation metadata + expiry |
| `MemoryLedgerData` | Ring-buffer ledger metadata |
| `LedgerPageData` | Sealed ledger page content |

### Events (38 types)

`RegisteredEvent` · `UpdatedEvent` · `DeactivatedEvent` · `ReactivatedEvent` · `ClosedEvent` · `FeedbackEvent` · `FeedbackUpdatedEvent` · `FeedbackRevokedEvent` · `ReputationUpdatedEvent` · `CallsReportedEvent` · `VaultInitializedEvent` · `SessionOpenedEvent` · `MemoryInscribedEvent` · `EpochOpenedEvent` · `SessionClosedEvent` · `VaultClosedEvent` · `SessionPdaClosedEvent` · `EpochPageClosedEvent` · `VaultNonceRotatedEvent` · `DelegateAddedEvent` · `DelegateRevokedEvent` · `ToolPublishedEvent` · `ToolSchemaInscribedEvent` · `ToolUpdatedEvent` · `ToolDeactivatedEvent` · `ToolReactivatedEvent` · `ToolClosedEvent` · `ToolInvocationReportedEvent` · `CheckpointCreatedEvent` · `EscrowCreatedEvent` · `EscrowDepositedEvent` · `PaymentSettledEvent` · `EscrowWithdrawnEvent` · `BatchSettledEvent` · `AttestationCreatedEvent` · `AttestationRevokedEvent` · `LedgerEntryEvent` · `LedgerSealedEvent`

### Enum Constants

| Enum | Variants |
|------|----------|
| `TokenType` | `sol`, `usdc`, `spl` |
| `PluginType` | `native`, `wasm`, `external` |
| `SettlementMode` | `instant`, `escrow`, `batched`, `x402` |
| `ToolHttpMethod` | `get`, `post`, `put`, `delete`, `compound` |
| `ToolCategory` | `swap`, `lend`, `stake`, `nft`, `payment`, `data`, `governance`, `bridge`, `analytics`, `custom` |
| `DelegatePermission` | `READ` (1), `WRITE` (2), `ADMIN` (4) |
| `SchemaType` | `INPUT` (0), `OUTPUT` (1), `DESCRIPTION` (2) |
| `CompressionType` | `NONE` (0), `DEFLATE` (1), `GZIP` (2), `BROTLI` (3) |

---

## Development

```bash
yarn install        # Install dependencies
yarn typecheck      # Type-check (strict mode)
yarn build          # Build CJS + ESM + declarations
yarn clean          # Remove dist/
yarn sync-idl       # Copy latest IDL from anchor build
```

### Building for Developers

The SDK outputs three artifacts:

| Output | Path | Config |
|--------|------|--------|
| ESM | `dist/esm/` | `tsconfig.esm.json` |
| CJS | `dist/cjs/` | `tsconfig.cjs.json` |
| Types | `dist/types/` | `tsconfig.json --emitDeclarationOnly` |

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development guidelines.

---

## License

[MIT](LICENSE)
