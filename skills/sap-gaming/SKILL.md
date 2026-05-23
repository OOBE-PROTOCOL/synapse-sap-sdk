---
name: sap-gaming
description: |
  Gaming and GameFi integration patterns for SAP SDK v0.18.0.
  Use when: play-to-earn mechanics, in-game item escrows, tournament payments,
  guild treasury management, NFT item rentals via SAP.
triggers:
  - sap gaming
  - sap gamefi
  - sap play-to-earn
  - sap guild
  - sap tournament
---

# SAP SDK v0.18.0 — Gaming Integration Patterns

> **Level:** Advanced/Gaming  
> **Package:** `@oobe-protocol-labs/synapse-sap-sdk@0.18.0`

---

## 1. Play-to-Earn Reward Distribution

```typescript
class GameFiAgent {
  private sapClient: SapClient;
  
  async distributeRewards(players: PublicKey[], scores: number[]) {
    const totalPool = 10_000_000_000; // 10 SOL
    const rewards = this.calculateRewards(scores, totalPool);
    
    const settleIxs = await Promise.all(
      players.map((player, idx) => {
        const [playerAgentPda] = Pdas.getAgentPDA(player);
        const [escrowPda] = Pdas.getEscrowV2PDA(playerAgentPda, 0);
        
        return this.sapClient.escrowV2.settleCallsV2(
          player,
          0,
          new BN(1),
          {
            receiptMerkleRoot: this.calculateMerkleRoot(scores),
          }
        );
      })
    );
    
    const tx = await this.sapClient.buildTransaction(
      settleIxs,
      this.sapClient.wallet.publicKey
    );
    
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return {
      signature: sig,
      playersPaid: players.length,
      totalDistributed: totalPool / 1e9,
      feeCollected: (totalPool * 0.005) / 1e9, // 0.5%
    };
  }
  
  private calculateRewards(scores: number[], totalPool: number): number[] {
    const totalScore = scores.reduce((a, b) => a + b, 0);
    return scores.map(score => (score / totalScore) * totalPool);
  }
}
```

## 2. NFT Item Rental Escrow

```typescript
async function rentNFTItem(
  renter: PublicKey,
  owner: PublicKey,
  nftMint: PublicKey,
  rentalPrice: number,
  durationDays: number
) {
  const [ownerAgentPda] = Pdas.getAgentPDA(owner);
  const [escrowPda] = Pdas.getEscrowV2PDA(ownerAgentPda, 0);
  
  const ix = await client.escrowV2.createEscrowV2({
    signer: wallet,
    depositor: renter,
    agent: ownerAgentPda,
    agentStake: Pdas.getAgentStakePDA(owner)[0],
    agentStats: Pdas.getAgentStatsPDA(owner)[0],
    pricingMenu: Pdas.getGlobalPDA()[0],
    escrow: escrowPda,
    escrowNonce: new BN(0),
    pricePerCall: new BN(0),
    maxCalls: new BN(1),
    initialDeposit: new BN(rentalPrice * 1e9),
    expiresAt: new BN(Date.now() / 1000 + (durationDays * 86400)),
    volumeCurve: [],
    tokenMint: null,
    tokenDecimals: 9,
    settlementSecurity: 2, // DisputeWindow for safety
    disputeWindowSlots: new BN(2160),
    coSigner: null,
    arbiter: null,
  });
  
  return { instruction: ix, rentalTerms: { durationDays, rentalPrice } };
}
```

---

**🎮 Gaming integration patterns for SAP!**
