// ===============================================================
//  Indexing Module — IDL v0.3.0
//  15 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { TREASURY_WALLET } from '../constants/treasury';

function withTreasury(remainingAccounts: any[] = []): any[] {
  return remainingAccounts.some((account) => account.pubkey?.equals?.(TREASURY_WALLET))
    ? remainingAccounts
    : [{ pubkey: TREASURY_WALLET, isSigner: false, isWritable: true }, ...remainingAccounts];
}

export class IndexingModule {
  constructor(private program: Program) {}

  /** add_to_capability_index (3 accounts, 1 args) */
  async addToCapabilityIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; capabilityIndex: PublicKey; capabilityHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.addToCapabilityIndex(ctx.capabilityHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        capabilityIndex: ctx.capabilityIndex,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** add_to_index_page (3 accounts, 1 args) */
  async addToIndexPage(ctx: { signer: Signer; authority: PublicKey; global: PublicKey; indexPage: PublicKey; agentPda: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.addToIndexPage(ctx.agentPda)
      .accounts({
        authority: ctx.authority,
        global: ctx.global,
        indexPage: ctx.indexPage,
      })
      .remainingAccounts(withTreasury(ctx.remainingAccounts))
      .signers([ctx.signer])
      .instruction();
  }

  /** add_to_protocol_index (3 accounts, 1 args) */
  async addToProtocolIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; protocolIndex: PublicKey; protocolHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.addToProtocolIndex(ctx.protocolHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        protocolIndex: ctx.protocolIndex,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** add_to_tool_category (4 accounts, 1 args) */
  async addToToolCategory(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; tool: PublicKey; toolCategoryIndex: PublicKey; category: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.addToToolCategory(ctx.category)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        tool: ctx.tool,
        toolCategoryIndex: ctx.toolCategoryIndex,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_capability_index (4 accounts, 1 args) */
  async closeCapabilityIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; capabilityIndex: PublicKey; globalRegistry: PublicKey; capabilityHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeCapabilityIndex(ctx.capabilityHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        capabilityIndex: ctx.capabilityIndex,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_index_page (3 accounts, 0 args) */
  async closeIndexPage(ctx: { signer: Signer; authority: PublicKey; global: PublicKey; indexPage: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeIndexPage()
      .accounts({
        authority: ctx.authority,
        global: ctx.global,
        indexPage: ctx.indexPage,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** close_protocol_index (4 accounts, 1 args) */
  async closeProtocolIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; protocolIndex: PublicKey; globalRegistry: PublicKey; protocolHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeProtocolIndex(ctx.protocolHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        protocolIndex: ctx.protocolIndex,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_capability_index (5 accounts, 2 args) */
  async initCapabilityIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; capabilityIndex: PublicKey; globalRegistry: PublicKey; capabilityId: string; capabilityHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initCapabilityIndex(ctx.capabilityId, ctx.capabilityHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        capabilityIndex: ctx.capabilityIndex,
        globalRegistry: ctx.globalRegistry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_index_page (5 accounts, 1 args) */
  async initIndexPage(ctx: { signer: Signer; authority: PublicKey; global: PublicKey; parentIndex: PublicKey; indexPage: PublicKey; pageIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initIndexPage(ctx.pageIndex)
      .accounts({
        authority: ctx.authority,
        global: ctx.global,
        parentIndex: ctx.parentIndex,
        indexPage: ctx.indexPage,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_protocol_index (5 accounts, 2 args) */
  async initProtocolIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; protocolIndex: PublicKey; globalRegistry: PublicKey; protocolId: string; protocolHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initProtocolIndex(ctx.protocolId, ctx.protocolHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        protocolIndex: ctx.protocolIndex,
        globalRegistry: ctx.globalRegistry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** init_tool_category_index (4 accounts, 1 args) */
  async initToolCategoryIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; toolCategoryIndex: PublicKey; category: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initToolCategoryIndex(ctx.category)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        toolCategoryIndex: ctx.toolCategoryIndex,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** remove_from_capability_index (3 accounts, 1 args) */
  async removeFromCapabilityIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; capabilityIndex: PublicKey; capabilityHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.removeFromCapabilityIndex(ctx.capabilityHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        capabilityIndex: ctx.capabilityIndex,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** remove_from_index_page (3 accounts, 1 args) */
  async removeFromIndexPage(ctx: { signer: Signer; authority: PublicKey; global: PublicKey; indexPage: PublicKey; agentPda: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.removeFromIndexPage(ctx.agentPda)
      .accounts({
        authority: ctx.authority,
        global: ctx.global,
        indexPage: ctx.indexPage,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** remove_from_protocol_index (3 accounts, 1 args) */
  async removeFromProtocolIndex(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; protocolIndex: PublicKey; protocolHash: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.removeFromProtocolIndex(ctx.protocolHash)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        protocolIndex: ctx.protocolIndex,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** remove_from_tool_category (4 accounts, 1 args) */
  async removeFromToolCategory(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; tool: PublicKey; toolCategoryIndex: PublicKey; category: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.removeFromToolCategory(ctx.category)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        tool: ctx.tool,
        toolCategoryIndex: ctx.toolCategoryIndex,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
