// ===============================================================
//  Session Module — IDL v0.25.0
//  5 instructions
// ===============================================================
import { SystemProgram } from '@solana/web3.js';
export class SessionModule {
    constructor(program) {
        this.program = program;
    }
    /** close_checkpoint (5 accounts, 1 args) */
    async closeCheckpoint(ctx) {
        return this.program
            .methods.closeCheckpoint(ctx.checkpointIndex)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            session: ctx.session,
            checkpoint: ctx.checkpoint,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** close_session (4 accounts, 0 args) */
    async closeSession(ctx) {
        return this.program
            .methods.closeSession()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            session: ctx.session,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** close_session_pda (4 accounts, 0 args) */
    async closeSessionPda(ctx) {
        return this.program
            .methods.closeSessionPda()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            session: ctx.session,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** create_session_checkpoint (6 accounts, 1 args) */
    async createSessionCheckpoint(ctx) {
        return this.program
            .methods.createSessionCheckpoint(ctx.checkpointIndex)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            session: ctx.session,
            checkpoint: ctx.checkpoint,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** open_session (5 accounts, 1 args) */
    async openSession(ctx) {
        return this.program
            .methods.openSession(ctx.sessionHash)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            session: ctx.session,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
//# sourceMappingURL=session.js.map