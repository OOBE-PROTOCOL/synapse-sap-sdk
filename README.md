# @synapse-sap/sdk

> TypeScript SDK for the **Synapse Agent Protocol (SAP v2)** on Solana.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-Anchor%200.32-purple.svg)](https://www.anchor-lang.com/)

---

## Features

- **8 domain modules** — Agent, Feedback, Indexing, Tools, Vault, Escrow, Attestation, Ledger
- **Fully typed** — 18 account interfaces, 11 instruction arg DTOs, typed events
- **17 PDA derivation functions** — deterministic, pure, memoizable
- **Dual output** — CommonJS + ESM with TypeScript declarations
- **Subpath exports** — `@synapse-sap/sdk/agent`, `@synapse-sap/sdk/pda`, etc.
- **Tree-shakeable** — import only what you need
- **Strict TypeScript** — `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`

## Installation

```bash
# Yarn
yarn add @synapse-sap/sdk @coral-xyz/anchor @solana/web3.js

# npm
npm install @synapse-sap/sdk @coral-xyz/anchor @solana/web3.js
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `@coral-xyz/anchor` | `>=0.30.0` |
| `@solana/web3.js` | `>=1.90.0` |

## Quick Start

```typescript
import { SapClient } from "@synapse-sap/sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import { BN } from "bn.js";

// 1. Create client
const provider = AnchorProvider.env();
const client = SapClient.from(provider);

// 2. Register an agent
await client.agent.register({
  name: "SwapBot",
  description: "AI-powered DEX aggregator",
  capabilities: [{
    id: "jupiter:swap",
    description: "Execute token swaps via Jupiter",
    protocolId: "jupiter",
    version: "1.0.0",
  }],
  pricing: [],
  protocols: ["jupiter"],
});

// 3. Fetch agent data
const agent = await client.agent.fetch();
console.log(agent.name, agent.isActive);

// 4. Create an escrow for micropayments
await client.escrow.create(agentWallet, {
  pricePerCall: new BN(1_000_000),   // 0.001 SOL per call
  maxCalls: new BN(100),
  initialDeposit: new BN(100_000_000), // 0.1 SOL
  expiresAt: new BN(0),              // no expiry
  volumeCurve: [],
  tokenMint: null,                   // SOL escrow
  tokenDecimals: 9,
});

// 5. Write to the memory ledger (zero additional rent)
await client.ledger.write(sessionPda, data, contentHash);
```

## Architecture

```
SapClient
├── .agent          → AgentModule        (identity, reputation, lifecycle)
├── .feedback       → FeedbackModule     (trustless reviews)
├── .indexing       → IndexingModule     (capability/protocol/category discovery)
├── .tools          → ToolsModule        (schema registry, checkpoints)
├── .vault          → VaultModule        (encrypted memory, delegation)
├── .escrow         → EscrowModule       (x402 micropayments, batch settlement)
├── .attestation    → AttestationModule  (web-of-trust vouching)
├── .ledger         → LedgerModule       (ring buffer, sealed pages, merkle proofs)
└── .events         → EventParser        (typed event decoding from TX logs)
```

## Module Usage

### Agent

```typescript
// Register
await client.agent.register({ name: "Bot", description: "...", ... });

// Update metadata
await client.agent.update({ name: "BotV2" });

// Report metrics
await client.agent.reportCalls(42n);
await client.agent.updateReputation(150, 9950); // 150ms avg, 99.50% uptime

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
// Initialize vault with encryption nonce
await client.vault.initVault(Array.from(nonce));

// Open session
await client.vault.openSession(Array.from(sessionHash));

// Inscribe encrypted data (zero rent — TX log only)
await client.vault.inscribeWithAccounts(sessionPda, epochPagePda, vaultPda, {
  sequence: 0,
  encryptedData: Array.from(ciphertext),
  nonce: Array.from(nonce),
  contentHash: Array.from(hash),
  totalFragments: 1,
  fragmentIndex: 0,
  compression: 0,
  epochIndex: 0,
});

// Delegation (hot wallet)
await client.vault.addDelegate(hotWallet, 0b111, expiresAt);
await client.vault.inscribeDelegated(hotWallet, vaultPda, sessionPda, epochPda, args);
```

### Escrow (x402 Micropayments)

```typescript
// Create SOL escrow
await client.escrow.create(agentWallet, { ... });

// Deposit more
await client.escrow.deposit(agentWallet, new BN(50_000_000));

// Agent settles calls
await client.escrow.settle(depositorWallet, 10, serviceHash);

// Batch settlement (up to 10 per TX)
await client.escrow.settleBatch(depositorWallet, [
  { callsToSettle: new BN(5), serviceHash: hash1 },
  { callsToSettle: new BN(3), serviceHash: hash2 },
]);

// SPL token escrow (pass remaining accounts)
await client.escrow.create(agentWallet, args, [
  { pubkey: depositorAta, isSigner: false, isWritable: true },
  { pubkey: escrowAta,    isSigner: false, isWritable: true },
  { pubkey: tokenMint,    isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
]);
```

### Ledger (Ring Buffer Memory)

```typescript
// Init ledger (~0.032 SOL for 4KB ring buffer)
await client.ledger.init(sessionPda);

// Write entries (TX fee only, zero additional rent)
await client.ledger.write(sessionPda, data, contentHash);

// Seal current buffer to permanent page (~0.031 SOL)
await client.ledger.seal(sessionPda);

// Decode ring buffer entries
const entries = client.ledger.decodeRingBuffer(ledgerData.ringBuffer);

// Fetch
const ledger = await client.ledger.fetchLedger(sessionPda);
const page = await client.ledger.fetchPage(ledgerPda, 0);
```

### Events

```typescript
// Parse events from transaction logs
const events = client.events.parseLogs(txLogs);

// Filter by name
const inscriptions = client.events.filterByName(events, "MemoryInscribedEvent");
const settlements = client.events.filterByName(events, "PaymentSettledEvent");
```

## PDA Derivation

All 17 PDA functions are available for direct use:

```typescript
import { deriveAgent, deriveVault, deriveEscrow } from "@synapse-sap/sdk/pda";

const [agentPda, bump] = deriveAgent(walletPubkey);
const [vaultPda]        = deriveVault(agentPda);
const [escrowPda]       = deriveEscrow(agentPda, depositorPubkey);
```

## Subpath Imports

Import only what you need for smaller bundles:

```typescript
// Individual modules
import { AgentModule } from "@synapse-sap/sdk/agent";
import { deriveAgent } from "@synapse-sap/sdk/pda";
import type { AgentAccountData } from "@synapse-sap/sdk/types";
```

## API Reference

### Accounts (18 types)

`AgentAccountData` · `AgentStatsData` · `GlobalRegistryData` · `FeedbackAccountData` · `CapabilityIndexData` · `ProtocolIndexData` · `ToolCategoryIndexData` · `ToolDescriptorData` · `SessionCheckpointData` · `MemoryVaultData` · `SessionLedgerData` · `EpochPageData` · `VaultDelegateData` · `EscrowAccountData` · `AgentAttestationData` · `MemoryLedgerData` · `LedgerPageData`

### Enum Constants

`TokenType` · `PluginType` · `SettlementMode` · `ToolHttpMethod` · `ToolCategory` · `DelegatePermission` · `SchemaType` · `CompressionType`

### Events (38 types)

`RegisteredEvent` · `UpdatedEvent` · `DeactivatedEvent` · `ReactivatedEvent` · `ClosedEvent` · `FeedbackEvent` · `FeedbackUpdatedEvent` · `FeedbackRevokedEvent` · `ReputationUpdatedEvent` · `CallsReportedEvent` · `VaultInitializedEvent` · `SessionOpenedEvent` · `MemoryInscribedEvent` · `EpochOpenedEvent` · `SessionClosedEvent` · `VaultClosedEvent` · `SessionPdaClosedEvent` · `EpochPageClosedEvent` · `VaultNonceRotatedEvent` · `DelegateAddedEvent` · `DelegateRevokedEvent` · `ToolPublishedEvent` · `ToolSchemaInscribedEvent` · `ToolUpdatedEvent` · `ToolDeactivatedEvent` · `ToolReactivatedEvent` · `ToolClosedEvent` · `ToolInvocationReportedEvent` · `CheckpointCreatedEvent` · `EscrowCreatedEvent` · `EscrowDepositedEvent` · `PaymentSettledEvent` · `EscrowWithdrawnEvent` · `BatchSettledEvent` · `AttestationCreatedEvent` · `AttestationRevokedEvent` · `LedgerEntryEvent` · `LedgerSealedEvent`

## Development

```bash
yarn install        # Install dependencies
yarn typecheck      # Type-check (strict mode)
yarn build          # Build CJS + ESM + declarations
yarn clean          # Remove dist/
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development guidelines.

## License

[MIT](LICENSE)
