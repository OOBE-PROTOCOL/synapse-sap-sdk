// ===============================================================
//  Misc Module — IDL v0.3.0
//  4 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class MiscModule {
  constructor(private program: Program) {}

  /** close_epoch_page (5 accounts, 1 args) */
  async closeEpochPage(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; epochPage: PublicKey; epochIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeEpochPage(ctx.epochIndex)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        epochPage: ctx.epochPage,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_vault (4 accounts, 0 args) */
  async closeVault(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; globalRegistry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeVault()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_shard (4 accounts, 1 args) */
  async initShard(ctx: { signer: Signer; authority: PublicKey; global: PublicKey; shard: PublicKey; shardIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initShard(ctx.shardIndex)
      .accounts({
        authority: ctx.authority,
        global: ctx.global,
        shard: ctx.shard,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** inscribe_receipt_batch (5 accounts, 5 args) */
  async inscribeReceiptBatch(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; escrow: PublicKey; receiptBatch: PublicKey; batchIndex: number; merkleRoot: number[]; callCount: number; periodStart: BN; periodEnd: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    void ctx;
    throw new Error("inscribeReceiptBatch is not exposed by the SAP 0.3.0 IDL.");
  }

}
