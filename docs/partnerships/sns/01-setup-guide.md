# SNS Integration Setup Guide

## Overview

This guide provides complete setup instructions for integrating Solana Name Service (SNS) with the Synapse Agent Protocol (SAP) SDK. The SNS integration enables SAP agents to register `.sol` domains that link to their on-chain identity, payment endpoints, and verification URIs.

## Prerequisites

### System Requirements

- Node.js >= 18
- npm or yarn package manager
- Solana CLI tools (for keypair management)
- Access to Solana RPC endpoint (mainnet or devnet)

### Dependencies

The SNS integration requires the following packages:

```json
{
  "@oobe-protocol-labs/synapse-sap-sdk": "^0.21.0",
  "@bonfida/spl-name-service": "^3.0.9",
  "@solana/web3.js": "^1.98.4",
  "@solana/spl-token": "^0.4.14"
}
```

Install dependencies:

```bash
npm install @oobe-protocol-labs/synapse-sap-sdk @bonfida/spl-name-service @solana/web3.js @solana/spl-token
```

## Environment Configuration

### RPC Endpoint Setup

Configure your RPC endpoint based on the target network:

```typescript
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Devnet
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Mainnet (use your own RPC provider for production)
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Custom RPC (recommended for production)
const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
```

### USDC Configuration

The SNS integration uses USDC for domain registration fees. Ensure the correct USDC mint is configured:

```typescript
import { USDC_MINTS } from '@oobe-protocol-labs/synapse-sap-sdk/constants/sns';

// Devnet USDC
const usdcMint = USDC_MINTS.DEVNET; // 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

// Mainnet USDC
const usdcMint = USDC_MINTS.MAINNET; // EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Wallet Setup

The agent wallet must be configured as the signer for all SNS operations:

```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Load from secret key (development only)
const agentWallet = Keypair.fromSecretKey(
  bs58.decode(process.env.AGENT_WALLET_SECRET!)
);

// Production: use wallet adapter or hardware wallet
// The signer MUST match the agentWallet public key
```

**Security Note:** Never expose mainnet private keys in environment files. Use secure key management solutions for production deployments.

## Module Initialization

### SnsModule Setup

Initialize the SNS module with your SAP program ID and connection:

```typescript
import { SnsModule } from '@oobe-protocol-labs/synapse-sap-sdk/modules/sns';
import { Connection } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL!);

const snsModule = new SnsModule({
  connection,
  sapProgramId: process.env.SAP_PROGRAM_ID!,
  defaultCommitment: 'confirmed', // Optional: default commitment level
});
```

### SnsSdk Setup (Standalone)

For standalone SNS operations without SAP integration:

```typescript
import { SnsSdk } from '@oobe-protocol-labs/synapse-sap-sdk';

const snsSdk = new SnsSdk({
  connection,
  usdcMint: USDC_MINTS.MAINNET, // Optional: defaults to mainnet
  defaultSpace: 600, // Optional: default space allocation
});
```

## Domain Registration Flow

### Step 1: Check Domain Availability

Before registration, verify the domain is available:

```typescript
import { SnsModule } from '@oobe-protocol-labs/synapse-sap-sdk/modules/sns';

const domainName = 'my-agent';
const available = await snsModule.checkAvailability(domainName);

if (!available) {
  console.log(`Domain ${domainName}.sol is already registered`);
  // Handle alternative: suggest variations or exit
}
```

**Rate Limiting:** The SDK enforces a 300ms minimum interval between availability checks to prevent RPC abuse.

### Step 2: Prepare Registration Parameters

Configure registration based on agent role:

```typescript
import { SapAgentRole, SapSnsRegistrationParams } from '@oobe-protocol-labs/synapse-sap-sdk/types/sns';
import { Record } from '@bonfida/spl-name-service';

// Merchant agent (provides services, requires x402 endpoint)
const merchantParams: SapSnsRegistrationParams = {
  agentWallet: agentWallet.publicKey,
  domainName: 'trading-bot',
  role: SapAgentRole.MERCHANT,
  dnsConfig: {
    role: SapAgentRole.MERCHANT,
    x402Endpoint: 'https://api.trading-bot.com/x402',
    additionalRecords: [
      { type: Record.Url, value: 'https://trading-bot.com', label: 'Website' },
    ],
  },
  optionalRecords: [
    { type: Record.Pic, value: 'https://trading-bot.com/avatar.png', label: 'Avatar' },
    { type: Record.Twitter, value: '@tradingbot', label: 'Twitter' },
  ],
  signer: agentWallet,
  space: 800, // Optional: custom space allocation
  setAsPrimary: true, // Optional: set as primary domain
  commitment: 'confirmed', // Optional: commitment level
  explicitRoleDeclaration: true, // Optional: store role explicitly on-chain
};

