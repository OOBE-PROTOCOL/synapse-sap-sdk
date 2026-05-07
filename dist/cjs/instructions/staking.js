"use strict";
// ===============================================================
//  Staking Module — IDL v0.25.0
//  8 instructions
// ===============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingModule = void 0;
const web3_js_1 = require("@solana/web3.js");
class StakingModule {
    constructor(program) {
        this.program = program;
    }
    /** close_ledger (5 accounts, 0 args) */
    async closeLedger(ctx) {
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
    async completeUnstake(ctx) {
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
    async depositStake(ctx) {
        return this.program
            .methods.depositStake(ctx.amount)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            stake: ctx.stake,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** init_ledger (6 accounts, 0 args) */
    async initLedger(ctx) {
        return this.program
            .methods.initLedger()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            session: ctx.session,
            ledger: ctx.ledger,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** init_stake (4 accounts, 1 args) */
    async initStake(ctx) {
        return this.program
            .methods.initStake(ctx.initialDeposit)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            stake: ctx.stake,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** request_unstake (3 accounts, 1 args) */
    async requestUnstake(ctx) {
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
    async sealLedger(ctx) {
        return this.program
            .methods.sealLedger()
            .accounts({
            wallet: ctx.wallet,
            session: ctx.session,
            vault: ctx.vault,
            agent: ctx.agent,
            ledger: ctx.ledger,
            page: ctx.page,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** write_ledger (5 accounts, 2 args) */
    async writeLedger(ctx) {
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
exports.StakingModule = StakingModule;
//# sourceMappingURL=staking.js.map