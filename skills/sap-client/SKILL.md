---
name: sap-client
description: |
  Consumer/client skill for SAP SDK v1.0.0.
  Use when: opening escrows, depositing/withdrawing funds,
  settling calls (v2), filing disputes, verifying settlements,
  discovering agents/tools, building x402 payment headers,
  reading agent profiles, or validating endpoints.
triggers:
  - sap consumer
  - sap depositor
  - sap x402 client
  - sap escrow verify
  - sap settlement check
---

# SAP SDK — Consumer / Client Skill Guide (v1.0.0)

> **Prerequisites**: See `sap-overview` for SDK setup, connection, and quickstart.

> **Role**: Consumer (depositor, buyer, escrow creator)  
> **Package**: `@oobe-protocol-labs/synapse-sap-sdk@1.0.0`  
> **Program ID**: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`  

---

## 1. Setup

```ts
import { SapClient } from '@oobe-protocol-labs/synapse-sap-sdk';

const client = new SapClient({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  wallet: myWallet,
});
```

---

## 2. Discovery — Finding Agents

```ts
// Via discovery registry (high-level)
const agents = await client.discovery.findAgentsByCapability('jupiter:swap');
const agentsByProto = await client.discovery.findAgentsByProtocol('jupiter');
const profile = await client.discovery.getAgentProfile(agentWallet);
const overview = await client.discovery.getNetworkOverview();
```

### Verifying Merchant Readiness

```ts
import { MIN_STAKE_LAMPORTS } from '@oobe-protocol-labs/synapse-sap-sdk';

const stakePda = getAgentStakePDA(agentWallet)[0];
const stakeAcc = await client.accounts.parseAgentStake(
  (await client.connection.getAccountInfo(stakePda))!.data
);

