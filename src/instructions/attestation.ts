// ===============================================================
//  Attestation Module — IDL v0.25.0
//  7 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class AttestationModule {
  constructor(private program: Program) {}

  /** close_attestation (4 accounts, 0 args) */
  async closeAttestation(ctx: { signer: Signer; attester: PublicKey; agent: PublicKey; attestation: PublicKey; globalRegistry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeAttestation()
      .accounts({
        attester: ctx.attester,
        agent: ctx.agent,
        attestation: ctx.attestation,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_feedback (4 accounts, 0 args) */
  async closeFeedback(ctx: { signer: Signer; reviewer: PublicKey; feedback: PublicKey; agent: PublicKey; globalRegistry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeFeedback()
      .accounts({
        reviewer: ctx.reviewer,
        feedback: ctx.feedback,
        agent: ctx.agent,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** create_attestation (5 accounts, 3 args) */
  async createAttestation(ctx: { signer: Signer; attester: PublicKey; agent: PublicKey; attestation: PublicKey; globalRegistry: PublicKey; attestationType: string; metadataHash: number[]; expiresAt: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.createAttestation(ctx.attestationType, ctx.metadataHash, ctx.expiresAt)
      .accounts({
        attester: ctx.attester,
        agent: ctx.agent,
        attestation: ctx.attestation,
        globalRegistry: ctx.globalRegistry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** give_feedback (5 accounts, 3 args) */
  async giveFeedback(ctx: { signer: Signer; reviewer: PublicKey; feedback: PublicKey; agent: PublicKey; globalRegistry: PublicKey; score: number; tag: string; commentHash: (number[] | null); remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.giveFeedback(ctx.score, ctx.tag, ctx.commentHash)
      .accounts({
        reviewer: ctx.reviewer,
        feedback: ctx.feedback,
        agent: ctx.agent,
        globalRegistry: ctx.globalRegistry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** revoke_attestation (3 accounts, 0 args) */
  async revokeAttestation(ctx: { signer: Signer; attester: PublicKey; agent: PublicKey; attestation: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.revokeAttestation()
      .accounts({
        attester: ctx.attester,
        agent: ctx.agent,
        attestation: ctx.attestation,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** revoke_feedback (3 accounts, 0 args) */
  async revokeFeedback(ctx: { signer: Signer; reviewer: PublicKey; feedback: PublicKey; agent: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.revokeFeedback()
      .accounts({
        reviewer: ctx.reviewer,
        feedback: ctx.feedback,
        agent: ctx.agent,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** update_feedback (3 accounts, 3 args) */
  async updateFeedback(ctx: { signer: Signer; reviewer: PublicKey; feedback: PublicKey; agent: PublicKey; newScore: number; newTag: (string | null); commentHash: (number[] | null); remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.updateFeedback(ctx.newScore, ctx.newTag, ctx.commentHash)
      .accounts({
        reviewer: ctx.reviewer,
        feedback: ctx.feedback,
        agent: ctx.agent,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
