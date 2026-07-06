# SNS Integration Technical Reference

## Architecture Overview

The SNS integration consists of three main components:

1. **Type Definitions** (`src/types/sns.ts`) — TypeScript interfaces for modular record system
2. **SnsModule** (`src/modules/sns.ts`) — SNS integration with builder pattern
3. **Adapters** (`src/utils/sns-adapter.ts`) — Low-level SNS operations

**Philosophy:** Free choice, strong typing, modularity. No roles, no requirements, complete freedom.

---

## Type Reference

### SnsRecordMap

Complete record map for SNS domains. All records except SOL and Pic are optional.

```typescript
interface SnsRecordMap {
  // Core (always present)
  [Record.SOL]: string;
  [Record.Pic]: string;
  
  // Optional records (agent chooses)
  [Record.TXT]?: string;
  [Record.Url]?: string;
  [Record.Twitter]?: string;
  [Record.Discord]?: string;
  [Record.Telegram]?: string;
  [Record.Github]?: string;
  [Record.Email]?: string;
  [Record.IPFS]?: string;
  [Record.ARWV]?: string;
  [Record.IPNS]?: string;
  [Record.ETH]?: string;
  [Record.BTC]?: string;
  [Record.BSC]?: string;
  [Record.Injective]?: string;
  [Record.LTC]?: string;
  [Record.DOGE]?: string;
  [Record.A]?: string;
  [Record.AAAA]?: string;
  [Record.CNAME]?: string;
  // ... and more
}
```

---

### SapStructuredData

Optional structured data for TXT record. Agents can expose SAP-specific information.

```typescript
interface SapStructuredData {
  /** SAP SDK version */
  version?: string;
  
  /** Agent capabilities (e.g., ["jupiter:swap", "kamino:lend"]) */
  capabilities?: string[];
  
  /** Supported protocols (e.g., ["jupiter", "kamino"]) */
  protocols?: string[];
  
  /** Pricing information */
  pricing?: {
    pricePerCall?: number;
    maxCallsPerSettlement?: number;
    acceptedTokens?: string[];
  };
  
  /** Reputation metrics */
  reputation?: {
    totalCalls?: number;
    avgLatencyMs?: number;
    uptimePercent?: number;
  };
  
  /** Extensible — agents can add custom fields */
  [key: string]: unknown;
}
```

---

### SnsRecordBuilderOptions

Builder options for modular record construction. All options except core are optional.

```typescript
interface SnsRecordBuilderOptions {
  // Core (always required)
  wallet: PublicKey;        // Agent wallet public key
  agentPda: PublicKey;      // Agent PDA (on-chain identity)
  
  // Optional packs (agent chooses)
  includeIdentity?: boolean;      // Social, contact
  includeDecentralized?: boolean; // IPFS, ARWV
  includeMultiChain?: boolean;    // ETH, BTC, etc
  includeDns?: boolean;           // DNS records
  
  // Actual data (optional, agent decides)
  sapData?: SapStructuredData;
  social?: SocialProfiles;
  metadata?: MetadataUrls;
  contact?: ContactInfo;
  multiChain?: MultiChainAddresses;
  dns?: DnsRecords;
  
  // Custom records
  customRecords?: Partial<SnsRecordMap>;
}
```

---

### SnsRegistrationParams

Registration parameters for SNS domains.

```typescript
interface SnsRegistrationParams {
  agentWallet: PublicKey;           // Agent wallet public key
  domainName: string;               // Domain without .sol suffix
  records: SnsRecordMap;            // Records to register (built with buildSnsRecords)
  signer: Signer;                   // Transaction signer (must match agentWallet)
  durationYears?: number;           // Registration duration (default: 1)
  setAsPrimary?: boolean;           // Set as primary domain (default: false)
  commitment?: Commitment;          // Commitment level (default: 'confirmed')
  space?: number;                   // Space allocation in bytes (default: 600)
}
```

---

### SnsRegistrationResult

Registration result returned by `registerAgentDomain()`.

