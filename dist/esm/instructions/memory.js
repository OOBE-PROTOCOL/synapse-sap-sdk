// ═══════════════════════════════════════════════════════════════
//  Memory Module — generated from IDL v0.25.0
//  6 instructions
// ═══════════════════════════════════════════════════════════════
import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
export class MemoryModule {
    constructor(program) {
        this.program = program;
    }
}
{
    signer: Signer;
    wallet: PublicKey;
    agent: PublicKey;
    vault: PublicKey;
    session: PublicKey;
    remainingAccounts ?  : any[];
}
Promise < TransactionInstruction > {
    return: await this.program
        .methods.closeSession()
        .accounts({
        wallet: wallet,
        agent: agent,
        vault: vault,
        session: session,
    })
        .remainingAccounts(remainingAccounts ?? [[]])
        .signers([signer])
        .instruction()
};
/** close_session_pda (4 accounts, 0 args) */
async;
closeSessionPda({
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    remainingAccounts: any[],
}, {
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    remainingAccounts: any[]
});
Promise < TransactionInstruction > {
    return: await this.program
        .methods.closeSessionPda()
        .accounts({
        wallet: wallet,
        agent: agent,
        vault: vault,
        session: session,
    })
        .remainingAccounts(remainingAccounts ?? [[]])
        .signers([signer])
        .instruction()
};
/** create_session_checkpoint (6 accounts, 1 args) */
async;
createSessionCheckpoint({
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    checkpoint: PublicKey,
    checkpoint_index: number,
    remainingAccounts: any[],
}, {
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    checkpoint: PublicKey,
    checkpoint_index: number,
    remainingAccounts: any[]
});
Promise < TransactionInstruction > {
    return: await this.program
        .methods.createSessionCheckpoint(checkpoint_index)
        .accounts({
        wallet: wallet,
        agent: agent,
        vault: vault,
        session: session,
        checkpoint: checkpoint,
        systemProgram: SystemProgram.programId,
    })
        .remainingAccounts(remainingAccounts ?? [[]])
        .signers([signer])
        .instruction()
};
/** inscribe_memory (6 accounts, 8 args) */
async;
inscribeMemory({
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    epochPage: PublicKey,
    sequence: number,
    encrypted_data: Buffer,
    nonce: [number, number, number, number, number, number, number, number, number, number, number, number],
    content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
    total_fragments: number,
    fragment_index: number,
    compression: number,
    epoch_index: number,
    remainingAccounts: any[],
}, {
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    epochPage: PublicKey,
    sequence: number,
    encrypted_data: Buffer,
    nonce: [number, number, number, number, number, number, number, number, number, number, number, number],
    content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
    total_fragments: number,
    fragment_index: number,
    compression: number,
    epoch_index: number,
    remainingAccounts: any[]
});
Promise < TransactionInstruction > {
    return: await this.program
        .methods.inscribeMemory(sequence, encrypted_data, nonce, content_hash, total_fragments, fragment_index, compression, epoch_index)
        .accounts({
        wallet: wallet,
        agent: agent,
        vault: vault,
        session: session,
        epochPage: epochPage,
        systemProgram: SystemProgram.programId,
    })
        .remainingAccounts(remainingAccounts ?? [[]])
        .signers([signer])
        .instruction()
};
/** inscribe_memory_delegated (7 accounts, 8 args) */
async;
inscribeMemoryDelegated({
    signer: Signer,
    delegateSigner: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    vaultDelegate: PublicKey,
    session: PublicKey,
    epochPage: PublicKey,
    sequence: number,
    encrypted_data: Buffer,
    nonce: [number, number, number, number, number, number, number, number, number, number, number, number],
    content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
    total_fragments: number,
    fragment_index: number,
    compression: number,
    epoch_index: number,
    remainingAccounts: any[],
}, {
    signer: Signer,
    delegateSigner: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    vaultDelegate: PublicKey,
    session: PublicKey,
    epochPage: PublicKey,
    sequence: number,
    encrypted_data: Buffer,
    nonce: [number, number, number, number, number, number, number, number, number, number, number, number],
    content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
    total_fragments: number,
    fragment_index: number,
    compression: number,
    epoch_index: number,
    remainingAccounts: any[]
});
Promise < TransactionInstruction > {
    return: await this.program
        .methods.inscribeMemoryDelegated(sequence, encrypted_data, nonce, content_hash, total_fragments, fragment_index, compression, epoch_index)
        .accounts({
        delegateSigner: delegateSigner,
        agent: agent,
        vault: vault,
        vaultDelegate: vaultDelegate,
        session: session,
        epochPage: epochPage,
        systemProgram: SystemProgram.programId,
    })
        .remainingAccounts(remainingAccounts ?? [[]])
        .signers([signer])
        .instruction()
};
/** open_session (5 accounts, 1 args) */
async;
openSession({
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    session_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
    remainingAccounts: any[],
}, {
    signer: Signer,
    wallet: PublicKey,
    agent: PublicKey,
    vault: PublicKey,
    session: PublicKey,
    session_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
    remainingAccounts: any[]
});
Promise < TransactionInstruction > {
    return: await this.program
        .methods.openSession(session_hash)
        .accounts({
        wallet: wallet,
        agent: agent,
        vault: vault,
        session: session,
        systemProgram: SystemProgram.programId,
    })
        .remainingAccounts(remainingAccounts ?? [[]])
        .signers([signer])
        .instruction()
};
//# sourceMappingURL=memory.js.map