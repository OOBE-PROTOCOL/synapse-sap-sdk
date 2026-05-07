"use strict";
// ===============================================================
//  Attestation Module — IDL v0.25.0
//  7 instructions
// ===============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttestationModule = void 0;
const web3_js_1 = require("@solana/web3.js");
class AttestationModule {
    constructor(program) {
        this.program = program;
    }
    /** close_attestation (4 accounts, 0 args) */
    async closeAttestation(ctx) {
        return this.program
            .methods.closeAttestation()
            .accounts({
            attester: ctx.attester,
            agent: ctx.agent,
            attestation: ctx.attestation,
            globalRegistry: ctx.globalRegistry,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** close_feedback (4 accounts, 0 args) */
    async closeFeedback(ctx) {
        return this.program
            .methods.closeFeedback()
            .accounts({
            reviewer: ctx.reviewer,
            feedback: ctx.feedback,
            agent: ctx.agent,
            globalRegistry: ctx.globalRegistry,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** create_attestation (5 accounts, 3 args) */
    async createAttestation(ctx) {
        return this.program
            .methods.createAttestation(ctx.attestationType, ctx.metadataHash, ctx.expiresAt)
            .accounts({
            attester: ctx.attester,
            agent: ctx.agent,
            attestation: ctx.attestation,
            globalRegistry: ctx.globalRegistry,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** give_feedback (5 accounts, 3 args) */
    async giveFeedback(ctx) {
        return this.program
            .methods.giveFeedback(ctx.score, ctx.tag, ctx.commentHash)
            .accounts({
            reviewer: ctx.reviewer,
            feedback: ctx.feedback,
            agent: ctx.agent,
            globalRegistry: ctx.globalRegistry,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** revoke_attestation (3 accounts, 0 args) */
    async revokeAttestation(ctx) {
        return this.program
            .methods.revokeAttestation()
            .accounts({
            attester: ctx.attester,
            agent: ctx.agent,
            attestation: ctx.attestation,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** revoke_feedback (3 accounts, 0 args) */
    async revokeFeedback(ctx) {
        return this.program
            .methods.revokeFeedback()
            .accounts({
            reviewer: ctx.reviewer,
            feedback: ctx.feedback,
            agent: ctx.agent,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** update_feedback (3 accounts, 3 args) */
    async updateFeedback(ctx) {
        return this.program
            .methods.updateFeedback(ctx.newScore, ctx.newTag, ctx.commentHash)
            .accounts({
            reviewer: ctx.reviewer,
            feedback: ctx.feedback,
            agent: ctx.agent,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
exports.AttestationModule = AttestationModule;
//# sourceMappingURL=attestation.js.map