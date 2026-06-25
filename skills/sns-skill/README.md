# SNS Skill — Solana Name Service Integration for SAP

> **Version:** 1.0.0  
> **SDK:** `@synapse-sap/sdk@0.21.0+`  
> **SNS SDK:** `@bonfida/spl-name-service@3.0.9`  
> **Principle:** Free choice, strong typing, modularity

---

## 🎯 Philosophy

**SNS for SAP imposes nothing.** Each agent chooses:
- ✅ Whether to register a `.sol` domain
- ✅ Which data to expose in records
- ✅ How to structure their on-chain identity

**Three Principles:**
1. **Free Choice** — No obligations, everything optional
2. **Strong Typing** — Rigorous but flexible TypeScript
3. **Modularity** — Composable packs, modular fetching

---

## 📦 Installation

```bash
# Install SDK
npm install @synapse-sap/sdk@0.21.0

# Install CLI (optional)
npm install -g @oobe-protocol-labs/synapse-sap-cli
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              SNS Record System for SAP                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Core (Always)          Modular Packs (Optional)       │
│  ┌─────────────┐       ┌──────────────────────────┐   │
│  │ SOL         │       │ Identity: Twitter,       │   │
│  │ Pic         │       │ Discord, Telegram, etc   │   │
│  │ TXT?        │       ├──────────────────────────┤   │
│  └─────────────┘       │ Decentralized: IPFS,     │   │
│                        │ ARWV, IPNS               │   │
│                        ├──────────────────────────┤   │
│                        │ Multi-Chain: ETH, BTC,   │   │
│                        │ BSC, etc                 │   │
│                        ├──────────────────────────┤   │
│                        │ DNS: A, AAAA, CNAME      │   │
│                        └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
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
  
  // SAP data (if you want to expose)
  sapData: {
    capabilities: ["jupiter:swap"],
    pricePerCall: 1000
  },
  
  // Social (if you have)
  includeIdentity: true,
  social: {
    twitter: "crypto_trader",
    discord: "discord.gg/bot"
  },
  
  // Decentralized (if you want)
  includeDecentralized: true,
  metadata: {
    ipfs: "QmX...123",
    endpoint: "https://api.bot.com/sap"
  }
});

// Result: { SOL, Pic, TXT, Twitter, Discord, IPFS, Url }
```

---

## 📋 SDK Usage

### 1. Build Records (Modular)

```typescript
import { buildSnsRecords, SnsRecordBuilderOptions } from '@synapse-sap/sdk/utils/sns-builder';

/**
 * Available options (ALL optional)
 */
const options: SnsRecordBuilderOptions = {
  // Core (always required)
  wallet: agentWallet,        // PublicKey
  agentPda: agentPda,         // PublicKey
  
  // Optional packs
  includeIdentity: true,      // Social, contact
  includeDecentralized: true, // IPFS, Arweave
  includeMultiChain: false,   // ETH, BTC, etc
  includeDns: false,          // DNS records
  
  // Actual data (optional)
  sapData: {                  // SAP structured data
    version: "0.21.0",
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
  
  social: {                   // Social profiles
    twitter: "crypto_trader",
    discord: "discord.gg/bot",
    telegram: "t.me/bot",
    github: "github.com/oobe/bot"
  },
  
  metadata: {                 // Metadata URLs
    endpoint: "https://api.bot.com/sap",
    website: "https://trading-bot.com",
    ipfs: "QmX...123",
    arweave: "arweave.net/...abc"
  },
  
  contact: {                  // Contact info
    email: "support@bot.com"
  },
  
  multiChain: {               // Multi-chain addresses
    eth: "0x742...abc",
    btc: "bc1q...xyz",
    bsc: "0x853...def"
  },
  
  dns: {                      // DNS records
    a: "192.168.1.1",
    aaaa: "2001:db8::1",
    cname: "www.bot.com"
  },
  
  customRecords: {            // Custom override
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
  domainName: 'trading-bot',  // Becomes trading-bot.sol
  records,                    // Records built above
  durationYears: 1,
  setAsPrimary: true,
  signer,
});

console.log('✅ Domain:', result.domain);
console.log('✅ Agent PDA:', result.agentPda.toBase58());
console.log('✅ Domain PDA:', result.domainPda.toBase58());
```

### 3. Fetch Records (Modular)

