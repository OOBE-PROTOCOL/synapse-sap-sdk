"use strict";
// ===============================================================
//  Digest Module — IDL v0.25.0
//  1 instruction
// ===============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestModule = void 0;
class DigestModule {
    constructor(program) {
        this.program = program;
    }
    /** compact_inscribe (4 accounts, 4 args) */
    async compactInscribe(ctx) {
        return this.program
            .methods.compactInscribe(ctx.sequence, ctx.encryptedData, ctx.nonce, ctx.contentHash)
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
}
exports.DigestModule = DigestModule;
//# sourceMappingURL=digest.js.map