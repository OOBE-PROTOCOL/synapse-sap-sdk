---
name: sap-memory
description: |
  On-chain memory subsystem for SAP SDK v0.15.0.
  Use when: init vault, open session, inscribe encrypted memory,
  delegated inscription, epoch pagination, ledger init/write/seal,
  nonce rotation, delegate management.
triggers:
  - sap memory vault
  - sap memory ledger
  - sap memory session
  - sap memory inscribe
  - sap memory epoch
  - sap memory reputation
  - sap memory prove
---

# SAP SDK — Memory Systems Reference (v0.15.0)

> **Package**: `@oobe-protocol-labs/synapse-sap-sdk@0.15.0`  
> **Program ID**: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`  
> **Encryption**: AES-256-GCM (client-side)  
> **Storage**: Transaction logs (zero rent) + EpochPage PDAs  
> **Ledger**: Ring buffer (4KB hot) + sealed pages (immutable)  

---

## 1. Architecture

```
AgentAccount
   │
   ├── Vault PDA     ["sap_vault", agent]
   │     ├── SessionLedger PDA  ["sap_session", vault, session_hash]
   │     │     ├── EpochPage PDA  ["sap_epoch", session, epoch_index]
   │     │     ├── VaultDelegate PDA ["sap_delegate", vault, delegate]
   │     │
   │     └── Ledger PDA ["sap_ledger", session]  (ring buffer)
   │           └── LedgerPage PDA ["sap_page", ledger, page_index]
```

Data lives in **transaction logs** (permanent, zero rent) for Vault memory.
The Ledger provides a **4KB hot ring buffer** for fast reads.

---

## 2. Setup

```ts
import {
  SapClient,
  getAgentPDA, getVaultPDA, getSessionLedgerPDA, getEpochPagePDA,
  getVaultDelegatePDA, getGlobalPDA,
} from '@oobe-protocol-labs/synapse-sap-sdk';

const client = new SapClient({ rpcUrl: '...', wallet: myWallet });

const agent = getAgentPDA(myWallet.publicKey)[0];
const vault = getVaultPDA(agent)[0];
const globalRegistry = getGlobalPDA()[0];
```

---

## 3. Vault Lifecycle

### Init Vault

```ts
const ix = await client.vault.initVault({
  signer: myKeypair,
  wallet: myWallet.publicKey,
  agent,
  vault,
  globalRegistry,
  vaultNonce: Array.from(crypto.randomBytes(32)), // 32-byte public salt
});
```

### Open Session (via SessionModule)

```ts
const sessionNum = 0;
const session = getSessionLedgerPDA(vault, sessionNum)[0];

