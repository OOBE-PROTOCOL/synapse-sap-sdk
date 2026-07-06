---
name: sap-overview
description: |
  Master reference for the Synapse SAP SDK v0.3.0 on Solana.
  Covers: 13 instruction modules, 6 registries, typed account parsers,
  PDA derivations, constants, errors, events, and utilities.
  Use for any code generation or agentic orchestration against
  @oobe-protocol-labs/synapse-sap-sdk@0.3.0.
triggers:
  - synapse sap sdk
  - sap v0.3
  - synapse-agent-sap
  - oobe protocol sdk
---

# SAP SDK v0.3.0 — Agent Skill Reference

> **Package**: `@oobe-protocol-labs/synapse-sap-sdk`  
> **Version**: `0.3.0`  
> **Program ID**: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`  
> **IDL**: `v0.3.0` aligned  
> **Runtime**: Node.js ≥ 18, TypeScript ≥ 5.0  

This skill is the canonical reference for agentic code generation interacting
with the Synapse Agent Protocol (SAP) on-chain program via the TypeScript SDK.
Treat every export path, instruction signature, and PDA seed below as the
single source of truth. When generating code, import from the paths shown here
exactly.

---

## 1. Package & Install

```bash
npm i @oobe-protocol-labs/synapse-sap-sdk
```

Peer dependencies (required):
```bash
npm i @coral-xyz/anchor @solana/web3.js bn.js
```

Optional peers (only if using metaplex bridge):
```bash
npm i @metaplex-foundation/mpl-core @metaplex-foundation/umi
```

---

## 2. Barrel Exports (Subpaths)

```ts
// Main entry
import { SapClient, createSapClient, PROGRAM_ID, SEEDS } from '@oobe-protocol-labs/synapse-sap-sdk';

// Subpaths
import * as Pdas from '@oobe-protocol-labs/synapse-sap-sdk/pdas';
import * as Accounts from '@oobe-protocol-labs/synapse-sap-sdk/accounts';
import * as Instructions from '@oobe-protocol-labs/synapse-sap-sdk/instructions';
import * as Events from '@oobe-protocol-labs/synapse-sap-sdk/events';
import * as Utils from '@oobe-protocol-labs/synapse-sap-sdk/utils';
import * as Types from '@oobe-protocol-labs/synapse-sap-sdk/types';
```

---

## 3. SapClient

```ts
import { SapClient } from '@oobe-protocol-labs/synapse-sap-sdk';

const client = new SapClient({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  wallet: myWalletAdapter,   // implements Anchor Wallet
});

