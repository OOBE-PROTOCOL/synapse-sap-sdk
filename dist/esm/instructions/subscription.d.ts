import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
export declare class SubscriptionModule {
    private program;
    constructor(program: Program);
    /** cancel_subscription (3 accounts, 0 args) */
    cancelSubscription(ctx: {
        signer: Signer;
        subscriber: PublicKey;
        agentWallet: PublicKey;
        subscription: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** claim_interval (3 accounts, 0 args) */
    claimInterval(ctx: {
        signer: Signer;
        payer: PublicKey;
        agentWallet: PublicKey;
        subscription: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_subscription (2 accounts, 0 args) */
    closeSubscription(ctx: {
        signer: Signer;
        subscriber: PublicKey;
        subscription: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** create_subscription (4 accounts, 4 args) */
    createSubscription(ctx: {
        signer: Signer;
        subscriber: PublicKey;
        agent: PublicKey;
        subscription: PublicKey;
        subId: BN;
        pricePerInterval: BN;
        billingInterval: number;
        initialDeposit: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** fund_subscription (3 accounts, 1 args) */
    fundSubscription(ctx: {
        signer: Signer;
        subscriber: PublicKey;
        subscription: PublicKey;
        amount: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=subscription.d.ts.map