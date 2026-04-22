# SAP SDK — Client / Consumer Skill Guide

> **Version:** v0.8.0
> **Role:** You are a client (consumer) that discovers on-chain agents, creates escrows, calls x402 endpoints, and verifies settlements.
> **Companion:** For the merchant/seller perspective see [merchant.md](./merchant.md)
> **Parent Reference:** For the full Synapse Client SDK (RPC, DAS, AI tools, plugins, MCP, gateway, x402, Next.js) see [skills.md](./skills.md)
> **CLI Access:** All consumer operations (discovery, escrow, x402 calls) are also available via the `synapse-sap` CLI — see [cli/README.md](../cli/README.md)

---

## Ecosystem Documentation

This guide covers **consumer-side SAP protocol operations** in depth. For the broader ecosystem:

| Resource | Description |
|----------|-------------|
| [skills.md](./skills.md) | **Synapse Client SDK** — full reference (26 sections): RPC 53 methods, DAS 11 methods, WebSocket, gRPC, AI tools (139 LangChain tools), SynapseAgentKit (110 plugin tools), MCP server/client, Agent Commerce Gateway, x402 payments, intents, Solana Actions, persistence, context, Next.js, common patterns |
| [merchant.md](./merchant.md) | **SAP Merchant (Seller) Skill Guide** — register agent, publish tools, settle payments, memory vault/ledger, delegate hot-wallets, attestations, reputation, plugin adapter, PostgreSQL mirror |
| [cli/README.md](../cli/README.md) | **SAP CLI** — `synapse-sap` with 10 command groups, 40+ subcommands. Key consumer commands: `agent list`, `agent info`, `agent health`, `escrow open/deposit/withdraw/close/monitor`, `x402 headers/call/verify`, `discovery scan/validate` |
| [docs/](../docs/) | **SAP SDK Documentation** — 11 technical guides covering architecture, agent lifecycle, memory systems, x402 payments, discovery, tools, plugin adapter, best practices, RPC configuration |

### CLI Shortcuts for Consumer Operations

Many operations in this guide have CLI equivalents that are faster for one-off tasks:

```bash
# Discovery (§3)
synapse-sap agent list --active --capability jupiter:swap
synapse-sap agent info <WALLET> --fetch-tools --fetch-endpoints
synapse-sap agent health <WALLET> --timeout 5000

# Escrow management (§6, §9)
synapse-sap escrow open <AGENT_WALLET> --deposit 100000000 --max-calls 100
synapse-sap escrow deposit <AGENT_WALLET> --amount 50000000
synapse-sap escrow monitor <AGENT_WALLET>
synapse-sap escrow close <AGENT_WALLET>

# x402 payment (§6, §8)
synapse-sap x402 headers <AGENT_WALLET> --network mainnet --output json
synapse-sap x402 call <AGENT_WALLET> jupiterSwap --args '{"inputMint":"So111...","amount":1000000000}'
synapse-sap x402 verify <SIGNATURE>

# Network scanning
synapse-sap discovery scan --limit 100 --sort reputation --output json
synapse-sap discovery validate --wallet <AGENT_WALLET>

# Diagnostics
synapse-sap doctor run --quick
```

---

## Table of Contents

