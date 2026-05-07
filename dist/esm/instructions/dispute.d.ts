import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
export declare class DisputeModule {
    private program;
    constructor(program: Program);
    /** auto_resolve_dispute (8 accounts, 0 args) */
    autoResolveDispute(ctx: {
        signer: Signer;
        payer: PublicKey;
        depositor: PublicKey;
        agentWallet: PublicKey;
        escrow: PublicKey;
        pendingSettlement: PublicKey;
        dispute: PublicKey;
        agentStats: PublicKey;
        agentStake: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_dispute (2 accounts, 0 args) */
    closeDispute(ctx: {
        signer: Signer;
        depositor: PublicKey;
        dispute: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_pending_settlement (2 accounts, 0 args) */
    closePendingSettlement(ctx: {
        signer: Signer;
        payer: PublicKey;
        pendingSettlement: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** create_pending_settlement (5 accounts, 5 args) */
    createPendingSettlement(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        escrow: PublicKey;
        pendingSettlement: PublicKey;
        settlementIndex: BN;
        callsToSettle: BN;
        amount: BN;
        serviceHash: number[];
        receiptMerkleRoot: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** file_dispute (5 accounts, 2 args) */
    fileDispute(ctx: {
        signer: Signer;
        depositor: PublicKey;
        escrow: PublicKey;
        pendingSettlement: PublicKey;
        dispute: PublicKey;
        evidenceHash: number[];
        disputeType: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** submit_agent_evidence (3 accounts, 1 args) */
    submitAgentEvidence(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        dispute: PublicKey;
        evidenceHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** submit_receipt_proof (6 accounts, 2 args) */
    submitReceiptProof(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        escrow: PublicKey;
        receiptBatch: PublicKey;
        pendingSettlement: PublicKey;
        dispute: PublicKey;
        receiptHashes: number[][];
        merkleProofs: number[][][];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=dispute.d.ts.map