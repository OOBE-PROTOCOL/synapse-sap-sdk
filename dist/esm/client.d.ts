import { Connection, PublicKey, Commitment, Signer, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { Program, Wallet, Idl } from "@coral-xyz/anchor";
import { AgentModule, AttestationModule, DigestModule, DisputeModule, EscrowModule, GlobalModule, IndexingModule, MiscModule, SessionModule, StakingModule, SubscriptionModule, ToolsModule, VaultModule } from "./instructions";
export interface SapClientOpts {
    connection?: Connection;
    rpcUrl?: string;
    commitment?: Commitment;
    wallet?: Wallet;
    programId?: PublicKey;
}
export declare class SapClient {
    readonly program: Program;
    readonly connection: Connection;
    readonly programId: PublicKey;
    private _provider;
    private _agent?;
    private _attestation?;
    private _digest?;
    private _dispute?;
    private _escrow?;
    private _global?;
    private _indexing?;
    private _misc?;
    private _session?;
    private _staking?;
    private _subscription?;
    private _tools?;
    private _vault?;
    constructor(opts?: SapClientOpts);
    get methods(): import("@coral-xyz/anchor").MethodsNamespace<Idl>;
    get agent(): AgentModule;
    get attestation(): AttestationModule;
    get digest(): DigestModule;
    get dispute(): DisputeModule;
    get escrow(): EscrowModule;
    get global(): GlobalModule;
    get indexing(): IndexingModule;
    get misc(): MiscModule;
    get session(): SessionModule;
    get staking(): StakingModule;
    get subscription(): SubscriptionModule;
    get tools(): ToolsModule;
    get vault(): VaultModule;
    fetchAccount<T = any>(name: string, address: PublicKey): Promise<T | null>;
    buildTransaction(ixs: TransactionInstruction[], payer: PublicKey, priority?: {
        microLamports?: number;
        limit?: number;
    }): Promise<VersionedTransaction>;
    sendTransaction(tx: VersionedTransaction, signers: Signer[], opts?: {
        commitment?: Commitment;
        maxRetries?: number;
    }): Promise<string>;
}
export declare function createSapClient(rpcUrl: string, wallet?: Wallet): SapClient;
//# sourceMappingURL=client.d.ts.map