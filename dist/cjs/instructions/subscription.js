"use strict";
// ===============================================================
//  Subscription Module — IDL v0.25.0
//  5 instructions
// ===============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionModule = void 0;
const web3_js_1 = require("@solana/web3.js");
class SubscriptionModule {
    constructor(program) {
        this.program = program;
    }
    /** cancel_subscription (3 accounts, 0 args) */
    async cancelSubscription(ctx) {
        return this.program
            .methods.cancelSubscription()
            .accounts({
            subscriber: ctx.subscriber,
            agentWallet: ctx.agentWallet,
            subscription: ctx.subscription,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** claim_interval (3 accounts, 0 args) */
    async claimInterval(ctx) {
        return this.program
            .methods.claimInterval()
            .accounts({
            payer: ctx.payer,
            agentWallet: ctx.agentWallet,
            subscription: ctx.subscription,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** close_subscription (2 accounts, 0 args) */
    async closeSubscription(ctx) {
        return this.program
            .methods.closeSubscription()
            .accounts({
            subscriber: ctx.subscriber,
            subscription: ctx.subscription,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** create_subscription (4 accounts, 4 args) */
    async createSubscription(ctx) {
        return this.program
            .methods.createSubscription(ctx.subId, ctx.pricePerInterval, ctx.billingInterval, ctx.initialDeposit)
            .accounts({
            subscriber: ctx.subscriber,
            agent: ctx.agent,
            subscription: ctx.subscription,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** fund_subscription (3 accounts, 1 args) */
    async fundSubscription(ctx) {
        return this.program
            .methods.fundSubscription(ctx.amount)
            .accounts({
            subscriber: ctx.subscriber,
            subscription: ctx.subscription,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
exports.SubscriptionModule = SubscriptionModule;
//# sourceMappingURL=subscription.js.map