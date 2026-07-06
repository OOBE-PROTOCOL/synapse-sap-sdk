// ===============================================================
//  Staking Module — IDL v1.0.0
//  8 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class StakingModule {
  constructor(private program: Program) {}

  /** close_stake (3 accounts, 0 args) */
  async closeStake(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; stake: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeStake()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        stake: ctx.stake,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_ledger (5 accounts, 0 args) */
  async closeLedger(ctx: { signer: Signer; wallet: PublicKey; session: PublicKey; vault: PublicKey; agent: PublicKey; ledger: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeLedger()
      .accounts({
        wallet: ctx.wallet,
        session: ctx.session,
        vault: ctx.vault,
        agent: ctx.agent,
        ledger: ctx.ledger,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** complete_unstake (3 accounts, 0 args) */
  async completeUnstake(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; stake: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.completeUnstake()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        stake: ctx.stake,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** deposit_stake (4 accounts, 1 args) */
  async depositStake(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; stake: PublicKey; amount: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.depositStake(ctx.amount)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        stake: ctx.stake,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_ledger (6 accounts, 0 args) */
  async initLedger(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; ledger: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initLedger()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        ledger: ctx.ledger,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_stake (4 accounts, 1 args) */
  async initStake(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; stake: PublicKey; initialDeposit: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initStake(ctx.initialDeposit)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        stake: ctx.stake,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** request_unstake (3 accounts, 1 args) */
  async requestUnstake(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; stake: PublicKey; amount: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.requestUnstake(ctx.amount)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        stake: ctx.stake,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** seal_ledger (7 accounts, 0 args) */
  async sealLedger(ctx: { signer: Signer; wallet: PublicKey; session: PublicKey; vault: PublicKey; agent: PublicKey; ledger: PublicKey; page: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.sealLedger()
      .accounts({
        wallet: ctx.wallet,
        session: ctx.session,
        vault: ctx.vault,
        agent: ctx.agent,
        ledger: ctx.ledger,
        page: ctx.page,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** write_ledger (5 accounts, 2 args) */
  async writeLedger(ctx: { signer: Signer; wallet: PublicKey; session: PublicKey; vault: PublicKey; agent: PublicKey; ledger: PublicKey; data: Buffer; contentHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.writeLedger(ctx.data, ctx.contentHash)
      .accounts({
        wallet: ctx.wallet,
        session: ctx.session,
        vault: ctx.vault,
        agent: ctx.agent,
        ledger: ctx.ledger,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
