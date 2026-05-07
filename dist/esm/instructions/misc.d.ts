import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
export declare class MiscModule {
    private program;
    constructor(program: Program);
    /** close_epoch_page (5 accounts, 1 args) */
    closeEpochPage(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        epochPage: PublicKey;
        epochIndex: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_vault (4 accounts, 0 args) */
    closeVault(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_shard (4 accounts, 1 args) */
    initShard(ctx: {
        signer: Signer;
        authority: PublicKey;
        global: PublicKey;
        shard: PublicKey;
        shardIndex: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** inscribe_receipt_batch (5 accounts, 5 args) */
    inscribeReceiptBatch(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        escrow: PublicKey;
        receiptBatch: PublicKey;
        batchIndex: number;
        merkleRoot: number[];
        callCount: number;
        periodStart: BN;
        periodEnd: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=misc.d.ts.map