```typescript
import { fetchSnsRecords, SnsFetchOptions } from '@synapse-sap/sdk/utils/sns-fetch';

// Fetch core only (minimal)
const core = await fetchSnsRecords(connection, 'trading-bot.sol', {
  includeCore: true
});

// Fetch full
const full = await fetchSnsRecords(connection, 'trading-bot.sol', {
  includeCore: true,
  includeSapData: true,
  includeSocial: true,
  includeMetadata: true,
  includeMultiChain: true
});

// Fetch social only
const social = await fetchSnsRecords(connection, 'trading-bot.sol', {
  includeSocial: true
});

// Fetch SAP data only
const sap = await fetchSnsRecords(connection, 'trading-bot.sol', {
  includeCore: true,
  includeSapData: true
});
```

### 4. Update Records

```typescript
import { updateSnsRecords } from '@synapse-sap/sdk/utils/sns-update';

// Update only specific records (modular)
await updateSnsRecords({
  connection,
  owner: signer,
  domainName: 'trading-bot.sol',
  records: {
    [Record.Twitter]: 'new_handle',
    [Record.Url]: 'https://new-endpoint.com/sap'
  }
});
```

### 5. Delete Domain

```typescript
import { deleteSnsDomain } from '@synapse-sap/sdk/utils/sns-lifecycle';

// Delete domain (rent returned)
await deleteSnsDomain({
  connection,
  owner: signer,
  domainName: 'trading-bot.sol'
});
```

---

## 🖥️ CLI Usage

### Check Availability

```bash
# Check single domain
synapse-sap sns check trading-bot

# Check multiple domains
synapse-sap batch-check bot1 bot2 bot3
```

### Register Domain

```bash
# Minimal (core only)
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

# Full options
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

### Resolve Domain

```bash
# Resolve to agent identity
synapse-sap resolve trading-bot.sol

# Fetch all records
synapse-sap records trading-bot.sol

# Validate records
synapse-sap validate trading-bot.sol
```

### Lifecycle Management

```bash
# Renew domain
synapse-sap sns renew trading-bot.sol \
  --years 1 \
  --keypair ~/.config/solana/id.json

# Transfer domain
synapse-sap sns transfer trading-bot.sol \
  --new-owner <NEW_WALLET> \
  --keypair ~/.config/solana/id.json

# Delete domain (rent returned)
synapse-sap sns delete trading-bot.sol \
  --keypair ~/.config/solana/id.json
```

### Update Records

```bash
# Update single record
synapse-sap sns update trading-bot.sol \
  --record Twitter \
  --value new_handle \
  --keypair ~/.config/solana/id.json

# Update endpoint
synapse-sap sns update trading-bot.sol \
  --record Url \
  --value https://new-endpoint.com/sap \
  --keypair ~/.config/solana/id.json
```

### PDA Derivation

```bash
# Get domain PDA
synapse-sap pda trading-bot.sol

# Get record PDA
synapse-sap pda trading-bot.sol --record SOL
```

---

## 📊 Record Types

### Core (Always Present)

| Record | Type | Required | Description |
|--------|------|----------|-------------|
| `SOL` | string | ✅ | Wallet address for payments |
| `Pic` | string | ✅ | Agent PDA or avatar URL |
| `TXT` | string | ❌ | SAP structured data (JSON) |

### Identity Pack (Optional)

| Record | Type | Description |
|--------|------|-------------|
| `Twitter` | string | Twitter handle (NO @ symbol) |
| `Discord` | string | Server invite or ID |
| `Telegram` | string | Channel or group |
| `Github` | string | Repository URL |
| `Email` | string | Support email |
| `Url` | string | Endpoint or website |

### Decentralized Pack (Optional)

| Record | Type | Description |
|--------|------|-------------|
| `IPFS` | string | Metadata CID (Qm...) |
| `ARWV` | string | Arweave permanent URL |
| `IPNS` | string | IPNS mutable pointer |

### Multi-Chain Pack (Optional)

| Record | Type | Description |
|--------|------|-------------|
| `ETH` | string | Ethereum address |
| `BTC` | string | Bitcoin address |
| `BSC` | string | BSC address |
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

## 🔧 Type Definitions

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
  ipns?: string;
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
  // Core
  wallet: PublicKey;
  agentPda: PublicKey;
  
  // Packs
  includeIdentity?: boolean;
  includeDecentralized?: boolean;
  includeMultiChain?: boolean;
  includeDns?: boolean;
  
  // Data
  sapData?: SapStructuredData;
  social?: SocialProfiles;
  metadata?: MetadataUrls;
  contact?: ContactInfo;
  multiChain?: MultiChainAddresses;
  dns?: DnsRecords;
  
  // Custom
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

/**
 * Fetched records
 */
interface FetchedSnsRecords {
  core?: {
    wallet: PublicKey;
    avatar: string;
  };
  sapData?: SapStructuredData;
  social?: SocialProfiles;
  multiChain?: MultiChainAddresses;
  metadata?: MetadataUrls;
}
```

