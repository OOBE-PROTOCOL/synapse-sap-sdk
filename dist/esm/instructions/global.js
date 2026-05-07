// ===============================================================
//  Global Module — IDL v0.25.0
//  1 instruction
// ===============================================================
import { SystemProgram } from '@solana/web3.js';
export class GlobalModule {
    constructor(program) {
        this.program = program;
    }
    /** initialize_global (3 accounts, 0 args) */
    async initializeGlobal(ctx) {
        return this.program
            .methods.initializeGlobal()
            .accounts({
            authority: ctx.authority,
            globalRegistry: ctx.globalRegistry,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
//# sourceMappingURL=global.js.map