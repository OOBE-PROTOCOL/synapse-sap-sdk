import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
export declare class AttestationModule {
    private program;
    constructor(program: Program);
    /** close_attestation (4 accounts, 0 args) */
    closeAttestation(ctx: {
        signer: Signer;
        attester: PublicKey;
        agent: PublicKey;
        attestation: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_feedback (4 accounts, 0 args) */
    closeFeedback(ctx: {
        signer: Signer;
        reviewer: PublicKey;
        feedback: PublicKey;
        agent: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** create_attestation (5 accounts, 3 args) */
    createAttestation(ctx: {
        signer: Signer;
        attester: PublicKey;
        agent: PublicKey;
        attestation: PublicKey;
        globalRegistry: PublicKey;
        attestationType: string;
        metadataHash: number[];
        expiresAt: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** give_feedback (5 accounts, 3 args) */
    giveFeedback(ctx: {
        signer: Signer;
        reviewer: PublicKey;
        feedback: PublicKey;
        agent: PublicKey;
        globalRegistry: PublicKey;
        score: number;
        tag: string;
        commentHash: (number[] | null);
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** revoke_attestation (3 accounts, 0 args) */
    revokeAttestation(ctx: {
        signer: Signer;
        attester: PublicKey;
        agent: PublicKey;
        attestation: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** revoke_feedback (3 accounts, 0 args) */
    revokeFeedback(ctx: {
        signer: Signer;
        reviewer: PublicKey;
        feedback: PublicKey;
        agent: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** update_feedback (3 accounts, 3 args) */
    updateFeedback(ctx: {
        signer: Signer;
        reviewer: PublicKey;
        feedback: PublicKey;
        agent: PublicKey;
        newScore: number;
        newTag: (string | null);
        commentHash: (number[] | null);
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=attestation.d.ts.map