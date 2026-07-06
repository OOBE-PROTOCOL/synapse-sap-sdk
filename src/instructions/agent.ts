// ===============================================================
//  Agent Module — IDL v1.0.0
//  5 instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { Capability, PricingTier } from '../idlTypes';
import { TREASURY_WALLET } from '../constants/treasury';

function withTreasury(remainingAccounts: any[] = []): any[] {
  return remainingAccounts.some((account) => account.pubkey?.equals?.(TREASURY_WALLET))
    ? remainingAccounts
    : [{ pubkey: TREASURY_WALLET, isSigner: false, isWritable: true }, ...remainingAccounts];
}

export class AgentModule {
  constructor(private program: Program) {}

  /** close_agent (7 accounts, 0 args) */
  async closeAgent(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; agentStats: PublicKey; vaultCheck: PublicKey; pricingMenu: PublicKey; stake: PublicKey; globalRegistry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeAgent()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        agentStats: ctx.agentStats,
        vaultCheck: ctx.vaultCheck,
        pricingMenu: ctx.pricingMenu,
        stake: ctx.stake,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(withTreasury(ctx.remainingAccounts))
      .signers([ctx.signer])
      .instruction();
  }

  /** deactivate_agent (4 accounts, 0 args) */
  async deactivateAgent(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; agentStats: PublicKey; globalRegistry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.deactivateAgent()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        agentStats: ctx.agentStats,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** reactivate_agent (4 accounts, 0 args) */
  async reactivateAgent(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; agentStats: PublicKey; globalRegistry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.reactivateAgent()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        agentStats: ctx.agentStats,
        globalRegistry: ctx.globalRegistry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /** register_agent (5 accounts, 8 args) */
  async registerAgent(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; agentStats: PublicKey; globalRegistry: PublicKey; name: string; description: string; capabilities: Capability[]; pricing: PricingTier[]; protocols: string[]; agentId: (string | null); agentUri: (string | null); x402Endpoint: (string | null); remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.registerAgent(ctx.name, ctx.description, ctx.capabilities, ctx.pricing, ctx.protocols, ctx.agentId, ctx.agentUri, ctx.x402Endpoint)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        agentStats: ctx.agentStats,
        globalRegistry: ctx.globalRegistry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(withTreasury(ctx.remainingAccounts))
      .signers([ctx.signer])
      .instruction();
  }

  /** update_agent (3 accounts, 8 args) */
  async updateAgent(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; name: (string | null); description: (string | null); capabilities: (Capability[] | null); pricing: (PricingTier[] | null); protocols: (string[] | null); agentId: (string | null); agentUri: (string | null); x402Endpoint: (string | null); remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.updateAgent(ctx.name, ctx.description, ctx.capabilities, ctx.pricing, ctx.protocols, ctx.agentId, ctx.agentUri, ctx.x402Endpoint)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
