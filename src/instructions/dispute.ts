// ===============================================================
//  Dispute Module — IDL v1.0.0
//  6 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class DisputeModule {
  constructor(private program: Program) {}

  /** resolve_dispute (7 accounts, 1 arg) */
  async resolveDispute(ctx: { signer: Signer; arbiter: PublicKey; depositor: PublicKey; agentWallet: PublicKey; escrow: PublicKey; pendingSettlement: PublicKey; dispute: PublicKey; agentStats: PublicKey; outcome: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.resolveDispute(ctx.outcome)
      .accounts({
        arbiter: ctx.arbiter,
        depositor: ctx.depositor,
        agentWallet: ctx.agentWallet,
        escrow: ctx.escrow,
        pendingSettlement: ctx.pendingSettlement,
        dispute: ctx.dispute,
        agentStats: ctx.agentStats,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_dispute (2 accounts, 0 args) */
  async closeDispute(ctx: { signer: Signer; depositor: PublicKey; dispute: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeDispute()
      .accounts({
        depositor: ctx.depositor,
        dispute: ctx.dispute,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_pending_settlement (2 accounts, 0 args) */
  async closePendingSettlement(ctx: { signer: Signer; payer: PublicKey; pendingSettlement: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closePendingSettlement()
      .accounts({
        payer: ctx.payer,
        pendingSettlement: ctx.pendingSettlement,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** create_pending_settlement (5 accounts, 4 args) */
  async createPendingSettlement(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; escrow: PublicKey; pendingSettlement: PublicKey; settlementIndex: BN; callsToSettle: BN; amount: BN; serviceHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    void ctx;
    throw new Error("createPendingSettlement is deprecated in SAP 1.0.0; pass the pending PDA to settleCallsV2 remainingAccounts.");
  }

  /** file_dispute (5 accounts, 2 args) */
  async fileDispute(ctx: { signer: Signer; depositor: PublicKey; escrow: PublicKey; pendingSettlement: PublicKey; dispute: PublicKey; evidenceHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.fileDispute(ctx.evidenceHash)
      .accounts({
        depositor: ctx.depositor,
        escrow: ctx.escrow,
        pendingSettlement: ctx.pendingSettlement,
        dispute: ctx.dispute,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** submit_agent_evidence (3 accounts, 1 args) */
  async submitAgentEvidence(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; dispute: PublicKey; evidenceHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.submitAgentEvidence(ctx.evidenceHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        dispute: ctx.dispute,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
