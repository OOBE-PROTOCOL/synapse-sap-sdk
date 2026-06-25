# SNS Integration Technical Reference

## Architecture Overview

The SNS integration consists of four main components:

1. **Type Definitions** (`src/types/sns.ts`) — TypeScript interfaces and enums
2. **SnsModule** (`src/modules/sns.ts`) — SAP-specific SNS integration
3. **SnsSdk** (`src/modules/sns-standalone.ts`) — Standalone SNS domain management
4. **Adapters** (`src/utils/sns-adapter.ts`, `src/utils/sns-devnet-adapter.ts`) — Low-level SNS operations

## Type Reference

### SapAgentRole

Defines the agent's role in the SAP ecosystem, determining DNS record requirements.

```typescript
enum SapAgentRole {
  MERCHANT = 'merchant',  // Provides services, requires x402 endpoint
  CITIZEN = 'citizen',    // Consumer, requires verification URI
}
```

### SapSnsRegistrationParams

Complete registration parameters for SAP agents.

```typescript
interface SapSnsRegistrationParams {
  agentWallet: PublicKey;           // Agent wallet public key
  domainName: string;               // Domain without .sol suffix
  role: SapAgentRole;               // Agent role
  dnsConfig: SapDnsRecordConfig;    // DNS configuration
  optionalRecords?: SapOptionalRecord[];  // Additional records
  signer: Signer;                   // Transaction signer (must match agentWallet)
  space?: number;                   // Space allocation in bytes (default: 600)
  setAsPrimary?: boolean;           // Set as primary domain (default: false)
  commitment?: Commitment;          // Commitment level (default: 'confirmed')
  explicitRoleDeclaration?: boolean; // Store role explicitly on-chain
}
```

### SapDnsRecordConfig

Role-based DNS configuration.

```typescript
type SapDnsRecordConfig = 
  | {
      role: SapAgentRole.MERCHANT;
      x402Endpoint: string;  // Must be valid HTTP/HTTPS URL
      additionalRecords?: SapDnsRecord[];
    }
  | {
      role: SapAgentRole.CITIZEN;
      agentUri: string;  // Must be valid HTTP/HTTPS URL
      additionalRecords?: SapDnsRecord[];
    };
```

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
  role: SapAgentRole;                // Agent role
  records: string[];                 // List of created record types
}
```

### SnsResolutionResult

Domain resolution result.

```typescript
interface SnsResolutionResult {
  domain: string;              // Domain name
  agentPda: PublicKey;         // Derived SAP agent PDA
  wallet: PublicKey;           // Owner wallet from SOL record
  role: SapAgentRole | null;   // Inferred or declared role
  metadata: {
    x402Endpoint?: string;     // Merchant payment endpoint
    agentUri?: string;         // Citizen verification URI
    capabilities?: string[];
    metadataUri?: string;
    web2Domain?: string;
    agentEndpoint?: string;
  };
  records: { [key: string]: string };  // All SNS records
}
```

### RecordValidationResult

Validation result for agent records.

```typescript
interface RecordValidationResult {
  valid: boolean;      // Whether records pass validation
  errors: string[];    // Critical errors
  warnings: string[];  // Non-critical warnings
}
```

## API Reference

### SnsModule

#### Constructor

```typescript
constructor(config: SnsModuleConfig)

