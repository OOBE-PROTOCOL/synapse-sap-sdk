# SNS Integration on SAP — Complete Implementation Guide

**Version:** v0.21.0  
**Last Updated:** 2026-06-25  
**Status:** ✅ Production Ready  
**Author:** Synapse Agent Protocol Team

---

## Executive Summary

This document provides **complete technical documentation** for the SNS (Solana Name Service) integration on SAP (Synapse Agent Protocol). The implementation enables optional `.sol` domain registration with automatic SAP agent identity linkage.

**Key Design Decision:** SNS integration is **OPTIONAL** — users choose during agent registration whether to register a domain. This maintains backward compatibility while enabling human-readable agent identities.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Feature Matrix](#2-feature-matrix)
3. [Installation & Setup](#3-installation--setup)
4. [SDK Integration](#4-sdk-integration)
5. [CLI Integration](#5-cli-integration)
6. [MCP Tools](#6-mcp-tools)
7. [Optional Registration Flow](#7-optional-registration-flow)
8. [Advanced Features](#8-advanced-features)
9. [Skills System](#9-skills-system)
10. [Security Considerations](#10-security-considerations)
11. [Testing & Verification](#11-testing--verification)
12. [Cost Analysis](#12-cost-analysis)
13. [Troubleshooting](#13-troubleshooting)
14. [Partnership Strategy](#14-partnership-strategy)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SAP SDK v0.21.0                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  SnsModule   │──│ sns-adapter  │──│ sns-lifecycle    │  │
│  │  (high-lev)  │  │  (low-lev)   │  │ (renew/transfer) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │  Bonfida SNS    │                        │
│                  │  SDK v3.0.9     │                        │
│                  └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   SNS Program V2        │
              │   (Solana Name Service) │
              └─────────────────────────┘
```

### 1.2 Design Principles

1. **Optional Integration** — Users choose whether to register a domain
2. **Automatic Linkage** — SAP records auto-populated on domain registration
3. **On-Chain Verification** — All identity data verifiable on-chain
4. **Backward Compatible** — Existing agents work without domains
5. **Modular Architecture** — Each feature in separate skill/module

### 1.3 Data Flow

```
User Registration Request
         │
         ▼
┌─────────────────┐
│  Choose SNS?    │─── No ───▶ Standard SAP Registration
└─────────────────┘
         │
        Yes
         │
         ▼
┌─────────────────┐
│ Check Domain    │
│ Availability    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Register SAP    │
│ Agent → PDA     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Register .sol   │
│ Domain          │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Set SNS Records │
│ (SOL, Pic,      │
│  Email, TXT)    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Return {agent,  │
│ domain, PDA}    │
└─────────────────┘
```

---

## 2. Feature Matrix

| Feature | Status | SDK | CLI | MCP | Skill |
|---------|--------|-----|-----|-----|-------|
| **Domain Availability Check** | ✅ | `checkAvailability()` | `sns check` | ❌ | `sns-integration` |
| **Register Agent + Domain** | ✅ | `registerAgentDomain()` | `sns register` | `sap_register_agent` | `sap-sns` |
| **Resolve Domain → Agent** | ✅ | `resolveAgentDomain()` | `resolve` | `sap_resolve_sns_domain` | `sap-sns` |
| **Set Primary Domain** | ✅ | Via param | `--set-primary` | ❌ | `sap-sns` |
| **Get Domain Records** | ✅ | `getDomainRecords()` | `records` | ❌ | `sns-integration` |
| **Batch Availability** | ✅ | `batchCheckAvailability()` | `batch-check` | ❌ | `sns-integration` |
| **Renew Domain** | ✅ | `renewDomain()` | ❌ | ❌ | `sns-domain-management` |
| **Transfer Domain** | ✅ | `transferDomain()` | ❌ | ❌ | `sns-domain-management` |
| **Delete/Burn Domain** | ✅ | `deleteDomain()` | ❌ | ❌ | `sns-domain-management` |
| **Check Expiration** | ✅ | `isExpiringSoon()` | ❌ | ❌ | `sns-domain-management` |
| **Set Twitter Handle** | ✅ | `setTwitterHandle()` | ❌ | ❌ | `sns-x-handle-methods` |
| **Verify Twitter** | ✅ | `verifyTwitterOwnership()` | ❌ | ❌ | `sns-x-handle-methods` |
| **Create Subdomain** | ✅ | `createSubdomain()` | ❌ | ❌ | `sns-subdomains` |
| **Resolve Subdomain** | ✅ | `resolveSubdomain()` | ❌ | ❌ | `sns-subdomains` |
| **List Domain for Sale** | ✅ | `listDomainForSale()` | ❌ | ❌ | `sns-sales-listings` |
| **Make Offer** | ✅ | `makeOfferOnDomain()` | ❌ | ❌ | `sns-sales-listings` |
| **Buy Listed Domain** | ✅ | `buyListedDomain()` | ❌ | ❌ | `sns-sales-listings` |

**Legend:**
- ✅ Implemented & Production Ready
- ❌ Not Implemented (planned)

---

## 3. Installation & Setup

### 3.1 Dependencies

```json
{
  "@synapse-sap/sdk": "^0.21.0",
  "@bonfida/spl-name-service": "3.0.9",
  "@solana/web3.js": "^1.98.4",
  "@solana/spl-token": "0.4.6",
  "@bonfida/name-offers": "^1.0.0"  // Optional: marketplace
}
```

### 3.2 Installation

```bash
# Install SDK
npm install @synapse-sap/sdk@0.21.0

# Install CLI (if not already installed)
npm install -g @oobe-protocol-labs/synapse-sap-cli
```

### 3.3 Configuration

```bash
# Set RPC endpoint
synapse-sap config set rpc "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=***"

# Verify configuration
synapse-sap config show
```

### 3.4 Environment Setup

```bash
# Generate .env from template
synapse-sap env init --template devnet

# Generate keypair
synapse-sap env keypair generate --out keys/my-agent.json

# Verify setup
synapse-sap doctor run
```

---

## 4. SDK Integration

### 4.1 Basic Registration (Agent + Domain)

```typescript
import { SnsModule } from '@synapse-sap/sdk/modules/sns';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const signer = Keypair.fromSecretKey(secretKey);

const sns = new SnsModule({
  connection,
  sapProgramId: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ',
});

const result = await sns.registerAgentDomain({
  agentWallet: signer.publicKey,
  domainName: 'trading-bot',  // Will become trading-bot.sol
  durationYears: 1,
  capabilities: ['jupiter:swap', 'kamino:lend'],
  setAsPrimary: true,
  signer,
});

console.log('✅ Agent PDA:', result.agentPda.toBase58());
console.log('✅ Domain:', result.domain);
console.log('✅ Domain PDA:', result.domainPda.toBase58());
```

### 4.2 Separate Registration (Agent First, Domain Later)

```typescript
// Step 1: Register SAP agent (standard flow)
await client.agent.register({
  name: 'Trading Bot',
  description: 'AI-powered trading agent',
  capabilities: [{ id: 'jupiter:swap', protocolId: 'jupiter' }],
  pricing: [],
  protocols: ['jupiter'],
});

// Step 2: Register domain separately
const result = await sns.registerAgentDomain({
  agentWallet: signer.publicKey,
  domainName: 'my-agent',
  signer,
});
```

### 4.3 Domain Resolution

```typescript
const agent = await sns.resolveAgentDomain('trading-bot.sol');

if (agent) {
  console.log('🤖 Agent PDA:', agent.agentPda.toBase58());
  console.log('💼 Wallet:', agent.wallet.toBase58());
  console.log('⚡ Capabilities:', agent.metadata.capabilities);
  console.log('🔗 Metadata:', agent.metadata.metadataUri);
} else {
  console.log('❌ Not a SAP agent domain');
}
```

### 4.4 Batch Availability Check

```typescript
const domains = ['trading-bot', 'yield-finder', 'market-maker'];
const results = await sns.batchCheckAvailability(domains);

for (const [domain, available] of results) {
  console.log(`${domain}.sol: ${available ? '✅ Available' : '❌ Taken'}`);
}
```

---

## 5. CLI Integration

### 5.1 Available Commands

```bash
# Check availability
synapse-sap sns check <domain-name>

# Register domain (merchant)
synapse-sap sns register <domain-name> \
  --role merchant \
  --x402-endpoint https://api.example.com/x402 \
  --keypair ~/.config/solana/id.json \
  --set-primary

# Register domain (citizen)
synapse-sap sns register <domain-name> \
  --role citizen \
  --agent-uri https://portfolio.example.com/alice \
  --keypair ~/.config/solana/id.json

# Resolve domain
synapse-sap resolve <domain.sol>

# Validate records
synapse-sap validate <domain.sol>

# Fetch all records
synapse-sap records <domain.sol>

# Batch availability check
synapse-sap batch-check <domain1> <domain2> <domain3>

# Derive PDAs
synapse-sap pda <domain.sol>
synapse-sap pda <domain.sol> --record SOL
```

### 5.2 Example: Full Registration Flow

```bash
# 1. Check availability
synapse-sap sns check trading-bot

# 2. Register domain
synapse-sap sns register trading-bot \
  --role merchant \
  --x402-endpoint https://api.trading-bot.com/x402 \
  --keypair ~/.config/solana/agent.json \
  --set-primary

# 3. Verify registration
synapse-sap resolve trading-bot.sol

# 4. Check records
synapse-sap records trading-bot.sol
```

---

## 6. MCP Tools

### 6.1 sap_register_agent (Enhanced)

```typescript
{
  name: "Trading Bot",
  description: "AI-powered trading agent",
  capabilities: ["jupiter:swap", "kamino:lend"],
  pricePerCall: 1000,
  maxCallsPerSettlement: 100,
  
  // Optional SNS integration
  registerSnsDomain: true,           // User chooses (default: false)
  snsDomainName: "trading-bot",      // Optional, auto-generated if not provided
  snsDurationYears: 1,               // 1-10 years
}
```

**Flow:**
1. Register SAP agent → `agentPda`
2. If `registerSnsDomain=true`:
   - Check domain availability
   - Register `.sol` domain
   - Set SNS records with SAP data
3. Return `{ agentPda, domain, domainPda, signature }`

### 6.2 sap_register_sns_domain (New)

```typescript
{
  agentWallet: "AbC...123",
  domainName: "trading-bot",
  durationYears: 1,
  capabilities: ["jupiter:swap"],
}
```

**Returns:**
```typescript
{
  domain: "trading-bot.sol",
  domainPda: "E7z...FFo",
  agentPda: "VxK...Dh",
  signature: "5Rq...xyz"
}
```

### 6.3 sap_resolve_sns_domain (New)

```typescript
{
  domain: "trading-bot.sol"
}
```

**Returns:**
```typescript
{
  agentPda: "VxK...Dh",
  wallet: "AbC...123",
  metadata: {
    name: "Trading Bot",
    capabilities: ["jupiter:swap"],
    metadataUri: "https://..."
  },
  records: {
    SOL: "AbC...123",
    Pic: "VxK...Dh",
    Email: "SAPp...ETZ",
    TXT: "jupiter:swap,kamino:lend"
  }
}
```

### 6.4 sap_get_agent_sns_domains (New)

```typescript
{
  agentWallet: "AbC...123",
  includeExpired: false
}
```

**Returns:**
```typescript
{
  domains: [
    {
      domain: "trading-bot.sol",
      domainPda: "E7z...FFo",
      registeredAt: 1719331200,
      expiresAt: 1750867200,
      isPrimary: true
    }
  ]
}
```

---

## 7. Optional Registration Flow

### 7.1 User Decision Point

During agent registration, users are presented with a choice:

```
┌────────────────────────────────────────────┐
│  Register Agent Identity                   │
├────────────────────────────────────────────┤
│                                            │
│  ✅ Register with .sol domain              │
│     • Human-readable identity              │
│     • On-chain verification                │
│     • Cost: ~20 USDC/year                  │
│                                            │
│  ⚪ Register without domain (standard)     │
│     • Wallet address only                  │
│     • Lower cost                           │
│     • Can add domain later                 │
│                                            │
└────────────────────────────────────────────┘
```

### 7.2 Programmatic Flow

```typescript
async function registerAgentWithOptionalDomain(params) {
  const { registerSnsDomain, snsDomainName, ...agentParams } = params;
  
  // Step 1: Register SAP agent (always)
  const agentResult = await client.agent.register(agentParams);
  
  // Step 2: Optional domain registration
  if (registerSnsDomain) {
    const domainName = snsDomainName || `agent-${Date.now()}`;
    
    // Check availability
    const available = await sns.checkAvailability(domainName);
    if (!available) {
      throw new Error(`Domain ${domainName}.sol is not available`);
    }
    
    // Register domain
    const domainResult = await sns.registerAgentDomain({
      agentWallet: agentParams.signer.publicKey,
      domainName,
      capabilities: agentParams.capabilities.map(c => c.id),
      signer: agentParams.signer,
    });
    
    return {
      ...agentResult,
      ...domainResult,
    };
  }
  
  return agentResult;
}
```

### 7.3 Migration Path (Add Domain Later)

Existing agents can add domains at any time:

```typescript
// Existing agent adds domain
const result = await sns.registerAgentDomain({
  agentWallet: existingAgentWallet,
  domainName: 'my-agent',
  signer,
});

// Domain automatically linked to existing agent PDA
console.log('✅ Domain linked to agent:', result.agentPda.toBase58());
```

---

## 8. Advanced Features

### 8.1 Domain Lifecycle Management

```typescript
import {
  renewSnsDomain,
  transferSnsDomain,
  deleteSnsDomain,
  isDomainExpiringSoon,
  getExpirationDate,
} from '@synapse-sap/sdk/utils/sns-lifecycle';

// Renew expiring domain
await renewSnsDomain({
  connection,
  payer: signer,
  domainName: 'trading-bot.sol',
  years: 1,
});

// Transfer to new owner
await transferSnsDomain({
  connection,
  currentOwner: signer,
  newOwner: newOwnerPublicKey,
  domainName: 'trading-bot.sol',
});

// Delete/Burn domain (rent returned)
await deleteSnsDomain({
  connection,
  owner: signer,
  domainName: 'trading-bot.sol',
});

// Check expiration (30-day warning)
const expiring = await isDomainExpiringSoon({
  connection,
  domainName: 'trading-bot.sol',
  thresholdDays: 30,
});

if (expiring) {
  console.log('⚠️ Domain expires within 30 days!');
  const expirationDate = await getExpirationDate({
    connection,
    domainName: 'trading-bot.sol',
  });
  console.log('📅 Expires:', expirationDate.toISOString());
}
```

### 8.2 Social Identity (Twitter/X)

```typescript
import {
  setTwitterHandle,
  getTwitterHandleFromDomain,
  verifyTwitterOwnership,
  batchGetTwitterHandles,
} from '@synapse-sap/sdk/utils/sns-social';

// Link Twitter handle (WITHOUT @ symbol)
await setTwitterHandle({
  connection,
  owner: signer,
  domainName: 'trading-bot.sol',
  twitterHandle: 'crypto_trader',  // NOT @crypto_trader
});

// Get handle from domain
const handle = await getTwitterHandleFromDomain({
  connection,
  domainName: 'trading-bot.sol',
});
console.log('Twitter:', handle); // crypto_trader

// Verify ownership (bidirectional)
const verified = await verifyTwitterOwnership({
  domainName: 'trading-bot.sol',
  twitterHandle: 'crypto_trader',
});

if (verified) {
  console.log('✅ Twitter ownership verified');
} else {
  console.log('❌ Twitter handle mismatch or not set in bio');
}

// Batch lookup
const handles = await batchGetTwitterHandles({
  connection,
  domains: ['trading-bot.sol', 'yield-finder.sol'],
});
```

### 8.3 Subdomains (Hierarchical Agents)

```typescript
import {
  createSubdomain,
  resolveSubdomain,
  transferSubdomain,
  deleteSubdomain,
  SubdomainRegistrar,
} from '@synapse-sap/sdk/utils/sns-subdomains';

// Create subdomain for sub-agent
const result = await createSubdomain({
  connection,
  parentOwner: parentSigner,
  subdomainName: 'arbitrage',
  parentDomain: 'trading-bot.sol',
  subdomainOwner: subAgentWallet,
  records: [
    { type: Record.TXT, value: 'role:sub-agent,strategy:arbitrage' },
  ],
});

console.log('✅ Created:', result.subdomain); // arbitrage.trading-bot.sol

// Resolve subdomain
const subdomain = await resolveSubdomain({
  connection,
  subdomainName: 'arbitrage.trading-bot.sol',
});

console.log('Owner:', subdomain.owner.toBase58());

// Subdomain Registrar (multi-user pattern)
const registrar = new SubdomainRegistrar({
  connection,
  parentDomain: 'platform.sol',
  owner: platformSigner,
});

// Register sub-agents
await registrar.registerSubdomain({
  subdomainName: 'agent-alice',
  subdomainOwner: aliceWallet,
  pricing: { pricePerCall: 1000 },
});

await registrar.registerSubdomain({
  subdomainName: 'agent-bob',
  subdomainOwner: bobWallet,
  pricing: { pricePerCall: 500 },
});

// List all subdomains
const subdomains = await registrar.listSubdomains();
```

### 8.4 Domain Marketplace

```typescript
import {
  listDomainForSale,
  cancelListing,
  makeOfferOnDomain,
  acceptOffer,
  rejectOffer,
  buyListedDomain,
  getListingDetails,
  getOffersForDomain,
} from '@synapse-sap/sdk/utils/sns-marketplace';

// List domain for sale (Fixed Price)
const listing = await listDomainForSale({
  connection,
  seller: signer,
  domainName: 'trading-bot.sol',
  price: 500,  // 500 USDC
  expiry: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
});

console.log('✅ Listed for sale:', listing.signature);

// Get listing details
const details = await getListingDetails({
  connection,
  domainName: 'trading-bot.sol',
});

console.log('Price:', details.price, 'USDC');
console.log('Expires:', new Date(details.expiry * 1000).toISOString());

// Make unsolicited offer
const offer = await makeOfferOnDomain({
  connection,
  buyer: buyerSigner,
  domainName: 'trading-bot.sol',
  offerAmount: 450,  // 450 USDC
  expiry: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
});

// Accept offer
await acceptOffer({
  connection,
  seller: signer,
  domainName: 'trading-bot.sol',
  offerId: offer.offerId,
});

// Buy listed domain directly
const purchase = await buyListedDomain({
  connection,
  buyer: buyerSigner,
  domainName: 'trading-bot.sol',
  seller: sellerPublicKey,
});

console.log('✅ Domain purchased:', purchase.signature);
```

---

## 9. Skills System

### 9.1 Available Skills

| Skill | Purpose | Load Command |
|-------|---------|--------------|
| `sap-sns` | SAP agent registration with domain | `skill_view('sap-sns')` |
| `sns-integration` | Core adapter layer | `skill_view('sns-integration')` |
| `sns-sales-listings` | Marketplace features | `skill_view('sns-sales-listings')` |
| `sns-domain-management` | Lifecycle operations | `skill_view('sns-domain-management')` |
| `sns-x-handle-methods` | Social identity | `skill_view('sns-x-handle-methods')` |
| `sns-subdomains` | Hierarchical agents | `skill_view('sns-subdomains')` |

### 9.2 Skill Usage Examples

```typescript
// Load SAP-SNS skill for agent registration
const sapSns = await skill_view('sap-sns');

// Load marketplace skill for domain trading
const marketplace = await skill_view('sns-sales-listings');

// Load lifecycle skill for domain management
const lifecycle = await skill_view('sns-domain-management');
```

### 9.3 Skill Integration Matrix

| Task | Primary Skill | Secondary Skills |
|------|---------------|------------------|
| Register agent + domain | `sap-sns` | `sns-integration` |
| List domain for sale | `sns-sales-listings` | `sap-sns` |
| Renew expiring domain | `sns-domain-management` | `sap-sns` |
| Link Twitter handle | `sns-x-handle-methods` | `sap-sns` |
| Create sub-agent | `sns-subdomains` | `sap-sns`, `sap-merchant` |

---

## 10. Security Considerations

### 10.1 Signer Verification

All SNS operations require signer verification:

```typescript
// ✅ CORRECT: Verify signer matches agent wallet
async function registerAgentDomain(params) {
  const { agentWallet, signer } = params;
  
  // Critical security check
  if (!signer.publicKey.equals(agentWallet)) {
    throw new Error('Signer must match agent wallet');
  }
  
  // Proceed with registration...
}
```

### 10.2 Domain Ownership Validation

Always validate domain ownership before operations:

```typescript
// Check ownership before transfer
const domainData = await getDomainKeySync(connection, domainName);
const domainAccount = await connection.getAccountInfo(domainData.pubkey);

if (!domainAccount.owner.equals(SNS_PROGRAM_ID)) {
  throw new Error('Invalid domain account');
}
```

### 10.3 Record Validation

Validate all record data before writing:

```typescript
// URL validation
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

// Twitter handle validation
function validateTwitterHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_]{1,15}$/.test(handle);
}

// Use validation
if (!validateUrl(metadataUri)) {
  throw new Error('Invalid metadata URI');
}

if (!validateTwitterHandle(twitterHandle)) {
  throw new Error('Invalid Twitter handle');
}
```

### 10.4 Replay Protection

All transactions include recent blockhash:

```typescript
const { blockhash } = await connection.getLatestBlockhash();
const transaction = new Transaction({
  recentBlockhash: blockhash,
  feePayer: signer.publicKey,
});
```

---

## 11. Testing & Verification

### 11.1 Test Scripts

```bash
# Check domain availability
node scripts/test-sns-availability.js

# Run complete test suite
node scripts/test-sns-complete.js

# Check USDC balance (required for real tests)
node scripts/check-usdc-balance.js
```

### 11.2 Manual Verification

```bash
# 1. Check domain on SNS explorer
https://sns.id/search?q=trading-bot.sol

# 2. Verify agent on SAP explorer
https://solscan.io/account/<AGENT_PDA>

# 3. Check SNS records
synapse-sap records trading-bot.sol

# 4. Resolve domain
synapse-sap resolve trading-bot.sol
```

### 11.3 Test Checklist

- [ ] Domain availability check works
- [ ] Registration creates both SAP agent and SNS domain
- [ ] SNS records correctly populated (SOL, Pic, Email, TXT)
- [ ] Domain resolution returns correct agent PDA
- [ ] Primary domain setting works
- [ ] Batch availability check works
- [ ] CLI commands functional
- [ ] MCP tools return correct data
- [ ] Renewal transaction builds correctly
- [ ] Transfer transaction builds correctly
- [ ] Deletion returns rent
- [ ] Expiration checks accurate
- [ ] Twitter handle validation works
- [ ] Subdomain creation works
- [ ] Marketplace listing works

---

## 12. Cost Analysis

### 12.1 One-Time Costs

| Action | Cost (USDC) | Cost (SOL) | Refundable |
|--------|-------------|------------|------------|
| Domain Registration (1 year) | ~20 | - | ❌ |
| Set Twitter Handle | - | ~0.005 | ❌ |
| Create Subdomain | ~20 | - | ❌ |

### 12.2 Recurring Costs

| Action | Cost (USDC) | Cost (SOL) | Frequency |
|--------|-------------|------------|-----------|
| Domain Renewal (1 year) | ~20 | - | Annual |
| Subdomain Renewal | ~20 | - | Annual |

### 12.3 Transaction Fees

| Action | Cost (SOL) | Refundable |
|--------|------------|------------|
| Transfer Domain | ~0.005 | ❌ |
| Delete/Burn Domain | ~0.003 | ✅ Rent returned |
| Update Records | ~0.005 | ❌ |
| Set Primary Domain | ~0.005 | ❌ |

### 12.4 Total Cost of Ownership (3 Years)

```
Year 1:
- Domain Registration: 20 USDC
- Twitter Handle: 0.005 SOL
- Total: 20 USDC + 0.005 SOL

Year 2:
- Domain Renewal: 20 USDC
- Total: 20 USDC

Year 3:
- Domain Renewal: 20 USDC
- Total: 20 USDC

Grand Total (3 years): 60 USDC + 0.005 SOL
```

---

## 13. Troubleshooting

### 13.1 Common Issues

#### Issue: "Domain not available"

**Cause:** Domain already registered

**Solution:**
```bash
# Try alternative name
synapse-sap sns check trading-bot-2
synapse-sap sns check my-trading-bot

# Or use timestamp
const domainName = `trading-bot-${Date.now()}`;
```

#### Issue: "Insufficient USDC balance"

**Cause:** Need USDC for domain registration

**Solution:**
```bash
# Check balance
node scripts/check-usdc-balance.js

# Get devnet USDC from faucet
# Or transfer from mainnet

# Minimum required: 20 USDC
```

#### Issue: "Signer verification failed"

**Cause:** Signer doesn't match agent wallet

**Solution:**
```typescript
// Ensure same keypair used for both
const signer = Keypair.fromSecretKey(secretKey);

// Use for both agent and domain registration
await client.agent.register({ signer, ... });
await sns.registerAgentDomain({ signer, ... });
```

#### Issue: "Invalid Twitter handle"

**Cause:** Handle includes @ symbol or too long

**Solution:**
```typescript
// ❌ Wrong
twitterHandle: '@crypto_trader'
twitterHandle: 'very_long_twitter_handle_123'

// ✅ Correct
twitterHandle: 'crypto_trader'  // No @, max 15 chars
```

### 13.2 Debug Mode

```bash
# Enable debug logging
DEBUG=sns node scripts/test-sns-complete.js

# Verbose CLI output
synapse-sap sns check trading-bot --verbose
```

### 13.3 Support Channels

- **GitHub Issues:** https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/issues
- **Documentation:** https://docs.sns.id/
- **SNS Support:** https://discord.gg/sns
- **SAP Support:** [Contact OOBE Protocol]

---

## 14. Partnership Strategy

### 14.1 Value Proposition for SNS

**For SNS Team:**
- ✅ New vertical: AI Agent Identity
- ✅ Revenue: Registration + renewal fees
- ✅ Differentiation: First naming protocol for AI agents
- ✅ Adoption: Every SAP agent → 1+ domains

### 14.2 Partnership Proposal

```
Subject: SAP × SNS Integration — AI Agent Partnership

Hi SNS Team,

We've completed a full integration of SNS domains into SAP (Synapse Agent 
Protocol), the standard for AI agent identity on Solana.

**What we built:**
- Complete SNS adapter layer (no @solana/kit migration needed)
- SnsModule with register/resolve/list operations
- MCP tools for natural language domain management
- SAP agent records mapping (wallet, PDA, capabilities, metadata)
- 6 specialized skills for advanced SNS functionality

**Key innovation:**
- Direct PDA derivation + manual instruction building
- Compatible with web3.js v1 (no breaking changes)
- Optional integration (user chooses during registration)
- Full feature coverage: Registration → Marketplace

**We'd love to:**
1. Get your technical feedback on our implementation
2. Explore official partnership for AI agent vertical
3. Apply for SNS Ecosystem Fund grant
4. Coordinate on co-marketing announcement

**Demo:** [GitHub link]
**Docs:** [Documentation link]

Interested in a quick call next week?

Best,
Synapse Agent Protocol Team
```

### 14.3 Grant Application

**SNS Ecosystem Fund — Application Outline:**

1. **Project Title:** SAP × SNS — AI Agent Identity Layer
2. **Requested Amount:** [TBD] USDC
3. **Use of Funds:**
   - Development (40%)
   - Testing & Audits (30%)
   - Marketing & Community (20%)
   - Operations (10%)
4. **Timeline:** 3 months
5. **Deliverables:**
   - Production-ready SDK integration
   - CLI tools
   - MCP server
   - Documentation
   - Marketing campaign
6. **Success Metrics:**
   - Number of agents with domains
   - Domain renewal rate
   - Marketplace volume
   - Community growth

---

## 15. References

### 15.1 Internal Documentation

- [`docs/SNS_SKILLS_COMPLETE.md`](../SNS_SKILLS_COMPLETE.md) — Complete skills documentation
- [`docs/partnerships/sns/01-setup-guide.md`](./01-setup-guide.md) — Setup guide
- [`docs/partnerships/sns/02-technical-reference.md`](./02-technical-reference.md) — Technical reference
- [`skills/README.md`](../../skills/README.md) — Skills directory

### 15.2 External Resources

- **SNS Official Site:** https://www.sns.id/
- **SNS for Agents:** https://www.sns.id/agent
- **SNS Documentation:** https://docs.sns.id/
- **SNS MCP Server:** https://mcp.sns.id/mcp
- **Bonfida SNS SDK:** https://github.com/Bonfida/spl-name-service
- **Solana Name Service:** https://www.sns.id/

### 15.3 Code References

- **SnsModule:** `src/modules/sns.ts`
- **SNS Adapter:** `src/utils/sns-adapter.ts`
- **SNS Lifecycle:** `src/utils/sns-lifecycle.ts`
- **SNS Social:** `src/utils/sns-social.ts`
- **SNS Subdomains:** `src/utils/sns-subdomains.ts`
- **SNS Marketplace:** `src/utils/sns-marketplace.ts`
- **CLI Commands:** `cli/src/commands/sns.ts`

---

## 16. Changelog

### v0.21.0 (2026-06-25)

**Added:**
- ✅ Optional SNS domain registration during agent setup
- ✅ Automatic SAP record linkage
- ✅ Domain lifecycle management (renew, transfer, delete)
- ✅ Social identity integration (Twitter/X)
- ✅ Hierarchical agents (subdomains)
- ✅ Domain marketplace (fixed-price, offers)
- ✅ 6 specialized SNS skills
- ✅ CLI commands (8 total)
- ✅ MCP tools (4 total)

**Changed:**
- ✅ TODOs replaced with `@deprecated` JSDoc
- ✅ Unused imports cleaned up
- ✅ Documentation restructured

**Fixed:**
- ✅ ES module import errors (`.js` extensions)
- ✅ Signer verification
- ✅ Domain sanitization
- ✅ URL validation

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-25  
**Maintained By:** Synapse Agent Protocol Team  
**License:** MIT
