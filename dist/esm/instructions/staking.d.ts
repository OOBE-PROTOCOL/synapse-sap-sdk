import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
export declare class StakingModule {
    private program;
    constructor(program: Program);
    /** close_ledger (5 accounts, 0 args) */
    closeLedger(ctx: {
        signer: Signer;
        wallet: PublicKey;
        session: PublicKey;
        vault: PublicKey;
        agent: PublicKey;
        ledger: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** complete_unstake (3 accounts, 0 args) */
    completeUnstake(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        stake: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** deposit_stake (4 accounts, 1 args) */
    depositStake(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        stake: PublicKey;
        amount: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_ledger (6 accounts, 0 args) */
    initLedger(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        ledger: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_stake (4 accounts, 1 args) */
    initStake(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        stake: PublicKey;
        initialDeposit: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** request_unstake (3 accounts, 1 args) */
    requestUnstake(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        stake: PublicKey;
        amount: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** seal_ledger (7 accounts, 0 args) */
    sealLedger(ctx: {
        signer: Signer;
        wallet: PublicKey;
        session: PublicKey;
        vault: PublicKey;
        agent: PublicKey;
        ledger: PublicKey;
        page: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** write_ledger (5 accounts, 2 args) */
    writeLedger(ctx: {
        signer: Signer;
        wallet: PublicKey;
        session: PublicKey;
        vault: PublicKey;
        agent: PublicKey;
        ledger: PublicKey;
        data: Buffer;
        contentHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=staking.d.ts.map