```typescript
interface SnsRegistrationResult {
  domain: string;                    // Full domain with .sol
  domainPda: PublicKey;              // Domain account PDA
  agentPda: PublicKey;               // SAP agent PDA
  transactionSignature: string;      // Transaction signature
  recordPdas: { [key: string]: PublicKey };  // All record PDAs
  setAsPrimary: boolean;             // Whether set as primary
  records: string[];                 // List of created record types
}
```

---

### SnsResolutionResult

Domain resolution result.

```typescript
interface SnsResolutionResult {
  domain: string;              // Domain name
  agentPda: PublicKey;         // Derived SAP agent PDA
  wallet: PublicKey;           // Owner wallet from SOL record
  metadata: {
    x402Endpoint?: string;     // Payment endpoint (if exposed)
    agentUri?: string;         // Verification URI (if exposed)
    capabilities?: string[];   // From TXT record
    metadataUri?: string;      // From TXT record
    web2Domain?: string;       // From Url record
    agentEndpoint?: string;    // From TXT record
  };
  records: { [key: string]: string };  // All SNS records
}
```

---

### SnsFetchOptions

Modular fetching options.

```typescript
interface SnsFetchOptions {
  includeCore?: boolean;        // Include core records (SOL, Pic)
  includeSapData?: boolean;     // Include and parse SAP data from TXT
  includeSocial?: boolean;      // Include social records
  includeMultiChain?: boolean;  // Include multi-chain records
  includeMetadata?: boolean;    // Include metadata records (IPFS, ARWV, Url)
}
```

---

### FetchedSnsRecords

Modular fetched records structure.

```typescript
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

## Record Types

### Core Records (Always Present)

| Record | Type | Description | Example |
|--------|------|-------------|---------|
| `SOL` | string | Wallet address for payments | `"AbC...123"` |
| `Pic` | string | Agent PDA or avatar URL | `"7RP...def"` or `"https://..."` |

### Optional Records (Agent Chooses)

#### Identity Pack

| Record | Type | Validation | Description |
|--------|------|------------|-------------|
| `Twitter` | string | `/^[a-zA-Z0-9_]{1,15}$/` | Twitter handle (NO @) |
| `Discord` | string | URL or ID | Server invite |
| `Telegram` | string | URL | Channel or group |
| `Github` | string | URL | Repository |
| `Email` | string | Email format | Support email |
| `Url` | string | HTTP/HTTPS | Endpoint or website |

#### Decentralized Pack

| Record | Type | Validation | Description |
|--------|------|------------|-------------|
| `IPFS` | string | `^Qm` | Metadata CID |
| `ARWV` | string | URL | Arweave permanent |
| `IPNS` | string | IPNS format | Mutable pointer |

#### Multi-Chain Pack

| Record | Type | Description |
|--------|------|-------------|
| `ETH` | string | Ethereum address (0x...) |
| `BTC` | string | Bitcoin address (bc1q...) |
| `BSC` | string | BSC address (0x...) |
| `Injective` | string | Injective address |
| `LTC` | string | Litecoin address |
| `DOGE` | string | Dogecoin address |

#### DNS Pack

| Record | Type | Description |
|--------|------|-------------|
| `A` | string | IPv4 address |
| `AAAA` | string | IPv6 address |
| `CNAME` | string | Canonical name |

---

## Usage Examples

### Example 1: Minimal Registration (Core Only)

```typescript
import { buildSnsRecords } from '@oobe-protocol-labs/synapse-sap-sdk/utils/sns-builder';

const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  // Nothing else, free choice
});

await snsModule.registerAgentDomain({
  agentWallet: agentWallet.publicKey,
  domainName: 'minimal-bot',
  records,
  signer: agentWallet,
});

// Result: { SOL: "...", Pic: "..." }
```

---

### Example 2: With Endpoint

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  includeIdentity: true,
  metadata: {
    endpoint: "https://api.trading-bot.com/sap"
  }
});

await snsModule.registerAgentDomain({
  agentWallet: agentWallet.publicKey,
  domainName: 'trading-bot',
  records,
  signer: agentWallet,
});

// Result: { SOL, Pic, Url }
```

