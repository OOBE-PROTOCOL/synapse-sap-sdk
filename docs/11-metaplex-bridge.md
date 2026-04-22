# 11. Metaplex Core Bridge

> **Module:** `client.metaplex` ([`MetaplexBridge`](../src/registries/metaplex-bridge.ts))
> **Since:** SDK `v0.9.0` · `@metaplex-foundation/mpl-core` `>=1.9.0`
> **Companion skill:** [skills/metaplex-bridge.md](../skills/metaplex-bridge.md)

This guide explains how SAP agents interoperate with Metaplex Core's `AgentIdentity` external plugin (PR [#258](https://github.com/metaplex-foundation/mpl-core/pull/258)) following the EIP-8004 trustless agent registration spec.

---

## 11.1 Architecture (verified)

The MPL Core `AgentIdentity` plugin is an **asset-only external plugin adapter** with exactly one field:

```ts
type AgentIdentity = { uri: string };
```

The URI **must** point to an [EIP-8004](https://eips.ethereum.org/EIPS/eip-8004) registration JSON. Capabilities, executives, services, and reputation live in that JSON — **not on chain**. The plugin only hooks the `Execute` lifecycle event, allowing the URI authority to gate execution operations on the asset.

This means the most efficient SAP × MPL bridge is:

1. SAP serves a live EIP-8004 JSON at a deterministic URL derived from the SAP agent PDA.
2. The MPL Core asset's `AgentIdentity.uri` points to that URL.
3. Every SAP write propagates automatically — no second transaction required.

```
                ┌──────────────────────────────────────┐
                │   MPL Core Asset (transferable NFT)  │
                │   AgentIdentity.uri ─────┐           │
                └──────────────────────────┼───────────┘
                                           ▼
        https://api.synapse.xyz/agents/<sapAgentPda>/eip-8004.json
                                           │
                                           ▼
                     SAP indexer  ◀──reads──  AgentAccount + VaultDelegate*
```

---

## 11.2 Public API

| Method | Purpose |
|---|---|
| `deriveRegistrationUrl(pda, baseUrl)` | Compute canonical URL — pure helper |
| `buildEip8004Registration({ sapAgentOwner, services, extra })` | Build the JSON server-side |
| `buildAttachAgentIdentityIx(opts)` | Build the **single** MPL ix that links an asset to a SAP agent |
| `buildUpdateAgentIdentityUriIx(opts)` | Re-point the URI when migrating registry hosts |
| `getUnifiedProfile({ wallet?, asset?, rpcUrl })` | Merged SAP + MPL read |
| `verifyLink({ asset, sapAgentPda, rpcUrl })` | Cryptographic bidirectional link check |

See `synapse-sap-sdk/src/registries/metaplex-bridge.ts` for full type signatures.

---

## 11.3 Linking flow

```ts
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";
import { Transaction } from "@solana/web3.js";

const client = SapClient.from(provider);

const ix = await client.metaplex.buildAttachAgentIdentityIx({
  asset:               mplCoreAsset,
  authority:           wallet.publicKey,
  sapAgentOwner:       wallet.publicKey,
  registrationBaseUrl: "https://api.synapse.xyz",
  rpcUrl:              process.env.RPC_URL!,
});

await provider.sendAndConfirm(new Transaction().add(ix));
```

After this single MPL transaction:

- The asset has the `AgentIdentity` plugin with `uri` set to the canonical SAP registration URL.
- The lifecycle check `[Execute, CanApprove]` is registered.
- **No SAP transaction was needed.** The 8 mainnet agents need no migration.
- Future SAP changes propagate automatically through the JSON.

---

## 11.4 Hosting the EIP-8004 endpoint

In `synapse-sap-explorer` (or any registry host):

```ts
// app/api/agents/[wallet]/eip-8004.json/route.ts
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";
import { PublicKey } from "@solana/web3.js";
import { getServerProvider } from "@/lib/synapse/client";

export async function GET(
  _req: Request,
  { params }: { params: { wallet: string } },
) {
  const client = SapClient.from(getServerProvider());
  try {
    const json = await client.metaplex.buildEip8004Registration({
      sapAgentOwner: new PublicKey(params.wallet),
      services: [
        {
          id:    "x402-default",
          type:  "x402-endpoint",
          url:   `https://api.synapse.xyz/agents/${params.wallet}/x402`,
        },
      ],
    });
    return Response.json(json, {
      headers: { "Cache-Control": "public, max-age=15, s-maxage=60" },
    });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 404 },
    );
  }
}
```

The cache header is intentionally short — SAP state changes (capability, vault delegate) become visible to MPL consumers within 15 s without any user action.

---

## 11.5 Reading a unified profile

```ts
const profile = await client.metaplex.getUnifiedProfile({
  asset:  mplCoreAsset,
  rpcUrl: process.env.RPC_URL!,
});

