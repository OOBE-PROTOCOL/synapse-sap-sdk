// ===============================================================
//  Subscription Module — IDL v1.0.0
//  5 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class SubscriptionModule {
  constructor(private program: Program) {}

  /** cancel_subscription (3 accounts, 0 args) */
  async cancelSubscription(ctx: { signer: Signer; subscriber: PublicKey; agentWallet: PublicKey; subscription: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.cancelSubscription()
      .accounts({
        subscriber: ctx.subscriber,
        agentWallet: ctx.agentWallet,
        subscription: ctx.subscription,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** claim_interval (3 accounts, 0 args) */
  async claimInterval(ctx: { signer: Signer; payer: PublicKey; agentWallet: PublicKey; subscription: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.claimInterval()
      .accounts({
        payer: ctx.payer,
        agentWallet: ctx.agentWallet,
        subscription: ctx.subscription,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_subscription (2 accounts, 0 args) */
  async closeSubscription(ctx: { signer: Signer; subscriber: PublicKey; subscription: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeSubscription()
      .accounts({
        subscriber: ctx.subscriber,
        subscription: ctx.subscription,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** create_subscription (4 accounts, 4 args) */
  async createSubscription(ctx: { signer: Signer; subscriber: PublicKey; agent: PublicKey; subscription: PublicKey; subId: BN; pricePerInterval: BN; billingInterval: number; initialDeposit: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.createSubscription(ctx.subId, ctx.pricePerInterval, ctx.billingInterval, ctx.initialDeposit)
      .accounts({
        subscriber: ctx.subscriber,
        agent: ctx.agent,
        subscription: ctx.subscription,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** fund_subscription (3 accounts, 1 args) */
  async fundSubscription(ctx: { signer: Signer; subscriber: PublicKey; subscription: PublicKey; amount: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.fundSubscription(ctx.amount)
      .accounts({
        subscriber: ctx.subscriber,
        subscription: ctx.subscription,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