// Or factory
const client2 = createSapClient('https://api.mainnet-beta.solana.com', wallet);
```

Lazy-loaded modules (instruction wrappers):

| Getter | Module | Instructions |
|---|---|---|
| `client.agent` | `AgentModule` | `registerAgent`, `updateAgent`, `closeAgent` |
| `client.attestation` | `AttestationModule` | `createAttestation`, `revokeAttestation` |
| `client.digest` | `DigestModule` | `inscribeDigest`, `closeDigest` |
| `client.dispute` | `DisputeModule` | `autoResolveDispute`, `closeDispute`, `closePendingSettlement`, `createPendingSettlement`, `fileDispute`, `submitAgentEvidence`, `submitReceiptProof` |
| `client.escrow` | `EscrowModule` | `closeEscrowV2`, `createEscrowV2`, `depositEscrowV2`, `finalizeSettlement`, `settleCallsV2`, `withdrawEscrowV2` |
| `client.global` | `GlobalModule` | `initGlobalRegistry`, `updateGlobalRegistry` |
| `client.indexing` | `IndexingModule` | `addCapabilityIndex`, `addProtocolIndex`, `addToolCategoryIndex`, `closeCapabilityIndex`, `closeProtocolIndex`, `removeCapabilityIndex`, `removeProtocolIndex`, `removeToolCategoryIndex`, `updateCapabilityIndex`, `updateProtocolIndex`, `updateToolCategoryIndex` |
| `client.misc` | `MiscModule` | `closeAgentStats`, `initAgentStats`, `migrateAgent`, `updateAgentStats` |
| `client.session` | `SessionModule` | `closeSession`, `createSession`, `initSessionLedger`, `migrateSession`, `updateSession` |
| `client.staking` | `StakingModule` | `closeLedger`, `completeUnstake`, `depositStake`, `initLedger`, `initStake`, `requestUnstake`, `sealLedger`, `writeLedger` |
| `client.subscription` | `SubscriptionModule` | `cancelSubscription`, `claimInterval`, `closeSubscription`, `createSubscription`, `fundSubscription` |
| `client.tools` | `ToolsModule` | `closeTool`, `closeToolCategoryIndex`, `deactivateTool`, `inscribeToolSchema`, `publishTool`, `reactivateTool`, `updateTool` |
| `client.vault` | `VaultModule` | `addVaultDelegate`, `initVault`, `inscribeMemory`, `inscribeMemoryDelegated`, `revokeVaultDelegate`, `rotateVaultNonce` |

---

## 4. PDA Derivation (`pdas` subpath)

All functions return `[PublicKey, number]` (address, bump).

```ts
import {
  getAgentPDA,           // seed: ["sap_agent", wallet]
  getAgentStatsPDA,      // seed: ["sap_stats", wallet]
  getAgentStakePDA,      // seed: ["sap_stake", wallet]
  getEscrowV2PDA,        // seed: ["sap_escrow_v2", agent, nonce_u32]
  getPendingSettlementPDA, // seed: ["sap_pending", escrow, index_u32]
  getDisputePDA,         // seed: ["sap_dispute", escrow, index_u32]
  getSubscriptionPDA,  // seed: ["sap_subscription", agent, subscriber, nonce_u32]
  getVaultPDA,           // seed: ["sap_vault", agent]
  getSessionLedgerPDA,   // seed: ["sap_session", vault, session_u32]
  getEpochPagePDA,       // seed: ["sap_epoch", vault, epoch_u32]
  getVaultDelegatePDA,   // seed: ["sap_delegate", vault, delegate]
  getToolPDA,            // seed: ["sap_tool", agent, tool_name]
  getToolCategoryIndexPDA, // seed: ["sap_tool_cat", category_u8]
  getCapabilityIndexPDA, // seed: ["sap_cap_idx", capability_hash_32]
  getProtocolIndexPDA,   // seed: ["sap_proto_idx", protocol_hash_32]
  getGlobalPDA,          // seed: ["sap_global"]
} from '@oobe-protocol-labs/synapse-sap-sdk/pdas';

import { hashString } from '@oobe-protocol-labs/synapse-sap-sdk/pdas'; // placeholder – use crypto.subtle.digest('SHA-256') in practice
```

---

## 5. Constants (`src/constants.ts`)

```ts
import {
  PROGRAM_ID,                    // "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ"
  DISCRIMINATOR_SIZE,            // 8
  PUBKEY_SIZE,                   // 32
  U8_SIZE, U16_SIZE, U32_SIZE, U64_SIZE, U128_SIZE, I64_SIZE,
  BOOL_SIZE, OPTION_SIZE,
  MAX_CALLS_PER_SETTLEMENT,      // 10_000
  MAX_VOLUME_CURVE_POINTS,       // 10
  MAX_RECEIPTS_PER_PROOF,        // 128
  MAX_MERKLE_DEPTH,              // 16
  MAX_SUBSCRIPTION_DURATION_YEARS, // 10
  STAKE_COVERAGE_BPS,            // 5_000 (50%)
  MIN_STAKE_LAMPORTS,            // 1_000_000_000 (1 SOL)
  COMPLETE_UNSTAKE_DELAY_DAYS,   // 14
  SEEDS,                         // object with all seed strings
  DEFAULT_COMMITMENT,            // "confirmed"
  ENDPOINTS,                     // { MAINNET, DEVNET, TESTNET }
} from '@oobe-protocol-labs/synapse-sap-sdk';
```

---

## 6. Instruction Modules — Quickref

### EscrowModule (v2 — the only escrow)

```ts
await client.escrow.createEscrowV2({
  signer, depositor, agent, agentStake, agentStats, pricingMenu, escrow,
  escrowNonce, pricePerCall, maxCalls, initialDeposit, expiresAt,
  volumeCurve, tokenMint, tokenDecimals, settlementSecurity, disputeWindowSlots,
  coSigner, arbiter,
});

