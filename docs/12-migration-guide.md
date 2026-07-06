# Migration Guide — v0.12.x to v0.3.0

> **SDK Version**: 0.3.0
> **Program Compatibility**: 0.3.0
> **Last Updated**: June 8, 2026

---

## Breaking Changes

### v0.3.0 — DisputeWindow Via `settle_calls_v2`

**What Changed**: `client.escrowV2.settle()` now derives the `PendingSettlement` PDA and passes it directly to `settle_calls_v2`. The generated `createPendingSettlement` wrapper is deprecated and should not be called in new integrations.

**Migration**:
```typescript
// ❌ BEFORE (v0.12.x)
await client.escrowV2.settleCallsV2(agentWallet, nonce, {
  callsToSettle: 10,
  serviceHash: hash,
});
// Then callers attempted to create a pending settlement in a second
// instruction, which is now deprecated and intentionally omitted.

// ✅ AFTER (v0.3.0)
await client.escrowV2.settle(
  depositorWallet,
  nonce,
  10,
  serviceHash,
);
```

**Why**: Eliminates orphan PendingSettlement bug (ArithmeticOverflow 6075).

---

### v0.12.8 — nextSettlementIndex Required

**What Changed**: Never use `escrow.settlementIndex` directly anymore.

**Migration**:
```typescript
// ❌ BEFORE (v0.12.x)
const index = escrowAccount.settlementIndex;
await client.escrowV2.finalizeSettlement(..., index);

// ✅ AFTER (v0.12.8+)
const index = await client.escrowV2.nextSettlementIndex(
  agentWallet,
  depositorWallet,
  nonce
);
await client.escrowV2.finalizeSettlement(..., index);
```

**Why**: Prevents `Allocate: account already in use` (SystemProgram error 0x0).

---

### v0.12.9 — finalizeSettlement Preflight

**What Changed**: Pre-flight validation throws before signing if pending PDA is invalid.

**Migration**:
```typescript
// ✅ Wrap in try-catch with specific error handling
try {
  await client.escrowV2.finalizeSettlement(...);
} catch (err) {
  if (err.message.includes("pending PDA not found")) {
    // Use nextSettlementIndex() to find correct index
    const correctIndex = await client.escrowV2.nextSettlementIndex(...);
    await client.escrowV2.finalizeSettlement(..., correctIndex);
  } else if (err.message.includes("amount exceeds pending")) {
    // Orphan settlement — recovery path required
    await recoverOrphanSettlement(...);
  } else {
    throw err;
  }
}
```

---

### v0.11.0 — ESM JSON Import Fix

**What Changed**: `require("./idl.json")` → `require("./idl/synapse_agent_sap.json")`

**Migration**:
```typescript
// ❌ BEFORE (v0.10.x) — BREAKS in Node ESM
import { IDL } from "@synapse-sap/sdk/idl.json";

// ✅ AFTER (v0.11.0+)
import { IDL } from "@synapse-sap/sdk/idl/synapse_agent_sap.json";
```

**Why**: Node ESM strict mode rejects directory-only re-exports.

---

### v0.10.0 — SettlementSecurity Enum Change

**What Changed**: `SettlementSecurity.SelfReport` deprecated (returns error on-chain).

**Migration**:
```typescript
// ❌ BEFORE (v0.9.x)
const escrow = await client.escrowV2.create(agentWallet, {
  settlementSecurity: { selfReport: {} }, // DEPRECATED
});

// ✅ AFTER (v0.10.0+)
const escrow = await client.escrowV2.create(agentWallet, {
  settlementSecurity: { disputeWindow: {} }, // RECOMMENDED
  disputeWindowSlots: 2_160, // ~15 min mainnet
  arbiter: arbiterPubkey,
});
```

**Why**: SelfReport abuse vector removed (no verification).

---

## Production Checklist

### Recommended Defaults (v0.3.0)

```typescript
const escrow = await client.escrowV2.create(agentWallet, {
  // Settlement security
  settlementSecurity: { disputeWindow: {} }, // ALWAYS use DisputeWindow
  disputeWindowSlots: 2_160, // ~15 min mainnet (consumer-side)

  // For devnet/testing only
  // disputeWindowSlots: 1,

  // Pricing
  pricePerCall: 1_000, // lamports
  maxCalls: 100,
  initialDeposit: 100_000, // lamports

  // Token
  tokenMint: null, // SOL
  tokenDecimals: 9,

  // Optional: volume curve
  volumeCurve: [
    { afterCalls: 50, pricePerCall: 800 },
    { afterCalls: 100, pricePerCall: 600 },
  ],

  // Required for DisputeWindow
  arbiter: arbiterPubkey,

  // Optional: co-signer (not needed for DisputeWindow)
  // coSigner: null,
});
```

