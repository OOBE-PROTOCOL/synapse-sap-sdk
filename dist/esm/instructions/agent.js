// ===============================================================
//  Agent Module — IDL v0.25.0
//  5 instructions
// ===============================================================
import { SystemProgram } from '@solana/web3.js';
export class AgentModule {
    constructor(program) {
        this.program = program;
    }
    /** close_agent (6 accounts, 0 args) */
    async closeAgent(ctx) {
        return this.program
            .methods.closeAgent()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            agentStats: ctx.agentStats,
            vaultCheck: ctx.vaultCheck,
            pricingMenu: ctx.pricingMenu,
            globalRegistry: ctx.globalRegistry,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** deactivate_agent (4 accounts, 0 args) */
    async deactivateAgent(ctx) {
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
    async reactivateAgent(ctx) {
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
    /** register_agent (6 accounts, 8 args) */
    async registerAgent(ctx) {
        return this.program
            .methods.registerAgent(ctx.name, ctx.description, ctx.capabilities, ctx.pricing, ctx.protocols, ctx.agentId, ctx.agentUri, ctx.x402Endpoint)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            agentStats: ctx.agentStats,
            pricingMenu: ctx.pricingMenu,
            globalRegistry: ctx.globalRegistry,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** update_agent (4 accounts, 8 args) */
    async updateAgent(ctx) {
        return this.program
            .methods.updateAgent(ctx.name, ctx.description, ctx.capabilities, ctx.pricing, ctx.protocols, ctx.agentId, ctx.agentUri, ctx.x402Endpoint)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            pricingMenu: ctx.pricingMenu,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
//# sourceMappingURL=agent.js.map