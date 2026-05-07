import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
export declare class IndexingModule {
    private program;
    constructor(program: Program);
    /** add_to_capability_index (3 accounts, 1 args) */
    addToCapabilityIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        capabilityIndex: PublicKey;
        capabilityHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** add_to_index_page (3 accounts, 1 args) */
    addToIndexPage(ctx: {
        signer: Signer;
        authority: PublicKey;
        global: PublicKey;
        indexPage: PublicKey;
        agentPda: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** add_to_protocol_index (3 accounts, 1 args) */
    addToProtocolIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        protocolIndex: PublicKey;
        protocolHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** add_to_tool_category (4 accounts, 1 args) */
    addToToolCategory(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        toolCategoryIndex: PublicKey;
        category: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_capability_index (4 accounts, 1 args) */
    closeCapabilityIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        capabilityIndex: PublicKey;
        globalRegistry: PublicKey;
        capabilityHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_index_page (3 accounts, 0 args) */
    closeIndexPage(ctx: {
        signer: Signer;
        authority: PublicKey;
        global: PublicKey;
        indexPage: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_protocol_index (4 accounts, 1 args) */
    closeProtocolIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        protocolIndex: PublicKey;
        globalRegistry: PublicKey;
        protocolHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_capability_index (5 accounts, 2 args) */
    initCapabilityIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        capabilityIndex: PublicKey;
        globalRegistry: PublicKey;
        capabilityId: string;
        capabilityHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_index_page (5 accounts, 1 args) */
    initIndexPage(ctx: {
        signer: Signer;
        authority: PublicKey;
        global: PublicKey;
        parentIndex: PublicKey;
        indexPage: PublicKey;
        pageIndex: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_protocol_index (5 accounts, 2 args) */
    initProtocolIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        protocolIndex: PublicKey;
        globalRegistry: PublicKey;
        protocolId: string;
        protocolHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_tool_category_index (4 accounts, 1 args) */
    initToolCategoryIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        toolCategoryIndex: PublicKey;
        category: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** remove_from_capability_index (3 accounts, 1 args) */
    removeFromCapabilityIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        capabilityIndex: PublicKey;
        capabilityHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** remove_from_index_page (3 accounts, 1 args) */
    removeFromIndexPage(ctx: {
        signer: Signer;
        authority: PublicKey;
        global: PublicKey;
        indexPage: PublicKey;
        agentPda: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** remove_from_protocol_index (3 accounts, 1 args) */
    removeFromProtocolIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        protocolIndex: PublicKey;
        protocolHash: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** remove_from_tool_category (4 accounts, 1 args) */
    removeFromToolCategory(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        toolCategoryIndex: PublicKey;
        category: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=indexing.d.ts.map