### Common Pitfalls

| Pitfall | Error | Solution |
|---------|-------|----------|
| Using `escrow.settlementIndex` directly | `Allocate: account already in use` | Use `nextSettlementIndex()` helper |
| Forgetting `createPendingSettlement` (pre-v0.13.0) | `ArithmeticOverflow` (6075) | Upgrade to v0.13.0+ (auto-bundle) |
| `disputeWindowSlots < 2_160` for security=2 | `InvalidSettlementSecurity` | Use >= 2_160 for mainnet |
| Using `SelfReport` mode | `SelfReportDeprecated` error | Use `DisputeWindow` instead |
| Node ESM `await import()` | Directory re-export breaks on old SDKs | Upgrade to v0.3.0 and use public imports such as `@oobe-protocol-labs/synapse-sap-sdk/registries` |

---

## Code Examples

### Complete Payment Flow (v0.3.0)

```typescript
import { SapClient } from "@synapse-sap/sdk";
import { BN } from "@coral-xyz/anchor";

const client = SapClient.from(provider);

// Step 1: Create escrow (DisputeWindow mode)
const escrowSig = await client.escrowV2.create(agentWallet, {
  settlementSecurity: { disputeWindow: {} },
  disputeWindowSlots: 2_160,
  arbiter: arbiterPubkey,
  pricePerCall: 1_000,
  maxCalls: 100,
  initialDeposit: 100_000,
});

// Step 2: Serve calls (agent-side)
// ... serve 10 calls ...

// Step 3: Settle (auto-bundled for DisputeWindow)
const settleSig = await client.escrowV2.settle(agentWallet, nonce, {
  callsToSettle: 10,
  serviceHash: serviceHash,
});

// Step 4: Wait for dispute window (~15 min mainnet)
await sleep(900_000); // 15 minutes in ms

// Step 5: Finalize settlement
const index = await client.escrowV2.nextSettlementIndex(
  agentWallet,
  depositorWallet,
  nonce
);

const finalizeSig = await client.escrowV2.finalizeSettlement(
  agentWallet,
  depositorWallet,
  nonce,
  index
);

console.log("Payment complete:", finalizeSig);
```

### Dispute Flow (v0.3.0)

```typescript
// Consumer-side: File dispute
const disputeSig = await client.escrowV2.fileDispute(agentWallet, nonce, index, {
  evidenceHash: evidenceHash,
  disputeType: 0, // 0=NonDelivery, 1=PartialDelivery, 2=Overcharge, 3=Quality
});

// Agent-side: Submit counter-evidence
const evidenceSig = await client.dispute.submitAgentEvidence(agentWallet, {
  evidenceHash: counterEvidenceHash,
});

// Permissionless: Auto-resolve (after deadline)
const resolveSig = await client.receipt.autoResolveDispute(
  agentWallet,
  depositorWallet,
  nonce,
  index
);
```

---

## Error Codes Reference

| Code | Name | Message | Recovery |
|------|------|---------|----------|
| 6075 | ArithmeticOverflow | `overflow in settle` | Use `nextSettlementIndex()`, check orphan recovery |
| 6093 | InvalidCoSigner | `bad co-signer` | Pass `Keypair` as 7th arg, not in args |
| 6098 | SettlementAlreadyFinalized | `already final` | Nothing to do, settlement complete |
| 6099 | DisputeWindowNotExpired | `too early` | Wait for dispute window to close |
| 6100 | DisputeWindowExpired | `window closed` | File dispute before deadline |
| 6101 | NotDepositor | `not depositor` | Sign with depositor wallet |
| 6102 | DisputeAlreadyFiled | `dup dispute` | Wait for existing dispute to resolve |
| 6103 | DisputeStillOpen | `dispute open` | Wait for resolution |
| 6104 | NotArbiter | `not arbiter` | Sign with arbiter wallet |

---

## Resources

- **Full Changelog**: [`CHANGELOG.md`](../CHANGELOG.md)
- **SDK Docs**: [`docs/`](./)
- **Program Docs**: [`../../docs/`](../../docs/)
- **User Memory**: `sap-ecosystem.md` (production pitfalls)
- **GitHub Issues**: [Link to repo issues]

---

*Migration guide prepared by OOBE Protocol Labs — June 4, 2026*
