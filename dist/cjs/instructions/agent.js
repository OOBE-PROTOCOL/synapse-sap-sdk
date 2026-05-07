"use strict";
// ===============================================================
//  Agent Module — IDL v0.25.0
//  5 instructions
// ===============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentModule = void 0;
const web3_js_1 = require("@solana/web3.js");
class AgentModule {
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
            systemProgram: web3_js_1.SystemProgram.programId,
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
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
exports.AgentModule = AgentModule;
//# sourceMappingURL=agent.js.map