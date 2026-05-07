"use strict";
// ===============================================================
//  Global Module — IDL v0.25.0
//  1 instruction
// ===============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalModule = void 0;
const web3_js_1 = require("@solana/web3.js");
class GlobalModule {
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
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
exports.GlobalModule = GlobalModule;
//# sourceMappingURL=global.js.map