const isReady = stakeAcc.stakedAmount.gte(new BN(MIN_STAKE_LAMPORTS));
```

---

## 3. Escrow V2 Lifecycle (Consumer Side)

### Create Escrow

```ts
import { getAgentPDA, getAgentStatsPDA, getAgentStakePDA, getEscrowV2PDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';
import BN from 'bn.js';

const agent = getAgentPDA(agentWallet)[0];
const agentStats = getAgentStatsPDA(agentWallet)[0];
const agentStake = getAgentStakePDA(agentWallet)[0];
const escrowNonce = 0; // increment per new escrow with same agent
const escrow = getEscrowV2PDA(agent, escrowNonce)[0];

const ix = await client.escrow.createEscrowV2({
  signer: myKeypair,
  depositor: myWallet.publicKey,
  agent,
  agentStake,
  agentStats,
  pricingMenu: agentStats, // or separate pricing menu PDA
  escrow,
  escrowNonce: new BN(escrowNonce),
  pricePerCall: new BN(100_000),        // lamports per call
  maxCalls: new BN(1_000),
  initialDeposit: new BN(500_000_000), // 0.5 SOL
  expiresAt: new BN(Date.now() / 1000 + 86400 * 7), // 7 days
  volumeCurve: [{ afterCalls: 0, pricePerCall: new BN(100_000) }],
  tokenMint: null,      // null = native SOL
  tokenDecimals: 9,
  settlementSecurity: 0, // 0 = Instant, 1 = CoSigned, 2 = DisputeWindow
  disputeWindowSlots: new BN(0),
  coSigner: null,
  arbiter: null,
});

// Build + sign transaction
tx.add(ix);
```

### Deposit More

```ts
const ix = await client.escrow.depositEscrowV2({
  signer, depositor: myWallet.publicKey, escrow,
  escrowNonce: new BN(escrowNonce), amount: new BN(100_000_000),
});
```

### Withdraw

```ts
const ix = await client.escrow.withdrawEscrowV2({
  signer, depositor: myWallet.publicKey, escrow,
  amount: new BN(50_000_000),
});
```

### Close (only when empty)

```ts
const ix = await client.escrow.closeEscrowV2({
  signer, depositor: myWallet.publicKey, escrow, agentStats,
});
```

---

## 4. Settlement (Consumer Side)

### Settle Calls V2

```ts
import { getPendingSettlementPDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const settlementIndex = 0; // provided by merchant or tracked locally
const pendingSettlement = getPendingSettlementPDA(escrow, settlementIndex)[0];

const ix = await client.escrow.settleCallsV2({
  signer,
  wallet: myWallet.publicKey,
  agent,
  agentStats,
  escrow,
  escrowNonce: new BN(escrowNonce),
  callsToSettle: new BN(5),
  serviceHash: Array.from(new Uint8Array(32)), // sha256 of service identifier
  // remainingAccounts: treasury/ATA plus co-signer or pending PDA as required.
  // Prefer client.escrowV2.settle() for automatic account derivation.
});
```

### Dispute a Settlement

```ts
import { getDisputePDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const dispute = getDisputePDA(escrow, settlementIndex)[0];

const ix = await client.dispute.fileDispute({
  signer,
  depositor: myWallet.publicKey,
  escrow,
  pendingSettlement,
  dispute,
  evidenceHash: Array.from(crypto.randomBytes(32)), // SHA-256 of evidence
  disputeType: 0, // 0=NonDelivery, 1=PartialDelivery, 2=Overcharge, 3=Quality
});
```

### Submit Receipt Proof (during dispute)

```ts
const ix = await client.dispute.submitReceiptProof({
  signer, wallet: myWallet.publicKey, agent, escrow,
  receiptBatch: new PublicKey('...'),
  pendingSettlement, dispute,
  receiptHashes: [Array.from(hash1), Array.from(hash2)],
  merkleProofs: [[Array.from(proof1)], [Array.from(proof2)]],
});
```

---

## 5. x402 Payment Headers

```ts
import { X402Headers } from '@oobe-protocol-labs/synapse-sap-sdk/registries';

const headers: X402Headers = await client.x402.buildHeaders({
  agentWallet,
  maxAmount: new BN(100_000_000),
  service: 'jupiter:swap',
});

// Use headers in fetch/axios
const res = await fetch(agentEndpoint, {
  headers: { ...headers, 'Content-Type': 'application/json' },
});
```

---

## 6. Reading Escrow State

```ts
import { fetchEscrowAccountV2 } from '@oobe-protocol-labs/synapse-sap-sdk/accounts';

const escrowData = await fetchEscrowAccountV2(client.connection, escrow);
console.log('Balance:', escrowData?.balance.toString());
console.log('Pending:', escrowData?.pendingAmount.toString());
console.log('Settled:', escrowData?.totalSettled.toString());
console.log('Security:', escrowData?.settlementSecurity); // 0|1|2
```

---

## 7. Reading Pending Settlement

```ts
import { parsePendingSettlement } from '@oobe-protocol-labs/synapse-sap-sdk/accounts';

const psAcc = await client.connection.getAccountInfo(pendingSettlement);
if (psAcc) {
  const ps = parsePendingSettlement(psAcc.data);
  console.log('Amount:', ps.amount.toString());
  console.log('Calls:', ps.calls.toString());
  console.log('Finalized:', ps.finalized);
  console.log('Disputed:', ps.isDisputed);
}
```

---

## 8. Events

```ts
import { fetchTransactionEvents } from '@oobe-protocol-labs/synapse-sap-sdk/events';

const events = await fetchTransactionEvents(client.connection, txSignature);
for (const ev of events) {
  console.log(ev.name, ev.data);
}
```

---

## 9. Error Handling

```ts
import { SapValidationError, SapRpcError, SapAccountNotFoundError } from '@oobe-protocol-labs/synapse-sap-sdk/errors';

try {
  await client.escrow.createEscrowV2({ ... });
} catch (err) {
  if (err instanceof SapValidationError) {
    console.error('Validation:', err.message, err.field);
  } else if (err instanceof SapRpcError) {
    console.error('RPC:', err.message, 'code:', err.rpcCode);
    console.error('Logs:', err.logs);
  } else if (err instanceof SapAccountNotFoundError) {
    console.error('Missing account:', err.address, err.accountType);
  } else {
    throw err;
  }
}
```

---

## 10. Pitfalls

1. **Always use V2** — The program no longer has v1 escrow instructions.
   `createEscrowV2` is the ONLY create method.

2. **PendingSettlement account** — DisputeWindow settlement passes the
   `PendingSettlement` PDA as a remaining account to `settleCallsV2`. The
   high-level `client.escrowV2.settle()` helper derives it automatically.

3. **BN everywhere** — All numeric args in instructions expect `BN`, not
   `number` or `bigint`. Import `BN` from `@coral-xyz/anchor`.

4. **Dispute window timing** — When `settlementSecurity === 2`
   (DisputeWindow), `finalizeSettlement` can only be called after
   `releaseSlot` has passed. Read `PendingSettlement.releaseSlot` first.

5. **Orphan PendingSettlements** — If a merchant creates a PendingSettlement
   without first calling `settleCallsV2`, the PDA becomes an orphan.
   `finalizeSettlement` will throw `ArithmeticOverflow` (6075). The SDK
   preflight in v0.14 catches this before signing.

6. **MIN_STAKE_LAMPORTS is 1 SOL** — Not 0.1 SOL. Verify stake before
   creating escrow.

7. **No `deriveXxx` functions** — PDA helpers are named `get*PDA`, not
   `derive*`. e.g. `getEscrowV2PDA`, not `deriveEscrowV2`.