interface SnsModuleConfig {
  connection: Connection;
  sapProgramId: string;
  defaultCommitment?: Commitment;  // Optional, defaults to 'confirmed'
}
```

#### checkAvailability(domainName: string): Promise<boolean>

Check if a domain is available for registration.

**Parameters:**
- `domainName` — Domain name with or without .sol suffix

**Returns:** `true` if available, `false` if taken

**Throws:** None (returns `true` on error)

**Rate Limiting:** Enforces 300ms minimum interval between calls.

**Example:**
```typescript
const available = await snsModule.checkAvailability('my-agent');
```

#### registerAgentDomain(params: SapSnsRegistrationParams): Promise<SnsRegistrationResult>

Register a .sol domain for a SAP agent.

**Parameters:**
- `params` — Registration parameters (see type reference)

**Returns:** `SnsRegistrationResult` with domain, PDAs, and signature

**Throws:**
- `Error` — Signer does not match agentWallet
- `Error` — Domain already registered
- `Error` — Invalid URL in dnsConfig
- `Error` — Invalid domain name format

**Security Validations:**
1. Signer must match agentWallet public key
2. Domain name is sanitized (lowercase, alphanumeric + hyphens)
3. URLs in dnsConfig are validated (HTTP/HTTPS only)
4. Space is calculated based on records

**Example:**
```typescript
const result = await snsModule.registerAgentDomain({
  agentWallet: wallet.publicKey,
  domainName: 'trading-bot',
  role: SapAgentRole.MERCHANT,
  dnsConfig: {
    role: SapAgentRole.MERCHANT,
    x402Endpoint: 'https://api.example.com/x402',
  },
  signer: wallet,
  setAsPrimary: true,
});
```

#### resolveAgentDomain(domain: string): Promise<SnsResolutionResult | null>

Resolve a .sol domain to its SAP agent identity.

**Parameters:**
- `domain` — Domain name with or without .sol suffix

**Returns:** `SnsResolutionResult` if domain exists and has SOL record, `null` otherwise

**Process:**
1. Derive domain PDA
2. Fetch SOL record (wallet address)
3. Derive SAP agent PDA from wallet and SAP program ID
4. Fetch TXT record (x402 endpoint or agent URI)
5. Infer role from TXT record content or explicit declaration

**Example:**
```typescript
const agent = await snsModule.resolveAgentDomain('trading-bot.sol');
if (agent) {
  console.log('Role:', agent.role);
  console.log('x402 Endpoint:', agent.metadata.x402Endpoint);
}
```

#### validateAgentRecords(domain: string): Promise<RecordValidationResult>

Validate SNS records for SAP agent compliance.

**Parameters:**
- `domain` — Domain name with or without .sol suffix

**Returns:** `RecordValidationResult` with errors and warnings

**Validations:**
- SOL record exists and is valid Base58 (44 chars)
- DNS record exists (A, AAAA, CNAME, or TXT)
- DNS record format is correct (IPv4, IPv6, domain, or URL)

**Example:**
```typescript
const validation = await snsModule.validateAgentRecords('trading-bot.sol');
if (!validation.valid) {
  console.error('Invalid agent records:', validation.errors);
}
```

#### batchCheckAvailability(domainNames: string[]): Promise<Map<string, boolean>>

Check availability for multiple domains.

**Parameters:**
- `domainNames` — Array of domain names

**Returns:** Map of domain → availability

**Note:** Processes sequentially with rate limiting delays.

**Example:**
```typescript
const results = await snsModule.batchCheckAvailability(['bot1', 'bot2', 'bot3']);
for (const [domain, available] of results) {
  console.log(`${domain}: ${available ? 'Available' : 'Taken'}`);
}
```

#### getDomainPda(domain: string): PublicKey

Derive domain PDA.

**Parameters:**
- `domain` — Domain name with or without .sol suffix

**Returns:** Domain account PDA

**Example:**
```typescript
const pda = snsModule.getDomainPda('trading-bot.sol');
```

#### getRecordPda(domain: string, recordType: Record): PublicKey

Derive record PDA.

**Parameters:**
- `domain` — Domain name
- `recordType` — SNS record type (from @bonfida/spl-name-service)

**Returns:** Record account PDA

**Example:**
```typescript
const solPda = snsModule.getRecordPda('trading-bot.sol', Record.SOL);
```

### SnsSdk (Standalone)

For non-SAP SNS operations.

#### Constructor

```typescript
constructor(config: SnsSdkConfig)

