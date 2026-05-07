import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
export declare class DigestModule {
    private program;
    constructor(program: Program);
    /** compact_inscribe (4 accounts, 4 args) */
    compactInscribe(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        sequence: number;
        encryptedData: Buffer;
        nonce: number[];
        contentHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=digest.d.ts.map