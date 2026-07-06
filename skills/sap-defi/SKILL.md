---
name: sap-defi
description: |
  DeFi integration patterns for SAP SDK v1.0.0.
  Use when: integrating with Jupiter, Raydium, Orca, Marinade,
  building DeFi agent workflows, yield optimization, liquidity management,
  automated market making with SAP escrows.
triggers:
  - sap defi
  - sap jupiter
  - sap raydium
  - sap liquidity
  - sap yield
  - sap amm
---

# SAP SDK v1.0.0 — DeFi Integration Patterns

> **Level:** Advanced/DeFi  
> **Package:** `@oobe-protocol-labs/synapse-sap-sdk@1.0.0`  
> **Treasury:** `J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P`

---

## 1. Jupiter Swap Integration

### Agent-Powered Swaps

```typescript
import { SapClient } from '@oobe-protocol-labs/synapse-sap-sdk';
import { JupiterClient } from '@jup-ag/core';

class DefiAgent {
  private sapClient: SapClient;
  private jupiter: JupiterClient;
  
  constructor(sapClient: SapClient, jupiter: JupiterClient) {
    this.sapClient = sapClient;
    this.jupiter = jupiter;
  }
  
  async swapAndSettle(
    depositor: PublicKey,
    nonce: number,
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number
  ) {
    // 1. Get swap quote
    const quote = await this.jupiter.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps: 50, // 0.5%
    });
    
    // 2. Build swap IXs
    const swapIxs = await this.jupiter.getSwapInstructions({
      quote,
      userPublicKey: this.sapClient.wallet.publicKey,
    });
    
    // 3. Settle SAP escrow (0.5% fee auto-collected)
    const settleIx = await this.sapClient.escrowV2.settleCallsV2(
      depositor,
      nonce,
      new BN(1)
    );
    
    // 4. Combine in single transaction
    const allIxs = [
      ...swapIxs.setupInstructions,
      swapIxs.swapInstruction,
      settleIx,
    ];
    
    const tx = await this.sapClient.buildTransaction(allIxs, this.sapClient.wallet.publicKey);
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return {
      signature: sig,
      swapAmountIn: quote.inAmount,
      swapAmountOut: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      feeCollected: amount * 0.005, // 0.5% SAP fee
    };
  }
}
```

### Liquidity Pool Management

```typescript
import { Raydium, AMM } from '@raydium-io/raydium-sdk';

class LiquidityAgent {
  private raydium: Raydium;
  private sapClient: SapClient;
  
  async provideLiquidity(
    poolId: PublicKey,
    amountA: number,
    amountB: number
  ) {
    const poolInfo = await this.raydium.liquidity.getPoolInfo(poolId);
    
    // Build LP deposit IXs
    const depositIxs = await this.raydium.liquidity.deposit({
      poolInfo,
      amountInA: new BN(amountA),
      amountInB: new BN(amountB),
    });
    
    // Settle multiple escrows in batch
    const settleIxs = await Promise.all(
      this.pendingEscrows.map(escrow =>
        this.sapClient.escrowV2.settleCallsV2(
          escrow.depositor,
          escrow.nonce,
          new BN(escrow.calls)
        )
      )
    );
    
    // Combine all IXs
    const allIxs = [
      ...depositIxs.innerTransactions[0].instructions,
      ...settleIxs,
    ];
    
    const tx = await this.sapClient.buildTransaction(allIxs, this.sapClient.wallet.publicKey);
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return {
      signature: sig,
      lpTokens: poolInfo.lpAmount,
      escrowsSettled: this.pendingEscrows.length,
    };
  }
}
```

---

## 2. Marinade Staking Integration

### Liquid Staking Rewards