interface SnsSdkConfig {
  connection: Connection;
  usdcMint?: PublicKey;  // Defaults to mainnet USDC
  defaultSpace?: number; // Defaults to 600
}
```

#### checkAvailability(domainName: string): Promise<DomainAvailability>

Check domain availability with pricing information.

**Returns:**
```typescript
interface DomainAvailability {
  domain: string;
  available: boolean;
  owner?: PublicKey;       // If registered
  costUsdc?: number;       // If available
  registrationUrl?: string;
  error?: string;
}
```

#### buildRegisterDomainTx(domainName: string, buyer: PublicKey, options?): Promise<RegistrationTransaction>

Build unsigned registration transaction.

**Options:**
```typescript
{
  records?: { [key: string]: string };  // Records to set
  setAsPrimary?: boolean;
  space?: number;
}
```

**Returns:**
```typescript
interface RegistrationTransaction {
  transactionBase64: string;
  transactionBase58: string;
  domainPda: PublicKey;
  webRegisterUrl: string;
  instructions: {
    register: number;
    records: number;
    primary: number;
  };
}
```

**Usage:**
```typescript
const tx = await snsSdk.buildRegisterDomainTx('my-domain', buyerPubkey, {
  records: {
    [Record.Twitter]: '@myhandle',
    [Record.Url]: 'https://example.com',
  },
  setAsPrimary: true,
});

// Sign and send separately
const signature = await sendAndConfirmTransaction(connection, tx, [signer]);
```

#### getDomainRecords(domain: string): Promise<DomainRecords>

Fetch all records for a domain.

**Returns:**
```typescript
interface DomainRecords {
  records: { [key: string]: string };
  addresses: { sol?: string; eth?: string; btc?: string; ... };
  social: { twitter?: string; github?: string; ... };
  web: { url?: string; ipfs?: string; ... };
  sap?: { agentWallet?: string; agentPda?: string; ... };
}
```

#### buildSetPrimaryDomainTx(domain: string, owner: PublicKey): Promise<PrimaryDomainTransaction>

Build transaction to set domain as primary.

#### getPrimaryDomain(owner: PublicKey): Promise<string | null>

Get primary domain for a wallet.

#### resolveDomain(domain: string): Promise<PublicKey | null>

Resolve domain to wallet address using Bonfida SDK.

### Low-Level Adapters

#### registerDomainWithSapRecords (sns-adapter.ts)

Mainnet adapter using official Bonfida SDK.

**Parameters:**
```typescript
{
  connection: Connection;
  agentWallet: PublicKey;
  domainName: string;
  sapRecords: SapAgentSnsRecords;
  signer: Signer;
  setAsPrimary?: boolean;
  commitment?: Commitment;
}
```

**SapAgentSnsRecords:**
```typescript
{
  agentWallet: string;      // Base58
  agentPda: string;         // Base58
  sapProgramId: string;     // Base58
  capabilities?: string;
  metadataUri?: string;
  web2Domain?: string;
  agentEndpoint?: string;   // Validated as HTTP/HTTPS URL
}
```

#### registerDomainWithSapRecordsDevnet (sns-devnet-adapter.ts)

Devnet adapter using official Bonfida SDK (same as mainnet).

**Note:** Previous manual implementation was removed for security. Both adapters now use identical Bonfida SDK calls.

## Record Types

### Standard SNS Records

| Record Type | Enum | Description |
|-------------|------|-------------|
| SOL | `Record.SOL` | Wallet address (Base58) |
| TXT | `Record.TXT` | Text data (used for SAP endpoints) |
| Twitter | `Record.Twitter` | Twitter handle |
| Github | `Record.Github` | GitHub username |
| Discord | `Record.Discord` | Discord ID |
| Telegram | `Record.Telegram` | Telegram username |
| Email | `Record.Email` | Email address |
| Url | `Record.Url` | Website URL |
| Pic | `Record.Pic` | Avatar image URL |
| IPFS | `Record.IPFS` | IPFS hash |
| ARWV | `Record.ARWV` | Arweave hash |

### SAP-Specific Records

SAP agents use TXT records for the following:

| Record Name | Type | Required | Description |
|-------------|------|----------|-------------|
| agentWallet | TXT | Yes | Agent wallet address |
| agentPda | TXT | Yes | SAP agent PDA |
| sapProgramId | TXT | Yes | SAP program ID |
| capabilities | TXT | No | JSON string of capabilities |
| metadataUri | TXT | No | Metadata URI |
| web2Domain | TXT | No | Web2 domain |
| agentEndpoint | TXT | No | Agent endpoint URL |
| sapRole | TXT | Optional | Explicit role declaration (`merchant` or `citizen`) |

## Security Implementation Details

### Signer Verification

All registration functions verify that the signer matches the agent wallet:

```typescript
if (!signer.publicKey.equals(agentWallet)) {
  throw new Error('Signer must be the agent wallet owner');
}
```

This prevents unauthorized domain registration on behalf of other wallets.

### Domain Name Sanitization

Domain names are validated before registration:

```typescript
function sanitizeDomainName(name: string): string {
  const sanitized = name.toLowerCase().replace(/\.sol$/, '');
  
  if (sanitized.length < 1 || sanitized.length > 63) {
    throw new Error('Domain name must be 1-63 characters');
  }
  
  if (!/^[a-z0-9-]+$/.test(sanitized)) {
    throw new Error('Domain name can only contain lowercase letters, numbers, and hyphens');
  }
  
  if (sanitized.startsWith('-') || sanitized.endsWith('-')) {
    throw new Error('Domain name cannot start or end with hyphen');
  }
  
  if (sanitized.substring(2, 4) === '--') {
    throw new Error('Domain name cannot contain IDN prefix (--) at position 3-4');
  }
  
  return sanitized;
}
```

This prevents:
- Homograph attacks (unicode lookalikes)
- Invalid characters
- Length violations
- IDN spoofing

### URL Validation

All URLs (x402Endpoint, agentUri, agentEndpoint) are validated:

```typescript
function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

