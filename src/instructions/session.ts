// ===============================================================
//  Session Module — IDL v0.3.0
//  5 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class SessionModule {
  constructor(private program: Program) {}

  /** close_checkpoint (5 accounts, 1 args) */
  async closeCheckpoint(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; checkpoint: PublicKey; checkpointIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeCheckpoint(ctx.checkpointIndex)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        checkpoint: ctx.checkpoint,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_session (4 accounts, 0 args) */
  async closeSession(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeSession()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_session_pda (4 accounts, 0 args) */
  async closeSessionPda(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeSessionPda()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** create_session_checkpoint (6 accounts, 1 args) */
  async createSessionCheckpoint(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; checkpoint: PublicKey; checkpointIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.createSessionCheckpoint(ctx.checkpointIndex)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        checkpoint: ctx.checkpoint,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** open_session (5 accounts, 1 args) */
  async openSession(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; sessionHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.openSession(ctx.sessionHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
