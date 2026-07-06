// ===============================================================
//  Escrow Module — IDL v0.3.0
//  6 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { VolumeCurveBreakpoint } from '../idlTypes';

export class EscrowModule {
  constructor(private program: Program) {}

  /** close_escrow_v2 (3 accounts, 0 args) */
  async closeEscrowV2(ctx: { signer: Signer; depositor: PublicKey; escrow: PublicKey; agentStats: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeEscrowV2()
      .accounts({
        depositor: ctx.depositor,
        escrow: ctx.escrow,
        agentStats: ctx.agentStats,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** create_escrow_v2 (7 accounts, 12 args) */
  async createEscrowV2(ctx: { signer: Signer; depositor: PublicKey; agent: PublicKey; agentStake: PublicKey; agentStats: PublicKey; pricingMenu: PublicKey; escrow: PublicKey; escrowNonce: BN; pricePerCall: BN; maxCalls: BN; initialDeposit: BN; expiresAt: BN; volumeCurve: VolumeCurveBreakpoint[]; tokenMint: (PublicKey | null); tokenDecimals: number; settlementSecurity: number; disputeWindowSlots: BN; coSigner: (PublicKey | null); arbiter: (PublicKey | null); remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.createEscrowV2(ctx.escrowNonce, ctx.pricePerCall, ctx.maxCalls, ctx.initialDeposit, ctx.expiresAt, ctx.volumeCurve, ctx.tokenMint, ctx.tokenDecimals, ctx.settlementSecurity, ctx.disputeWindowSlots, ctx.coSigner, ctx.arbiter)
      .accounts({
        depositor: ctx.depositor,
        agent: ctx.agent,
        agentStake: ctx.agentStake,
        agentStats: ctx.agentStats,
        pricingMenu: ctx.pricingMenu,
        escrow: ctx.escrow,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** deposit_escrow_v2 (3 accounts, 2 args) */
  async depositEscrowV2(ctx: { signer: Signer; depositor: PublicKey; escrow: PublicKey; escrowNonce: BN; amount: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.depositEscrowV2(ctx.escrowNonce, ctx.amount)
      .accounts({
        depositor: ctx.depositor,
        escrow: ctx.escrow,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** finalize_settlement (5 accounts, 0 args) */
  async finalizeSettlement(ctx: { signer: Signer; payer: PublicKey; agentWallet: PublicKey; escrow: PublicKey; pendingSettlement: PublicKey; agentStats: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.finalizeSettlement()
      .accounts({
        payer: ctx.payer,
        agentWallet: ctx.agentWallet,
        escrow: ctx.escrow,
        pendingSettlement: ctx.pendingSettlement,
        agentStats: ctx.agentStats,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** settle_calls_v2 (5 accounts, 3 args) */
  async settleCallsV2(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; agentStats: PublicKey; escrow: PublicKey; escrowNonce: BN; callsToSettle: BN; serviceHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.settleCallsV2(ctx.escrowNonce, ctx.callsToSettle, ctx.serviceHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        agentStats: ctx.agentStats,
        escrow: ctx.escrow,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** withdraw_escrow_v2 (2 accounts, 1 args) */
  async withdrawEscrowV2(ctx: { signer: Signer; depositor: PublicKey; escrow: PublicKey; amount: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.withdrawEscrowV2(ctx.amount)
      .accounts({
        depositor: ctx.depositor,
        escrow: ctx.escrow,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
