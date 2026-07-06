// ===============================================================
//  Global Module — IDL v1.0.0
//  1 instruction
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class GlobalModule {
  constructor(private program: Program) {}

  /** initialize_global (3 accounts, 0 args) */
  async initializeGlobal(ctx: { signer: Signer; authority: PublicKey; globalRegistry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initializeGlobal()
      .accounts({
        authority: ctx.authority,
        globalRegistry: ctx.globalRegistry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
