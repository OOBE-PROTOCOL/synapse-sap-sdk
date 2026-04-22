# SAP × Metaplex Core — Bridge Skill Guide

> **Module:** `client.metaplex` ([`MetaplexBridge`](../src/registries/metaplex-bridge.ts))
> **Since:** SDK `v0.9.0` · `@metaplex-foundation/mpl-core` `>=1.9.0`
> **Sources of truth (verified 2026-04-22):**
> - [mpl-core PR #258 — AgentIdentity external plugin](https://github.com/metaplex-foundation/mpl-core/pull/258)
> - [`AgentIdentity` type](https://mpl-core-js-docs.vercel.app/types/AgentIdentity.html) — `{ uri: string }`
> - [EIP-8004 — Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)

---

## 1. The model in one paragraph

MPL Core's `AgentIdentity` is an **asset-only external plugin adapter** with **one field**: a URI pointing to an EIP-8004 agent registration JSON. There is **no on-chain executive list**, no `addExecutive` instruction, no on-chain capability list. Capabilities, services, executives, reputation — all live in that JSON, off-chain. The plugin only hooks the `Execute` lifecycle event so the URI authority can gate execution.

Therefore the most efficient SAP × MPL bridge is:

```
SAP indexer  ──serves──▶  https://api.synapse.xyz/agents/<sapAgentPda>/eip-8004.json
                                     ▲
                                     │ AgentIdentity.uri
                                     │
                          MPL Core Asset (NFT)
```

**One transaction** attaches the plugin. After that, **every SAP write propagates with zero MPL transactions**, because the JSON is rendered live from on-chain SAP state.

---

## 2. Decision matrix: when to use which method

| You want to… | Use |
|---|---|
| Mint a tradeable NFT identity for an existing SAP agent | `buildAttachAgentIdentityIx(...)` |
| Migrate an asset to a new registry host | `buildUpdateAgentIdentityUriIx(...)` |
| Render an explorer page for one agent (NFT image + on-chain stats) | `getUnifiedProfile({ asset, rpcUrl })` |
| Confirm an asset cryptographically links to a SAP PDA | `verifyLink({ asset, sapAgentPda, rpcUrl })` |
| Serve the EIP-8004 JSON from your own host | `buildEip8004Registration({ sapAgentOwner, services })` |
| Compute the canonical URL without fetching | `deriveRegistrationUrl(sapAgentPda, baseUrl)` |

---

## 3. Linking flow (single transaction)

```ts
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";
import { Transaction } from "@solana/web3.js";

const client = SapClient.from(provider);

const ix = await client.metaplex.buildAttachAgentIdentityIx({
  asset:               mplCoreAsset,
  authority:           wallet.publicKey,
  sapAgentOwner:       wallet.publicKey,
  registrationBaseUrl: "https://explorer.oobeprotocol.ai",
  rpcUrl:              process.env.RPC_URL!,
});

await provider.sendAndConfirm(new Transaction().add(ix));
```

What happens on chain:
1. `mpl_core` adds an `AgentIdentity` adapter to the asset with `uri = https://api.synapse.xyz/agents/<sapAgentPda>/eip-8004.json` and lifecycle check `[Execute, CanApprove]`.
2. SAP state is **untouched** — no SAP transaction, no SAP fee.

What happens off chain afterwards:
- Whenever the SAP agent's capabilities, vault delegates, or x402 tiers change, the served JSON updates automatically.
- The MPL plugin **never needs to be touched again** unless you migrate hosts (then use `buildUpdateAgentIdentityUriIx`).

---

## 4. Reading a unified profile

```ts
const profile = await client.metaplex.getUnifiedProfile({
  asset:  mplCoreAsset,
  rpcUrl: process.env.RPC_URL!,
});

if (profile.linked) {
  console.log("Agent name :", profile.mpl?.registration?.name);
  console.log("Capabilities:", profile.sap.identity?.capabilities);
  console.log("Reputation :", profile.sap.stats?.reputationScore);
  console.log("Executives :", profile.mpl?.registration?.executives.length);
}
```

The `linked` flag is `true` iff:
1. `AgentIdentity.uri` ends with `/agents/<sapAgentPda>/eip-8004.json` **and**
2. The fetched JSON's `synapseAgent` field equals the SAP PDA.

This is what makes the link **bidirectional and cryptographic** without any on-chain SAP change.

---

## 5. Hosting the EIP-8004 JSON

Your registry host serves at the canonical URL:

```
GET /agents/<sapAgentPda>/eip-8004.json
```

Implementation (Next.js route handler example):

```ts
// app/api/agents/[wallet]/eip-8004.json/route.ts
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";
import { PublicKey } from "@solana/web3.js";

export async function GET(
  _req: Request,
  { params }: { params: { wallet: string } },
) {
  const client = SapClient.from(provider);
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
}
```

This single endpoint replaces:
- A second on-chain instruction per delegate update,
- A second IDL,
- Any custom indexer on the MPL side.

---

## 6. Why this is efficient — quantitative comparison

| Operation | Naive design (dual on-chain) | This bridge |
|---|---|---|
| **Initial linking** | 2 tx (SAP + MPL `addExecutive`) | 1 tx (MPL only) |
| **Add a vault delegate** | 2 tx (SAP `addVaultDelegate` + MPL `addExecutive`) | 1 tx (SAP only) |
| **Revoke a delegate** | 2 tx | 1 tx (SAP only) |
| **Capability add / x402 tier change** | 2 tx | 1 tx (SAP only) |
| **Reads (per profile)** | 2 RPC + 2 deserialisations | 1 RPC + 1 fetch (cached) |
| **MPL programs touched after init** | every change | never (until host migration) |
| **Required on-chain SAP changes** | new instructions + new fields | **zero** |

Every recurring operation drops from 2 tx to 1 tx, and the SAP program itself is unchanged — the 8 mainnet agents keep working unmodified.

---

## 7. Sequence diagram — write path

```
Operator (wallet)
   │
   │  client.vault.addDelegate(hot, perms, expires)   ──▶  SAP program
   │                                                         │
   │                                                         ▼
   │                                            VaultDelegate PDA created
   │
   │  (no MPL tx required)
   │
SAP indexer notices new VaultDelegate
   │
   ▼
EIP-8004 JSON regenerated at /agents/<pda>/eip-8004.json
   │
   ▼
Any consumer fetching the MPL asset's AgentIdentity.uri sees the update
```

---

## 8. Sequence diagram — read path (explorer / wallet)

```
UI ──fetchAsset──▶ MPL Core program  ──▶  asset + AgentIdentity { uri }
UI ──fetch(uri)──▶ SAP registry host  ──▶  EIP-8004 JSON (live from chain)
UI ──fetch SAP AgentAccount + AgentStats──▶ SAP program

→ MetaplexBridge.getUnifiedProfile does all three in parallel and returns one object.
```

---

## 9. Lifecycle checks (`Execute` event)

When attaching the plugin, the bridge registers:

```ts
lifecycleChecks: [[HookableLifecycleEvent.Execute, ExternalCheckResult.CanApprove]]
```

This means the URI's authority can approve `Execute` operations on the asset — the precise hook that lets a SAP agent gate downstream actions through MPL Core's lifecycle without a custom program.

---

## 10. Common pitfalls (verified)

| Pitfall | Reality |
|---|---|
| "Use `addExecutive` to delegate" | ❌ Function does not exist in `mpl-core` ≥ 1.9.0. |
| "AgentIdentity stores the executive list" | ❌ It stores **only** `uri: string`. |
| "We need a new SAP instruction to link" | ❌ The link is just the URI in the MPL plugin. SAP is unchanged. |
| "We need to attach the plugin to the collection" | ❌ `AgentIdentity` is **rejected on collections** (`validate_create` check). |
| "We can attach two plugins" | ❌ One per asset enforced by `add_external_plugin_adapter` processor. |
| "umi `Signer` requires a real keypair" | ✅ For ix-only construction (`getInstructions()`) the bridge uses a public-key-only stub. The caller signs the assembled web3.js transaction. |

---

## 11. Future on-chain link (#0001 - MPL- PROPOSAL) 

If we later add an on-chain `mpl_asset: Pubkey` field to `AgentAccount` for cryptographic dual-link:

- `MetaplexBridge.getUnifiedProfile` shape **does not change**.
- `linked` becomes `(agentAccount.mpl_asset === asset) && currentHeuristic`.
- Existing 8 mainnet agents stay valid via `Pubkey::default()` migration.

The SDK API is **forward-compatible**.

---

## 12. Quick reference

```ts
client.metaplex.deriveRegistrationUrl(sapPda, baseUrl);                 // pure
client.metaplex.buildEip8004Registration({ sapAgentOwner, services });  // server-side JSON
client.metaplex.buildAttachAgentIdentityIx(opts);                       // 1 MPL ix
client.metaplex.buildUpdateAgentIdentityUriIx(opts);                    // 1 MPL ix (host migration)
client.metaplex.getUnifiedProfile({ asset|wallet, rpcUrl });            // merged read
client.metaplex.verifyLink({ asset, sapAgentPda, rpcUrl });             // boolean
```
