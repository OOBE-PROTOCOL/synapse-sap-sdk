---
name: sap-merchant
description: |
  Merchant/agent skill for SAP SDK v0.3.0.
  Use when: registering an agent, publishing tools with schema hashes,
  managing vault delegates, staking (init/deposit/unstake),
  settling escrows (v2), handling disputes, managing subscriptions,
  inscribing memory, building reputation.
triggers:
  - sap merchant
  - sap merchant agent
  - sap agent register
  - sap merchant tool
  - sap merchant sell
---

# SAP SDK — Merchant / Agent Skill Guide (v0.3.0)

> **Role**: Merchant (agent, seller, service provider)  
> **Package**: `@oobe-protocol-labs/synapse-sap-sdk@0.3.0`  
> **Main Class**: `SapMerchant`  
> **Program ID**: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`

---

## 1. Setup

```ts
import { SapClient, MIN_STAKE_LAMPORTS } from '@oobe-protocol-labs/synapse-sap-sdk';

const client = new SapClient({ rpcUrl: 'https://api.mainnet-beta.solana.com', wallet: myWallet });
```

---

## 2. Register Agent

```ts
import { getAgentPDA, getAgentStatsPDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const agent = getAgentPDA(myWallet.publicKey)[0];
const agentStats = getAgentStatsPDA(myWallet.publicKey)[0];

const ix = await client.agent.registerAgent({
  signer: myKeypair,
  wallet: myWallet.publicKey,
  agent,
  agentStats,
  name: 'MySwapAgent',
  endpointUri: 'https://myagent.dev/x402',
  // optional: did, capabilities, metadataUri
});
```

---

## 3. Staking (Required for Merchant Status)

### Init + Deposit

```ts
import { getAgentStakePDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';
import BN from 'bn.js';

const stake = getAgentStakePDA(myWallet.publicKey)[0];

const ixInit = await client.staking.initStake({
  signer, wallet: myWallet.publicKey, agent, stake,
  initialDeposit: new BN(MIN_STAKE_LAMPORTS), // 1 SOL minimum
});

const ixDeposit = await client.staking.depositStake({
  signer, wallet: myWallet.publicKey, agent, stake,
  amount: new BN(2_000_000_000), // +2 SOL
});
```

### Request Unstake

```ts
const ix = await client.staking.requestUnstake({
  signer, wallet: myWallet.publicKey, agent, stake,
  amount: new BN(1_000_000_000),
});
```

### Complete Unstake (after cooldown)

```ts
const ix = await client.staking.completeUnstake({
  signer, wallet: myWallet.publicKey, agent, stake,
});
```

**Cooldown**: `COMPLETE_UNSTAKE_DELAY_DAYS = 14` days.

---

## 4. Publish Tools

```ts
import { getToolPDA, getGlobalPDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';
import { sha256 } from '@oobe-protocol-labs/synapse-sap-sdk/utils';
import { toArray } from 'some-encoder'; // convert Buffer -> number[]

const tool = getToolPDA(agent, 'jupiter-swap')[0];
const globalRegistry = getGlobalPDA()[0];

const inputSchema = Buffer.from(JSON.stringify({ type: 'object', properties: { ... } }));
const outputSchema = Buffer.from(JSON.stringify({ type: 'object', properties: { ... } }));
const inputHash = Array.from(await sha256(new Uint8Array(inputSchema)));
const outputHash = Array.from(await sha256(new Uint8Array(outputSchema)));

const ix = await client.tools.publishTool({
  signer,
  wallet: myWallet.publicKey,
  agent,
  tool,
  globalRegistry,
  toolName: 'jupiter-swap',
  toolNameHash: Array.from(await sha256(Buffer.from('jupiter-swap'))),
  protocolHash: Array.from(await sha256(Buffer.from('jupiter'))),
  descriptionHash: Array.from(await sha256(Buffer.from('Jupiter aggregator swap'))),
  inputSchemaHash: inputHash,
  outputSchemaHash: outputHash,
  httpMethod: 1, // 0=GET, 1=POST, 2=PUT, 3=DELETE, 4=COMPOUND
  category: 0,   // 0=Swap, 1=Lend, 2=Stake, ... check on-chain enum
  paramsCount: 3,
  requiredParams: 2,
  isCompound: false,
});
```

### Inscribe Schema On-Chain

```ts
const ixSchema = await client.tools.inscribeToolSchema({
  signer, wallet: myWallet.publicKey, agent, tool,
  schemaType: 0, // 0=Input, 1=Output, 2=Description
  schemaData: inputSchema,
  schemaHash: inputHash,
  compression: 0, // 0=None, 1=Deflate, 2=Gzip, 3=Brotli
});
```

---

## 5. Escrow V2 — Merchant Settlement Flow

### Settle Calls V2

```ts
import { getPendingSettlementPDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const settlementIndex = 0; // bump per settlement
const pendingSettlement = getPendingSettlementPDA(escrow, settlementIndex)[0];

const ix = await client.escrow.settleCallsV2({
  signer,
  wallet: myWallet.publicKey,
  agent,
  agentStats,
  escrow,
  escrowNonce: new BN(0),
  callsToSettle: new BN(10),
  serviceHash: Array.from(crypto.randomBytes(32)),
  // remainingAccounts: co-signer or pending PDA plus treasury/ATA as required.
  // Prefer client.escrowV2.settle() for automatic account derivation.
});
```

### Pending Settlement

```ts
// v0.3.0 creates PendingSettlement through settle_calls_v2.
// Do not call createPendingSettlement directly; it is kept only as a
// deprecated generated wrapper for IDL completeness.
```

### Finalize Settlement (after dispute window or instantly)

```ts
const ix = await client.escrow.finalizeSettlement({
  signer,
  payer: myWallet.publicKey,
  agentWallet: myWallet.publicKey,
  escrow,
  pendingSettlement,
  agentStats,
});
```

### Handling Auto-Resolution

```ts
const ix = await client.dispute.autoResolveDispute({
  signer,
  payer: myWallet.publicKey,
  depositor: consumerWallet,
  agentWallet: myWallet.publicKey,
  escrow,
  pendingSettlement,
  dispute,
  agentStats,
  agentStake,
});
```

---

## 6. Vault & Memory

### Init Vault

```ts
import { getVaultPDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const vault = getVaultPDA(agent)[0];

const ix = await client.vault.initVault({
  signer, wallet: myWallet.publicKey, agent, vault,
  globalRegistry,
  vaultNonce: Array.from(crypto.randomBytes(32)),
});
```

### Inscribe Memory

```ts
import { getSessionLedgerPDA, getEpochPagePDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const session = 0;
const epoch = 0;
const sessionPda = getSessionLedgerPDA(vault, session)[0];
const epochPage = getEpochPagePDA(vault, epoch)[0];

const ix = await client.vault.inscribeMemory({
  signer, wallet: myWallet.publicKey, agent, vault,
  session: sessionPda, epochPage,
  sequence: 0,
  encryptedData: Buffer.from('encrypted payload'),
  nonce: Array.from(crypto.randomBytes(12)),
  contentHash: Array.from(await sha256(Buffer.from('encrypted payload'))),
  totalFragments: 1,
  fragmentIndex: 0,
  compression: 0,
  epochIndex: epoch,
});
```

### Add Vault Delegate (hot wallet)

```ts
import { getVaultDelegatePDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';
import BN from 'bn.js';

const vaultDelegate = getVaultDelegatePDA(vault, hotWallet.publicKey)[0];

const ix = await client.vault.addVaultDelegate({
  signer, wallet: myWallet.publicKey, agent, vault, vaultDelegate,
  delegate: hotWallet.publicKey,
  permissions: 7, // bitmask: 1=Inscribe, 2=CloseSession, 4=OpenSession, 7=All
  expiresAt: new BN(Math.floor(Date.now() / 1000) + 86400 * 30),
});
```

---

## 7. Subscriptions

### Create a Subscription Plan

```ts
import { getSubscriptionPDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const subscription = getSubscriptionPDA(agent, subscriberWallet, 0)[0];

const ix = await client.subscription.createSubscription({
  signer, subscriber: subscriberWallet, agent, subscription,
  subId: new BN(0),
  pricePerInterval: new BN(10_000_000),
  billingInterval: 1, // 0=Weekly, 1=Monthly, 2=Quarterly, 3=Yearly
  initialDeposit: new BN(100_000_000),
});
```

### Claim Interval (merchant collects)

```ts
const ix = await client.subscription.claimInterval({
  signer, payer: myWallet.publicKey, agentWallet: myWallet.publicKey, subscription,
});
```

---

## 8. Reputation & Attestations

### Create Attestation

```ts
const ix = await client.attestation.createAttestation({
  signer, wallet: myWallet.publicKey, agent, attestation,
  targetAgent: otherAgent,
  score: 5000, // basis points (0-10000)
  metadataHash: Array.from(await sha256(Buffer.from('attestation metadata'))),
});
```

---

## 9. Pitfalls

1. **Stake minimum = 1 SOL** — `MIN_STAKE_LAMPORTS = 1_000_000_000`.
   The old 0.1 SOL value is obsolete.

2. **Schema hashes are mandatory** — `publishTool` requires both
   `inputSchemaHash` and `outputSchemaHash` as 32-byte arrays. Empty hashes
   will fail on-chain validation.

3. **All numeric args are BN** — Never pass raw `number` for u64/i64
   instruction args. Always use `new BN(value)`.

4. **Escrow v2 only** — There is no v1 escrow in the program.
   `createEscrowV2` is the sole creation instruction.

5. **PendingSettlement orphan risk** — Always call `settleCallsV2` BEFORE
   `createPendingSettlement`. Orphan PDAs trap funds.

6. **Vault delegate expires** — Max 365 days (`MAX_DELEGATE_DURATION_SECS`).
   Rotate before expiry.

7. **Tool names max 32 bytes** — `toolName` is ASCII, max 32 chars.

8. **No `deriveXxx` anymore** — Use `getAgentPDA`, `getEscrowV2PDA`, etc.
