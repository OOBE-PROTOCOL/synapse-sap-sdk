import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { VolumeCurveBreakpoint } from '../idlTypes';
export declare class EscrowModule {
    private program;
    constructor(program: Program);
    /** close_escrow_v2 (3 accounts, 0 args) */
    closeEscrowV2(ctx: {
        signer: Signer;
        depositor: PublicKey;
        escrow: PublicKey;
        agentStats: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** create_escrow_v2 (7 accounts, 12 args) */
    createEscrowV2(ctx: {
        signer: Signer;
        depositor: PublicKey;
        agent: PublicKey;
        agentStake: PublicKey;
        agentStats: PublicKey;
        pricingMenu: PublicKey;
        escrow: PublicKey;
        escrowNonce: BN;
        pricePerCall: BN;
        maxCalls: BN;
        initialDeposit: BN;
        expiresAt: BN;
        volumeCurve: VolumeCurveBreakpoint[];
        tokenMint: (PublicKey | null);
        tokenDecimals: number;
        settlementSecurity: number;
        disputeWindowSlots: BN;
        coSigner: (PublicKey | null);
        arbiter: (PublicKey | null);
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** deposit_escrow_v2 (3 accounts, 2 args) */
    depositEscrowV2(ctx: {
        signer: Signer;
        depositor: PublicKey;
        escrow: PublicKey;
        escrowNonce: BN;
        amount: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** finalize_settlement (5 accounts, 0 args) */
    finalizeSettlement(ctx: {
        signer: Signer;
        payer: PublicKey;
        agentWallet: PublicKey;
        escrow: PublicKey;
        pendingSettlement: PublicKey;
        agentStats: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** settle_calls_v2 (6 accounts, 3 args) */
    settleCallsV2(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        agentStats: PublicKey;
        escrow: PublicKey;
        settlementReceipt: PublicKey;
        escrowNonce: BN;
        callsToSettle: BN;
        serviceHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** withdraw_escrow_v2 (2 accounts, 1 args) */
    withdrawEscrowV2(ctx: {
        signer: Signer;
        depositor: PublicKey;
        escrow: PublicKey;
        amount: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=escrow.d.ts.map