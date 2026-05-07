// ===============================================================
//  Digest Module — IDL v0.25.0
//  1 instruction
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class DigestModule {
  constructor(private program: Program) {}

  /** compact_inscribe (4 accounts, 4 args) */
  async compactInscribe(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; sequence: number; encryptedData: Buffer; nonce: number[]; contentHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.compactInscribe(ctx.sequence, ctx.encryptedData, ctx.nonce, ctx.contentHash)
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

}