This prevents:
- JavaScript injection (`javascript:...`)
- Invalid URL schemes
- Malformed URLs

### Record Data Parsing

SNS records are parsed with proper header handling:

```typescript
async function getSnsRecord(domain: string, recordType: Record): Promise<string | null> {
  const recordPda = getRecordKeySync(domain, recordType);
  const accountInfo = await connection.getAccountInfo(recordPda);
  
  if (!accountInfo || accountInfo.data.length === 0) {
    return null;
  }
  
  // Skip header (8-10 bytes depending on record type)
  const headerSize = recordType === Record.TXT ? 8 : 10;
  const rawData = accountInfo.data.slice(headerSize);
  
  // Find null terminator and strip
  const nullIndex = rawData.indexOf(0);
  const trimmedData = nullIndex > 0 ? rawData.slice(0, nullIndex) : rawData;
  
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(trimmedData).trim();
}
```

This prevents:
- Buffer overflow from malformed data
- Silent corruption from padding bytes
- Incorrect parsing of binary data

### PDA Derivation

SAP agent PDAs are derived correctly from the SAP program:

```typescript
const [expectedAgentPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('sap_agent'), wallet.toBuffer()],
  this.sapProgramId
);
```

This ensures the PDA matches the on-chain SAP agent account.

## Error Codes

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Signer must be the agent wallet owner` | Signer does not match agentWallet | Use same wallet for both |
| `Domain ... is already registered` | Domain taken | Choose alternative domain |
| `Domain name must be 1-63 characters` | Invalid length | Use shorter/longer name |
| `Domain name can only contain...` | Invalid characters | Use lowercase alphanumeric + hyphens |
| `Invalid x402Endpoint` | URL not HTTP/HTTPS | Provide valid URL |
| `Invalid agentUri` | URL not HTTP/HTTPS | Provide valid URL |
| `Missing required SOL record` | No SOL record found | Register domain with SOL record |
| `Missing required DNS record` | No DNS record found | Register with A/AAAA/CNAME/TXT |

## Testing Guidelines

### Unit Tests

```typescript
import { SnsModule, SapAgentRole } from '@oobe-protocol-labs/synapse-sap-sdk/modules/sns';
import { Connection, Keypair } from '@solana/web3.js';

