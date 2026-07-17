---
name: sap-social
description: |
  Social media and content creator patterns for SAP SDK v1.0.0.
  Use when: creator monetization, subscription content, tipping systems,
  social token gating, influencer affiliate programs.
triggers:
  - sap social
  - sap creator
  - sap subscription
  - sap tipping
  - sap influencer
---

# SAP SDK v1.0.0 — Social Media Integration

> **Level:** Advanced/Social  
> **Package:** `@oobe-protocol-labs/synapse-sap-sdk@1.0.0`

---

## 1. Creator Subscription Model

```typescript
class CreatorAgent {
  private sapClient: SapClient;
  
  async createSubscriptionTier(
    tierName: string,
    pricePerMonth: number,
    benefits: string[]
  ) {
    const [creatorAgentPda] = Pdas.getAgentPDA(this.sapClient.wallet.publicKey);
    const [subscriptionPda] = Pdas.getSubscriptionPDA(
      creatorAgentPda,
      this.sapClient.wallet.publicKey,
      0
    );
    
    const ix = await this.sapClient.subscription.createSubscription({
      signer: this.sapClient.wallet,
      subscriber: this.sapClient.wallet.publicKey,
      agent: creatorAgentPda,
      subscription: subscriptionPda,
      subId: new BN(0),
      pricePerInterval: new BN(pricePerMonth * 1e9),
      billingInterval: 1, // Monthly
      initialFund: new BN(pricePerMonth * 1e9),
    });
    
    return {
      instruction: ix,
      tier: {
        name: tierName,
        price: pricePerMonth,
        benefits,
        billingCycle: 'monthly',
      },
    };
  }
  
  async claimSubscriptionRevenue(subscriptionPda: PublicKey) {
    const ix = await this.sapClient.subscription.claimInterval({
      signer: this.sapClient.wallet,
      payer: this.sapClient.wallet.publicKey,
      agentWallet: this.sapClient.wallet.publicKey,
      subscription: subscriptionPda,
    });
    
    const tx = await this.sapClient.buildTransaction(
      [ix],
      this.sapClient.wallet.publicKey
    );
    
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return { signature: sig, revenueClaimed: true };
  }
}
```

## 2. Tipping System

```typescript
async function sendTip(
  creatorWallet: PublicKey,
  amount: number,
  message: string
) {
  const [creatorAgentPda] = Pdas.getAgentPDA(creatorWallet);
  const [escrowPda] = Pdas.getEscrowV2PDA(creatorAgentPda, 0);
  
  // Create micro-escrow for tip
  const ix = await client.escrowV2.createEscrowV2({
    signer: wallet,
    depositor: wallet.publicKey,
    agent: creatorAgentPda,
    agentStake: Pdas.getAgentStakePDA(creatorWallet)[0],
    agentStats: Pdas.getAgentStatsPDA(creatorWallet)[0],
    pricingMenu: Pdas.getGlobalPDA()[0],
    escrow: escrowPda,
    escrowNonce: new BN(0),
    pricePerCall: new BN(0),
    maxCalls: new BN(1),
    initialDeposit: new BN(amount * 1e9),
    expiresAt: new BN(Date.now() / 1000 + 86400), // 24h
    volumeCurve: [],
    tokenMint: null,
    tokenDecimals: 9,
    settlementSecurity: 2,
    disputeWindowSlots: new BN(2160),
    coSigner: null,
    arbiter: null,
  });
  
  // Settle immediately (tip)
  const settleIx = await client.escrowV2.settleCallsV2(
    wallet.publicKey,
    0,
    new BN(1),
    {
      serviceData: Buffer.from(message),
    }
  );
  
  const tx = await client.buildTransaction([ix, settleIx], wallet.publicKey);
  const sig = await client.sendTransaction(tx, [wallet]);
  
  return { signature: sig, tipAmount: amount, message };
}
```

---

**📱 Social media integration patterns for SAP!**
