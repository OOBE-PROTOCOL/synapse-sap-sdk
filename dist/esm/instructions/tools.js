// ===============================================================
//  Tools Module — IDL v0.25.0
//  7 instructions
// ===============================================================
import { SystemProgram } from '@solana/web3.js';
export class ToolsModule {
    constructor(program) {
        this.program = program;
    }
    /** close_tool (4 accounts, 0 args) */
    async closeTool(ctx) {
        return this.program
            .methods.closeTool()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            tool: ctx.tool,
            globalRegistry: ctx.globalRegistry,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** close_tool_category_index (3 accounts, 1 args) */
    async closeToolCategoryIndex(ctx) {
        return this.program
            .methods.closeToolCategoryIndex(ctx.category)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            toolCategoryIndex: ctx.toolCategoryIndex,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** deactivate_tool (3 accounts, 0 args) */
    async deactivateTool(ctx) {
        return this.program
            .methods.deactivateTool()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            tool: ctx.tool,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** inscribe_tool_schema (3 accounts, 4 args) */
    async inscribeToolSchema(ctx) {
        return this.program
            .methods.inscribeToolSchema(ctx.schemaType, ctx.schemaData, ctx.schemaHash, ctx.compression)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            tool: ctx.tool,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** publish_tool (5 accounts, 11 args) */
    async publishTool(ctx) {
        return this.program
            .methods.publishTool(ctx.toolName, ctx.toolNameHash, ctx.protocolHash, ctx.descriptionHash, ctx.inputSchemaHash, ctx.outputSchemaHash, ctx.httpMethod, ctx.category, ctx.paramsCount, ctx.requiredParams, ctx.isCompound)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            tool: ctx.tool,
            globalRegistry: ctx.globalRegistry,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** reactivate_tool (3 accounts, 0 args) */
    async reactivateTool(ctx) {
        return this.program
            .methods.reactivateTool()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            tool: ctx.tool,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** update_tool (3 accounts, 7 args) */
    async updateTool(ctx) {
        return this.program
            .methods.updateTool(ctx.descriptionHash, ctx.inputSchemaHash, ctx.outputSchemaHash, ctx.httpMethod, ctx.category, ctx.paramsCount, ctx.requiredParams)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            tool: ctx.tool,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
//# sourceMappingURL=tools.js.map