"use strict";
// ===============================================================
//  Escrow Module — IDL v0.25.0
//  6 instructions
// ===============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowModule = void 0;
const web3_js_1 = require("@solana/web3.js");
class EscrowModule {
    constructor(program) {
        this.program = program;
    }
    /** close_escrow_v2 (3 accounts, 0 args) */
    async closeEscrowV2(ctx) {
        return this.program
            .methods.closeEscrowV2()
            .accounts({
            depositor: ctx.depositor,
            escrow: ctx.escrow,
            agentStats: ctx.agentStats,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** create_escrow_v2 (7 accounts, 12 args) */
    async createEscrowV2(ctx) {
        return this.program
            .methods.createEscrowV2(ctx.escrowNonce, ctx.pricePerCall, ctx.maxCalls, ctx.initialDeposit, ctx.expiresAt, ctx.volumeCurve, ctx.tokenMint, ctx.tokenDecimals, ctx.settlementSecurity, ctx.disputeWindowSlots, ctx.coSigner, ctx.arbiter)
            .accounts({
            depositor: ctx.depositor,
            agent: ctx.agent,
            agentStake: ctx.agentStake,
            agentStats: ctx.agentStats,
            pricingMenu: ctx.pricingMenu,
            escrow: ctx.escrow,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** deposit_escrow_v2 (3 accounts, 2 args) */
    async depositEscrowV2(ctx) {
        return this.program
            .methods.depositEscrowV2(ctx.escrowNonce, ctx.amount)
            .accounts({
            depositor: ctx.depositor,
            escrow: ctx.escrow,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** finalize_settlement (5 accounts, 0 args) */
    async finalizeSettlement(ctx) {
        return this.program
            .methods.finalizeSettlement()
            .accounts({
            payer: ctx.payer,
            agentWallet: ctx.agentWallet,
            escrow: ctx.escrow,
            pendingSettlement: ctx.pendingSettlement,
            agentStats: ctx.agentStats,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** settle_calls_v2 (6 accounts, 3 args) */
    async settleCallsV2(ctx) {
        return this.program
            .methods.settleCallsV2(ctx.escrowNonce, ctx.callsToSettle, ctx.serviceHash)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            agentStats: ctx.agentStats,
            escrow: ctx.escrow,
            settlementReceipt: ctx.settlementReceipt,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** withdraw_escrow_v2 (2 accounts, 1 args) */
    async withdrawEscrowV2(ctx) {
        return this.program
            .methods.withdrawEscrowV2(ctx.amount)
            .accounts({
            depositor: ctx.depositor,
            escrow: ctx.escrow,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
exports.EscrowModule = EscrowModule;
//# sourceMappingURL=escrow.js.map