---

## 📝 Real Examples

### Example 1: Minimal Agent

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
});

// Result: { SOL: "...", Pic: "..." }
// Cost: ~20 USDC (1 year)
```

### Example 2: Agent with Endpoint

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

### Example 3: Social Agent

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  includeIdentity: true,
  social: {
    twitter: "crypto_trader",
    discord: "discord.gg/bot",
    telegram: "t.me/bot"
  },
  contact: {
    email: "support@bot.com"
  }
});

// Result: { SOL, Pic, Twitter, Discord, Telegram, Email }
// Cost: ~20 USDC + 0.015 SOL
```

### Example 4: Decentralized Agent

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  includeDecentralized: true,
  metadata: {
    ipfs: "QmX...123",
    arweave: "arweave.net/...abc",
    endpoint: "https://api.bot.com/sap"
  }
});

// Result: { SOL, Pic, IPFS, ARWV, Url }
// Cost: ~20 USDC + 0.010 SOL
```

### Example 5: Multi-Chain Agent

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  includeMultiChain: true,
  multiChain: {
    eth: "0x742...abc",
    btc: "bc1q...xyz",
    bsc: "0x853...def"
  }
});

// Result: { SOL, Pic, ETH, BTC, BSC }
// Cost: ~20 USDC + 0.010 SOL
```

### Example 6: Full Agent

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  
  sapData: {
    capabilities: ["jupiter:swap", "kamino:lend"],
    protocols: ["jupiter", "kamino"],
    pricing: {
      pricePerCall: 1000,
      maxCallsPerSettlement: 100
    },
    reputation: {
      totalCalls: 15420,
      avgLatencyMs: 145,
      uptimePercent: 99.5
    }
  },
  
  includeIdentity: true,
  social: {
    twitter: "crypto_trader",
    discord: "discord.gg/bot",
    github: "github.com/oobe/bot"
  },
  
  includeDecentralized: true,
  metadata: {
    ipfs: "QmX...123",
    endpoint: "https://api.bot.com/sap"
  },
  
  contact: {
    email: "support@bot.com"
  }
});

// Result: { SOL, Pic, TXT, Twitter, Discord, Github, IPFS, Url, Email }
// Cost: ~20 USDC + 0.025 SOL
```

---

## ⚠️ Best Practices

### 1. Input Validation

```typescript
// Twitter handle: NO @ symbol, max 15 chars
function validateTwitter(handle: string): boolean {
  return /^[a-zA-Z0-9_]{1,15}$/.test(handle);
}

// URL: must be HTTP/HTTPS
function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// IPFS: must start with Qm
function validateIpfs(cid: string): boolean {
  return /^Qm/.test(cid);
}

// Email: standard validation
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### 2. Costs

| Action | Cost USDC | Cost SOL | Refundable |
|--------|-----------|----------|------------|
| Registration (1 year) | ~20 | - | ❌ |
| Renewal (1 year) | ~20 | - | ❌ |
| Update Record | - | ~0.005 | ❌ |
| Transfer | - | ~0.005 | ❌ |
| Delete/Burn | - | ~0.003 | ✅ Rent |

### 3. Security

```typescript
// ALWAYS verify signer
if (!signer.publicKey.equals(agentWallet)) {
  throw new Error('Signer must match agent wallet');
}

// Validate all inputs before registering
const validatedRecords = validateSnsRecords(records);

// Use recent blockhash
const { blockhash } = await connection.getLatestBlockhash();
```

---

## 🔗 Resources

- **SNS Official:** https://www.sns.id/
- **SNS Docs:** https://docs.sns.id/
- **Bonfida SDK:** https://github.com/Bonfida/spl-name-service
- **SAP SDK:** https://github.com/OOBE-PROTOCOL/synapse-sap-sdk

---

## 📚 Related Skills

- `sap-sns` — SAP agent registration with SNS
- `sns-integration` — Core adapter layer
- `sns-sales-listings` — Domain marketplace
- `sns-domain-management` — Lifecycle operations
- `sns-x-handle-methods` — Social identity
- `sns-subdomains` — Hierarchical agents

---

**License:** MIT  
**Maintained By:** Synapse Agent Protocol Team
