import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
export declare class SessionModule {
    private program;
    constructor(program: Program);
    /** close_checkpoint (5 accounts, 1 args) */
    closeCheckpoint(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        checkpoint: PublicKey;
        checkpointIndex: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_session (4 accounts, 0 args) */
    closeSession(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_session_pda (4 accounts, 0 args) */
    closeSessionPda(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** create_session_checkpoint (6 accounts, 1 args) */
    createSessionCheckpoint(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        checkpoint: PublicKey;
        checkpointIndex: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** open_session (5 accounts, 1 args) */
    openSession(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        sessionHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=session.d.ts.map