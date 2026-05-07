import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { Capability, PricingTier } from '../idlTypes';
export declare class AgentModule {
    private program;
    constructor(program: Program);
    /** close_agent (6 accounts, 0 args) */
    closeAgent(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        agentStats: PublicKey;
        vaultCheck: PublicKey;
        pricingMenu: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** deactivate_agent (4 accounts, 0 args) */
    deactivateAgent(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        agentStats: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** reactivate_agent (4 accounts, 0 args) */
    reactivateAgent(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        agentStats: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** register_agent (6 accounts, 8 args) */
    registerAgent(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        agentStats: PublicKey;
        pricingMenu: PublicKey;
        globalRegistry: PublicKey;
        name: string;
        description: string;
        capabilities: Capability[];
        pricing: PricingTier[];
        protocols: string[];
        agentId: (string | null);
        agentUri: (string | null);
        x402Endpoint: (string | null);
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** update_agent (4 accounts, 8 args) */
    updateAgent(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        pricingMenu: PublicKey;
        name: (string | null);
        description: (string | null);
        capabilities: (Capability[] | null);
        pricing: (PricingTier[] | null);
        protocols: (string[] | null);
        agentId: (string | null);
        agentUri: (string | null);
        x402Endpoint: (string | null);
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=agent.d.ts.map