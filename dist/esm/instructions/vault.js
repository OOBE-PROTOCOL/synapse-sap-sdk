// ===============================================================
//  Vault Module — IDL v0.25.0
//  6 instructions
// ===============================================================
import { SystemProgram } from '@solana/web3.js';
export class VaultModule {
    constructor(program) {
        this.program = program;
    }
    /** add_vault_delegate (6 accounts, 2 args) */
    async addVaultDelegate(ctx) {
        return this.program
            .methods.addVaultDelegate(ctx.permissions, ctx.expiresAt)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            vaultDelegate: ctx.vaultDelegate,
            delegate: ctx.delegate,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** init_vault (5 accounts, 1 args) */
    async initVault(ctx) {
        return this.program
            .methods.initVault(ctx.vaultNonce)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            globalRegistry: ctx.globalRegistry,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** inscribe_memory (6 accounts, 8 args) */
    async inscribeMemory(ctx) {
        return this.program
            .methods.inscribeMemory(ctx.sequence, ctx.encryptedData, ctx.nonce, ctx.contentHash, ctx.totalFragments, ctx.fragmentIndex, ctx.compression, ctx.epochIndex)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            session: ctx.session,
            epochPage: ctx.epochPage,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** inscribe_memory_delegated (7 accounts, 8 args) */
    async inscribeMemoryDelegated(ctx) {
        return this.program
            .methods.inscribeMemoryDelegated(ctx.sequence, ctx.encryptedData, ctx.nonce, ctx.contentHash, ctx.totalFragments, ctx.fragmentIndex, ctx.compression, ctx.epochIndex)
            .accounts({
            delegateSigner: ctx.delegateSigner,
            agent: ctx.agent,
            vault: ctx.vault,
            vaultDelegate: ctx.vaultDelegate,
            session: ctx.session,
            epochPage: ctx.epochPage,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** revoke_vault_delegate (4 accounts, 0 args) */
    async revokeVaultDelegate(ctx) {
        return this.program
            .methods.revokeVaultDelegate()
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
            vaultDelegate: ctx.vaultDelegate,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
    /** rotate_vault_nonce (3 accounts, 1 args) */
    async rotateVaultNonce(ctx) {
        return this.program
            .methods.rotateVaultNonce(ctx.newNonce)
            .accounts({
            wallet: ctx.wallet,
            agent: ctx.agent,
            vault: ctx.vault,
        })
            .remainingAccounts(ctx.remainingAccounts ?? [])
            .signers([ctx.signer])
            .instruction();
    }
}
//# sourceMappingURL=vault.js.map