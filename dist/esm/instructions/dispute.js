// ===============================================================
//  Dispute Module — IDL v0.25.0
//  7 instructions
// ===============================================================
import { SystemProgram } from '@solana/web3.js';
export class DisputeModule {
    constructor(program) {
        this.program = program;
    }
    /** auto_resolve_dispute (8 accounts, 0 args) */
    async autoResolveDispute(ctx) {
        return this.program
            .methods.autoResolveDispute()
            .accounts({
            payer: ctx.payer,
            depositor: ctx.depositor,
            agentWallet: ctx.agentWallet,
            escrow: ctx.escrow,
            pendingSettlement: ctx.pendingSettlement,
            dispute: ctx.dispute,
            agentStats: ctx.agentStats,
            agentStake: ctx.agentStake,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** close_dispute (2 accounts, 0 args) */
    async closeDispute(ctx) {
        return this.program
            .methods.closeDispute()
            .accounts({
            depositor: ctx.depositor,
            dispute: ctx.dispute,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** close_pending_settlement (2 accounts, 0 args) */
    async closePendingSettlement(ctx) {
        return this.program
            .methods.closePendingSettlement()
            .accounts({
            payer: ctx.payer,
            pendingSettlement: ctx.pendingSettlement,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** create_pending_settlement (5 accounts, 5 args) */
    async createPendingSettlement(ctx) {
        return this.program
            .methods.createPendingSettlement(ctx.settlementIndex, ctx.callsToSettle, ctx.amount, ctx.serviceHash, ctx.receiptMerkleRoot)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            escrow: ctx.escrow,
            pendingSettlement: ctx.pendingSettlement,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** file_dispute (5 accounts, 2 args) */
    async fileDispute(ctx) {
        return this.program
            .methods.fileDispute(ctx.evidenceHash, ctx.disputeType)
            .accounts({
            depositor: ctx.depositor,
            escrow: ctx.escrow,
            pendingSettlement: ctx.pendingSettlement,
            dispute: ctx.dispute,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** submit_agent_evidence (3 accounts, 1 args) */
    async submitAgentEvidence(ctx) {
        return this.program
            .methods.submitAgentEvidence(ctx.evidenceHash)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            dispute: ctx.dispute,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** submit_receipt_proof (6 accounts, 2 args) */
    async submitReceiptProof(ctx) {
        return this.program
            .methods.submitReceiptProof(ctx.receiptHashes, ctx.merkleProofs)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            escrow: ctx.escrow,
            receiptBatch: ctx.receiptBatch,
            pendingSettlement: ctx.pendingSettlement,
            dispute: ctx.dispute,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
//# sourceMappingURL=dispute.js.map