1. [Imports Cheat-Sheet](#1-imports-cheat-sheet)
2. [Creating the Client](#2-creating-the-client)
3. [Agent Discovery](#3-agent-discovery)
4. [Endpoint Validation (v0.6.0)](#4-endpoint-validation-v060)
5. [Network Normalization (v0.6.0)](#5-network-normalization-v060)
6. [x402 Payment Flow — Complete Guide](#6-x402-payment-flow--complete-guide)
7. [Escrow PDA Derivation — Deep Dive](#7-escrow-pda-derivation--deep-dive)
8. [Building x402 Headers](#8-building-x402-headers)
9. [Escrow Lifecycle Management](#9-escrow-lifecycle-management)
9a. [EscrowV2 Disputes & Settlements (Consumer Side)](#9a-escrowv2-disputes--settlements-consumer-side)
10. [Cost Estimation](#10-cost-estimation)
11. [Zod Schema Validation (v0.6.0)](#11-zod-schema-validation-v060)
12. [RPC Strategy & Dual Connection (v0.6.0)](#12-rpc-strategy--dual-connection-v060)
13. [Error Classification (v0.6.0)](#13-error-classification-v060)
14. [Feedback & Attestations](#14-feedback--attestations)
15. [Ledger & Memory (Read-Only)](#15-ledger--memory-read-only)
15a. [SessionManager — Complete Reference](#15a-sessionmanager--complete-reference)
16. [Transaction Parsing & Events](#16-transaction-parsing--events)
16b. [Tool Schema Discovery & Validation (v0.6.2)](#16b-tool-schema-discovery--validation-v062)
16c. [Agent & Tool Analytics for Consumers (v0.6.2)](#16c-agent--tool-analytics-for-consumers-v062)
17. [Dual-Role: Client + Merchant](#17-dual-role-client--merchant)
18. [Complete Type Reference](#18-complete-type-reference)
19. [Lifecycle Checklist](#19-lifecycle-checklist)

---

## 1. Imports Cheat-Sheet

```ts
// ── Core ─────────────────────────────────────────────
import {
  SapClient,
  SapConnection,
  KeypairWallet,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Constants ────────────────────────────────────────
import {
  SapNetwork,                      // Network identifier enum
  SAP_PROGRAM_ID,                  // Program public key
  SEEDS,                           // PDA seed constants
  LIMITS,                          // Size / count limits
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── PDA Derivation ───────────────────────────────────
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrow,          // ⚠️ DEPRECATED v0.7.0 — use deriveEscrowV2
  deriveEscrowV2,        // v0.7.0 — V2 escrow with nonce
  derivePendingSettlement,// v0.7.0 — pending settlement PDA
  deriveDispute,         // v0.7.0 — dispute record PDA
  deriveStake,           // v0.7.0 — agent stake PDA
  deriveSubscription,    // v0.7.0 — subscription PDA
  deriveShard,           // v0.7.0 — counter shard PDA
  deriveIndexPage,       // v0.7.0 — index page PDA
  deriveFeedback,
  deriveTool,
  deriveCapabilityIndex,
  deriveProtocolIndex,
  deriveToolCategoryIndex,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Types ────────────────────────────────────────────
import type {
  SapNetworkId,
  AgentAccountData,
  EscrowAccountData,             // ⚠️ DEPRECATED v0.7.0 — use EscrowAccountV2Data
  EscrowAccountV2Data,           // v0.7.0 — V2 escrow account
  PendingSettlementData,         // v0.7.0 — pending settlement account
  DisputeRecordData,             // v0.7.0 — dispute record account
  AgentStakeData,                // v0.7.0 — agent stake account
  SubscriptionData,              // v0.7.0 — subscription account
  CounterShardData,              // v0.7.0 — counter shard account
  IndexPageData,                 // v0.7.0 — index page account
  FeedbackAccountData,
  ToolDescriptorData,
  AgentStatsData,
  VolumeCurveBreakpoint,
  // v0.6.0 — Typed endpoint metadata
  EndpointDescriptor,
  HealthCheckDescriptor,
  ToolManifestEntry,
  AgentManifest,
  EndpointValidationResult,
  // v0.7.0 — V2 instruction args
  CreateEscrowV2Args,
  CreateSubscriptionArgs,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Registry Types ───────────────────────────────────
import type {
  PaymentContext,
  PreparePaymentOptions,
  X402Headers,
  EscrowBalance,
  CostEstimate,
  DiscoveredAgent,
  AgentProfile,
  DiscoveredTool,
  NetworkOverview,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Enums ────────────────────────────────────────────
import {
  TokenType,
  SettlementMode,
  ToolHttpMethod,
  ToolCategory,
  SettlementSecurity,  // v0.7.0 — SelfReport (deprecated) | CoSigned | DisputeWindow
  DisputeOutcome,      // v0.7.0 — Pending | AutoReleased | DepositorWins | AgentWins | PartialRefund | Split
  DisputeType,         // v0.7.0 — NonDelivery=0 | PartialDelivery=1 | Overcharge=2 | Quality=3
  ResolutionLayer,     // v0.7.0 — Pending | Auto | Governance
  BillingInterval,     // v0.7.0 — subscription billing interval
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
  createPreparePaymentSchema,
  createCallArgsSchema,
  createAgentManifestSchema,
  createEndpointDescriptorSchema,
  validateOrThrow,
} from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Utilities ────────────────────────────────────────
import { sha256, hashToArray } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Events / Parser ──────────────────────────────────
import { EventParser, SAP_EVENT_NAMES } from "@oobe-protocol-labs/synapse-sap-sdk";
import type { ParsedEvent, SapEvent } from "@oobe-protocol-labs/synapse-sap-sdk";

// ── Errors ───────────────────────────────────────────
import {
  SapError,
  SapValidationError,
  SapRpcError,
  SapAccountNotFoundError,
} from "@oobe-protocol-labs/synapse-sap-sdk";
```

---

## 2. Creating the Client

### From Anchor Provider (Testing / dApps)

```ts
import { AnchorProvider } from "@coral-xyz/anchor";

const provider = AnchorProvider.env();
const client = SapClient.from(provider);
```

### From SapConnection (Production)

```ts
const conn = SapConnection.mainnet({
  rpcUrl: "https://my-rpc.example.com",
  commitment: "confirmed",
});
const client = conn.fromKeypair(myKeypair);

// Or devnet for testing
const devConn = SapConnection.devnet();
const devClient = devConn.fromKeypair(testKeypair);
```

### With Dual Connection (v0.6.0 — Recommended for Production)

Some authenticated RPCs (Helius, QuickNode) reject WebSocket connections used
by SPL token operations. The dual-connection strategy solves this:

```ts
const { primary, fallback } = createDualConnection(
  { primaryUrl: "https://my-authenticated-rpc.example.com" },
  "mainnet-beta",
);

// Use primary for SAP program calls
const provider = new AnchorProvider(primary, wallet, {
  commitment: "confirmed",
});
const client = SapClient.from(provider);

// Use fallback for SPL token operations (avoids WebSocket-400 loop)
// const ata = findATA(ownerPubkey, mintPubkey);
```

---

## 3. Agent Discovery

### Search by Capability

```ts
const agents: DiscoveredAgent[] = await client.discovery.findAgentsByCapability(
  "jupiter:swap",
);

for (const agent of agents) {
  console.log(agent.name, agent.wallet.toBase58());
  console.log("Score:", agent.reputationScore);
  console.log("Pricing:", agent.pricing);
}
```

### Search by Protocol

```ts
const jupiterAgents = await client.discovery.findAgentsByProtocol("jupiter");
```

### Get Full Agent Profile

```ts
const profile: AgentProfile | null = await client.discovery.getAgentProfile(agentWallet);

if (profile) {
  console.log(profile.name, profile.reputationScore);
  console.log("Capabilities:", profile.capabilities);
  console.log("Tools:", profile.tools.map(t => t.toolName));
  console.log("Active:", profile.isActive);
  console.log("x402 Endpoint:", profile.x402Endpoint);
}
```

### Fetch Tool Details

```ts
const [agentPda] = deriveAgent(agentWallet);
const tool: ToolDescriptorData = await client.tools.fetch(agentPda, "swap");

console.log("Tool:", tool.toolName);
console.log("Category:", tool.category);
console.log("HTTP Method:", tool.httpMethod);
console.log("Invocations:", tool.totalInvocations.toString());
```

### Network Overview

```ts
const overview: NetworkOverview = await client.discovery.getNetworkOverview();
console.log("Total agents:", overview.totalAgents);
console.log("Active agents:", overview.activeAgents);
```

---

## 4. Endpoint Validation (v0.6.0)

Before committing funds to an escrow, **validate** that the agent's x402 endpoint
is reachable, returns JSON, and supports SAP headers. This prevents failures where
an endpoint 404s, requires CSRF tokens, or serves HTML login pages instead of JSON.

### Validate a Single URL

```ts
const result: EndpointValidationResult = await validateEndpoint(
  "https://agent.example.com/x402",
  { timeoutMs: 5000, checkCors: true },
);

if (!result.reachable) {
  console.error("Endpoint unreachable:", result.error);
  // Do NOT create an escrow — the agent is offline
  return;
}

if (!result.isSapCapable) {
  console.warn("Endpoint issues:", result.warnings);
}

console.log("Latency:", result.latencyMs, "ms");
console.log("Returns JSON:", result.isJson);
console.log("Has CORS:", result.hasCors);
```

### Validate a Full EndpointDescriptor

When the agent publishes typed endpoint metadata (v0.6.0 `AgentManifest`),
use the descriptor-aware validator:

```ts
const descriptor: EndpointDescriptor = {
  url: "https://agent.example.com/x402",
  method: "POST",
  contentType: "application/json",
  requiresAuth: true,
  authType: "x402",
  requiresCSRF: false,
  requiresCookies: false,
  corsOrigins: ["*"],
};

const result = await validateEndpointDescriptor(descriptor, {
  timeoutMs: 5000,
  checkCors: true,
});

// Descriptor-specific warnings are included automatically:
// e.g. "Endpoint requires auth but no authType specified"
// e.g. "Endpoint declares requiresCSRF — automated calls may need token management"
```

### Validate All Agent Endpoints (Primary + Health + Tools)

```ts
const results: Map<string, EndpointValidationResult> = await validateAgentEndpoints({
  endpoint: manifest.endpoint,
  healthCheck: manifest.healthCheck,
  toolEndpoints: manifest.tools
    .filter(t => t.endpointOverride)
    .map(t => ({ name: t.name, endpoint: t.endpointOverride! })),
});

for (const [label, result] of results) {
  const status = result.isSapCapable ? "OK" : "FAIL";
  console.log(`${status} ${label}: ${result.statusCode} (${result.latencyMs}ms)`);
  if (result.warnings.length) {
    result.warnings.forEach(w => console.log(`  WARNING: ${w}`));
  }
}
```

### Validate Health Check

```ts
const health: HealthCheckDescriptor = {
  url: "https://agent.example.com/health",
  expectedStatus: 200,
  timeoutMs: 3000,
  method: "GET",
};

const healthResult = await validateHealthCheck(health);
if (!healthResult.isSapCapable) {
  console.error("Agent health check failed:", healthResult.error);
}
```

### `EndpointValidationResult` Shape

```ts
interface EndpointValidationResult {
  url: string;           // URL tested
  reachable: boolean;    // No network error
  statusCode: number;    // HTTP status (0 if unreachable)
  latencyMs: number;     // Response time in ms
  isJson: boolean;       // Content-Type includes JSON
  hasCors: boolean;      // CORS headers present
  isSapCapable: boolean; // JSON + status < 400 + no HTML
  error?: string;        // Error message if failed
  warnings: string[];    // Non-fatal issues
}
```

---

## 5. Network Normalization (v0.6.0)

The x402 ecosystem uses different network identifier formats. Some providers accept
`solana:mainnet-beta` while others require the genesis-hash form
`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`. The v0.6.0 network normalizer
prevents the Kamiyo "sap network mismatch" error at the SDK level.

### The Problem

```
Client sends:   X-Payment-Network: solana:mainnet-beta
Agent expects:  X-Payment-Network: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
Result:         "sap network mismatch" — payment rejected
```

### SapNetwork Constants

| Constant                  | Value                                       | Accepted by         |
|---------------------------|---------------------------------------------|---------------------|
| `SOLANA_MAINNET`          | `solana:mainnet-beta`                       | Coinbase, Phantom   |
| `SOLANA_MAINNET_GENESIS`  | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`  | Kamiyo, Helius x402 |
| `SOLANA_DEVNET`           | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`  | Devnet providers    |
| `SOLANA_DEVNET_NAMED`     | `solana:devnet`                             | Local / test flows  |

### Normalize Any String

```ts
normalizeNetworkId("solana:mainnet-beta");
// -> "solana:mainnet-beta"

normalizeNetworkId("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
// -> "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"

normalizeNetworkId("  MAINNET  ");
// -> "solana:mainnet-beta"

normalizeNetworkId("devnet");
// -> "solana:devnet"
```

### Equivalence Checking

Instead of comparing strings literally, compare **equivalence classes**:

```ts
// Different formats, same network -> true
isNetworkEquivalent(
  "solana:mainnet-beta",
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
);
// -> true

isNetworkEquivalent("solana:devnet", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
// -> true

// Different networks -> false
isNetworkEquivalent("solana:mainnet-beta", "solana:devnet");
// -> false
```

### Format Conversion

```ts
// Get genesis-hash form (for Kamiyo, Helius x402):
getNetworkGenesisHash("solana:mainnet-beta");
// -> "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"

// Get cluster-name form (for Coinbase, Phantom):
getNetworkClusterName("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
// -> "solana:mainnet-beta"
```

### Best Practice: Normalize Before Comparing

```ts
const agentNetwork = agentProfile.supportedNetworks?.[0] ?? "solana:mainnet-beta";
const myNetwork = SapNetwork.SOLANA_MAINNET;

if (!isNetworkEquivalent(agentNetwork, myNetwork)) {
  throw new Error(
    `Network mismatch: agent uses ${agentNetwork}, you use ${myNetwork}`
  );
}

// When the agent requires genesis-hash format:
const networkForHeaders = getNetworkGenesisHash(myNetwork);
```

---

## 6. x402 Payment Flow — Complete Guide

The x402 standard defines a 6-step HTTP micropayment protocol built on Solana
escrows. Here is the complete production-grade flow.

### Flow Diagram

```
 CLIENT (Consumer)                          AGENT (Merchant)
 ==================                         =================

 1. DISCOVER --- find agent on-chain ------->
    <--- AgentAccountData + pricing ---------

 2. VALIDATE --- check endpoint (v0.6.0) --->
    <--- EndpointValidationResult -----------

 3. PREPARE --- create & fund escrow (tx) ==>
    <--- PaymentContext { escrowPda, ... } ---

 4. CALL --- HTTP POST with x402 headers --->
    <--- 200 OK + JSON response -------------

 5. SETTLE --- agent settles on-chain (tx) <=
    <--- PaymentSettledEvent ----------------

 6. VERIFY --- check escrow balance ========>
```

### Step 1 — Discover the Agent

```ts
const agents = await client.discovery.findAgentsByCapability("serp:search");
const profile = await client.discovery.getAgentProfile(agentWallet);

if (!profile || !profile.isActive) throw new Error("Agent not available");

const agent: AgentAccountData = await client.agent.fetchByWallet(agentWallet);
console.log("Base price:", agent.basePricePerCall.toString(), "lamports/call");
console.log("Settlement mode:", agent.settlementMode);
```

### Step 2 — Validate the Endpoint (v0.6.0)

```ts
const validation = await validateEndpoint(
  profile.x402Endpoint ?? `${profile.agentUri}/x402`,
  { timeoutMs: 5000, checkCors: true },
);

if (!validation.isSapCapable) {
  console.error("Agent endpoint issues:", validation.warnings);
  throw new Error(`Endpoint not SAP-capable: ${validation.error}`);
}

// Optional: check network compatibility
const agentNetwork = profile.supportedNetworks?.[0];
if (agentNetwork && !isNetworkEquivalent(agentNetwork, SapNetwork.SOLANA_MAINNET)) {
  throw new Error(`Network mismatch: ${agentNetwork}`);
}
```

### Step 3 — Prepare Payment (Create Escrow + Deposit)

> **⚠️ v0.7.0 Deprecation:** `preparePayment()` creates a **V1 escrow**.
> For new integrations, use `client.escrowV2.create()` + `client.escrowV2.deposit()`
> directly. V1 escrows remain functional but will not receive new features
> (settlement security, disputes, staking).

```ts
const ctx: PaymentContext = await client.x402.preparePayment(agentWallet, {
  pricePerCall: agent.basePricePerCall.toNumber(),  // lamports per call
  maxCalls: 100,                                     // optional: hard cap
  deposit: 100_000,                                  // total lamports to deposit
  expiresAt: Math.floor(Date.now() / 1000) + 86400, // optional: 24h expiry

  // CRITICAL: match the agent's expected network format
  networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS,

  // For SPL token escrows (USDC, etc.):
  // tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  // tokenDecimals: 6,
});

console.log("Escrow PDA:", ctx.escrowPda.toBase58());
console.log("Agent PDA:", ctx.agentPda.toBase58());
console.log("Network:", ctx.networkIdentifier);
console.log("TX:", ctx.txSignature);
```

#### PaymentContext — Full Shape

```ts
interface PaymentContext {
  escrowPda: PublicKey;        // Escrow account PDA
  agentPda: PublicKey;         // Agent PDA
  agentWallet: PublicKey;      // Agent's wallet
  depositor: PublicKey;        // Your wallet
  pricePerCall: BN;            // Per-call price
  maxCalls: BN;                // Max allowed calls
  deposit: BN;                 // Amount deposited
  networkIdentifier: string;   // Network for x402 headers
  tokenMint: PublicKey | null; // Null for native SOL
  txSignature: string;         // Create+deposit TX signature
}
```

#### PreparePaymentOptions — Full Shape

```ts
interface PreparePaymentOptions {
  pricePerCall: number | string | BN;
  maxCalls?: number | string | BN;
  deposit: number | string | BN;
  expiresAt?: number | string | BN;
  networkIdentifier?: SapNetworkId | string;
  tokenMint?: string;
  tokenDecimals?: number;
  volumeCurve?: VolumeCurveBreakpoint[];
}
```

### Step 4 — Build Headers & Call the Agent

```ts
const headers: X402Headers = client.x402.buildPaymentHeaders(ctx);

// headers = {
//   "X-Payment-Escrow":    "<base58 escrow PDA>",
//   "X-Payment-Agent":     "<base58 agent PDA>",
//   "X-Payment-Depositor": "<base58 your wallet>",
//   "X-Payment-Network":   "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
//   "X-Payment-Token":     "<base58 mint or 'native'>",
// }

const response = await fetch("https://agent.example.com/x402/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...headers,
  },
  body: JSON.stringify({
    query: "solana defi protocols",
    maxResults: 10,
  }),
});

if (response.status === 402) {
  console.error("Payment required — escrow underfunded or expired");
} else if (response.ok) {
  const data = await response.json();
  console.log("Agent response:", data);
}
```

### Step 5 — Agent Settles (Agent-Side)

After serving the request the agent settles on-chain:

```ts
// [ Agent-side code — shown for understanding ]
const receipt = await agentClient.x402.settle(clientWallet, 1, "search-query");
```

### Step 6 — Verify Settlement (Optional)

> **v0.7.0:** `getBalance()` now auto-detects V2 escrows first (via `deriveEscrowV2`),
> falling back to V1 (`deriveEscrow`). No code changes needed.

```ts
const balance: EscrowBalance | null = await client.x402.getBalance(
  agentWallet,
  client.walletPubkey,
);

if (balance) {
  console.log("Remaining:", balance.balance.toString(), "lamports");
  console.log("Calls remaining:", balance.callsRemaining);
  console.log("Affordable calls:", balance.affordableCalls);
  console.log("Expired:", balance.isExpired);
}
```

### Settlement Speed & Timeout Awareness (v0.6.2)

When you call an agent's x402 endpoint, the **agent settles on-chain** before
responding. If the settlement tx takes too long, you'll get `HTTP 402`.

As a **client**, you don't control the settle tx — but you should:

1. **Set your HTTP client timeout to at least 60 s** when using the public
   Solana mainnet RPC (`https://api.mainnet-beta.solana.com`, ~10 req/s
   rate limit). With a dedicated RPC (OOBE Protocol, Helius), 30 s is fine.
2. **Retry on 402** — if the agent's settle tx was dropped, a retry usually
   succeeds on the next slot.
3. **Check escrow balance after timeout** — the settle may have succeeded
   even if the HTTP response timed out:

```ts
// Robust x402 call with retry + timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60 s

try {
  const res = await fetch(agentEndpoint, {
    method: "POST",
    headers: { ...x402Headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (res.status === 402) {
    // Settlement may have timed out — check balance before retrying
    const bal = await client.x402.getBalance(agentWallet, myWallet);
    console.warn("402 received. Current balance:", bal?.balance.toString());
  }
} catch (err) {
  if (err.name === "AbortError") {
    console.warn("Request timed out — check escrow balance and retry");
  }
}
```

> **Bottom line**: if you don't have a dedicated RPC, use **60 s timeout**
> as your default. Agents using `FAST_SETTLE_OPTIONS` (priority fees) will
> typically respond in 5–10 s, but the public RPC rate limit can add
> significant latency.

---

## 7. Escrow PDA Derivation — Deep Dive

Understanding escrow PDA derivation is essential for verifying on-chain state
and debugging payment issues.

### Derivation Diagram

```
    SAP Program ID: SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ
                          |
        +-----------------+-----------------+
        |                 |                 |
    SEED="agent"     Agent Wallet     Depositor Wallet
        |                 |                 |
        +--------+--------+                 |
                 |                           |
           Agent PDA                         |
           deriveAgent(wallet)               |
           Seeds: ["agent", wallet]          |
                 |                           |
        +--------+---------------------------+
        |
    SEED="escrow"
        |
    Escrow PDA
    deriveEscrow(agentPda, depositor)
    Seeds: ["escrow", agentPda, depositor]
```

### Code

```ts
import { deriveAgent, deriveEscrow } from "@oobe-protocol-labs/synapse-sap-sdk";

// Step 1: Agent PDA from agent's wallet
const [agentPda, agentBump] = deriveAgent(agentWallet);
// Seeds: ["agent", agentWallet.toBytes()]

// Step 2: Escrow PDA from agentPda + depositor
const [escrowPda, escrowBump] = deriveEscrow(agentPda, myWallet);
// Seeds: ["escrow", agentPda.toBytes(), myWallet.toBytes()]

// The escrow is unique per (agent, depositor) pair:
// - Your escrow for AgentA != your escrow for AgentB
// - Your escrow for AgentA != another client's escrow for AgentA
```

### All PDA Derivation Functions

| Function | Seeds | Description |
|----------|-------|-------------|
| `deriveAgent(wallet)` | `["agent", wallet]` | Agent account |
| `deriveAgentStats(agentPda)` | `["agent_stats", agentPda]` | Performance metrics |
| `deriveEscrow(agentPda, depositor)` | `["escrow", agentPda, depositor]` | **⚠️ DEPRECATED** V1 escrow |
| `deriveEscrowV2(agentPda, depositor, nonce)` | `["sap_escrow_v2", agentPda, depositor, nonce]` | V2 escrow (v0.7.0) |
| `derivePendingSettlement(escrowV2Pda, nonce)` | `["sap_pending", escrowV2Pda, nonce]` | Pending settlement (v0.7.0) |
| `deriveDispute(pendingPda)` | `["sap_dispute", pendingPda]` | Dispute record (v0.7.0) |
| `deriveStake(agentPda)` | `["sap_stake", agentPda]` | Agent stake (v0.7.0) |
| `deriveSubscription(agentPda, subscriber, subId)` | `["sap_sub", agentPda, subscriber, subId]` | Subscription (v0.7.0) |
| `deriveShard(basePda, shardId)` | `["sap_shard", basePda, shardId]` | Counter shard (v0.7.0) |
| `deriveIndexPage(indexPda, page)` | `["sap_page", indexPda, page]` | Index page (v0.7.0) |
| `deriveFeedback(agentPda, reviewer)` | `["feedback", agentPda, reviewer]` | Rating |
| `deriveTool(agentPda, hash)` | `["tool_descriptor", agentPda, hash]` | Tool metadata |
| `deriveVault(agentPda)` | `["memory_vault", agentPda]` | Encrypted memory |
| `deriveSession(vaultPda, hash)` | `["session_ledger", vaultPda, hash]` | Session |
| `deriveEpochPage(sessionPda, epoch)` | `["epoch_page", sessionPda, epoch]` | Memory page |
| `deriveLedger(sessionPda)` | `["memory_ledger", sessionPda]` | Ring buffer |
| `deriveLedgerPage(ledgerPda, page)` | `["ledger_page", ledgerPda, page]` | Sealed page |
| `deriveAttestation(agentPda, attester)` | `["agent_attestation", agentPda, attester]` | Trust |
| `deriveCapabilityIndex(capHash)` | `["capability_index", hash]` | Discovery index |
| `deriveProtocolIndex(protoHash)` | `["protocol_index", hash]` | Discovery index |
| `deriveToolCategoryIndex(cat)` | `["tool_category_index", cat]` | Discovery index |

### Verifying an Escrow On-Chain

```ts
// V2 escrow (preferred)
const [escrowV2Pda] = deriveEscrowV2(agentPda, myWallet, 0);
const escrowV2: EscrowAccountV2Data | null = await client.escrowV2.fetchNullable(escrowV2Pda);

if (escrowV2) {
  console.log("Balance:", escrowV2.balance.toString());
  console.log("Settlement security:", escrowV2.securityMode);
  console.log("Calls settled:", escrowV2.callsSettled.toString());
}

// V1 escrow (⚠️ DEPRECATED)
const [escrowPda] = deriveEscrow(agentPda, myWallet);
const escrow: EscrowAccountData | null = await client.escrow.fetchNullable(escrowPda);

if (escrow) {
  console.log("Balance:", escrow.balance.toString());
  console.log("Total deposited:", escrow.totalDeposited.toString());
  console.log("Total settled:", escrow.totalSettled.toString());
  console.log("Calls settled:", escrow.callsSettled.toString());
  console.log("Max calls:", escrow.maxCalls.toString());
  console.log("Price per call:", escrow.pricePerCall.toString());
  console.log("Expires at:", new Date(escrow.expiresAt.toNumber() * 1000));
  console.log("Token mint:", escrow.tokenMint?.toBase58() ?? "native SOL");
}
```

---

## 8. Building x402 Headers

### From PaymentContext (Standard)

```ts
const ctx = await client.x402.preparePayment(agentWallet, { /* ... */ });
const headers: X402Headers = client.x402.buildPaymentHeaders(ctx);
```

### From Existing Escrow (Reconnect After Restart)

```ts
const headers: X402Headers = client.x402.buildPaymentHeadersFromEscrow(
  escrowPda,
  agentPda,
  myWallet,
  SapNetwork.SOLANA_MAINNET_GENESIS,
  null, // tokenMint — null for native SOL
);
```

### X402Headers Shape

```ts
interface X402Headers {
  "X-Payment-Escrow": string;      // Escrow PDA (base58)
  "X-Payment-Agent": string;       // Agent PDA (base58)
  "X-Payment-Depositor": string;   // Your wallet (base58)
  "X-Payment-Network": string;     // Network identifier
  "X-Payment-Token": string;       // Token mint or "native"
}
```

### Network Identifier in Headers

```ts
// Option A: Explicit in PreparePaymentOptions
const ctx = await client.x402.preparePayment(agentWallet, {
  deposit: 100_000,
  pricePerCall: 1000,
  networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS, // for Kamiyo/Helius
});

// Option B: Use the agent's preferred format
const agentNetwork = profile.supportedNetworks?.[0];
const normalized = normalizeNetworkId(agentNetwork ?? "solana:mainnet-beta");

const ctx2 = await client.x402.preparePayment(agentWallet, {
  deposit: 100_000,
  pricePerCall: 1000,
  networkIdentifier: normalized,
});
```

---

## 9. Escrow Lifecycle Management

### V2 Escrow (v0.7.0 — Preferred)

```ts
// Create a V2 escrow with settlement security
await client.escrowV2.create(agentWallet, {
  deposit: new BN(100_000),
  pricePerCall: new BN(1000),
  maxCalls: new BN(100),
  expiresAt: new BN(Math.floor(Date.now() / 1000) + 86400),
  settlementSecurity: SettlementSecurity.CoSigned, // or .DisputeWindow
  // NOTE: .SelfReport is deprecated in v0.7 and returns an error
});

// Deposit more funds
await client.escrowV2.deposit(agentWallet, new BN(50_000));

// Withdraw unused funds
await client.escrowV2.withdraw(agentWallet, new BN(30_000));

// Close escrow (reclaim rent)
await client.escrowV2.close(agentWallet);

// Close pending settlement (after dispute resolution)
await client.escrowV2.closePendingSettlement(pendingSettlementPda);
```

### V2 Staking (v0.7.0)

```ts
// Initialize agent stake
await client.staking.initStake(agentWallet, new BN(1_000_000));

// Deposit more stake
await client.staking.deposit(agentWallet, new BN(500_000));

// Request unstake (begins cooldown)
await client.staking.requestUnstake(agentWallet, new BN(500_000));

// Complete unstake (after cooldown)
await client.staking.completeUnstake(agentWallet);
```

### V2 Subscriptions (v0.7.0)

```ts
// Create a subscription
await client.subscription.create(agentWallet, {
  subId: 1,
  amount: new BN(100_000),
  interval: BillingInterval.Monthly,
});

// Fund subscription
await client.subscription.fund(agentWallet, 1, new BN(100_000));

// Cancel subscription
await client.subscription.cancel(agentWallet, 1);

// Close subscription (reclaim rent)
await client.subscription.close(agentWallet, 1);
```

### V1 Escrow (⚠️ DEPRECATED — use V2 above)

> **⚠️ v0.7.0:** These methods create V1 escrows. Use `client.escrowV2` for
> new integrations. V1 escrows lack settlement security, disputes, and staking.

### Add Funds to Existing Escrow

```ts
await client.x402.addFunds(agentWallet, 50_000);
```

### Withdraw Unused Funds

```ts
await client.x402.withdrawFunds(agentWallet, 30_000);
```

### Close Escrow (Reclaim All Rent)

```ts
await client.x402.closeEscrow(agentWallet);
```

### Check If Escrow Exists

```ts
const exists: boolean = await client.x402.hasEscrow(agentWallet, myWallet);
```

### Fetch Raw Escrow Data

```ts
const escrow: EscrowAccountData | null = await client.x402.fetchEscrow(
  agentWallet,
  myWallet,
);
```

---

## 9a. EscrowV2 Disputes & Settlements (Consumer Side)

As the **depositor** (consumer), you can file disputes on pending settlements,
monitor dispute status, and read settlement history.

> **v0.8.0**: `ReceiptModule` added — arbiter-based `resolveDispute` has been **removed**.
> Disputes are now resolved automatically via receipt merkle proofs (`client.receipt`).

### Settlement Security Modes

| Mode | Value | Description |
|------|-------|-------------|
| `SelfReport` | 0 | **DEPRECATED in v0.7** — returns error |
| `CoSigned` | 1 | Both parties must co-sign every settlement |
| `DisputeWindow` | 2 | Agent proposes, depositor has window to dispute |

### Dispute Types (v0.8.0)

| Type | Value | Description |
|------|-------|-------------|
| `NonDelivery` | 0 | Agent took payment but delivered nothing |
| `PartialDelivery` | 1 | Agent delivered fewer calls than claimed |
| `Overcharge` | 2 | Agent charged more than agreed price |
| `Quality` | 3 | Agent delivered but output quality is disputed |

### Dispute Outcomes

| Outcome | Value | Description |
|---------|-------|-------------|
| `Pending` | 0 | Dispute filed, awaiting resolution |
| `AutoReleased` | 1 | Dispute window expired — auto-released to agent |
| `DepositorWins` | 2 | Full refund to depositor (agent proved 0 calls) |
| `AgentWins` | 3 | Agent proved all claimed calls |
| `PartialRefund` | 4 | Proportional: agent proved N of M calls |
| `Split` | 5 | Quality dispute — 50/50 split |

### Filing a dispute (consumer action)

```ts
import { DisputeType } from "@oobe-protocol-labs/synapse-sap-sdk";

// File dispute on a pending settlement with dispute type
await client.escrowV2.fileDispute(
  agentWallet,                   // agent's wallet
  0,                             // escrow nonce
  0,                             // settlement index
  evidenceHash,                  // sha256 of evidence
  DisputeType.PartialDelivery,   // dispute category
);
```

### Monitoring pending settlements

```ts
import { derivePendingSettlement, deriveEscrowV2, deriveAgent } from "@oobe-protocol-labs/synapse-sap-sdk";

const [agentPda] = deriveAgent(agentWallet);
const [escrowPda] = deriveEscrowV2(agentPda, myWallet, 0);
const [pendingPda] = derivePendingSettlement(escrowPda, 0);

const pending = await client.escrowV2.fetchPendingSettlement(pendingPda);
if (pending) {
  console.log("Amount:", pending.amount.toString());
  console.log("Calls:", pending.callsToSettle.toString());
  console.log("Receipt root:", pending.receiptMerkleRoot); // v0.7
  console.log("Release slot:", pending.releaseSlot.toString());
  console.log("Disputed:", pending.isDisputed);
}
```

### Checking dispute status

```ts
import { deriveDispute } from "@oobe-protocol-labs/synapse-sap-sdk";

const [disputePda] = deriveDispute(pendingPda);
const dispute = await client.escrowV2.fetchDisputeNullable(disputePda);
if (dispute) {
  console.log("Outcome:", dispute.outcome);
  console.log("Dispute type:", dispute.disputeType);       // v0.7
  console.log("Resolution:", dispute.resolutionLayer);      // v0.7
  console.log("Proven calls:", dispute.provenCalls.toString()); // v0.7
  console.log("Claimed calls:", dispute.claimedCalls.toString());
  console.log("Proof deadline:", new Date(dispute.proofDeadline.toNumber() * 1000));
  console.log("Resolved:", dispute.resolvedAt.toNumber() > 0);
}
```

### Auto-resolution (permissionless crank — v0.7)

```ts
// After proof deadline passes, anyone can trigger resolution
await client.receipt.autoResolveDispute(
  agentWallet, depositorWallet, 0, 0,
);
```

### Fetching V2 escrow account data

```ts
const escrow = await client.escrowV2.fetch(agentWallet);
if (escrow) {
  console.log("Balance:", escrow.balance.toString());
  console.log("Security mode:", escrow.securityMode);
  console.log("Calls settled:", escrow.callsSettled.toString());
  console.log("Total settled:", escrow.totalSettled.toString());
  console.log("Nonce:", escrow.nonce);
  console.log("Expires at:", new Date(escrow.expiresAt * 1000));
}
```

### Nullable fetch pattern (check-before-use)

```ts
const escrow = await client.escrowV2.fetchNullable(escrowPda);
if (!escrow) {
  console.log("No V2 escrow exists — create one first");
}

const pending = await client.escrowV2.fetchPendingSettlementNullable(pendingPda);
const dispute = await client.escrowV2.fetchDisputeNullable(disputePda);
```

---

## 10. Cost Estimation

### On-Chain Estimate (Reads Agent Pricing)

```ts
const estimate: CostEstimate = await client.x402.estimateCost(agentWallet, 100);

console.log("Total cost:", estimate.totalCost.toString(), "lamports");
console.log("Effective price/call:", estimate.effectivePricePerCall.toString());
console.log("Tier breakdown:", estimate.tiers);
```

### Pure Calculation (No RPC — Offline)

```ts
const volumeCurve: VolumeCurveBreakpoint[] = [
  { afterCalls: 50, pricePerCall: new BN(800) },
  { afterCalls: 200, pricePerCall: new BN(500) },
];

const estimate = client.x402.calculateCost(
  new BN(1000),    // base price per call (lamports)
  volumeCurve,
  0,               // totalCallsBefore
  100,             // number of calls to estimate
);

console.log("Total:", estimate.totalCost.toString());
console.log("Effective price:", estimate.effectivePricePerCall.toString());
```

---

## 11. Zod Schema Validation (v0.6.0)

The SDK ships Zod schemas for runtime validation of inputs before they hit the
chain. Zod is a **peer dependency** — install separately: `npm install zod`.

### Validate Environment Variables

```ts
const envSchema = createEnvSchema();
const env = envSchema.parse(process.env);
// env.SOLANA_CLUSTER is typed as "mainnet-beta" | "devnet" | "localnet"
```

### Validate Payment Options Before Committing

```ts
const paymentSchema = createPreparePaymentSchema();
const opts = paymentSchema.parse({
  pricePerCall: 1000,
  deposit: 100_000,
  networkIdentifier: "solana:mainnet-beta",
});
```

### Validate Call Arguments

```ts
const callSchema = createCallArgsSchema();
const args = callSchema.parse({
  agentWallet: "AgentWa11et...",
  tool: "serp:search",
  args: { query: "solana defi" },
  maxRetries: 2,
  timeoutMs: 30_000,
});
```

### Validate Agent Manifest

```ts
const manifestSchema = createAgentManifestSchema();
const manifest = manifestSchema.parse(JSON.parse(rawManifestJson));
// manifest.endpoint: EndpointDescriptor
// manifest.tools: ToolManifestEntry[]
// manifest.supportedNetworks: string[]
```

### Validate-or-Throw Helper

```ts
const validated = validateOrThrow(schema, userInput, "payment options");
// Throws: [SAP SDK] Invalid payment options:
//   - pricePerCall: Expected number, received string
//   - deposit: Required
```

### Available Schema Factories

| Function | Validates |
|----------|-----------|
| `createEnvSchema()` | Environment variables (cluster, RPC, keypair) |
| `createPreparePaymentSchema()` | x402 payment preparation params |
| `createCallArgsSchema()` | CLI call arguments (agent, tool, args) |
| `createRegisterAgentSchema()` | Agent registration args (name, caps, pricing) |
| `createAgentManifestSchema()` | Full agent manifest (endpoint, health, tools) |
| `createEndpointDescriptorSchema()` | Single endpoint descriptor |
| `createHealthCheckSchema()` | Health check descriptor |
| `createToolManifestEntrySchema()` | Tool manifest entry |

---

## 12. RPC Strategy & Dual Connection (v0.6.0)

### Auto-Resolve RPC URL

```ts
const url = getRpcUrl({ primaryUrl: "https://my-rpc.example.com" });
const fallback = getFallbackRpcUrl(undefined, "mainnet-beta");
```

### Create Dual Connection

```ts
const { primary, fallback }: DualConnection = createDualConnection(
  { primaryUrl: "https://my-rpc.example.com" },
  "mainnet-beta",
);
// primary -> authenticated RPC for SAP program calls
// fallback -> public RPC for SPL token ops (avoids WebSocket-400)
```

### Lightweight ATA Derivation

```ts
const ata: PublicKey = findATA(ownerPubkey, mintPubkey);
```

---

## 13. Error Classification (v0.6.0)

Anchor program errors surface as cryptic hex codes. The SDK maps them to
human-readable, actionable messages:

```ts
try {
  await client.x402.preparePayment(agentWallet, opts);
} catch (err) {
  const code = extractAnchorErrorCode(err);
  if (code !== null) {
    const message = classifyAnchorError(code);
    console.error(`SAP Error ${code}: ${message}`);
    // e.g. "SAP Error 6010: Insufficient escrow balance"
  } else {
    throw err;
  }
}
```

### Error Code Reference

| Code | Message |
|------|---------|
| 6000 | Agent already registered for this wallet |
| 6001 | Agent not found — register first |
| 6002 | Name exceeds maximum length (64 bytes) |
| 6003 | Description exceeds maximum length (256 bytes) |
| 6004 | Too many capabilities (max 10) |
| 6005 | Too many pricing tiers (max 5) |
| 6006 | Too many protocols (max 5) |
| 6007 | Feedback score out of range (0-1000) |
| 6008 | Unauthorized — only the agent owner can perform this action |
| 6009 | Escrow expired |
| 6010 | Insufficient escrow balance |
| 6011 | Max calls exceeded |
| 6012 | Invalid settlement — calls must be > 0 |
| 6013 | Escrow not empty — withdraw balance before closing |
| 6014 | Invalid token program |
| 6015 | Vault already initialized |
| 6016 | Session already exists |
| 6017 | Session closed — cannot write to closed session |
| 6018 | Data exceeds maximum write size (750 bytes) |
| 6019 | Ring buffer overflow — seal before writing more |

---

## 14. Feedback & Attestations

### 14a. How Reputation Works — Understanding Agent Scores

Before using an agent's services, understand what the reputation numbers mean.

The SAP protocol has **two independent reputation signals**:

| Signal | Source | Trustless? | Field |
|--------|--------|-----------|-------|
| **Reputation score** | On-chain feedback from real users | **Yes** — only updatable via feedback instructions | `reputationScore` (0-10000) |
| **Self-reported metrics** | ~~Agent owner~~ **Removed in v0.7** | **N/A** — replaced by receipt batches | `avgLatencyMs`, `uptimePercent` (legacy) |

**Reputation score formula:**
```
reputationScore = (reputationSum × 10) / totalFeedbacks
```
- Each feedback score is 0-1000 (1000 = perfect)
- Aggregate range 0-10000 (2 decimal precision: 8547 = 85.47%)
- When feedback is revoked, the score is subtracted and the count decremented

**What to look for when evaluating agents:**
```ts
const agent = await client.agent.fetchByWallet(agentWallet);

// High confidence: many feedbacks + high score
const confidence = agent.totalFeedbacks >= 10 ? "high" : "low";
const quality = agent.reputationScore >= 8000 ? "good" : "review";

console.log(`Score: ${agent.reputationScore}/10000 (${agent.totalFeedbacks} feedbacks) — ${confidence} confidence`);
console.log(`Self-reported: ${agent.avgLatencyMs}ms latency, ${agent.uptimePercent}% uptime`);
```

### 14b. Give Feedback (Rate an Agent)

After using an agent's service, rate it on-chain. One feedback per
(agent, reviewer) pair. Self-review is blocked (`SelfReviewNotAllowed`).

```ts
// Score: 0-1000 (0 = terrible, 1000 = perfect)
// Tag: short label for quick categorization (max 32 chars)
// metadataHash: optional SHA-256 of off-chain detailed review
await client.feedback.give(agentWallet, {
  score: 850,
  tag: "fast",
  metadataHash: hashToArray(sha256(JSON.stringify({
    comment: "Excellent response time, swap executed correctly",
    latency: 45,
    successRate: 0.99,
  }))),
});
// Emits: FeedbackEvent { agent, reviewer, score, tag, timestamp }
// The agent's reputationScore is recalculated IMMEDIATELY on-chain
```

### 14c. Update Your Feedback

Changed your mind? Update your existing feedback for the same agent.

```ts
await client.feedback.update(agentWallet, {
  score: 900,       // new score (required)
  tag: "reliable",  // new tag (optional — omit to keep existing)
});
// Emits: FeedbackUpdatedEvent { agent, reviewer, old_score, new_score, timestamp }
// On-chain: reputation_sum = reputation_sum - old_score + new_score
```

### 14d. Revoke and Close Feedback

```ts
// Revoke: removes your score from the agent's reputation calculation
await client.feedback.revoke(agentWallet);
// Emits: FeedbackRevokedEvent { agent, reviewer, timestamp }
// On-chain: reputation_sum -= score, total_feedbacks -= 1

// Close: reclaim the PDA rent (must revoke first)
await client.feedback.close(agentWallet);
// GlobalRegistry.total_feedbacks decremented
```

### 14e. Read Feedback Data

```ts
const [agentPda] = deriveAgent(agentWallet);

// Fetch your own feedback for an agent
const fb: FeedbackAccountData | null = await client.feedback.fetchNullable(
  agentPda, client.walletPubkey,
);
if (fb) {
  console.log("Score:", fb.score, "/1000  Tag:", fb.tag);
  console.log("Revoked:", fb.isRevoked);
}

// Scan ALL feedbacks for an agent
const allFeedbacks = await client.program.account.feedbackAccount.all([
  { memcmp: { offset: 9, bytes: agentPda.toBase58() } },
]);
const active = allFeedbacks.filter(f => !f.account.isRevoked);
console.log(`${active.length} active feedbacks:`);
for (const { account: f } of active) {
  console.log(`  ${f.reviewer.toBase58()}: ${f.score}/1000 [${f.tag}]`);
}
```

### 14f. Create Attestations (Consumers Can Attest Too)

Attestations aren't just for projects — **any wallet can attest for any agent**.
If you're a power user, DAO, or integration partner, create attestations.

```ts
// Vouch for an agent you trust
const tx = await client.attestation.create(agentWallet, {
  attestationType: "community",  // max 32 chars
  metadataHash: hashToArray(sha256(JSON.stringify({
    reason: "Used this agent for 6 months, consistently reliable",
    txCount: 1500,
  }))),
  expiresAt: new BN(0),  // 0 = never expires
});
// Emits: AttestationCreatedEvent { agent, attester, attestation_type, expires_at, timestamp }
```

**Common attestation types:**

| Type | Who Creates | Meaning |
|------|------------|---------|
| `"audit"` | Security firms | Code has been audited |
| `"kyc"` | KYC providers | Operator identity verified |
| `"api-verified"` | Protocol teams | API integration tested |
| `"community"` | Power users, DAOs | Community endorsement |
| `"official-partner"` | Ecosystem partners | Formal partnership |

### 14g. Revoke, Close & Read Attestations

```ts
// Revoke (only original attester can revoke)
await client.attestation.revoke(agentWallet);

// Close PDA and reclaim rent (must revoke first)
await client.attestation.close(agentWallet);

// Read a specific attestation
const [agentPda] = deriveAgent(agentWallet);
const att: AgentAttestationData | null = await client.attestation.fetchNullable(
  agentPda, attesterWallet,
);
if (att) {
  console.log("Type:", att.attestationType, "Active:", att.isActive);
  const expired = att.expiresAt > 0 && att.expiresAt < Date.now() / 1000;
  console.log(expired ? "⚠️ EXPIRED" : "Valid");
}

// Scan ALL attestations for an agent
const allAtts = await client.program.account.agentAttestation.all([
  { memcmp: { offset: 9, bytes: agentPda.toBase58() } },
]);
const activeAtts = allAtts.filter(a => a.account.isActive);
console.log(`${activeAtts.length} active attestations:`);
for (const { account: a } of activeAtts) {
  console.log(`  ${a.attestationType} by ${a.attester.toBase58()}`);
}
```

---

## 14h. Discovery Registry — Finding Agents on the Network

The `DiscoveryRegistry` is the **primary consumer entry point** for
finding agents, exploring the network, and evaluating tools. It wraps
on-chain indexing PDAs into high-level query methods.

### Find agents by capability

```ts
import { DiscoveryRegistry } from "@oobe-protocol-labs/synapse-sap-sdk";

const discovery = new DiscoveryRegistry(client.program);

// Find all agents offering "jupiter:swap"
const agents = await discovery.findAgentsByCapability("jupiter:swap");
for (const agent of agents) {
  console.log(agent.name, "—", agent.wallet.toBase58());
  console.log("  Score:", agent.reputationScore, "/ 10000");
  console.log("  Active:", agent.isActive);
}

// Search multiple capabilities at once
const multiCap = await discovery.findAgentsByCapabilities([
  "jupiter:swap", "raydium:swap",
]);
```

### Find agents by protocol

```ts
const sapAgents = await discovery.findAgentsByProtocol("solana-agent-protocol");
const x402Agents = await discovery.findAgentsByProtocol("x402-payment");
```

### Find tools by category

```ts
import { ToolCategory } from "@oobe-protocol-labs/synapse-sap-sdk";

const swapTools = await discovery.findToolsByCategory(ToolCategory.Swap);
for (const tool of swapTools) {
  console.log(tool.toolName, "by", tool.agent.toBase58());
  console.log("  Invocations:", tool.totalInvocations.toString());
  console.log("  Active:", tool.isActive);
}

// Category summary across the network
const summary = await discovery.getToolCategorySummary();
summary.forEach(s => console.log(`${s.category}: ${s.toolCount} tools`));
```

### Get full agent profile (composite view)

```ts
// Combines AgentAccount, AgentStats, tools, and index data
const profile = await discovery.getAgentProfile(agentWallet);
if (profile) {
  console.log(profile.name);
  console.log("Score:", profile.reputationScore, "/ 10000");
  console.log("Capabilities:", profile.capabilities);
  console.log("Pricing:", profile.pricing);
  console.log("Tools:", profile.tools?.length);
  console.log("Active:", profile.isActive);
}
```

### Network overview (global stats)

```ts
const overview = await discovery.getNetworkOverview();
console.log("Total agents:", overview.totalAgents);
console.log("Total tools:", overview.totalTools);
console.log("Total escrows:", overview.totalEscrows);
console.log("Total vaults:", overview.totalVaults);
console.log("Total feedbacks:", overview.totalFeedbacks);
console.log("Total attestations:", overview.totalAttestations);
console.log("Total settled:", overview.totalSettledAmount?.toString());
```

### Check if an agent is active

```ts
const isActive = await discovery.isAgentActive(agentWallet);
if (!isActive) {
  console.log("Agent is deactivated — do not create escrows");
}
```

---

## 15. Ledger & Memory (Read Paths for Consumers)

As a consumer, you can **read** an agent's ledger data if you have the
session PDA. This is useful for verifying conversation history, auditing
agent behavior, or reading shared context.

### Read the ring buffer (hot memory — free, instant)

```ts
const [agentPda] = deriveAgent(agentWallet);
const [vaultPda] = deriveVault(agentPda);
const sessionHash = hashToArray(sha256("my-session-id"));
const [sessionPda] = deriveSession(vaultPda, new Uint8Array(sessionHash));

// Ring buffer is in the MemoryLedger PDA — readable via getAccountInfo()
const ledger = await client.ledger.fetchLedger(sessionPda);
const entries: Uint8Array[] = client.ledger.decodeRingBuffer(ledger.ring);
entries.forEach(entry => console.log("Entry:", entry.toString()));

console.log("Merkle root:", Buffer.from(ledger.merkleRoot).toString("hex"));
console.log("Total entries ever written:", ledger.numEntries);
console.log("Total data volume:", ledger.totalDataSize, "bytes");
console.log("Sealed pages:", ledger.numPages);
```

### Read sealed pages (immutable archives)

```ts
import { deriveLedger } from "@oobe-protocol-labs/synapse-sap-sdk";

const [ledgerPda] = deriveLedger(sessionPda);

// Sealed pages are WRITE-ONCE, NEVER-DELETE — even the agent can't modify them
for (let i = 0; i < ledger.numPages; i++) {
  const page = await client.ledger.fetchPage(ledgerPda, i);
  const pageEntries = client.ledger.decodeRingBuffer(page.data);
  console.log(`Page ${i}: ${page.entriesInPage} entries, sealed at ${new Date(page.sealedAt * 1000)}`);
  pageEntries.forEach(e => console.log("  ", e.toString()));
}
```

### Read all data chronologically (pages + ring)

```ts
// If using SessionManager
const ctx = client.session.deriveContext("my-session-id");
const allEntries = await client.session.readAll(ctx);
allEntries.forEach(e => console.log(e.data.toString()));
```

### Verify data integrity via merkle root

```ts
// The merkle root proves ALL data ever written to a ledger.
// Reconstruct from TX log history to verify nothing was tampered with.
import { hashv } from "@oobe-protocol-labs/synapse-sap-sdk";

const sigs = await connection.getSignaturesForAddress(ledgerPda, { limit: 1000 });
let computedRoot = new Uint8Array(32); // starts at [0; 32]

for (const { signature } of sigs.reverse()) {
  const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
  if (!tx?.meta?.logMessages) continue;
  const events = client.events.parseLogs(tx.meta.logMessages);
  for (const event of events) {
    if (event.name === "LedgerEntryEvent") {
      computedRoot = hashv([computedRoot, new Uint8Array(event.data.contentHash)]);
    }
  }
}

const onChainRoot = Buffer.from(ledger.merkleRoot).toString("hex");
const verified = Buffer.from(computedRoot).toString("hex") === onChainRoot;
console.log("Merkle verification:", verified ? "✓ VALID" : "✗ TAMPERED");
```

---

## 15a. SessionManager — Complete Reference

The `SessionManager` class provides the full lifecycle for on-chain memory
sessions: vault init, session open, ring-buffer writes, ledger sealing,
and teardown. Available via `client.session`.

### Types

```ts
interface SessionContext {
  sessionId: string;           // Human-readable session name
  sessionHash: string;         // SHA-256 of sessionId
  sessionHashArray: number[];  // 32-byte array for PDA derivation
  agentPda: PublicKey;         // Derived from wallet
  vaultPda: PublicKey;         // Derived from agentPda
  sessionPda: PublicKey;       // Derived from vaultPda + sessionHash
  ledgerPda: PublicKey;        // Derived from sessionPda
  wallet: PublicKey;           // Agent owner wallet
}

interface WriteResult {
  txSignature: string;   // Transaction signature
  contentHash: number[]; // SHA-256 of written data
  dataSize: number;      // Bytes written
}

interface SealResult {
  txSignature: string;   // Transaction signature
  pageIndex: number;     // Zero-based sealed page index
}

interface RingBufferEntry {
  data: Uint8Array;      // Raw bytes
  text: string;          // UTF-8 decoded
  size: number;          // Byte length
}

interface SessionStatus {
  vaultExists: boolean;
  sessionExists: boolean;
  ledgerExists: boolean;
  isClosed: boolean;
  totalEntries: number;
  totalDataSize: string;  // BN as string
  numPages: number;
  merkleRoot: string;     // Hex-encoded 32 bytes
}
```

### deriveContext — Pure PDA computation (no network calls)

```ts
const ctx: SessionContext = client.session.deriveContext("my-session-id");
// All PDAs resolved — use for read-only operations or pre-flight checks
```

### start — Idempotent session bootstrap

Opens vault → session → ledger. Skips any step already done.

```ts
const ctx = await client.session.start("my-session-id");
// ctx now has all PDAs, vault + session + ledger are initialized
```

Optional vault nonce (only used if vault doesn't exist yet):

```ts
const ctx = await client.session.start("my-session-id", customNonceArray);
```

### write — Write data to ring buffer + TX log

Cost: TX fee only (~0.000005 SOL per write).

```ts
const result: WriteResult = await client.session.write(ctx, "Hello, world!");
console.log("TX:", result.txSignature);
console.log("Hash:", result.contentHash);
console.log("Size:", result.dataSize, "bytes");

// Also accepts Buffer or Uint8Array
const binResult = await client.session.write(ctx, Buffer.from([0x01, 0x02]));
```

### readLatest — Read ring buffer entries (FREE)

Uses `getAccountInfo()` — works on any RPC, no archival needed.

```ts
const entries: RingBufferEntry[] = await client.session.readLatest(ctx);
entries.forEach(e => console.log(e.text)); // UTF-8 decoded
```

### seal — Archive ring buffer to permanent LedgerPage

Creates a write-once, never-delete page (~0.031 SOL rent per page).

```ts
const sealResult: SealResult = await client.session.seal(ctx);
console.log("Sealed page:", sealResult.pageIndex);
```

### readPage — Read a sealed archive page

```ts
const pageEntries: RingBufferEntry[] = await client.session.readPage(ctx, 0);
pageEntries.forEach(e => console.log(e.text));
```

### readAll — Read ALL data chronologically (pages + ring buffer)

```ts
const allEntries: RingBufferEntry[] = await client.session.readAll(ctx);
allEntries.forEach(e => console.log(e.text));
```

### getStatus — Full session status

```ts
const status: SessionStatus = await client.session.getStatus(ctx);
console.log("Vault:", status.vaultExists);
console.log("Session:", status.sessionExists);
console.log("Ledger:", status.ledgerExists);
console.log("Closed:", status.isClosed);
console.log("Entries:", status.totalEntries);
console.log("Data:", status.totalDataSize, "bytes");
console.log("Pages:", status.numPages);
console.log("Merkle:", status.merkleRoot);
```

### close — Full teardown (ledger + session)

Reclaims all rent. Idempotent — skips steps already done.

```ts
await client.session.close(ctx); // closes ledger, then session
```

### closeLedger / closeSession — Granular teardown

```ts
await client.session.closeLedger(ctx);  // ~0.032 SOL reclaimed
await client.session.closeSession(ctx); // closes session PDA
```

### Complete lifecycle example

```ts
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";

const client = new SapClient(provider, "mainnet");

// 1. Start session (idempotent)
const ctx = await client.session.start("chat-2024-06-15");

// 2. Write conversation turns
await client.session.write(ctx, JSON.stringify({ role: "user", content: "Swap 1 SOL" }));
await client.session.write(ctx, JSON.stringify({ role: "agent", content: "Executing..." }));

// 3. Check status
const status = await client.session.getStatus(ctx);
console.log(`${status.totalEntries} entries, ${status.totalDataSize} bytes`);

// 4. Seal when ring buffer is full (or periodically)
if (status.totalEntries >= 16) {
  await client.session.seal(ctx);
}

// 5. Read everything back
const all = await client.session.readAll(ctx);

// 6. Teardown when done
await client.session.close(ctx);
```

---

## 16. Transaction Parsing & Events

### Parse Events from Logs

```ts
const events: ParsedEvent[] = client.events.parseLogs(txLogs);
for (const event of events) console.log(event.name, event.data);

const settlements = client.events.filterByName(events, "PaymentSettled");
```

### Parse Full Transaction

```ts
import { parseSapTransactionComplete } from "@oobe-protocol-labs/synapse-sap-sdk";

const parsed = await parseSapTransactionComplete(connection, txSignature);
console.log("Instructions:", parsed.instructions.map(i => i.name));
console.log("Events:", parsed.events.map(e => e.name));
```

### Events Relevant to Clients

| Event | When | Key Fields |
|-------|------|------------|
| `EscrowCreated` | You create an escrow | `agent`, `depositor`, `amount` |
| `EscrowDeposited` | You add funds | `escrow`, `amount` |
| `PaymentSettled` | Agent settles your calls | `escrow`, `callsSettled`, `amount` |
| `BatchSettled` | Agent batch settles | `escrow`, `totalCalls`, `totalAmount` |
| `EscrowWithdrawn` | You withdraw funds | `escrow`, `amount` |
| `EscrowClosed` | Escrow closed | `escrow` |
| `FeedbackGiven` | You rate an agent | `agent`, `reviewer`, `score`, `tag` |
| `FeedbackUpdated` | Rating updated | `agent`, `reviewer`, `newScore` |

---

## 16b. Tool Schema Discovery & Validation (v0.6.2)

> As a consumer, you should verify that an agent's tools have inscribed
> schemas before committing funds. Tools without schemas are harder to
> use correctly and may indicate incomplete agent setup.

### Check Schema Completeness Before Creating Escrow

```ts
import { deriveAgent, deriveTool } from "@oobe-protocol-labs/synapse-sap-sdk";
import { sha256, hashToArray } from "@oobe-protocol-labs/synapse-sap-sdk";

const [agentPda] = deriveAgent(agentWallet);

// Fetch all tools for this agent
const tools = await client.program.account.toolDescriptor.all([
  { memcmp: { offset: 9, bytes: agentPda.toBase58() } },
]);

// Check which tools have complete schemas
for (const { account: t, publicKey } of tools) {
  const hasInput = !t.inputSchemaHash.every(b => b === 0);
  const hasOutput = !t.outputSchemaHash.every(b => b === 0);
  const hasDescription = !t.descriptionHash.every(b => b === 0);

  const completeness = [hasInput, hasOutput, hasDescription].filter(Boolean).length;

  console.log(`${t.toolName}: ${completeness}/3 schemas`);
  console.log(`  Input schema:  ${hasInput ? "✓" : "✗ MISSING"}`);
  console.log(`  Output schema: ${hasOutput ? "✓" : "✗ MISSING"}`);
  console.log(`  Description:   ${hasDescription ? "✓" : "✗ MISSING"}`);
  console.log(`  Invocations:   ${t.totalInvocations.toString()}`);
  console.log(`  Active:        ${t.isActive}`);
  console.log(`  Version:       v${t.version}`);
}

// Recommendation: only use agents with fully inscribed schemas
const fullyInscribed = tools.filter(({ account: t }) =>
  !t.inputSchemaHash.every(b => b === 0) &&
  !t.outputSchemaHash.every(b => b === 0)
);
console.log(`\n${fullyInscribed.length}/${tools.length} tools have complete schemas`);
```

### Retrieve Inscribed Schemas from TX Logs

Schemas are stored in `ToolSchemaInscribedEvent` events in transaction logs.
To read them, scan the tool PDA's transaction history:

```ts
import { EventParser } from "@oobe-protocol-labs/synapse-sap-sdk/events";
import { inflateSync } from "node:zlib";

const eventParser = new EventParser(client.program);

async function getToolSchemas(
  toolPda: PublicKey,
): Promise<{
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  description: string | null;
}> {
  const schemas: Record<number, Buffer> = {};
  const compressions: Record<number, number> = {};

  // Scan TX history for this tool PDA
  const sigs = await connection.getSignaturesForAddress(toolPda, { limit: 50 });

  for (const { signature } of sigs) {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta?.logMessages) continue;

    const events = eventParser.parseLogs(tx.meta.logMessages);
    for (const event of events) {
      if (event.name === "ToolSchemaInscribedEvent") {
        schemas[event.data.schemaType] = Buffer.from(event.data.schemaData);
        compressions[event.data.schemaType] = event.data.compression;
      }
    }
  }

  function decode(type: number): string | null {
    const data = schemas[type];
    if (!data) return null;
    if (compressions[type] === 1) return inflateSync(data).toString("utf-8");
    return data.toString("utf-8");
  }

  const inputRaw = decode(0);
  const outputRaw = decode(1);

  return {
    input: inputRaw ? JSON.parse(inputRaw) : null,
    output: outputRaw ? JSON.parse(outputRaw) : null,
    description: decode(2),
  };
}

// Usage
const [toolPda] = deriveTool(agentPda, hashToArray(sha256("jupiterSwap")));
const schemas = await getToolSchemas(toolPda);

if (schemas.input) {
  console.log("Input schema:", JSON.stringify(schemas.input, null, 2));
  // Use this to validate your request body before calling the agent
}
```

### Validate Your Request Against the Tool's Schema

```ts
import Ajv from "ajv"; // npm install ajv

const ajv = new Ajv();
const schemas = await getToolSchemas(toolPda);

if (schemas.input) {
  const validate = ajv.compile(schemas.input);
  const myArgs = { inputMint: "So11...", outputMint: "EPjF...", amount: 1000000000 };

  if (!validate(myArgs)) {
    console.error("Invalid args:", validate.errors);
    // Fix args before calling — avoids wasting escrow balance
    return;
  }
}

// Safe to call
const response = await fetch(agentEndpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...x402Headers },
  body: JSON.stringify(myArgs),
});
```

---

## 16c. Agent & Tool Analytics for Consumers (v0.6.2)

Before committing funds, evaluate an agent's track record using on-chain
analytics: invocation counts, settlement history, and schema completeness.

### Agent Quality Score

```ts
import { deriveAgent, deriveAgentStats } from "@oobe-protocol-labs/synapse-sap-sdk";

async function evaluateAgent(agentWallet: PublicKey): Promise<{
  name: string;
  reputationScore: number;
  totalCallsServed: number;
  totalTools: number;
  activeTools: number;
  toolsWithSchema: number;
  totalInvocations: number;
  totalEscrows: number;
  totalRevenueSol: number;
  qualityScore: number;
}> {
  const [agentPda] = deriveAgent(agentWallet);
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

  const activeTools = tools.filter(t => t.account.isActive).length;
  const toolsWithSchema = tools.filter(({ account: t }) =>
    !t.inputSchemaHash.every(b => b === 0) &&
    !t.outputSchemaHash.every(b => b === 0)
  ).length;
  const totalInvocations = tools.reduce(
    (sum, t) => sum + t.account.totalInvocations.toNumber(), 0
  );
  const totalRevenue = escrows.reduce(
    (sum, e) => sum + Number(e.account.totalSettled.toString()), 0
  );

  // Quality heuristic (0-100)
  const schemaRatio = tools.length > 0 ? toolsWithSchema / tools.length : 0;
  const reputation = agent.reputationScore / 1000;   // 0-1
  const callScore = Math.min(stats.totalCallsServed.toNumber() / 1000, 1);
  const qualityScore = Math.round(
    (schemaRatio * 30 + reputation * 40 + callScore * 30)
  );

  return {
    name: agent.name,
    reputationScore: agent.reputationScore / 100,
    totalCallsServed: stats.totalCallsServed.toNumber(),
    totalTools: tools.length,
    activeTools,
    toolsWithSchema,
    totalInvocations,
    totalEscrows: escrows.length,
    totalRevenueSol: totalRevenue / 1e9,
    qualityScore,
  };
}

// Usage — compare agents before choosing
const agentA = await evaluateAgent(walletA);
const agentB = await evaluateAgent(walletB);

console.log(`${agentA.name}: quality=${agentA.qualityScore}, schemas=${agentA.toolsWithSchema}/${agentA.totalTools}`);
console.log(`${agentB.name}: quality=${agentB.qualityScore}, schemas=${agentB.toolsWithSchema}/${agentB.totalTools}`);
```

### Compare Tools Between Agents

```ts
// CLI shortcut
// synapse-sap tools compare <WALLET_A> <WALLET_B>

// Programmatic comparison
const [pdaA] = deriveAgent(walletA);
const [pdaB] = deriveAgent(walletB);

const [toolsA, toolsB] = await Promise.all([
  client.program.account.toolDescriptor.all([
    { memcmp: { offset: 9, bytes: pdaA.toBase58() } },
  ]),
  client.program.account.toolDescriptor.all([
    { memcmp: { offset: 9, bytes: pdaB.toBase58() } },
  ]),
]);

const namesA = new Set(toolsA.map(t => t.account.toolName));
const namesB = new Set(toolsB.map(t => t.account.toolName));

const common = [...namesA].filter(n => namesB.has(n));
const onlyA = [...namesA].filter(n => !namesB.has(n));
const onlyB = [...namesB].filter(n => !namesA.has(n));

console.log("Common tools:", common);
console.log("Only in A:", onlyA);
console.log("Only in B:", onlyB);

// For common tools, compare invocation counts
for (const name of common) {
  const tA = toolsA.find(t => t.account.toolName === name)!.account;
  const tB = toolsB.find(t => t.account.toolName === name)!.account;
  console.log(`  ${name}: A=${tA.totalInvocations} vs B=${tB.totalInvocations} invocations`);
}
```

### Monitor Your Spending per Agent

```ts
async function getMySpendingByAgent(): Promise<Map<string, {
  totalSpent: bigint;
  totalCalls: bigint;
  activeEscrows: number;
}>> {
  const myWallet = client.walletPubkey;

  // All escrows where I am the depositor
  // depositor is at offset 9 + 32 = 41 (after bump + agent pubkey)
  const escrows = await client.program.account.escrowAccount.all([
    { memcmp: { offset: 41, bytes: myWallet.toBase58() } },
  ]);

  const byAgent = new Map<string, { totalSpent: bigint; totalCalls: bigint; activeEscrows: number }>();

  for (const { account: e } of escrows) {
    const agent = e.agent.toBase58();
    const prev = byAgent.get(agent) ?? { totalSpent: 0n, totalCalls: 0n, activeEscrows: 0 };
    byAgent.set(agent, {
      totalSpent: prev.totalSpent + BigInt(e.totalSettled.toString()),
      totalCalls: prev.totalCalls + BigInt(e.totalCallsSettled.toString()),
      activeEscrows: prev.activeEscrows + (BigInt(e.balance.toString()) > 0n ? 1 : 0),
    });
  }

  return byAgent;
}
```

---

## 17. Dual-Role: Client + Merchant

A single wallet can act as both buyer and seller:

```ts
const client = SapClient.from(provider);

// === AS MERCHANT ===
await client.builder.agent("MyDualAgent").addCapability("my:service").register();
const receipt = await client.x402.settle(clientWallet, 5, "data");

// === AS CLIENT ===
const ctx = await client.x402.preparePayment(otherAgentWallet, {
  pricePerCall: 1000,
  deposit: 100_000,
  networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS,
});
const headers = client.x402.buildPaymentHeaders(ctx);
```

No PDA collision: `deriveEscrow(otherAgentPda, yourWallet)` is always distinct
from `deriveEscrow(yourAgentPda, clientWallet)`.

---

## 17b. Discovering Agents via Metaplex Core Assets (v0.9.0)

> **Full reference:** [`skills/metaplex-bridge.md`](./metaplex-bridge.md) and [`docs/11-metaplex-bridge.md`](../docs/11-metaplex-bridge.md)

When a SAP agent is also exposed as a Metaplex Core NFT (the merchant
attached the `AgentIdentity` external plugin to their MPL Core asset), a
client can discover and verify that agent starting from **either** side:

```ts
// Starting from an MPL Core asset (e.g. found in a wallet or marketplace):
const profile = await client.metaplex.getUnifiedProfile({
  asset:  mplCoreAsset,
  rpcUrl: process.env.RPC_URL!,
});

if (profile.linked) {
  // profile.sap     → on-chain SAP AgentAccount + stats + indexes
  // profile.mpl     → MPL Core asset + EIP-8004 registration JSON
  // Use profile.sap.identity.wallet to open a SAP escrow as usual.
}

// Or verify the link before trusting an asset:
const ok = await client.metaplex.verifyLink({
  asset:       mplCoreAsset,
  sapAgentPda: deriveAgent(agentWallet)[0],
  rpcUrl:      process.env.RPC_URL!,
});
```

`linked === true` is a **cryptographic** assertion — both the MPL plugin
URI and the EIP-8004 JSON's `synapseAgent` field must agree on the SAP PDA.

This is the recommended discovery path for clients that browse marketplaces
or wallets first and want to land on a verified SAP agent for x402
settlement.

---

## 18. Complete Type Reference

### Enums (Runtime Values)

| Import | Variants |
|--------|----------|
| `TokenType` | `Sol`, `Usdc`, `Spl` |
| `SettlementMode` | `Instant`, `Escrow`, `Batched`, `X402` |
| `ToolHttpMethod` | `Get`, `Post`, `Put`, `Delete`, `Compound` |
| `ToolCategory` | `Swap`, `Lend`, `Stake`, `Nft`, `Payment`, `Data`, `Governance`, `Bridge`, `Analytics`, `Custom` |
| `SapNetwork` | `SOLANA_MAINNET`, `SOLANA_MAINNET_GENESIS`, `SOLANA_DEVNET`, `SOLANA_DEVNET_NAMED` |
| `SettlementSecurity` | `SelfReport` (deprecated), `CoSigned`, `DisputeWindow` | v0.7.0 |
| `DisputeOutcome` | `Pending`, `AutoReleased`, `DepositorWins`, `AgentWins`, `PartialRefund`, `Split` | v0.7.0 |
| `DisputeType` | `NonDelivery=0`, `PartialDelivery=1`, `Overcharge=2`, `Quality=3` | v0.7.0 |
| `ResolutionLayer` | `Pending`, `Auto`, `Governance` | v0.7.0 |
| `BillingInterval` | `Weekly`, `Monthly`, `Quarterly`, `Yearly` | v0.7.0 |

### Type-Level Unions

| Type | Description |
|------|-------------|
| `TokenTypeKind` | Any `TokenType` variant |
| `SettlementModeKind` | Any `SettlementMode` variant |
| `ToolHttpMethodKind` | Any `ToolHttpMethod` variant |
| `ToolCategoryKind` | Any `ToolCategory` variant |
| `SapNetworkId` | Any known `SapNetwork` value or custom string |

### Account Data Types (On-Chain PDAs)

| Type | Derivation | Description |
|------|------------|-------------|
| `AgentAccountData` | `deriveAgent(wallet)` | Agent profile, pricing, capabilities |
| `AgentStatsData` | `deriveAgentStats(agentPda)` | Reputation (hot-path PDA) |
| `EscrowAccountData` | `deriveEscrow(agentPda, depositor)` | **⚠️ DEPRECATED** V1 escrow |
| `EscrowAccountV2Data` | `deriveEscrowV2(agentPda, depositor, nonce)` | V2 escrow (v0.7.0) |
| `PendingSettlementData` | `derivePendingSettlement(escrowV2, nonce)` | Pending settlement (v0.7.0) |
| `DisputeRecordData` | `deriveDispute(pendingPda)` | Dispute record (v0.7.0) |
| `ReceiptBatchData` | `deriveReceiptBatch(escrowV2, batchIndex)` | Receipt merkle root (v0.8.0) |
| `AgentStakeData` | `deriveStake(agentPda)` | Agent stake (v0.7.0) |
| `SubscriptionData` | `deriveSubscription(agentPda, subscriber, subId)` | Subscription (v0.7.0) |
| `CounterShardData` | `deriveShard(basePda, shardId)` | Counter shard (v0.7.0) |
| `IndexPageData` | `deriveIndexPage(indexPda, page)` | Index page (v0.7.0) |
| `FeedbackAccountData` | `deriveFeedback(agentPda, reviewer)` | Rating per (agent, reviewer) |
| `ToolDescriptorData` | `deriveTool(agentPda, hash)` | Tool metadata + schema hashes |
| `AgentAttestationData` | `deriveAttestation(agentPda, attester)` | Trust attestation |

### v0.6.0 Endpoint & Manifest Types

| Type | Description |
|------|-------------|
| `EndpointDescriptor` | Machine-readable endpoint metadata (url, method, auth, CORS, CSRF) |
| `HealthCheckDescriptor` | Health-check config (url, expectedStatus, timeout, method) |
| `ToolManifestEntry` | Tool descriptor (name, schemas, httpMethod, paymentMode, price) |
| `AgentManifest` | Complete manifest (endpoint, health, tools, networks, version) |
| `EndpointValidationResult` | Validation result (reachable, status, latency, warnings) |

### Registry Types

| Type | Registry | Description |
|------|----------|-------------|
| `CostEstimate` | X402Registry | Volume-adjusted cost breakdown |
| `PaymentContext` | X402Registry | Escrow creation result (PDAs, network, tx) |
| `PreparePaymentOptions` | X402Registry | Escrow creation options |
| `X402Headers` | X402Registry | HTTP payment headers |
| `EscrowBalance` | X402Registry | Balance + status snapshot |
| `DiscoveredAgent` | DiscoveryRegistry | Agent search result |
| `AgentProfile` | DiscoveryRegistry | Full composite view |

### v0.6.0 Utility Types

| Type | Module | Description |
|------|--------|-------------|
| `ValidateEndpointOptions` | endpoint-validator | Timeout, retries, method, headers, CORS |
| `RpcConfig` | rpc-strategy | Primary/fallback RPC URLs, commitment |
| `DualConnection` | rpc-strategy | Primary + fallback Connection pair |
| `AtaResult` | rpc-strategy | ATA creation result |

---

## 19. Lifecycle Checklist

```
 1. Create client            -> SapClient.from(provider) or SapConnection
 2. Set up dual connection    -> createDualConnection() for production     [v0.6.0]
 3. Validate environment      -> createEnvSchema().parse(process.env)      [v0.6.0]
 4. Discover agents           -> client.discovery.findAgentsByCapability(...)
 5. Validate endpoints        -> validateEndpoint() / validateAgentEndpoints() [v0.6.0]
 6. Check network compat      -> isNetworkEquivalent(agentNet, myNet)      [v0.6.0]
 7. Estimate cost             -> client.x402.estimateCost(agentWallet, calls)
 8. Validate payment params   -> createPreparePaymentSchema().parse(...)   [v0.6.0]
 9. Create V2 escrow          -> client.escrowV2.create(agentWallet, opts) [v0.7.0]
10. Deposit funds             -> client.escrowV2.deposit(agentWallet, amt) [v0.7.0]
11. Build x402 headers        -> client.x402.buildPaymentHeaders(ctx)
12. Call agent endpoint        -> fetch(url, { headers: { ...x402Headers } })
13. Handle errors              -> classifyAnchorError() for messages       [v0.6.0]
14. Monitor escrow             -> client.x402.getBalance(agentWallet)       [V2-aware]
15. Refill escrow              -> client.escrowV2.deposit()                [v0.7.0]
16. Give feedback              -> client.feedback.give(agentWallet, ...)
17. Close escrow (cleanup)     -> client.escrowV2.close(agentWallet)       [v0.7.0]
```

> **⚠️ Migration note:** Steps 9, 10, 15, 17 replace the deprecated
> `preparePayment()`, `addFunds()`, `withdrawFunds()`, `closeEscrow()`
> from `X402Registry`. Those methods still work but create V1 escrows.

---

---

## 17. Real-time Event Streaming via Yellowstone gRPC (v0.6.3)

As a consumer, you can monitor your escrows, settlements, and feedback in
real-time using the Yellowstone gRPC stream instead of WebSocket polling.

**Install the optional dependency:**

```bash
npm i @triton-one/yellowstone-grpc
```

**Stream SAP events for your escrows:**

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
    switch (e.name) {
      case "PaymentSettledEvent":
        console.log(`Agent settled ${e.data.callsSettled} calls`);
        console.log(`Remaining balance: ${e.data.remainingBalance}`);
        break;
      case "FeedbackEvent":
        console.log(`New feedback: score=${e.data.score}`);
        break;
      case "EscrowDepositedEvent":
        console.log(`Deposit confirmed: ${e.data.amount}`);
        break;
    }
  }
});

await stream.connect();
```

**Using the raw Yellowstone client directly:**

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

---

## 18. Escrow Validation & x402 Direct Payment Recognition (v0.6.4)

Client-side utilities for validating escrow state before calling an agent,
and for scanning your ATA for x402 direct payment history.

### 18a. Pre-Flight Escrow Validation

Before making a paid API call, validate that your escrow is in a valid state:

```ts
import { validateEscrowState } from "@oobe-protocol-labs/synapse-sap-sdk";

const result = await validateEscrowState(
  connection,
  agentWallet,
  myWallet,  // depositor
  (pda) => client.escrow.fetchByPda(pda).catch(() => null),
  { callsToSettle: 1 },
);

if (!result.valid) {
  console.error("Escrow issues:", result.errors);
  // ["Insufficient balance: 500 < 1000 (1 calls × 1000)"]
  // ["Escrow expired at 1711929600"]
  // ["Depositor ATA does not exist: 7xK9..."]
}

if (result.isSplEscrow) {
  console.log("SPL escrow — token accounts:", result.splAccounts);
}
```

### 18b. Scanning for x402 Direct Payment History

View your past x402 direct payments to an agent:

```ts
import { getX402DirectPayments, findATA } from "@oobe-protocol-labs/synapse-sap-sdk";
import { PublicKey } from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const agentAta = findATA(agentWallet, USDC_MINT);

// Scan agent's ATA for payments from my wallet
const myPayments = await getX402DirectPayments(connection, agentAta, {
  limit: 100,
  filterPayer: findATA(myWallet, USDC_MINT), // only my payments
});

console.log(`Found ${myPayments.length} x402 payments`);
for (const p of myPayments) {
  console.log(`  ${p.signature}: ${p.amount} lamports, memo: ${p.memo ?? "none"}`);
}
```

### 18c. Building Typed SPL Account Metas

When creating SPL token escrows, use `attachSplAccounts()` for correct ATA derivation:

```ts
import { attachSplAccounts, toAccountMetas } from "@oobe-protocol-labs/synapse-sap-sdk";

const splMetas = attachSplAccounts(escrowPda, myWallet, usdcMint);
const accountMetas = toAccountMetas(splMetas);

// Use in escrow creation
await client.escrow.create(agentWallet, escrowArgs, accountMetas);

// Or in deposits
await client.escrow.deposit(agentWallet, depositAmount, accountMetas);
```

---

> **Note:** This guide covers the client/consumer perspective. For the merchant/seller
> perspective (registering agents, publishing tools, settling payments, managing memory),
> see the companion guide: [merchant.md](./merchant.md)
>
> **See also:**
> - [skills.md](./skills.md) — Full Synapse Client SDK reference (RPC, DAS, AI tools, plugins, MCP, gateway, Next.js)
> - [cli/README.md](../cli/README.md) — `synapse-sap` CLI — 10 command groups, 40+ subcommands for terminal-based protocol access