```typescript
import { MarinadeFinance } from '@marinade-finance/sdk';

class StakingAgent {
  private marinade: MarinadeFinance;
  private sapClient: SapClient;
  
  async stakeAndEarn(agentWallet: PublicKey) {
    // 1. Initialize SAP stake (0.1 SOL minimum)
    const [stakePda] = Pdas.getAgentStakePDA(agentWallet);
    
    const initStakeIx = await this.sapClient.staking.initStake({
      signer: this.sapClient.wallet,
      wallet: agentWallet,
      agent: Pdas.getAgentPDA(agentWallet)[0],
      stake: stakePda,
      initialDeposit: new BN(100_000_000), // 0.1 SOL
    });
    
    // 2. Liquid stake with Marinade
    const depositIx = await this.marinade.deposit({
      lamports: 100_000_000, // 0.1 SOL
      mintToAddress: agentWallet,
    });
    
    // 3. Combine IXs
    const tx = await this.sapClient.buildTransaction(
      [initStakeIx, depositIx],
      this.sapClient.wallet.publicKey
    );
    
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return {
      signature: sig,
      sapStake: 0.1,
      mSOLReceived: await this.marinade.getMSolForSol(0.1),
    };
  }
  
  async claimStakingRewards() {
    // 1. Unstake from Marinade
    const unstakeIx = await this.marinade.unstake({
      mSOLAmount: 1.0,
      solToReceive: await this.marinade.getSolForMSol(1.0),
    });
    
    // 2. Complete SAP unstake (after cooldown)
    const completeUnstakeIx = await this.sapClient.staking.completeUnstake({
      signer: this.sapClient.wallet,
      wallet: this.sapClient.wallet.publicKey,
      agent: Pdas.getAgentPDA(this.sapClient.wallet.publicKey)[0],
      stake: Pdas.getAgentStakePDA(this.sapClient.wallet.publicKey)[0],
    });
    
    const tx = await this.sapClient.buildTransaction(
      [unstakeIx, completeUnstakeIx],
      this.sapClient.wallet.publicKey
    );
    
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return {
      signature: sig,
      rewardsClaimed: true,
    };
  }
}
```

---

## 3. Yield Optimization Strategies

### Auto-Compound Yield

```typescript
interface YieldStrategy {
  name: string;
  protocol: 'jupiter' | 'raydium' | 'orca' | 'marinade';
  apy: number;
  risk: 'low' | 'medium' | 'high';
}

class YieldOptimizer {
  private strategies: YieldStrategy[];
  private sapClient: SapClient;
  
  async autoCompound(escrowPda: PublicKey) {
    // 1. Withdraw from escrow
    const withdrawIx = await this.sapClient.escrowV2.withdraw({
      signer: this.sapClient.wallet,
      depositor: this.sapClient.wallet.publicKey,
      escrow: escrowPda,
      escrowNonce: new BN(0),
      amount: new BN(500_000_000), // 0.5 SOL
    });
    
    // 2. Swap to yield-bearing token (e.g., mSOL)
    const swapIx = await this.jupiter.getSwapInstructions({
      inputMint: WSOL,
      outputMint: MSOL,
      amount: 500_000_000,
    });
    
    // 3. Deposit to yield farm
    const depositIx = await this.raydium.farm.deposit({
      poolId: YIELD_POOL,
      amount: new BN(500_000_000),
    });
    
    // Combine all IXs
    const tx = await this.sapClient.buildTransaction(
      [withdrawIx, swapIx.swapInstruction, depositIx],
      this.sapClient.wallet.publicKey
    );
    
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return {
      signature: sig,
      strategy: 'mSOL Yield Farm',
      estimatedAPY: 8.5,
      feeCollected: 0.5 * 0.005, // 0.5% SAP fee
    };
  }
}
```

---

## 4. Risk Management

### Multi-Sig Treasury

```typescript
import { SquadsMesh } from '@squads-finance/squads-mesh';

class RiskManager {
  private squads: SquadsMesh;
  private sapClient: SapClient;
  
  async proposeFeeTransfer(amount: number, recipients: PublicKey[]) {
    const multisig = new PublicKey('YOUR_MULTISIG_PDA');
    
    // 1. Create proposal
    const proposal = await this.squads.createTransaction({
      vault: multisig,
    });
    
    // 2. Add transfer instructions for each recipient
    for (const recipient of recipients) {
      await this.squads.addInstruction({
        transactionKey: proposal.transactionKey,
        instruction: SystemProgram.transfer({
          fromPubkey: multisig,
          toPubkey: recipient,
          lamports: amount * 1e9 / recipients.length,
        }),
      });
    }
    
    // 3. Activate proposal
    await this.squads.activateTransaction({
      transactionKey: proposal.transactionKey,
    });
    
    return proposal;
  }
}
```

---

## 5. DeFi Dashboard Integration

### Real-Time Analytics

```typescript
class DefiDashboard {
  async getAgentDefiMetrics(agentWallet: PublicKey) {
    const [stakePda] = Pdas.getAgentStakePDA(agentWallet);
    const stake = await client.fetchAccount('agentStake', stakePda);
    
    // Get DeFi positions
    const positions = await Promise.all([
      this.getMarinadePosition(agentWallet),
      this.getRaydiumLPPositions(agentWallet),
      this.getJupiterLimitOrders(agentWallet),
    ]);
    
    return {
      sapStake: stake.stakedAmount.toNumber() / 1e9,
      mSOLBalance: positions[0].mSOL,
      lpPositions: positions[1],
      limitOrders: positions[2],
      totalTvl: this.calculateTotalTvl(positions),
      estimatedApy: this.calculateWeightedApy(positions),
    };
  }
}
```

---

**🚀 DeFi integration patterns for SAP agents!**
