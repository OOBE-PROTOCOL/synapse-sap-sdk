---
name: sap-nft
description: |
  NFT and digital collectibles integration for SAP SDK v0.18.0.
  Use when: minting NFTs for agents, Metaplex Core integration,
  NFT-gated access, collectible tool access, NFT royalties with SAP escrows.
triggers:
  - sap nft
  - sap metaplex
  - sap digital collectibles
  - sap nft gated
---

# SAP SDK v0.18.0 — NFT Integration Patterns

> **Level:** Advanced/NFT  
> **Package:** `@oobe-protocol-labs/synapse-sap-sdk@0.18.0`  
> **Metaplex Core:** `@metaplex-foundation/mpl-core >= 1.9.0`

---

## 1. NFT-Gated Agent Access

```typescript
import { SapClient } from '@oobe-protocol-labs/synapse-sap-sdk';
import { getAsset, getAssetsByOwner } from '@metaplex-foundation/mpl-core';

class NFTGatekeeper {
  private sapClient: SapClient;
  private requiredNFTs: PublicKey[];
  
  constructor(sapClient: SapClient, requiredNFTs: PublicKey[]) {
    this.sapClient = sapClient;
    this.requiredNFTs = requiredNFTs;
  }
  
  async verifyNFTAccess(userWallet: PublicKey): Promise<boolean> {
    // Fetch user's NFTs
    const assets = await getAssetsByOwner(
      this.sapClient.connection,
      userWallet,
      { limit: 100 }
    );
    
    // Check if user owns required NFT
    const hasRequiredNFT = this.requiredNFTs.some(required =>
      assets.some(asset => asset.publicKey.equals(required))
    );
    
    return hasRequiredNFT;
  }
  
  async createNFTGatedEscrow(
    agentWallet: PublicKey,
    nftRequirement: PublicKey,
    pricePerCall: number
  ) {
    const [agentPda] = Pdas.getAgentPDA(agentWallet);
    const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, 0);
    
    const ix = await this.sapClient.escrowV2.createEscrowV2({
      signer: this.sapClient.wallet,
      depositor: this.sapClient.wallet.publicKey,
      agent: agentPda,
      agentStake: Pdas.getAgentStakePDA(agentWallet)[0],
      agentStats: Pdas.getAgentStatsPDA(agentWallet)[0],
      pricingMenu: Pdas.getGlobalPDA()[0],
      escrow: escrowPda,
      escrowNonce: new BN(0),
      pricePerCall: new BN(pricePerCall),
      maxCalls: new BN(100),
      initialDeposit: new BN(1_000_000_000), // 1 SOL
      expiresAt: new BN(Date.now() / 1000 + 86400 * 7),
      volumeCurve: [],
      tokenMint: null,
      tokenDecimals: 9,
      settlementSecurity: 2, // DisputeWindow
      disputeWindowSlots: new BN(2160), // 15 min
      coSigner: null,
      arbiter: null,
    });
    
    // Store NFT requirement in metadata
    const metadata = {
      nftGate: nftRequirement.toBase58(),
      accessLevel: 'premium',
    };
    
    return { instruction: ix, metadata };
  }
}
```

## 2. NFT Royalty Distribution

```typescript
async function distributeNFTRoyalties(
  salePrice: number,
  royaltyBps: number,
  creatorWallet: PublicKey
) {
  const royaltyAmount = (salePrice * royaltyBps) / 10000;
  
  // Create escrow for royalty payment
  const [creatorAgentPda] = Pdas.getAgentPDA(creatorWallet);
  const [escrowPda] = Pdas.getEscrowV2PDA(creatorAgentPda, 0);
  
  const ix = await client.escrowV2.createEscrowV2({
    signer: wallet,
    depositor: wallet.publicKey,
    agent: creatorAgentPda,
    agentStake: Pdas.getAgentStakePDA(creatorWallet)[0],
    agentStats: Pdas.getAgentStatsPDA(creatorWallet)[0],
    pricingMenu: Pdas.getGlobalPDA()[0],
    escrow: escrowPda,
    escrowNonce: new BN(0),
    pricePerCall: new BN(0), // Free access
    maxCalls: new BN(1),
    initialDeposit: new BN(royaltyAmount * 1e9),
    expiresAt: new BN(Date.now() / 1000 + 86400 * 30),
    volumeCurve: [],
    tokenMint: null,
    tokenDecimals: 9,
    settlementSecurity: 0,
    disputeWindowSlots: new BN(0),
    coSigner: null,
    arbiter: null,
  });
  
  return { instruction: ix, royaltyAmount };
}
```

---

**🎨 NFT integration patterns for SAP!**
