import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
export declare class GlobalModule {
    private program;
    constructor(program: Program);
    /** initialize_global (3 accounts, 0 args) */
    initializeGlobal(ctx: {
        signer: Signer;
        authority: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=global.d.ts.map