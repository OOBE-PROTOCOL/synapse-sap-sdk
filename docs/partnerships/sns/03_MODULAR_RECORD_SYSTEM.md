# SNS Integration — Modular Record System

**Version:** 1.0.0  
**Last Updated:** 2026-06-25  
**Status:** ✅ Production Ready  
**Philosophy:** Free choice, strong typing, modularity

---

## 🎯 Philosophy

**SNS for SAP imposes nothing.** Each agent freely chooses:
- ✅ Whether to register a `.sol` domain
- ✅ Which data to expose in records
- ✅ How to structure their on-chain identity

**Three Core Principles:**

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Free Choice** | No obligations, everything optional | Every record is choice-driven |
| **Strong Typing** | Rigorous but flexible TypeScript | Defined types, extensible |
| **Modularity** | Composable packs, modular fetching | Builder pattern, optional packs |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              SNS Record System for SAP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Core (Always)              Modular Packs (Optional)       │
│  ┌─────────────┐            ┌────────────────────────────┐ │
│  │ SOL         │            │ Identity Pack:             │ │
│  │ Pic         │            │ - Twitter, Discord         │ │
│  │ TXT?        │            │ - Telegram, Github         │ │
│  └─────────────┘            │ - Email, Url               │ │
│                             ├────────────────────────────┤ │
│                             │ Decentralized Pack:        │ │
│                             │ - IPFS, ARWV, IPNS         │ │
│                             ├────────────────────────────┤ │
│                             │ Multi-Chain Pack:          │ │
│                             │ - ETH, BTC, BSC, etc       │ │
│                             ├────────────────────────────┤ │
│                             │ DNS Pack:                  │ │
│                             │ - A, AAAA, CNAME           │ │
│                             └────────────────────────────┘ │
│                                                             │
│  Agent Choice: Build your identity                         │
│  - Minimal: Core Only                                      │
│  - Basic: Core + Endpoint                                  │
│  - Social: Core + Identity Pack                            │
│  - Decentralized: Core + Decentralized Pack                │
│  - Multi-Chain: Core + Multi-Chain Pack                    │
│  - Full: Everything (but you choose)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

```bash
# Install SDK
npm install @synapse-sap/sdk@0.3.0

# Install CLI (optional)
npm install -g @oobe-protocol-labs/synapse-sap-cli
```

---

## 🚀 Quick Start

### Option 1: Minimal (Core Only)

```typescript
import { buildSnsRecords } from '@synapse-sap/sdk/utils/sns-builder';

const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  // Nothing else, free choice
});

// Result: { SOL: "...", Pic: "..." }
// Cost: ~20 USDC (1 year)
```

### Option 2: With Endpoint

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  includeIdentity: true,
  metadata: {
    endpoint: "https://api.trading-bot.com/sap"
  }
});

// Result: { SOL, Pic, Url }
// Cost: ~20 USDC + 0.005 SOL
```

### Option 3: Social

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  includeIdentity: true,
  social: {
    twitter: "crypto_trader",
    discord: "discord.gg/bot"
  }
});

// Result: { SOL, Pic, Twitter, Discord }
```

### Option 4: Full (But You Choose)

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  
  sapData: {
    capabilities: ["jupiter:swap"],
    pricePerCall: 1000
  },
  
  includeIdentity: true,
  social: {
    twitter: "crypto_trader",
    discord: "discord.gg/bot"
  },
  
  includeDecentralized: true,
  metadata: {
    ipfs: "QmX...123",
    endpoint: "https://api.bot.com/sap"
  }
});

