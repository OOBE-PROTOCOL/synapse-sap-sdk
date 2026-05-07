import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
export declare class VaultModule {
    private program;
    constructor(program: Program);
    /** add_vault_delegate (6 accounts, 2 args) */
    addVaultDelegate(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        vaultDelegate: PublicKey;
        delegate: PublicKey;
        permissions: number;
        expiresAt: BN;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** init_vault (5 accounts, 1 args) */
    initVault(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        globalRegistry: PublicKey;
        vaultNonce: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** inscribe_memory (6 accounts, 8 args) */
    inscribeMemory(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        session: PublicKey;
        epochPage: PublicKey;
        sequence: number;
        encryptedData: Buffer;
        nonce: number[];
        contentHash: number[];
        totalFragments: number;
        fragmentIndex: number;
        compression: number;
        epochIndex: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** inscribe_memory_delegated (7 accounts, 8 args) */
    inscribeMemoryDelegated(ctx: {
        signer: Signer;
        delegateSigner: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        vaultDelegate: PublicKey;
        session: PublicKey;
        epochPage: PublicKey;
        sequence: number;
        encryptedData: Buffer;
        nonce: number[];
        contentHash: number[];
        totalFragments: number;
        fragmentIndex: number;
        compression: number;
        epochIndex: number;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** revoke_vault_delegate (4 accounts, 0 args) */
    revokeVaultDelegate(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        vaultDelegate: PublicKey;
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
    /** rotate_vault_nonce (3 accounts, 1 args) */
    rotateVaultNonce(ctx: {
        signer: Signer;
        wallet: PublicKey;
        agent: PublicKey;
        vault: PublicKey;
        newNonce: number[];
        remainingAccounts?: any[];
    }): Promise<TransactionInstruction>;
}
//# sourceMappingURL=vault.d.ts.map