// Citizen agent (consumer, requires verification URI)
const citizenParams: SapSnsRegistrationParams = {
  agentWallet: agentWallet.publicKey,
  domainName: 'alice',
  role: SapAgentRole.CITIZEN,
  dnsConfig: {
    role: SapAgentRole.CITIZEN,
    agentUri: 'https://portfolio.example.com/alice',
  },
  signer: agentWallet,
};
```

### Step 3: Execute Registration

Submit the registration transaction:

```typescript
try {
  const result = await snsModule.registerAgentDomain(merchantParams);
  
  console.log('Domain registered successfully:');
  console.log('  Domain:', result.domain);
  console.log('  Signature:', result.transactionSignature);
  console.log('  Domain PDA:', result.domainPda.toBase58());
  console.log('  Agent PDA:', result.agentPda.toBase58());
  console.log('  Records:', result.records);
  console.log('  Record PDAs:', result.recordPdas);
} catch (error) {
  console.error('Registration failed:', error instanceof Error ? error.message : error);
  
  // Handle specific errors
  if (error instanceof Error && error.message.includes('already registered')) {
    // Domain was taken between availability check and registration
    // Implement retry with alternative domain
  }
  
  if (error instanceof Error && error.message.includes('Signer must be')) {
    // Security violation: signer does not match agentWallet
    // This should never happen in legitimate flows
  }
}
```

## Post-Registration Operations

### Resolve Domain to Agent Identity

Resolve a `.sol` domain to retrieve agent information:

```typescript
const resolution = await snsModule.resolveAgentDomain('trading-bot.sol');

if (resolution) {
  console.log('Agent Identity:');
  console.log('  Wallet:', resolution.wallet.toBase58());
  console.log('  Agent PDA:', resolution.agentPda.toBase58());
  console.log('  Role:', resolution.role);
  console.log('  x402 Endpoint:', resolution.metadata.x402Endpoint);
  console.log('  Agent URI:', resolution.metadata.agentUri);
} else {
  console.log('Domain not found or not linked to SAP agent');
}
```

### Validate Agent Records

Verify SNS records for compliance before interacting with an agent:

```typescript
const validation = await snsModule.validateAgentRecords('trading-bot.sol');

if (!validation.valid) {
  console.error('Validation errors:');
  validation.errors.forEach(err => console.error('  -', err));
  
  if (validation.warnings.length > 0) {
    console.warn('Warnings:');
    validation.warnings.forEach(warn => console.warn('  -', warn));
  }
  
  // Do not proceed with unvalidated agents
  return;
}

console.log('Agent records validated successfully');
```

### Batch Availability Check

Check multiple domains efficiently:

```typescript
const domains = ['bot1', 'bot2', 'bot3', 'bot4', 'bot5'];
const results = await snsModule.batchCheckAvailability(domains);

for (const [domain, available] of results.entries()) {
  console.log(`${domain}: ${available ? 'Available' : 'Taken'}`);
}
```

### Get Domain and Record PDAs

Derive PDAs for verification or direct account queries:

```typescript
const domainPda = snsModule.getDomainPda('trading-bot.sol');
const solRecordPda = snsModule.getRecordPda('trading-bot.sol', Record.SOL);
const txtRecordPda = snsModule.getRecordPda('trading-bot.sol', Record.TXT);

console.log('Domain PDA:', domainPda.toBase58());
console.log('SOL Record PDA:', solRecordPda.toBase58());
console.log('TXT Record PDA:', txtRecordPda.toBase58());
```

## Devnet Testing

### Setup Devnet Environment

```bash
# Set devnet RPC
export SOLANA_RPC_URL=https://api.devnet.solana.com

# Fund your devnet wallet
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet

# Get devnet USDC (use faucet or mint)
# Devnet USDC: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Devnet Registration Example

```typescript
import { SnsModule } from '@oobe-protocol-labs/synapse-sap-sdk/modules/sns';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import { USDC_MINTS } from '@oobe-protocol-labs/synapse-sap-sdk/constants/sns';

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

const snsModule = new SnsModule({
  connection,
  sapProgramId: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ', // Devnet SAP program
});

const agentWallet = Keypair.generate(); // Generate test wallet

// Fund wallet with devnet SOL
await connection.requestAirdrop(agentWallet.publicKey, 2_000_000_000); // 2 SOL

// Create USDC ATA if needed
// ... (SDK handles this automatically)

const result = await snsModule.registerAgentDomain({
  agentWallet: agentWallet.publicKey,
  domainName: 'test-agent',
  role: SapAgentRole.MERCHANT,
  dnsConfig: {
    role: SapAgentRole.MERCHANT,
    x402Endpoint: 'https://test.example.com/x402',
  },
  signer: agentWallet,
  setAsPrimary: false,
});
```