// Result: { SOL, Pic, TXT, Twitter, Discord, IPFS, Url }
```

---

## 📋 Record Types

### Core (Always Present)

| Record | Type | Required | Description |
|--------|------|----------|-------------|
| `SOL` | string | ✅ | Wallet address for payments |
| `Pic` | string | ✅ | Agent PDA or avatar URL |
| `TXT` | string | ❌ | SAP structured data (JSON) |

### Identity Pack (Optional)

| Record | Type | Validation | Description |
|--------|------|------------|-------------|
| `Twitter` | string | `/^[a-zA-Z0-9_]{1,15}$/` | Twitter handle (NO @) |
| `Discord` | string | URL or ID | Server invite |
| `Telegram` | string | URL | Channel or group |
| `Github` | string | URL | Repository |
| `Email` | string | Email format | Support email |
| `Url` | string | HTTP/HTTPS | Endpoint or website |

### Decentralized Pack (Optional)

| Record | Type | Validation | Description |
|--------|------|------------|-------------|
| `IPFS` | string | `^Qm` | Metadata CID |
| `ARWV` | string | URL | Arweave permanent |
| `IPNS` | string | IPNS format | Mutable pointer |

### Multi-Chain Pack (Optional)

| Record | Type | Description |
|--------|------|-------------|
| `ETH` | string | Ethereum address (0x...) |
| `BTC` | string | Bitcoin address (bc1q...) |
| `BSC` | string | BSC address (0x...) |
| `Injective` | string | Injective address |
| `LTC` | string | Litecoin address |
| `DOGE` | string | Dogecoin address |

### DNS Pack (Optional)

| Record | Type | Description |
|--------|------|-------------|
| `A` | string | IPv4 address |
| `AAAA` | string | IPv6 address |
| `CNAME` | string | Canonical name |

---

## 🔧 SDK Implementation

### 1. Build Records (Modular)

```typescript
import { buildSnsRecords, SnsRecordBuilderOptions } from '@synapse-sap/sdk/utils/sns-builder';

const options: SnsRecordBuilderOptions = {
  // Core (always required)
  wallet: agentWallet,        // PublicKey
  agentPda: agentPda,         // PublicKey
  
  // Optional packs (agent chooses)
  includeIdentity: true,      // Social, contact
  includeDecentralized: true, // IPFS, Arweave
  includeMultiChain: false,   // ETH, BTC, etc
  includeDns: false,          // DNS records
  
  // Actual data (optional, agent decides)
  sapData: {
    version: "0.3.0",
    capabilities: ["jupiter:swap", "kamino:lend"],
    protocols: ["jupiter", "kamino"],
    pricing: {
      pricePerCall: 1000,
      maxCallsPerSettlement: 100,
      acceptedTokens: ["SOL", "USDC"]
    },
    reputation: {
      totalCalls: 15420,
      avgLatencyMs: 145,
      uptimePercent: 99.5
    }
  },
  
  social: {
    twitter: "crypto_trader",
    discord: "discord.gg/bot",
    telegram: "t.me/bot",
    github: "github.com/oobe/bot"
  },
  
  metadata: {
    endpoint: "https://api.bot.com/sap",
    website: "https://trading-bot.com",
    ipfs: "QmX...123",
    arweave: "arweave.net/...abc"
  },
  
  contact: {
    email: "support@bot.com"
  },
  
  multiChain: {
    eth: "0x742...abc",
    btc: "bc1q...xyz",
    bsc: "0x853...def"
  },
  
  dns: {
    a: "192.168.1.1",
    aaaa: "2001:db8::1",
    cname: "www.bot.com"
  },
  
  customRecords: {
    [Record.Background]: "custom-data"
  }
};

const records = buildSnsRecords(options);
```

### 2. Register Domain

```typescript
import { SnsModule } from '@synapse-sap/sdk/modules/sns';

const sns = new SnsModule({ connection, sapProgramId });

const result = await sns.registerAgentDomain({
  agentWallet: signer.publicKey,
  domainName: 'trading-bot',
  records,
  durationYears: 1,
  setAsPrimary: true,
  signer,
});

console.log('✅ Domain:', result.domain);
console.log('✅ Agent PDA:', result.agentPda.toBase58());
```

### 3. Fetch Records (Modular)

```typescript
import { fetchSnsRecords, SnsFetchOptions } from '@synapse-sap/sdk/utils/sns-fetch';