await client.escrow.depositEscrowV2({ signer, depositor, escrow, escrowNonce, amount });
await client.escrow.withdrawEscrowV2({ signer, depositor, escrow, amount });
await client.escrow.settleCallsV2({
  signer, wallet, agent, agentStats, escrow,
  escrowNonce, callsToSettle, serviceHash,
  // remainingAccounts: co-signer or pending PDA plus treasury/ATA as required.
  // Prefer client.escrowV2.settle() for automatic account derivation.
});
await client.escrow.finalizeSettlement({ signer, payer, agentWallet, escrow, pendingSettlement, agentStats });
await client.escrow.closeEscrowV2({ signer, depositor, escrow, agentStats });
```

### DisputeModule

```ts
// Deprecated in v0.3.0: PendingSettlement is created by settle_calls_v2.
// Do not call createPendingSettlement in new integrations.
await client.dispute.fileDispute({ signer, depositor, escrow, pendingSettlement, dispute, evidenceHash, disputeType });
await client.dispute.submitAgentEvidence({ signer, wallet, agent, dispute, evidenceHash });
await client.dispute.submitReceiptProof({ signer, wallet, agent, escrow, receiptBatch, pendingSettlement, dispute, receiptHashes, merkleProofs });
await client.dispute.autoResolveDispute({ signer, payer, depositor, agentWallet, escrow, pendingSettlement, dispute, agentStats, agentStake });
await client.dispute.closeDispute({ signer, depositor, dispute });
await client.dispute.closePendingSettlement({ signer, payer, pendingSettlement });
```

### StakingModule

```ts
await client.staking.initStake({ signer, wallet, agent, stake, initialDeposit });
await client.staking.depositStake({ signer, wallet, agent, stake, amount });
await client.staking.requestUnstake({ signer, wallet, agent, stake, amount });
await client.staking.completeUnstake({ signer, wallet, agent, stake });
// Ledger ops (also under StakingModule in v0.3.0):
await client.staking.initLedger({ signer, wallet, agent, vault, session, ledger });
await client.staking.writeLedger({ signer, wallet, session, vault, agent, ledger, data, contentHash });
await client.staking.sealLedger({ signer, wallet, session, vault, agent, ledger, page });
await client.staking.closeLedger({ signer, wallet, session, vault, agent, ledger });
```

### SubscriptionModule

```ts
await client.subscription.createSubscription({ signer, subscriber, agent, subscription, subId, pricePerInterval, billingInterval, initialDeposit });
await client.subscription.fundSubscription({ signer, subscriber, subscription, amount });
await client.subscription.claimInterval({ signer, payer, agentWallet, subscription });
await client.subscription.cancelSubscription({ signer, subscriber, agentWallet, subscription });
await client.subscription.closeSubscription({ signer, subscriber, subscription });
```

### VaultModule

```ts
await client.vault.initVault({ signer, wallet, agent, vault, globalRegistry, vaultNonce });
await client.vault.inscribeMemory({ signer, wallet, agent, vault, session, epochPage, sequence, encryptedData, nonce, contentHash, totalFragments, fragmentIndex, compression, epochIndex });
await client.vault.inscribeMemoryDelegated({ signer, delegateSigner, agent, vault, vaultDelegate, session, epochPage, sequence, encryptedData, nonce, contentHash, totalFragments, fragmentIndex, compression, epochIndex });
await client.vault.addVaultDelegate({ signer, wallet, agent, vault, vaultDelegate, delegate, permissions, expiresAt });
await client.vault.revokeVaultDelegate({ signer, wallet, agent, vault, vaultDelegate });
await client.vault.rotateVaultNonce({ signer, wallet, agent, vault, newNonce });
```

### ToolsModule

```ts
await client.tools.publishTool({ signer, wallet, agent, tool, globalRegistry, toolName, toolNameHash, protocolHash, descriptionHash, inputSchemaHash, outputSchemaHash, httpMethod, category, paramsCount, requiredParams, isCompound });
await client.tools.inscribeToolSchema({ signer, wallet, agent, tool, schemaType, schemaData, schemaHash, compression });
await client.tools.updateTool({ signer, wallet, agent, tool, descriptionHash, inputSchemaHash, outputSchemaHash, httpMethod, category, paramsCount, requiredParams });
await client.tools.deactivateTool({ signer, wallet, agent, tool });
await client.tools.reactivateTool({ signer, wallet, agent, tool });
await client.tools.closeTool({ signer, wallet, agent, tool, globalRegistry });
await client.tools.closeToolCategoryIndex({ signer, wallet, agent, toolCategoryIndex, category });
```

---

## 7. Registries (High-Level Workflows)

Accessed via getters on `SapClient`:

```ts
client.discovery    // DiscoveryRegistry — find agents/tools by capability/protocol/category
client.x402         // X402Registry — escrow lifecycle, payment headers, settlement
client.session      // SessionManager — vault + ledger session lifecycle
client.builder      // AgentBuilder — fluent agent registration
client.metaplex     // MetaplexBridge — MPL Core AgentIdentity bridge
// FairScaleRegistry is exported from registries barrel but NOT mounted on SapClient directly
```

---

## 8. Account Parsers (`accounts` subpath)

```ts
import {
  parseEscrowAccountV2, fetchEscrowAccountV2,
  parsePendingSettlement,
  parseAgentAccount,
  parseAgentStats,
  parseAgentStake,
  parseDisputeRecord,
  parseSubscription,
} from '@oobe-protocol-labs/synapse-sap-sdk/accounts';
```

These are **hand-written, byte-level parsers** aligned to the v0.25 IDL
layout (discriminator-first). Use them when you need raw account data
without Anchor's `program.account.*.fetch()` overhead.

---

## 9. Errors (`errors` subpath)

```ts
import {
  SapError, SapValidationError, SapRpcError, SapAccountNotFoundError,
  SapTimeoutError, SapPermissionError,
} from '@oobe-protocol-labs/synapse-sap-sdk/errors';
```

All extend `SapError` for `instanceof` checks.

---

## 10. Events (`events` subpath)

```ts
import { parseEventsFromLogs, fetchTransactionEvents, ParsedEvent } from '@oobe-protocol-labs/synapse-sap-sdk/events';
```

Supported event names (discriminator stubs):
- `EscrowCreated`
- `SettlementFiled`
- `SettlementFinalized`
- `DisputeFiled`
- `DisputeResolved`
- `StakeEvent`
- `SubscriptionEvent`

---

## 11. Utils (`utils` subpath)

```ts
import {
  validateAgentInput, validateEscrowCreate, validateEscrowDeposit,
  validateEscrowSettle, validateEscrowClose, validateAgentClose,
  validateSubscriptionCreate, validateReceiptProof,
  computeEscrowMaxObligation,
  sha256, hashReceipt,
} from '@oobe-protocol-labs/synapse-sap-sdk/utils';
```

---

## 12. Important TypeScript Types

```ts
import {
  EscrowAccountV2, PendingSettlement, AgentAccount, AgentStats,
  AgentStake, DisputeRecord, Subscription, MemoryVault, SessionLedger,
  EpochPage, SettlementSecurity, DisputeOutcome, BillingInterval,
  Capability, VolumeCurveBreakpoint,
} from '@oobe-protocol-labs/synapse-sap-sdk/types';
```

---

## 13. Pitfalls & Breaking Changes from Old SDK Versions

1. **Old module names removed** — `EscrowModule` in v0.14 wraps ONLY v2
   instructions (`createEscrowV2`, `settleCallsV2`, etc.). The v1 escrow
   (`createEscrow`, `settleCalls`) was removed from the program at v0.25.
   Do NOT generate code with `client.escrow.create()` or `createEscrow`.

2. **Package name** — Always `@oobe-protocol-labs/synapse-sap-sdk`.
   Do NOT use the old `@synapse-sap/sdk` or `@oobe-protocol-labs/synapse-client-sdk`
   for SAP protocol instructions.

3. **Staking minimum** — `MIN_STAKE_LAMPORTS = 1_000_000_000` (1 SOL), NOT
   0.1 SOL. Agents must stake ≥ 1 SOL to be merchant-ready.

4. **PDA functions renamed** — The SDK uses `get*PDA` (e.g. `getAgentPDA()`),
   not `deriveAgent()` or `deriveEscrowV2()`. Old skill references to
   `deriveXxx` are obsolete.

5. **`hashString` is a placeholder** — The exported `hashString()` in `pdas`
   returns a zero-filled `Uint8Array(32)`. Compute real SHA-256 with
   `crypto.subtle.digest('SHA-256', bytes)` and pass the 32-byte result to
   `getCapabilityIndexPDA()` / `getProtocolIndexPDA()`.

6. **All BN values** — The SDK uses `BN` from `@coral-xyz/anchor` for u64/i64
   instruction args. Pass `new BN(amount)` rather than raw `number` or
   `bigint` for args like `pricePerCall`, `maxCalls`, `amount`.

7. **No legacy escrow** — `src/modules/escrow.ts` was deleted. Only
   `escrow-v2.ts` (exported as `EscrowModule`) exists. Barrels do NOT expose
   an `escrow` and `escrow-v2` separately.

8. **Dual-package hazard** — CJS `require('@oobe-protocol-labs/synapse-sap-sdk')`
   and ESM `import` both work, but deep subpaths (`/pdas`, `/instructions`)
   must match the import style. In `"type": "module"` projects, use ESM paths.

9. **Preflight errors (v0.14)** — Many module methods now validate inputs
   before signing (preflights). Catch `SapValidationError` and `SapRpcError`
   around all calls.