profile.linked;                                  // boolean
profile.sap.identity?.capabilities;              // SAP on-chain capabilities
profile.sap.stats?.reputationScore;              // SAP reputation
profile.mpl?.registration?.executives;           // EIP-8004 executives mirror
profile.mpl?.registration?.services;             // EIP-8004 services
profile.mpl?.agentIdentityUri;                   // raw plugin URI
```

`linked` is `true` iff:

1. `AgentIdentity.uri` ends with `/agents/<sapAgentPda>/eip-8004.json`, and
2. The fetched JSON's `synapseAgent` field equals the SAP PDA.

---

## 11.6 Efficiency comparison

| Operation | Naive dual-on-chain | This bridge |
|---|---|---|
| Initial linking | 2 tx | **1 tx** (MPL only) |
| Add a vault delegate | 2 tx | **1 tx** (SAP only) |
| Revoke a delegate | 2 tx | **1 tx** (SAP only) |
| Capability or x402 tier change | 2 tx | **1 tx** (SAP only) |
| Reads per profile | 2 RPC + 2 deserialisations | 1 RPC + 1 cached fetch |
| Required SAP program changes | new instructions/fields | **zero** |

Every recurring operation drops from 2 tx to 1 tx.

---

## 11.7 Lifecycle check semantics

When attaching the plugin the bridge registers:

```ts
lifecycleChecks: [[HookableLifecycleEvent.Execute, ExternalCheckResult.CanApprove]]
```

This is what makes the SAP-side authority able to gate `Execute` calls on the MPL asset — the precise hook that motivated PR #258.

---

## 11.8 Error model

| Throw | Meaning |
|---|---|
| `MetaplexBridge requires @metaplex-foundation/mpl-core ...` | Optional peer dep missing — install both Metaplex packages |
| `... did not return a TransactionBuilder. Upgrade ... >=1.9.0.` | Old `mpl-core` without `AgentIdentity` |
| `getUnifiedProfile: provide 'wallet' or 'asset'` | API misuse |
| `buildEip8004Registration: SAP agent not found ...` | Owner has not registered an agent on SAP |

`getUnifiedProfile` and `verifyLink` never throw on a missing or malformed JSON — they return `linked: false` instead.

---

## 11.9 Forward compatibility (Phase 3)

If a future SAP program update adds `mpl_asset: Pubkey` on `AgentAccount`:

- The `UnifiedProfile` shape does **not** change.
- `linked` becomes `(agentAccount.mpl_asset == asset) && currentHeuristic`.
- Existing 8 mainnet agents stay valid via `Pubkey::default()` migration.

Consumers do not need to update their code.

---

## 11.10 References

- [mpl-core PR #258 — AgentIdentity external plugin](https://github.com/metaplex-foundation/mpl-core/pull/258)
- [`AgentIdentity` type](https://mpl-core-js-docs.vercel.app/types/AgentIdentity.html)
- [`addExternalPluginAdapterV1`](https://mpl-core-js-docs.vercel.app/functions/addExternalPluginAdapterV1.html)
- [EIP-8004 — Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- [SAP × Metaplex Phase 1 breakdown](../../docs/metaplex-partnership-phase1-breakdown.md)
