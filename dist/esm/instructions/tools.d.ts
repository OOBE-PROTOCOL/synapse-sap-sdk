import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
export declare class ToolsModule {
    private program;
    constructor(program: Program);
    /** close_tool (4 accounts, 0 args) */
    closeTool(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        globalRegistry: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** close_tool_category_index (3 accounts, 1 args) */
    closeToolCategoryIndex(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        toolCategoryIndex: PublicKey;
        category: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** deactivate_tool (3 accounts, 0 args) */
    deactivateTool(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** inscribe_tool_schema (3 accounts, 4 args) */
    inscribeToolSchema(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        schemaType: number;
        schemaData: Buffer;
        schemaHash: number[];
        compression: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** publish_tool (5 accounts, 11 args) */
    publishTool(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        globalRegistry: PublicKey;
        toolName: string;
        toolNameHash: number[];
        protocolHash: number[];
        descriptionHash: number[];
        inputSchemaHash: number[];
        outputSchemaHash: number[];
        httpMethod: number;
        category: number;
        paramsCount: number;
        requiredParams: number;
        isCompound: boolean;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** reactivate_tool (3 accounts, 0 args) */
    reactivateTool(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** update_tool (3 accounts, 7 args) */
    updateTool(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        tool: PublicKey;
        descriptionHash: (number[] | null);
        inputSchemaHash: (number[] | null);
        outputSchemaHash: (number[] | null);
        httpMethod: (number | null);
        category: (number | null);
        paramsCount: (number | null);
        requiredParams: (number | null);
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=tools.d.ts.map