// Fetch core only
const core = await fetchSnsRecords(connection, 'bot.sol', {
  includeCore: true
});

// Fetch full
const full = await fetchSnsRecords(connection, 'bot.sol', {
  includeCore: true,
  includeSapData: true,
  includeSocial: true,
  includeMetadata: true
});

// Fetch social only
const social = await fetchSnsRecords(connection, 'bot.sol', {
  includeSocial: true
});
```

---

## 🖥️ CLI Commands

### Availability

```bash
# Single domain
synapse-sap sns check trading-bot

# Batch check
synapse-sap batch-check bot1 bot2 bot3
```

### Register

```bash
# Minimal
synapse-sap sns register trading-bot \
  --keypair ~/.config/solana/id.json

# With endpoint
synapse-sap sns register trading-bot \
  --keypair ~/.config/solana/id.json \
  --endpoint https://api.bot.com/sap

# With social
synapse-sap sns register trading-bot \
  --keypair ~/.config/solana/id.json \
  --endpoint https://api.bot.com/sap \
  --twitter crypto_trader \
  --discord discord.gg/bot

# Full
synapse-sap sns register trading-bot \
  --keypair ~/.config/solana/id.json \
  --duration 1 \
  --set-primary \
  --endpoint https://api.bot.com/sap \
  --twitter crypto_trader \
  --telegram t.me/bot \
  --github github.com/oobe/bot \
  --email support@bot.com \
  --ipfs QmX...123
```

### Resolve

```bash
# Resolve domain
synapse-sap resolve trading-bot.sol

# Fetch records
synapse-sap records trading-bot.sol

# Validate records
synapse-sap validate trading-bot.sol
```

### Lifecycle

```bash
# Renew
synapse-sap sns renew trading-bot.sol \
  --years 1 \
  --keypair ~/.config/solana/id.json

# Transfer
synapse-sap sns transfer trading-bot.sol \
  --new-owner <WALLET> \
  --keypair ~/.config/solana/id.json

# Delete
synapse-sap sns delete trading-bot.sol \
  --keypair ~/.config/solana/id.json
```

### Update

```bash
# Update single record
synapse-sap sns update trading-bot.sol \
  --record Twitter \
  --value new_handle \
  --keypair ~/.config/solana/id.json

# Update endpoint
synapse-sap sns update trading-bot.sol \
  --record Url \
  --value https://new.com/sap \
  --keypair ~/.config/solana/id.json
```

### PDA

```bash
# Domain PDA
synapse-sap pda trading-bot.sol

# Record PDA
synapse-sap pda trading-bot.sol --record SOL
```

---

## 💰 Cost Analysis

### One-Time Costs

| Action | Cost (USDC) | Cost (SOL) | Refundable |
|--------|-------------|------------|------------|
| Domain Registration (1 year) | ~20 | - | ❌ |
| Each Additional Record | - | ~0.005 | ❌ |

### Recurring Costs

| Action | Cost (USDC) | Frequency |
|--------|-------------|-----------|
| Domain Renewal (1 year) | ~20 | Annual |

### Transaction Fees

| Action | Cost (SOL) | Refundable |
|--------|------------|------------|
| Update Record | ~0.005 | ❌ |
| Transfer | ~0.005 | ❌ |
| Delete/Burn | ~0.003 | ✅ Rent |

### Example Scenarios

| Scenario | Records | Total Cost (Year 1) |
|----------|---------|---------------------|
| Minimal | SOL, Pic | ~20 USDC |
| Basic | SOL, Pic, Url | ~20 USDC + 0.005 SOL |
| Social | SOL, Pic, Twitter, Discord, Email | ~20 USDC + 0.015 SOL |
| Decentralized | SOL, Pic, IPFS, ARWV, Url | ~20 USDC + 0.010 SOL |
| Full | 10+ records | ~20 USDC + 0.050 SOL |

---

## ⚠️ Best Practices

### 1. Input Validation

```typescript
// Twitter: NO @, max 15 chars
function validateTwitter(handle: string): boolean {
  return /^[a-zA-Z0-9_]{1,15}$/.test(handle);
}

