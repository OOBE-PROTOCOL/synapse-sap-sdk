// ===============================================================
//  Misc Module — IDL v0.25.0
//  4 instructions
// ===============================================================
import { SystemProgram } from '@solana/web3.js';
export class MiscModule {
    constructor(program) {
        this.program = program;
    }
    /** close_epoch_page (5 accounts, 1 args) */
    async closeEpochPage(ctx) {
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
    async closeVault(ctx) {
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
    async initShard(ctx) {
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
    async inscribeReceiptBatch(ctx) {
        return this.program
            .methods.inscribeReceiptBatch(ctx.batchIndex, ctx.merkleRoot, ctx.callCount, ctx.periodStart, ctx.periodEnd)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            escrow: ctx.escrow,
            receiptBatch: ctx.receiptBatch,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
//# sourceMappingURL=misc.js.map