// SessionModule instruction
const ix = await client.session.createSession({
  signer, wallet: myWallet.publicKey, agent, vault, session,
});
```

---

## 4. Inscribe Memory

### Standard Inscription

```ts
import { getEpochPagePDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';
import { sha256 } from '@oobe-protocol-labs/synapse-sap-sdk/utils';

const epoch = 0;
const epochPage = getEpochPagePDA(vault, epoch)[0];

const plaintext = Buffer.from(JSON.stringify({ role: 'assistant', content: '...' }));
const iv = crypto.randomBytes(12);

// Derive key client-side (NEVER on chain)
const key = crypto.pbkdf2Sync(secret, Buffer.from(vaultNonce), 100_000, 32, 'sha512');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const authTag = cipher.getAuthTag();
const encryptedData = Buffer.concat([encrypted, authTag]);

const contentHash = Array.from(await sha256(new Uint8Array(encryptedData)));

const ix = await client.vault.inscribeMemory({
  signer,
  wallet: myWallet.publicKey,
  agent,
  vault,
  session,
  epochPage,
  sequence: 0,
  encryptedData,
  nonce: Array.from(iv),
  contentHash,
  totalFragments: 1,
  fragmentIndex: 0,
  compression: 0, // 0=None, 1=Deflate, 2=Gzip, 3=Brotli
  epochIndex: epoch,
});
```

### Delegated Inscription (hot wallet)

```ts
const delegateWallet = hotWallet.publicKey;
const vaultDelegate = getVaultDelegatePDA(vault, delegateWallet)[0];

const ix = await client.vault.inscribeMemoryDelegated({
  signer: myKeypair, // agent owner signs
  delegateSigner: delegateWallet, // delegate pubkey for validation
  agent,
  vault,
  vaultDelegate,
  session,
  epochPage,
  sequence: 1,
  encryptedData,
  nonce: Array.from(iv),
  contentHash,
  totalFragments: 1,
  fragmentIndex: 0,
  compression: 0,
  epochIndex: epoch,
});
```

### Multi-Fragment (payload > 750 bytes)

```ts
const MAX_FRAGMENT = 750;
const fragments = [];
for (let i = 0; i < encryptedData.length; i += MAX_FRAGMENT) {
  fragments.push(encryptedData.slice(i, i + MAX_FRAGMENT));
}

const sequence = 2;
for (let i = 0; i < fragments.length; i++) {
  await client.vault.inscribeMemory({
    signer, wallet, agent, vault, session, epochPage,
    sequence,                // SAME for all fragments
    encryptedData: fragments[i],
    nonce: Array.from(iv),
    contentHash,              // SAME for all
    totalFragments: fragments.length,
    fragmentIndex: i,
    compression: 0,
    epochIndex: epoch,
  });
}
```

### Epoch Pages

Every 1,000 inscriptions auto-creates an `EpochPage` PDA:
- Epoch 0: sequences 0–999 → `getEpochPagePDA(vault, 0)`
- Epoch 1: sequences 1000–1999 → `getEpochPagePDA(vault, 1)`

Query efficiently per epoch:
```ts
const epochPda = getEpochPagePDA(vault, targetEpoch)[0];
const sigs = await client.connection.getSignaturesForAddress(epochPda, { limit: 1000 });
```

---

## 5. Vault Delegates

### Add Delegate

```ts
import BN from 'bn.js';

const delegateWallet = hotWallet.publicKey;
const vaultDelegate = getVaultDelegatePDA(vault, delegateWallet)[0];

const ix = await client.vault.addVaultDelegate({
  signer, wallet: myWallet.publicKey, agent, vault, vaultDelegate,
  delegate: delegateWallet,
  permissions: 7, // 1=Inscribe, 2=CloseSession, 4=OpenSession, 7=All
  expiresAt: new BN(Math.floor(Date.now() / 1000) + 86400 * 30),
});
```

**Max duration**: 365 days.

### Revoke Delegate

```ts
const ix = await client.vault.revokeVaultDelegate({
  signer, wallet: myWallet.publicKey, agent, vault, vaultDelegate,
});
```

### Rotate Vault Nonce

```ts
const ix = await client.vault.rotateVaultNonce({
  signer, wallet: myWallet.publicKey, agent, vault,
  newNonce: Array.from(crypto.randomBytes(32)),
});
```

---

## 6. Memory Ledger (Hot Reads)

### Init Ledger

```ts
import { getAgentPDA } from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

const ledger = new PublicKey('...'); // derive or create

const ix = await client.staking.initLedger({
  signer, wallet: myWallet.publicKey, agent, vault, session, ledger,
});
```

### Write to Ledger

```ts
const data = Buffer.from(JSON.stringify({ tool: 'swap', input: '...' }));
const contentHash = Array.from(await sha256(new Uint8Array(data)));

const ix = await client.staking.writeLedger({
  signer, wallet: myWallet.publicKey, session, vault, agent, ledger,
  data,
  contentHash,
});
```

### Seal Ledger Page

```ts
const ix = await client.staking.sealLedger({
  signer, wallet: myWallet.publicKey, session, vault, agent, ledger, page,
});
```

### Close Ledger

```ts
const ix = await client.staking.closeLedger({
  signer, wallet: myWallet.publicKey, session, vault, agent, ledger,
});
```

---

## 7. Events

```ts
import { fetchTransactionEvents } from '@oobe-protocol-labs/synapse-sap-sdk/events';

const events = await fetchTransactionEvents(client.connection, txSig);
```

Events: `SettlementFiled`, `SettlementFinalized`, `DisputeFiled`, `DisputeResolved`,
`StakeEvent`, `SubscriptionEvent`.

---

## 8. Encryption Model

```ts
// 1. Derive key (client-side ONLY)
const key = crypto.pbkdf2Sync(userSecret, Buffer.from(vaultNonce), 100_000, 32, 'sha512');

// 2. Encrypt
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const authTag = cipher.getAuthTag();
const payload = Buffer.concat([encrypted, authTag]);

// 3. Decrypt
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag);
const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
```

---

## 9. Pitfalls

1. **Max fragment = 750 bytes** — Split larger payloads via multi-fragment.
   Max 255 fragments per sequence.

2. **Sequence MUST match session counter** — The on-chain validator checks
   `sequence == session.sequenceCounter`. Query session state first.

3. **epochIndex == sequence / 1000** — Integer division. Passing wrong epoch
   causes on-chain rejection.

4. **Delegate expiry ≤ 365 days** — `addVaultDelegate` enforces this.

5. **All BN args** — `expiresAt` in `addVaultDelegate` must be `BN`.

6. **`hashString` is a placeholder** — Use real SHA-256 from `crypto.subtle`
   or `crypto.createHash('sha256')` for content hashing.

7. **No `deriveXxx`** — Use `getVaultPDA`, `getSessionLedgerPDA`, etc.
