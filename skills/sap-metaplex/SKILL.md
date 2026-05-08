---
name: sap-metaplex
description: |
  Metaplex Core bridge for SAP SDK v0.14.0.
  Use when: minting agent identity NFTs, attaching AgentIdentity plugin,
  linking SAP agents to MPL Core assets, triple-check link verification,
  atomic register flows (mint + attach + SAP register).
triggers:
  - sap metaplex
  - sap mpl core
  - sap agent identity
  - sap nft
  - sap bridge
---

# SAP × Metaplex Core — Bridge Skill Guide (v0.14.0)

> **Module**: `client.metaplex` (MetaplexBridge)  
> **SAP SDK**: `@oobe-protocol-labs/synapse-sap-sdk@0.14.0`  
> **MPL Core**: `@metaplex-foundation/mpl-core >= 1.9.0`  
> **EIP-8004**: Trustless Agents  

---

## 1. Core Model

MPL Core's `AgentIdentity` is an **asset-only external plugin** with one field:
`uri: string` pointing to an EIP-8004 agent registration JSON.

**Architecture:**
```
SAP indexer ──serves──▶ https://explorer.oobeprotocol.ai/agents/<sapPda>/eip-8004.json
                                    ▲
                                    │ AgentIdentity.uri
                                    │
                          MPL Core Asset (NFT)
```

One transaction attaches the plugin. After that, every SAP write propagates
with zero MPL transactions (the JSON is rendered live from on-chain SAP state).

---

## 2. Decision Matrix

| You want to… | Method |
|---|---|
| Attach AgentIdentity to existing MPL asset | `buildAttachAgentIdentityIx` |
| Update plugin URI (host migration) | `buildUpdateAgentIdentityUriIx` |
| Unified read (NFT + SAP on-chain + JSON) | `getUnifiedProfile` |
| Cryptographic link verification | `verifyLink` |
| 3-layer audit (MPL + JSON + SAP) | `tripleCheckLink` |
| Mint MPL + attach AgentIdentity | `buildMintAndAttachIxs` |
| Register SAP for MPL asset owner | `buildRegisterSapForMplOwnerIx` |
| Atomic SAP + MPL + attach (fresh start) | `buildRegisterBothIxs` |
| Build EIP-8004 JSON | `buildEip8004Registration` |
| Canonical URL without fetch | `deriveRegistrationUrl` |

---

## 3. Basic Linking (1 tx)

```ts
import { SapClient } from '@oobe-protocol-labs/synapse-sap-sdk';

const client = SapClient.from(provider);

const ix = await client.metaplex.buildAttachAgentIdentityIx({
  asset: new PublicKey(mplCoreAssetId),
  authority: wallet.publicKey,
  sapAgentOwner: wallet.publicKey,
  registrationBaseUrl: 'https://explorer.oobeprotocol.ai',
  rpcUrl: process.env.RPC_URL!,
});

await provider.sendAndConfirm(new web3.Transaction().add(ix));
```

---

## 4. Unified Profile Read

```ts
const profile = await client.metaplex.getUnifiedProfile({
  asset: new PublicKey(assetId),
  rpcUrl: process.env.RPC_URL!,
});

if (profile.linked) {
  console.log('Agent name:', profile.mpl?.registration?.name);
  console.log('Capabilities:', profile.sap.identity?.capabilities);
  console.log('Reputation:', profile.sap.stats?.reputationScore);
}
```

---

## 5. Triple-Check Link Audit

```ts
const result = await client.metaplex.tripleCheckLink({
  asset: new PublicKey(assetId),
  rpcUrl: process.env.RPC_URL!,
  rpcHeaders: { 'x-api-key': process.env.RPC_KEY! }, // gated RPC
});

console.log(result.layers); // { mplOnChain, eip8004Json, sapOnChain }
console.log(result.linked); // true iff all 3 pass
```

| Layer | Passes when | Common failure |
|---|---|---|
| `mplOnChain` | Asset readable + AgentIdentity present | RPC 401, asset missing |
| `eip8004Json` | URI resolves + JSON synapseAgent == sapPda | Wrong registry host |
| `sapOnChain` | AgentAccount PDA exists for asset owner | Not registered on SAP |

---

## 6. Atomic Register Flows

### A. SAP exists → Mint MPL + Attach

```ts
const result = await client.metaplex.buildMintAndAttachIxs({
  sapAgentOwner: wallet.publicKey,
  authority: wallet.publicKey,
  payer: wallet.publicKey,
  owner: wallet.publicKey,
  name: 'My Agent',
  metadataUri: 'https://...metadata.json',
  registrationBaseUrl: 'https://explorer.oobeprotocol.ai',
  rpcUrl,
});

const tx = new web3.Transaction().add(...result.instructions);
tx.partialSign(web3.Keypair.fromSecretKey(result.assetSecretKey));
```

### B. MPL exists → Register SAP for owner

```ts
const result = await client.metaplex.buildRegisterSapForMplOwnerIx({
  asset: new PublicKey(assetId),
  registerArgs: { name, capabilities, metadataUri },
  rpcUrl,
});

if (!result.alreadyRegistered) {
  await sendTx([result.instruction!], result.assetOwner);
}
```

### C. Neither exists → Atomic both

```ts
const result = await client.metaplex.buildRegisterBothIxs({
  wallet: wallet.publicKey,
  payer: wallet.publicKey,
  registerArgs: { name, capabilities, metadataUri },
  mintName: 'My Agent',
  mintMetadataUri: 'https://...metadata.json',
  registrationBaseUrl: 'https://explorer.oobeprotocol.ai',
  rpcUrl,
});
```

---

## 7. Hosting EIP-8004 JSON

```ts
// Next.js route handler
export async function GET(
  _req: Request,
  { params }: { params: { wallet: string } },
) {
  const client = SapClient.from(provider);
  const json = await client.metaplex.buildEip8004Registration({
    sapAgentOwner: new PublicKey(params.wallet),
    services: [
      {
        id: 'x402-default',
        type: 'x402-endpoint',
        url: `https://explorer.oobeprotocol.ai/agents/${params.wallet}/x402`,
      },
    ],
  });
  return Response.json(json, {
    headers: { 'Cache-Control': 'public, max-age=15, s-maxage=60' },
  });
}
```

---

## 8. Pitfalls

1. **`AgentIdentity` rejected on collections** — Can only attach to individual
   assets, not collections.

2. **One plugin per asset** — Enforced by MPL Core processor.

3. **`rpcHeaders` on gated RPCs** — Pass `rpcHeaders` to every read method or
   `fetchAsset` returns 401 silently.

4. **`tripleCheckLink.linked === false` after attach** — Check that both write
   AND verify use the same authenticated RPC config.

5. **`hashString` from pdas is a placeholder** — The real SHA-256 must be
   computed in the bridge code, not the placeholder in `pdas/index.ts`.

6. **Version drift** — This bridge guide targets SDK v0.14.0. If using a
   different version, verify `MetaplexBridge` exports in `src/registries/metaplex-bridge.ts`.