## Production Deployment

### Security Checklist

Before deploying to production:

1. **Wallet Management**
   - Use hardware wallets or secure key management services
   - Never store private keys in environment variables or code
   - Implement wallet rotation procedures

2. **RPC Configuration**
   - Use dedicated RPC endpoints (not public RPCs)
   - Configure rate limiting on your end
   - Implement RPC failover

3. **Transaction Handling**
   - Validate all user inputs before signing
   - Implement transaction timeout handling
   - Monitor for failed transactions

4. **Monitoring**
   - Log all registration attempts (without sensitive data)
   - Alert on validation failures
   - Track domain resolution latency

### Recommended Infrastructure

```yaml
# docker-compose.yml example
version: '3.8'
services:
  sap-agent:
    build: .
    environment:
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
      - SAP_PROGRAM_ID=${SAP_PROGRAM_ID}
      - AGENT_WALLET_PATH=/secure/wallet/keypair.json
    volumes:
      - ./secure/wallet:/secure/wallet:ro
    networks:
      - internal
    restart: unless-stopped

networks:
  internal:
    driver: bridge
```

### Environment Variables

```bash
# Required
SOLANA_RPC_URL=https://your-rpc-provider.com
SAP_PROGRAM_ID=SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ

# Optional
SNS_DEFAULT_COMMITMENT=confirmed
SNS_DEFAULT_SPACE=600
LOG_LEVEL=info
```

## Troubleshooting

### Common Issues

**Issue: "Signer must be the agent wallet owner"**

Cause: The signer keypair does not match the `agentWallet` public key.

Solution: Ensure the same wallet is used for both `agentWallet` and `signer`:

```typescript
// Correct
await snsModule.registerAgentDomain({
  agentWallet: wallet.publicKey,
  signer: wallet, // Same wallet
});

// Incorrect - will throw error
await snsModule.registerAgentDomain({
  agentWallet: walletA.publicKey,
  signer: walletB, // Different wallet
});
```

**Issue: "Domain is already registered"**

Cause: Domain was registered between availability check and registration.

Solution: Implement retry logic with alternative domain suggestions:

```typescript
async function registerWithRetry(domainName: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const available = await snsModule.checkAvailability(domainName);
    
    if (available) {
      try {
        return await snsModule.registerAgentDomain({ ...params, domainName });
      } catch (error) {
        if (error.message.includes('already registered')) {
          continue; // Retry with same name (race condition)
        }
        throw error;
      }
    }
    
    // Suggest variation
    domainName = `${domainName}-${i + 1}`;
  }
  
  throw new Error('Could not register domain after retries');
}
```

**Issue: "Insufficient funds for transaction"**

Cause: Wallet lacks SOL for fees or USDC for registration.

Solution: Verify balances before registration:

```typescript
const balance = await connection.getBalance(agentWallet.publicKey);
const minBalance = 100_000_000; // 0.1 SOL minimum

if (balance < minBalance) {
  throw new Error('Insufficient SOL balance for registration');
}
```

**Issue: USDC ATA not found**

Cause: Agent wallet lacks a USDC associated token account.

Solution: The SDK automatically creates ATA if missing. Ensure wallet has SOL for ATA creation rent (~0.002 SOL).

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
import { logger } from '@oobe-protocol-labs/synapse-sap-sdk/utils/logger';

// Set log level (implementation depends on your logger)
logger.setLevel('debug');

// Or use environment variable
process.env.LOG_LEVEL = 'debug';
```

## Performance Considerations

### Rate Limiting

The SDK enforces rate limiting on availability checks:

- Minimum interval: 300ms between checks
- Batch operations process sequentially with delays
- RPC-level rate limiting should also be configured

### Caching

Implement caching for frequently accessed data:

```typescript
const resolutionCache = new Map<string, SnsResolutionResult>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedResolution(domain: string) {
  const cached = resolutionCache.get(domain);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await snsModule.resolveAgentDomain(domain);
  
  if (data) {
    resolutionCache.set(domain, { data, timestamp: Date.now() });
  }
  
  return data;
}
```

### Transaction Optimization

- Use versioned transactions for complex operations
- Consider compute budget adjustments for bulk operations
- Batch record creation when possible

## Support

For issues, questions, or feature requests:

- GitHub Issues: https://github.com/oobe-protocol/synapse-agent-sap/issues
- Documentation: https://docs.oobeprotocol.ai
- Discord: https://discord.gg/oobeprotocol
