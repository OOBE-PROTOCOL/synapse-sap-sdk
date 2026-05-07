import { Program } from '@coral-xyz/anchor';
export declare class MemoryModule {
    private program;
    constructor(program: Program);
    /** close_session (4 accounts, 0 args) */
    closeSession({ signer: Signer, wallet: PublicKey, agent: PublicKey, vault: PublicKey, session: PublicKey, remainingAccounts }?: any[]): any;
}
//# sourceMappingURL=memory.d.ts.map