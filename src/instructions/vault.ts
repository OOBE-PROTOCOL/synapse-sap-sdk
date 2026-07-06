// ===============================================================
//  Vault Module — IDL v0.3.0
//  6 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

export class VaultModule {
  constructor(private program: Program) {}

  /** add_vault_delegate (6 accounts, 2 args) */
  async addVaultDelegate(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; vaultDelegate: PublicKey; delegate: PublicKey; permissions: number; expiresAt: BN; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.addVaultDelegate(ctx.permissions, ctx.expiresAt)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        vaultDelegate: ctx.vaultDelegate,
        delegate: ctx.delegate,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_vault (5 accounts, 1 args) */
  async initVault(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; globalRegistry: PublicKey; vaultNonce: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initVault(ctx.vaultNonce)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        globalRegistry: ctx.globalRegistry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** inscribe_memory (6 accounts, 8 args) */
  async inscribeMemory(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; epochPage: PublicKey; sequence: number; encryptedData: Buffer; nonce: number[]; contentHash: number[]; totalFragments: number; fragmentIndex: number; compression: number; epochIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.inscribeMemory(ctx.sequence, ctx.encryptedData, ctx.nonce, ctx.contentHash, ctx.totalFragments, ctx.fragmentIndex, ctx.compression, ctx.epochIndex)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        epochPage: ctx.epochPage,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** inscribe_memory_delegated (7 accounts, 8 args) */
  async inscribeMemoryDelegated(ctx: { signer: Signer; delegateSigner: PublicKey; agent: PublicKey; vault: PublicKey; vaultDelegate: PublicKey; session: PublicKey; epochPage: PublicKey; sequence: number; encryptedData: Buffer; nonce: number[]; contentHash: number[]; totalFragments: number; fragmentIndex: number; compression: number; epochIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.inscribeMemoryDelegated(ctx.sequence, ctx.encryptedData, ctx.nonce, ctx.contentHash, ctx.totalFragments, ctx.fragmentIndex, ctx.compression, ctx.epochIndex)
      .accounts({
        delegateSigner: ctx.delegateSigner,
        agent: ctx.agent,
        vault: ctx.vault,
        vaultDelegate: ctx.vaultDelegate,
        session: ctx.session,
        epochPage: ctx.epochPage,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** revoke_vault_delegate (4 accounts, 0 args) */
  async revokeVaultDelegate(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; vaultDelegate: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.revokeVaultDelegate()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        vaultDelegate: ctx.vaultDelegate,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** rotate_vault_nonce (3 accounts, 1 args) */
  async rotateVaultNonce(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; newNonce: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.rotateVaultNonce(ctx.newNonce)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