describe('SnsModule', () => {
  let snsModule: SnsModule;
  let wallet: Keypair;
  
  beforeEach(() => {
    const connection = new Connection('http://localhost:8899');
    snsModule = new SnsModule({
      connection,
      sapProgramId: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ',
    });
    wallet = Keypair.generate();
  });
  
  it('rejects registration when signer != agentWallet', async () => {
    const otherWallet = Keypair.generate();
    
    await expect(snsModule.registerAgentDomain({
      agentWallet: wallet.publicKey,
      domainName: 'test',
      role: SapAgentRole.MERCHANT,
      dnsConfig: {
        role: SapAgentRole.MERCHANT,
        x402Endpoint: 'https://example.com/x402',
      },
      signer: otherWallet, // Different wallet
    })).rejects.toThrow('Signer must be the agent wallet owner');
  });
  
  it('rejects invalid domain names', async () => {
    await expect(snsModule.registerAgentDomain({
      agentWallet: wallet.publicKey,
      domainName: 'INVALID_DOMAIN', // Uppercase
      role: SapAgentRole.MERCHANT,
      dnsConfig: {
        role: SapAgentRole.MERCHANT,
        x402Endpoint: 'https://example.com/x402',
      },
      signer: wallet,
    })).rejects.toThrow('Domain name can only contain');
  });
  
  it('rejects invalid URLs', async () => {
    await expect(snsModule.registerAgentDomain({
      agentWallet: wallet.publicKey,
      domainName: 'test',
      role: SapAgentRole.MERCHANT,
      dnsConfig: {
        role: SapAgentRole.MERCHANT,
        x402Endpoint: 'javascript:alert(1)', // Invalid
      },
      signer: wallet,
    })).rejects.toThrow('Invalid x402Endpoint');
  });
});
```

### Integration Tests

```typescript
import { startLocalValidator, stopLocalValidator } from './test-utils';

describe('SnsModule Integration', () => {
  let validator: any;
  let connection: Connection;
  let snsModule: SnsModule;
  
  beforeAll(async () => {
    validator = await startLocalValidator();
    connection = new Connection(validator.rpcUrl);
    snsModule = new SnsModule({
      connection,
      sapProgramId: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ',
    });
  });
  
  afterAll(async () => {
    await stopLocalValidator(validator);
  });
  
  it('registers domain successfully', async () => {
    const wallet = Keypair.generate();
    
    // Fund wallet
    await connection.requestAirdrop(wallet.publicKey, 10_000_000_000);
    
    // Register domain
    const result = await snsModule.registerAgentDomain({
      agentWallet: wallet.publicKey,
      domainName: 'test-agent',
      role: SapAgentRole.MERCHANT,
      dnsConfig: {
        role: SapAgentRole.MERCHANT,
        x402Endpoint: 'https://test.example.com/x402',
      },
      signer: wallet,
    });
    
    expect(result.domain).toBe('test-agent.sol');
    expect(result.transactionSignature).toBeDefined();
    expect(result.recordPdas.SOL).toBeDefined();
    expect(result.recordPdas.DNS).toBeDefined();
  });
});
```

## Performance Benchmarks

| Operation | Latency (mainnet) | Latency (devnet) | Notes |
|-----------|-------------------|------------------|-------|
| checkAvailability | ~100ms | ~50ms | Single domain |
| batchCheckAvailability (5 domains) | ~600ms | ~300ms | Rate limited |
| registerAgentDomain | ~2-5s | ~1-3s | Includes confirmation |
| resolveAgentDomain | ~200ms | ~100ms | 2 RPC calls |
| validateAgentRecords | ~300ms | ~150ms | 3-4 RPC calls |

## Version Compatibility

| SNS SDK Version | Bonfida SDK | Solana/web3.js | SAP SDK |
|-----------------|-------------|----------------|---------|
| 0.21.0 | ^3.0.9 | ^1.98.4 | 0.20.0+ |
| 0.20.0 | ^3.0.9 | ^1.98.4 | 0.19.0 |

## Changelog

### v0.21.0

**Security Fixes:**
- Added signer verification in `registerAgentDomain()`
- Fixed PDA derivation in `resolveAgentDomain()`
- Implemented safe record data parsing with header skip
- Aligned devnet adapter with official Bonfida SDK
- Added URL validation for DNS records
- Added domain name sanitization

**Features:**
- Added commitment level configuration
- Added rate limiting on availability checks
- Added explicit role declaration support
- Added space calculation based on records
- Complete record PDA tracking

**Breaking Changes:**
- `signer` parameter now requires `Signer` type (was `any`)
- Invalid domain names throw errors (previously passed to SNS)
- Invalid URLs throw errors (previously passed to SNS)

### v0.20.0

Initial SNS integration release.
