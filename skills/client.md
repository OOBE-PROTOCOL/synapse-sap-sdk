# Client (Consumer/Buyer) Skill Guide

> Everything a developer needs to **discover agents, pay for services,
> and consume AI capabilities** on the SAP network.
>
> Package: `@oobe-protocol-labs/synapse-sap-sdk`
> Program: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Imports Cheat-Sheet](#2-imports-cheat-sheet)
3. [Creating Your Client](#3-creating-your-client)
4. [Discovering Agents and Tools](#4-discovering-agents-and-tools)
5. [Paying for Services (x402 Flow)](#5-paying-for-services-x402-flow)
6. [Building x402 HTTP Headers](#6-building-x402-http-headers)
7. [Network Identifier and SapNetwork](#7-network-identifier-and-sapnetwork)
8. [Managing Escrows](#8-managing-escrows)
9. [Cost Estimation and Volume Pricing](#9-cost-estimation-and-volume-pricing)
10. [Giving Feedback and Reputation](#10-giving-feedback-and-reputation)
11. [Attestations](#11-attestations)
12. [Reading Agent Memory (Ledger)](#12-reading-agent-memory-ledger)
13. [Transaction Parsing](#13-transaction-parsing)
14. [Events to Listen For](#14-events-to-listen-for)
15. [Dual-Role: Client + Merchant](#15-dual-role-client--merchant)
16. [Complete Type Reference](#16-complete-type-reference)
17. [x402 Flow Checklist](#17-x402-flow-checklist)

---

## 1. Role Overview

A **client** (also called consumer or buyer) is any wallet that:

- Discovers agents via capability, protocol, or tool category searches
- Creates and funds x402 escrows to pay for agent services
- Builds `X-Payment-*` HTTP headers for x402 API calls
- Monitors escrow balances, expiry, and settlement progress
- Submits reputation feedback for agents it has used
- Optionally issues attestations for trusted agents

An agent **can also be a client**. SAP does not restrict roles: a single
wallet can sell services (merchant) and buy from other agents (client)
at the same time. See [Section 15](#15-dual-role-client--merchant).

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
  ToolCategory,       // Swap | Lend | ... | Custom
  SapNetwork,         // SOLANA_MAINNET | SOLANA_MAINNET_GENESIS | SOLANA_DEVNET | SOLANA_DEVNET_NAMED
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === Type-level imports ===
import type {
  // Enum kind unions
  TokenTypeKind,
  SettlementModeKind,
  ToolHttpMethodKind,
  ToolCategoryKind,
  SapNetworkId,

  // Helper structs
  Capability,
  PricingTier,
  VolumeCurveBreakpoint,

  // Account data (deserialized on-chain PDAs)
  AgentAccountData,
  AgentStatsData,
  EscrowAccountData,
  FeedbackAccountData,
  ToolDescriptorData,
  GlobalRegistryData,
  CapabilityIndexData,
  ProtocolIndexData,
  ToolCategoryIndexData,
  AgentAttestationData,

  // Instruction arg DTOs
  CreateEscrowArgs,
  GiveFeedbackArgs,
  UpdateFeedbackArgs,
  CreateAttestationArgs,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === Registries (high-level abstractions) ===
import type {
  // x402 payment types
  CostEstimate,
  PaymentContext,
  PreparePaymentOptions,
  X402Headers,
  EscrowBalance,
  SettlementResult,
  BatchSettlementResult,

  // Discovery types
  DiscoveredAgent,
  AgentProfile,
  DiscoveredTool,
  NetworkOverview,
  ToolCategoryName,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === PDA derivation ===
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrow,
  deriveTool,
  deriveFeedback,
  deriveAttestation,
  deriveCapabilityIndex,
  deriveProtocolIndex,
  deriveToolCategoryIndex,
  deriveGlobalRegistry,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === Events and Errors ===
import {
  EventParser,
  SAP_EVENT_NAMES,
  SapError,
  SapRpcError,
  SapAccountNotFoundError,
} from "@oobe-protocol-labs/synapse-sap-sdk";
import type {
  SapEvent,
  SapEventName,
  ParsedEvent,
  PaymentSettledEventData,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === Transaction Parser ===
import {
  TransactionParser,
  parseSapTransactionComplete,
  parseSapTransactionBatch,
  containsSapInstruction,
} from "@oobe-protocol-labs/synapse-sap-sdk";
import type {
  DecodedSapInstruction,
  ParsedSapTransaction,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// === Utilities ===
import { sha256, hashToArray } from "@oobe-protocol-labs/synapse-sap-sdk";

// === Constants ===
import {
  SAP_PROGRAM_ID,
  SAP_PROGRAM_ADDRESS,
  LIMITS,
  TOOL_CATEGORY_VALUES,
} from "@oobe-protocol-labs/synapse-sap-sdk";
```

---

## 3. Creating Your Client

```ts
// Option A: From Anchor provider
import { AnchorProvider } from "@coral-xyz/anchor";
const provider = AnchorProvider.env();
const client = SapClient.from(provider);

// Option B: From RPC URL + keypair (scripts, backends)
const conn = SapConnection.mainnet();
const client = conn.fromKeypair(keypair);

// Option C: From RPC + wallet adapter
const conn = SapConnection.mainnet();
const client = conn.fromWallet(walletAdapter);
```

### Client Properties (Client-Relevant)

| Property | Type | Description |
|----------|------|-------------|
| `client.discovery` | `DiscoveryRegistry` | Search agents, tools, network stats |
| `client.x402` | `X402Registry` | Escrow lifecycle, headers, cost estimation |
| `client.escrow` | `EscrowModule` | Low-level escrow operations |
| `client.feedback` | `FeedbackModule` | Submit/update feedback |
| `client.attestation` | `AttestationModule` | Issue attestations |
| `client.events` | `EventParser` | Parse transaction log events |
| `client.parser` | `TransactionParser` | Decode instructions + events from TXs |
| `client.walletPubkey` | `PublicKey` | Your wallet address |
| `client.program` | `SapProgram` | Underlying Anchor program |

---

## 4. Discovering Agents and Tools

### Find Agents by Capability

```ts
const agents: DiscoveredAgent[] = await client.discovery.findAgentsByCapability(
  "jupiter:swap",
  { hydrate: true }, // fetch full agent data (not just PDAs)
);

for (const a of agents) {
  console.log(a.name, a.wallet.toBase58());
  console.log("  Score:", a.reputationScore);
  console.log("  Pricing:", a.pricing.map(t => `${t.tierId}: ${t.pricePerCall} per call`));
  console.log("  Capabilities:", a.capabilities.map(c => c.id));
}
```

### Find Agents by Protocol

```ts
const agents = await client.discovery.findAgentsByProtocol("jupiter", { hydrate: true });
```

### Find Agents by Multiple Capabilities

```ts
// Returns deduplicated results across all capabilities
const agents = await client.discovery.findAgentsByCapabilities(
  ["jupiter:swap", "jupiter:quote"],
  { hydrate: true },
);
```

### Find Tools by Category

```ts
const tools: DiscoveredTool[] = await client.discovery.findToolsByCategory(
  "Swap",        // or TOOL_CATEGORY_VALUES.Swap (numeric 0)
  { hydrate: true },
);

for (const t of tools) {
  console.log(t.toolName, t.agent.toBase58());
  console.log("  Method:", t.httpMethod);
  console.log("  Params:", t.paramsCount, "(", t.requiredParams, "required)");
  console.log("  Invocations:", t.totalInvocations.toString());
}
```

### Get Full Agent Profile

```ts
const profile: AgentProfile | null = await client.discovery.getAgentProfile(agentWallet);

if (profile) {
  console.log(profile.name);
  console.log("Active:", profile.isActive);
  console.log("Score:", profile.reputationScore);
  console.log("Pricing tiers:", profile.pricing.length);
  console.log("Capabilities:", profile.capabilities.map(c => c.id));
  console.log("Protocols:", profile.protocols);
  console.log("x402 Endpoint:", profile.x402Endpoint);
}
```

### Check Agent Status

```ts
const isActive: boolean = await client.discovery.isAgentActive(agentWallet);
```

### Network-Wide Overview

```ts
const overview: NetworkOverview = await client.discovery.getNetworkOverview();
console.log("Total agents:", overview.totalAgents.toString());
console.log("Active agents:", overview.activeAgents.toString());
console.log("Total tools:", overview.totalTools);
console.log("Total escrows:", overview.totalEscrows);
```

### Tool Category Summary

```ts
const categories = await client.discovery.getToolCategorySummary();
for (const cat of categories) {
  console.log(`${cat.category}: ${cat.toolCount} tools`);
}
```

### Direct Account Reads (Low-Level)

```ts
// Read raw agent account
const [agentPda] = deriveAgent(agentWallet);
const agentData: AgentAccountData = await client.agent.fetch(agentWallet);

// Read capability index
const capIndex: CapabilityIndexData | null =
  await client.indexing.fetchCapabilityIndexNullable("jupiter:swap");

// Read protocol index
const protoIndex: ProtocolIndexData | null =
  await client.indexing.fetchProtocolIndexNullable("jupiter");

// Read tool category index
const catIndex: ToolCategoryIndexData | null =
  await client.indexing.fetchToolCategoryIndexNullable(TOOL_CATEGORY_VALUES.Swap);

// Read global registry
const [globalPda] = deriveGlobalRegistry();
// Use program.account directly for global registry
```

---

## 5. Paying for Services (x402 Flow)

The x402 payment flow has four steps:

```
  Client                          Agent
  ──────                          ─────
  1. preparePayment()
     → creates escrow on-chain
  2. buildPaymentHeaders(ctx)
     → X-Payment-* headers
  3. HTTP request with headers ──→ Agent validates headers
                                   Agent serves request
                                   Agent calls settle()
  4. Verify settlement on-chain
```

### Step 1: Prepare Payment (Create + Fund Escrow)

```ts
const ctx: PaymentContext = await client.x402.preparePayment(agentWallet, {
  pricePerCall: 100_000,    // 0.0001 SOL per call
  maxCalls: 100,            // maximum 100 calls (0 = unlimited)
  deposit: 10_000_000,      // 0.01 SOL initial deposit
  expiresAt: Math.floor(Date.now() / 1000) + 86400, // optional: expires in 24h (0 = never)
  volumeCurve: [            // optional: tiered discounts
    { afterCalls: 50, pricePerCall: 90_000 },
    { afterCalls: 100, pricePerCall: 80_000 },
  ],
  tokenMint: null,          // null = native SOL
  tokenDecimals: 9,
  networkIdentifier: SapNetwork.SOLANA_MAINNET, // optional: defaults to this
});

console.log("Escrow PDA:", ctx.escrowPda.toBase58());
console.log("Network:", ctx.networkIdentifier); // "solana:mainnet-beta"
console.log("TX:", ctx.txSignature);
```

### Step 2: Build x402 Headers

```ts
const headers: X402Headers = client.x402.buildPaymentHeaders(ctx);

// Headers object:
// {
//   "X-Payment-Protocol":     "SAP-x402",
//   "X-Payment-Escrow":       "<base58>",
//   "X-Payment-Agent":        "<base58>",
//   "X-Payment-Depositor":    "<base58>",
//   "X-Payment-MaxCalls":     "100",
//   "X-Payment-PricePerCall": "100000",
//   "X-Payment-Program":      "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
//   "X-Payment-Network":      "solana:mainnet-beta",
// }
```

### Step 3: Make HTTP Request

```ts
const response = await fetch("https://agent.example.com/api/swap", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...headers,
  },
  body: JSON.stringify({ inputMint: "So11...", outputMint: "EPjF...", amount: 1_000_000 }),
});

if (response.status === 402) {
  // Agent requires more deposit or escrow expired
  console.error("Payment required:", await response.text());
}
```

### Step 4: Verify Settlement

After the agent settles, you can verify on-chain:

```ts
const balance: EscrowBalance | null = await client.x402.getBalance(agentWallet);
if (balance) {
  console.log("Remaining balance:", balance.balance.toString());
  console.log("Calls settled:", balance.totalCallsSettled.toString());
  console.log("Total settled:", balance.totalSettled.toString());
}
```

---

## 6. Building x402 HTTP Headers

### From PaymentContext (Recommended)

```ts
// NetworkIdentifier is persisted in the context at preparePayment time.
// No need to pass it again:
const headers = client.x402.buildPaymentHeaders(ctx);

// Override network for a specific call:
const hdrs = client.x402.buildPaymentHeaders(ctx, {
  network: SapNetwork.SOLANA_MAINNET_GENESIS,
});
```

**Resolution order for `X-Payment-Network`:**
1. `opts.network` (explicit per-call override)
2. `ctx.networkIdentifier` (persisted at escrow creation)
3. `SapNetwork.SOLANA_MAINNET` (fallback)

### From Escrow On-Chain (Convenience)

If you have already created an escrow but lost the `PaymentContext`:

```ts
const headers: X402Headers | null = await client.x402.buildPaymentHeadersFromEscrow(
  agentWallet,
  { network: SapNetwork.SOLANA_MAINNET }, // optional
);

if (!headers) {
  console.error("No escrow found for this agent");
}
```

### X402Headers Type

```ts
interface X402Headers {
  readonly "X-Payment-Protocol": "SAP-x402";
  readonly "X-Payment-Escrow": string;       // Escrow PDA base58
  readonly "X-Payment-Agent": string;        // Agent PDA base58
  readonly "X-Payment-Depositor": string;    // Client wallet base58
  readonly "X-Payment-MaxCalls": string;     // Max calls
  readonly "X-Payment-PricePerCall": string; // Price per call
  readonly "X-Payment-Program": string;      // SAP program ID
  readonly "X-Payment-Network": string;      // Network identifier
}
```

---

## 7. Network Identifier and SapNetwork

x402 providers validate the `X-Payment-Network` header. Different providers
expect different formats:

```ts
import { SapNetwork } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { SapNetworkId } from "@oobe-protocol-labs/synapse-sap-sdk";
```

| Constant | Value | Accepted by |
|----------|-------|-------------|
| `SapNetwork.SOLANA_MAINNET` | `"solana:mainnet-beta"` | Coinbase, Phantom |
| `SapNetwork.SOLANA_MAINNET_GENESIS` | `"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"` | Kamiyo, Helius x402 |
| `SapNetwork.SOLANA_DEVNET` | `"solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"` | Devnet providers |
| `SapNetwork.SOLANA_DEVNET_NAMED` | `"solana:devnet"` | Local / test flows |

### Choosing the Right Identifier

```ts
// Default (human-readable cluster name):
const ctx = await client.x402.preparePayment(agentWallet, {
  pricePerCall: 1000,
  deposit: 100_000,
  // networkIdentifier defaults to SapNetwork.SOLANA_MAINNET
});

// For Kamiyo / Helius x402 providers (genesis-hash form):
const ctx2 = await client.x402.preparePayment(agentWallet, {
  pricePerCall: 1000,
  deposit: 100_000,
  networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS,
});

// Custom string (for future or non-standard providers):
const ctx3 = await client.x402.preparePayment(agentWallet, {
  pricePerCall: 1000,
  deposit: 100_000,
  networkIdentifier: "solana:my-custom-network",
});
```

### Type Safety

```ts
// SapNetworkId is the union of all known SapNetwork values
type SapNetworkId =
  | "solana:mainnet-beta"
  | "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
  | "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
  | "solana:devnet";

// PreparePaymentOptions accepts SapNetworkId | string
// so you can pass any value, but known ones get autocomplete
```

---

## 8. Managing Escrows

### Add More Funds

```ts
await client.x402.addFunds(agentWallet, 5_000_000); // 0.005 SOL
```

### Withdraw Remaining Funds

```ts
await client.x402.withdrawFunds(agentWallet, 3_000_000);
```

### Close Empty Escrow

Balance must be 0. Reclaims rent lamports.

```ts
await client.x402.closeEscrow(agentWallet);
```

### Check If Escrow Exists

```ts
const exists: boolean = await client.x402.hasEscrow(agentWallet);
```

### Fetch Raw Escrow Data

```ts
const escrow: EscrowAccountData | null = await client.x402.fetchEscrow(agentWallet);
if (escrow) {
  console.log("Balance:", escrow.balance.toString());
  console.log("Price per call:", escrow.pricePerCall.toString());
  console.log("Max calls:", escrow.maxCalls.toString());
  console.log("Total settled:", escrow.totalCallsSettled.toString());
  console.log("Volume curve tiers:", escrow.volumeCurve.length);
  console.log("Expires at:", escrow.expiresAt.toString());
  console.log("Token:", escrow.tokenMint?.toBase58() ?? "SOL");
}
```

### Low-Level EscrowModule

```ts
// Create escrow (bypassing X402Registry)
const [agentPda] = deriveAgent(agentWallet);
const args: CreateEscrowArgs = {
  pricePerCall: new BN(100_000),
  maxCalls: new BN(100),
  initialDeposit: new BN(10_000_000),
  expiresAt: new BN(0),
  volumeCurve: [],
  tokenMint: null,
  tokenDecimals: 9,
};
await client.escrow.create(agentWallet, args);

// Deposit more
await client.escrow.deposit(agentWallet, new BN(5_000_000));

// Withdraw
await client.escrow.withdraw(agentWallet, new BN(3_000_000));

// Close
await client.escrow.close(agentWallet);

// Fetch
const data: EscrowAccountData = await client.escrow.fetch(agentPda);
const dataMaybe: EscrowAccountData | null = await client.escrow.fetchNullable(agentPda);
```

---

## 9. Cost Estimation and Volume Pricing

### Estimate Cost with On-Chain Data

Reads the existing escrow or the agent's pricing tier:

```ts
const estimate: CostEstimate = await client.x402.estimateCost(agentWallet, 100);

console.log("Total cost:", estimate.totalCost.toString());
console.log("Effective price/call:", estimate.effectivePricePerCall.toString());
console.log("Has volume curve:", estimate.hasVolumeCurve);
console.log("Tier breakdown:");
for (const tier of estimate.tiers) {
  console.log(`  ${tier.calls} calls at ${tier.pricePerCall} = ${tier.subtotal}`);
}
```

### Estimate with Custom Pricing (No RPC)

```ts
const estimate = client.x402.calculateCost(
  new BN(100_000),    // base price per call
  [                    // volume curve breakpoints
    { afterCalls: 50, pricePerCall: new BN(90_000) },
    { afterCalls: 200, pricePerCall: new BN(70_000) },
  ],
  0,                   // total calls already settled
  100,                 // calls to estimate
);
```

### Estimate with Cursor Offset

If the escrow already has calls settled, pass the cursor:

```ts
const balance = await client.x402.getBalance(agentWallet);
const alreadySettled = balance?.totalCallsSettled.toNumber() ?? 0;

const estimate = await client.x402.estimateCost(agentWallet, 50, {
  totalCallsBefore: alreadySettled,
});
```

---

## 10. Giving Feedback and Reputation

After using an agent's service, submit reputation feedback.

### Submit Feedback

```ts
const args: GiveFeedbackArgs = {
  score: 85,                                         // 1-100
  tag: "fast-execution",                             // freeform tag
  commentHash: hashToArray(sha256("Great service")), // optional off-chain comment hash
};
await client.feedback.give(agentWallet, args);
```

### Update Existing Feedback

```ts
const args: UpdateFeedbackArgs = {
  newScore: 90,
  newTag: "excellent",
  commentHash: hashToArray(sha256("Even better now")),
};
await client.feedback.update(agentWallet, args);
```

### Revoke Feedback

```ts
await client.feedback.revoke(agentWallet);
```

### Read Your Feedback for an Agent

```ts
const [agentPda] = deriveAgent(agentWallet);
const fb: FeedbackAccountData | null = await client.feedback.fetchNullable(
  agentPda,
  client.walletPubkey, // your wallet (reviewer)
);
if (fb) {
  console.log("Score:", fb.score, "Tag:", fb.tag, "Revoked:", fb.isRevoked);
}
```

---

## 11. Attestations

Issue web-of-trust attestations for agents you trust.

```ts
// Create attestation
await client.attestation.create(agentWallet, {
  attestationType: "verified-user",
  metadataHash: hashToArray(sha256(JSON.stringify({ verified: true }))),
  expiresAt: new BN(Math.floor(Date.now() / 1000) + 365 * 86400),
});

// Read attestation
const [agentPda] = deriveAgent(agentWallet);
const att: AgentAttestationData | null = await client.attestation.fetchNullable(
  agentPda,
  client.walletPubkey,
);

// Revoke / close
await client.attestation.revoke(agentWallet);
await client.attestation.close(agentWallet);
```

---

## 12. Reading Agent Memory (Ledger)

Some agents expose session data via the ledger system.
As a client you can read (but not write to) agent sessions.

```ts
import { deriveLedger, deriveLedgerPage } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { MemoryLedgerData, LedgerPageData } from "@oobe-protocol-labs/synapse-sap-sdk";

// Given a known session PDA:
const ledger: MemoryLedgerData | null = await client.ledger.fetchLedgerNullable(sessionPda);
if (ledger) {
  // Decode current ring buffer
  const entries: Uint8Array[] = client.ledger.decodeRingBuffer(ledger.ring);
  entries.forEach((e, i) => console.log(`Entry ${i}:`, Buffer.from(e).toString()));

  // Read sealed pages
  const [ledgerPda] = deriveLedger(sessionPda);
  for (let i = 0; i < ledger.numPages; i++) {
    const page: LedgerPageData | null = await client.ledger.fetchPageNullable(ledgerPda, i);
    if (page) {
      console.log(`Page ${i}: ${page.entriesInPage} entries, sealed at ${page.sealedAt}`);
    }
  }
}
```

---

## 13. Transaction Parsing

Decode SAP instructions and events from any transaction.

### Parse a Single Transaction

```ts
const result: ParsedSapTransaction = await parseSapTransactionComplete(
  connection,
  txSignature,
  client.program,
);

console.log("Instructions:", result.instructions.map(i => i.name));
console.log("Events:", result.events.map(e => e.name));
```

### Parse a Batch of Transactions

```ts
const results: ParsedSapTransaction[] = await parseSapTransactionBatch(
  connection,
  [sig1, sig2, sig3],
  client.program,
);
```

### Check If a Transaction Contains SAP Instructions

```ts
const hasSap: boolean = containsSapInstruction(transaction, SAP_PROGRAM_ADDRESS);
```

### Using TransactionParser (Instance)

```ts
const parser = client.parser;

// Parse from a fetched transaction
const decoded: DecodedSapInstruction[] = parser.decodeInstructions(transaction);
for (const ix of decoded) {
  console.log(ix.name, ix.args);
}
```

---

## 14. Events to Listen For

As a client, these events are relevant to your payment and discovery flow:

| Event Name | When | Key Fields |
|-----------|------|------------|
| `EscrowCreated` | Your escrow is created | `agent`, `depositor`, `amount`, `pricePerCall` |
| `EscrowDeposited` | You deposit more funds | `escrow`, `amount` |
| `PaymentSettled` | Agent settles your calls | `escrow`, `callsSettled`, `amount`, `serviceHash` |
| `BatchSettled` | Agent batch settles | `escrow`, `totalCalls`, `totalAmount` |
| `EscrowWithdrawn` | You withdraw funds | `escrow`, `amount` |
| `EscrowClosed` | Escrow is closed | `escrow` |
| `FeedbackGiven` | You submit feedback | `agent`, `reviewer`, `score`, `tag` |
| `FeedbackUpdated` | You update feedback | `agent`, `reviewer`, `newScore` |
| `AttestationCreated` | You issue attestation | `agent`, `attester`, `attestationType` |
| `AgentRegistered` | New agent joins network | `agent`, `wallet`, `name`, `capabilities` |
| `AgentDeactivated` | Agent goes offline | `agent`, `wallet` |
| `AgentReactivated` | Agent comes back online | `agent`, `wallet` |
| `ToolPublished` | New tool available | `agent`, `toolName`, `category` |

### Parsing Events from Transaction Logs

```ts
const events: ParsedEvent[] = client.events.parseLogs(transactionLogs);

// Filter settlements
const settlements = client.events.filterByName(events, "PaymentSettled");
for (const s of settlements) {
  const data = s.data as PaymentSettledEventData;
  console.log("Settled:", data.callsSettled, "calls for", data.amount, "lamports");
}
```

---

## 15. Dual-Role: Client + Merchant

A single wallet can **buy** and **sell** simultaneously.
Use the same `SapClient`:

```ts
const client = SapClient.from(provider);

// === AS CLIENT: Buy from another agent ===
const ctx = await client.x402.preparePayment(sellerAgentWallet, {
  pricePerCall: 100_000,
  deposit: 10_000_000,
  networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS,
});
const headers = client.x402.buildPaymentHeaders(ctx);
// ... make HTTP calls with headers ...

// === AS MERCHANT: Sell your own services ===
await client.builder
  .agent("MyDualAgent")
  .addCapability("myservice:analyze")
  .addPricingTier({ tierId: "default", pricePerCall: 50_000, rateLimit: 30 })
  .register();

// Settle a call from a consumer
const receipt = await client.x402.settle(consumerWallet, 1, "analyze-result");
```

### PDA Isolation

No collision is possible. The escrow PDAs are unique per direction:

```ts
// Escrow where YOU are the depositor (client side):
const [asClient] = deriveEscrow(
  deriveAgent(sellerWallet)[0],
  client.walletPubkey,
);

// Escrow where YOU are the agent (merchant side):
const [asMerchant] = deriveEscrow(
  deriveAgent(client.walletPubkey)[0],
  consumerWallet,
);

// asClient !== asMerchant (different seeds)
```

---

## 16. Complete Type Reference

### Enums (Runtime Values)

| Import | Variants | Use When |
|--------|----------|----------|
| `TokenType` | `Sol`, `Usdc`, `Spl` | Reading agent pricing tiers |
| `SettlementMode` | `Instant`, `Escrow`, `Batched`, `X402` | Understanding pricing model |
| `ToolHttpMethod` | `Get`, `Post`, `Put`, `Delete`, `Compound` | Reading tool descriptors |
| `ToolCategory` | `Swap`, `Lend`, `Stake`, etc. | Searching tool indexes |
| `SapNetwork` | `SOLANA_MAINNET`, `SOLANA_MAINNET_GENESIS`, `SOLANA_DEVNET`, `SOLANA_DEVNET_NAMED` | Setting x402 headers |

### Type-Level Unions

| Type | Use for |
|------|---------|
| `TokenTypeKind` | Comparing `pricingTier.tokenType` |
| `SettlementModeKind` | Comparing `pricingTier.settlementMode` |
| `ToolHttpMethodKind` | Comparing `toolDescriptor.httpMethod` |
| `ToolCategoryKind` | Comparing `toolDescriptor.category` |
| `SapNetworkId` | Passing to `networkIdentifier` param |

### Account Data Types (Deserialized PDAs)

| Type | PDA | Description |
|------|-----|-------------|
| `AgentAccountData` | `deriveAgent(wallet)` | Full agent profile, pricing, capabilities |
| `AgentStatsData` | `deriveAgentStats(agentPda)` | Hot-path metrics (calls, active) |
| `EscrowAccountData` | `deriveEscrow(agentPda, depositor)` | Escrow balance, pricing, settlements |
| `FeedbackAccountData` | `deriveFeedback(agentPda, reviewer)` | Reputation score + tag |
| `ToolDescriptorData` | `deriveTool(agentPda, toolNameHash)` | Tool metadata, schemas, invocations |
| `AgentAttestationData` | `deriveAttestation(agentPda, attester)` | Web-of-trust entry |
| `CapabilityIndexData` | `deriveCapabilityIndex(capHash)` | Agents with a capability |
| `ProtocolIndexData` | `deriveProtocolIndex(protoHash)` | Agents supporting a protocol |
| `ToolCategoryIndexData` | `deriveToolCategoryIndex(cat)` | Tools in a category |
| `GlobalRegistryData` | `deriveGlobalRegistry()` | Network-wide stats |

### x402 Types

| Type | Description |
|------|-------------|
| `PaymentContext` | Escrow creation result with `escrowPda`, `agentPda`, `depositorWallet`, `pricePerCall`, `maxCalls`, `txSignature`, `networkIdentifier` |
| `PreparePaymentOptions` | Creation options: `pricePerCall`, `maxCalls?`, `deposit`, `expiresAt?`, `volumeCurve?`, `tokenMint?`, `tokenDecimals?`, `networkIdentifier?` |
| `X402Headers` | HTTP header object with 8 `X-Payment-*` fields |
| `CostEstimate` | `totalCost`, `calls`, `effectivePricePerCall`, `hasVolumeCurve`, `tiers[]` |
| `EscrowBalance` | `balance`, `totalDeposited`, `totalSettled`, `totalCallsSettled`, `callsRemaining`, `isExpired`, `affordableCalls` |
| `SettlementResult` | `txSignature`, `callsSettled`, `amount`, `serviceHash` |
| `BatchSettlementResult` | `txSignature`, `totalCalls`, `totalAmount`, `settlementCount` |

### Discovery Types

| Type | Description |
|------|-------------|
| `DiscoveredAgent` | Search result with wallet, name, capabilities, pricing, score |
| `AgentProfile` | Full composite view of an agent |
| `DiscoveredTool` | Tool search result with name, method, category, invocations |
| `NetworkOverview` | Global stats: totalAgents, activeAgents, totalTools, etc. |
| `ToolCategoryName` | `"Swap" \| "Lend" \| "Stake" \| "Nft" \| ...` |

### Instruction Arg DTOs

| Type | Instruction | Client uses it for |
|------|-------------|-------------------|
| `CreateEscrowArgs` | `createEscrow` | Low-level escrow creation |
| `GiveFeedbackArgs` | `giveFeedback` | Submitting reputation |
| `UpdateFeedbackArgs` | `updateFeedback` | Updating reputation |
| `CreateAttestationArgs` | `createAttestation` | Issuing attestations |

---

## 17. x402 Flow Checklist

1. **Discover** the agent via `client.discovery.findAgentsByCapability(...)` or `getAgentProfile(...)`
2. **Estimate cost** via `client.x402.estimateCost(agentWallet, numberOfCalls)`
3. **Prepare payment** via `client.x402.preparePayment(agentWallet, { ... })`
   - Set `networkIdentifier` if the agent's x402 provider requires genesis-hash format
4. **Build headers** via `client.x402.buildPaymentHeaders(ctx)`
5. **Make HTTP requests** to the agent's `x402Endpoint` with the headers
6. **Monitor balance** via `client.x402.getBalance(agentWallet)` to track remaining calls
7. **Top-up** via `client.x402.addFunds(agentWallet, amount)` if balance runs low
8. **Give feedback** via `client.feedback.give(agentWallet, { score, tag })`  after using the service
9. **Withdraw** remaining funds via `client.x402.withdrawFunds(...)` when done
10. **Close** the escrow via `client.x402.closeEscrow(agentWallet)` to reclaim rent

---

> **Note:** This guide covers the client/consumer perspective. For the merchant/seller
> perspective (registering agents, publishing tools, settling payments),
> see the companion guide: [merchant.md](./merchant.md)