// URL: HTTP/HTTPS only
function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// IPFS: Must start with Qm
function validateIpfs(cid: string): boolean {
  return /^Qm/.test(cid);
}

// Email: Standard format
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### 2. Security

```typescript
// Verify signer matches wallet
if (!signer.publicKey.equals(agentWallet)) {
  throw new Error('Signer must match agent wallet');
}

// Validate all records before registering
const validated = validateSnsRecords(records);

// Use recent blockhash
const { blockhash } = await connection.getLatestBlockhash();
```

### 3. Error Handling

```typescript
try {
  await sns.registerAgentDomain({ ... });
} catch (error) {
  if (error instanceof SnsValidationError) {
    console.error('Invalid record:', error.message);
  } else if (error instanceof SnsRpcError) {
    console.error('RPC error:', error.message);
  } else {
    throw error;
  }
}
```

---

## 📊 Type Definitions

```typescript
/**
 * SAP structured data (typed, extensible)
 */
interface SapStructuredData {
  version?: string;
  capabilities?: string[];
  protocols?: string[];
  pricing?: {
    pricePerCall?: number;
    maxCallsPerSettlement?: number;
    acceptedTokens?: string[];
  };
  reputation?: {
    totalCalls?: number;
    avgLatencyMs?: number;
    uptimePercent?: number;
  };
  [key: string]: unknown;  // Extensible
}

/**
 * Social profiles
 */
interface SocialProfiles {
  twitter?: string;
  discord?: string;
  telegram?: string;
  github?: string;
}

/**
 * Metadata URLs
 */
interface MetadataUrls {
  endpoint?: string;
  website?: string;
  ipfs?: string;
  arweave?: string;
}

/**
 * Contact info
 */
interface ContactInfo {
  email?: string;
}

/**
 * Multi-chain addresses
 */
interface MultiChainAddresses {
  eth?: string;
  btc?: string;
  bsc?: string;
  injective?: string;
  ltc?: string;
  doge?: string;
}

/**
 * DNS records
 */
interface DnsRecords {
  a?: string;
  aaaa?: string;
  cname?: string;
}

/**
 * Builder options (all optional except core)
 */
interface SnsRecordBuilderOptions {
  wallet: PublicKey;
  agentPda: PublicKey;
  
  includeIdentity?: boolean;
  includeDecentralized?: boolean;
  includeMultiChain?: boolean;
  includeDns?: boolean;
  
  sapData?: SapStructuredData;
  social?: SocialProfiles;
  metadata?: MetadataUrls;
  contact?: ContactInfo;
  multiChain?: MultiChainAddresses;
  dns?: DnsRecords;
  customRecords?: Partial<SnsRecordMap>;
}

/**
 * Fetch options (modular)
 */
interface SnsFetchOptions {
  includeCore?: boolean;
  includeSapData?: boolean;
  includeSocial?: boolean;
  includeMultiChain?: boolean;
  includeMetadata?: boolean;
}
```

---

## 🔗 Resources

- **SNS Official:** https://www.sns.id/
- **SNS Docs:** https://docs.sns.id/
- **Bonfida SDK:** https://github.com/Bonfida/spl-name-service
- **SAP SDK:** https://github.com/OOBE-PROTOCOL/synapse-sap-sdk
- **SNS Skills:** `/skills/sns-skill/README.md`

---

## 📚 Related Documentation

- [`01-setup-guide.md`](./01-setup-guide.md) — Setup and configuration
- [`02-technical-reference.md`](./02-technical-reference.md) — Complete API reference
- [`00_COMPLETE_IMPLEMENTATION_GUIDE.md`](./00_COMPLETE_IMPLEMENTATION_GUIDE.md) — Implementation guide
- [`/skills/sns-skill/README.md`](../../skills/sns-skill/README.md) — Practical skill

---

**License:** MIT  
**Maintained By:** Synapse Agent Protocol Team