---

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
```

---

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
```

---

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
```

---

### Example 6: Full Agent (But You Choose)

```typescript
const records = buildSnsRecords({
  wallet: agentWallet,
  agentPda: agentPda,
  
  // SAP data (if you want to expose)
  sapData: {
    version: "1.0.0",
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
  
  // Social (if you have)
  includeIdentity: true,
  social: {
    twitter: "crypto_trader",
    discord: "discord.gg/bot",
    github: "github.com/oobe/bot"
  },
  
  // Decentralized (if you want)
  includeDecentralized: true,
  metadata: {
    ipfs: "QmX...123",
    endpoint: "https://api.bot.com/sap"
  },
  
  // Contact
  contact: {
    email: "support@bot.com"
  }
});

// Result: { SOL, Pic, TXT, Twitter, Discord, Github, IPFS, Url, Email }
```

---

## API Reference

### SnsModule Methods

#### `checkAvailability(domainName: string): Promise<boolean>`

Check if a domain is available for registration.

```typescript
const available = await snsModule.checkAvailability('trading-bot');
if (available) {
  console.log('Domain is available!');
}
```

---

#### `registerAgentDomain(params: SnsRegistrationParams): Promise<SnsRegistrationResult>`

Register a domain with custom records.

```typescript
const result = await snsModule.registerAgentDomain({
  agentWallet: agentWallet.publicKey,
  domainName: 'trading-bot',
  records,
  signer: agentWallet,
  durationYears: 1,
  setAsPrimary: true,
});
```

---

#### `resolveAgentDomain(domain: string): Promise<SnsResolutionResult | null>`

Resolve a domain to agent identity.

```typescript
const resolution = await snsModule.resolveAgentDomain('trading-bot.sol');
if (resolution) {
  console.log('Wallet:', resolution.wallet.toBase58());
  console.log('Agent PDA:', resolution.agentPda.toBase58());
}
```

---

#### `fetchRecords(domain: string, options?: SnsFetchOptions): Promise<FetchedSnsRecords>`

Fetch domain records with modular options.

```typescript
// Fetch core only
const core = await snsModule.fetchRecords('bot.sol', {
  includeCore: true
});

// Fetch full
const full = await snsModule.fetchRecords('bot.sol', {
  includeCore: true,
  includeSapData: true,
  includeSocial: true
});
```

---

#### `updateRecords(params: UpdateRecordsParams): Promise<void>`

Update specific records.

```typescript
await snsModule.updateRecords({
  owner: signer,
  domainName: 'trading-bot.sol',
  records: {
    [Record.Twitter]: 'new_handle',
    [Record.Url]: 'https://new-endpoint.com/sap'
  }
});
```

---

#### `deleteDomain(params: DeleteDomainParams): Promise<void>`

Delete domain and reclaim rent.

```typescript
await snsModule.deleteDomain({
  owner: signer,
  domainName: 'trading-bot.sol'
});
```

---

## Best Practices

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

---

### 2. Security

```typescript
// ALWAYS verify signer
if (!signer.publicKey.equals(agentWallet)) {
  throw new Error('Signer must match agent wallet');
}

// Validate all records before registering
const validatedRecords = validateSnsRecords(records);

// Use recent blockhash
const { blockhash } = await connection.getLatestBlockhash();
```

---

### 3. Error Handling

```typescript
try {
  await snsModule.registerAgentDomain({ ... });
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

## Related Documentation

- [`03_MODULAR_RECORD_SYSTEM.md`](./03_MODULAR_RECORD_SYSTEM.md) — Complete modular system guide
- [`/skills/sns-skill/README.md`](../../skills/sns-skill/README.md) — Practical skill
- [`01-setup-guide.md`](./01-setup-guide.md) — Setup and configuration

---

**License:** MIT  
**Maintained By:** Synapse Agent Protocol Team
