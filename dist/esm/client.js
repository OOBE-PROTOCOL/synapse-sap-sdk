// ================================================================
//  synapse-sap-sdk / src/client.ts
//  SapClient v0.25.0 — modular Anchor program wrapper
// ================================================================
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "./constants";
import { AgentModule, AttestationModule, DigestModule, DisputeModule, EscrowModule, GlobalModule, IndexingModule, MiscModule, SessionModule, StakingModule, SubscriptionModule, ToolsModule, VaultModule, } from "./instructions";
// @ts-ignore — JSON resolution handled by bundler
const idlJson = require("./idl.json");
export class SapClient {
    constructor(opts = {}) {
        this.connection = opts.connection ?? new Connection(opts.rpcUrl ?? "https://api.mainnet-beta.solana.com", opts.commitment ?? "confirmed");
        this.programId = opts.programId ?? new PublicKey(PROGRAM_ID);
        const wallet = opts.wallet ?? {};
        this._provider = new AnchorProvider(this.connection, wallet, {
            commitment: opts.commitment ?? "confirmed",
        });
        setProvider(this._provider);
        this.program = new Program(idlJson, this._provider);
    }
    get methods() { return this.program.methods; }
    get agent() { return this._agent ?? (this._agent = new AgentModule(this.program)); }
    get attestation() { return this._attestation ?? (this._attestation = new AttestationModule(this.program)); }
    get digest() { return this._digest ?? (this._digest = new DigestModule(this.program)); }
    get dispute() { return this._dispute ?? (this._dispute = new DisputeModule(this.program)); }
    get escrow() { return this._escrow ?? (this._escrow = new EscrowModule(this.program)); }
    get global() { return this._global ?? (this._global = new GlobalModule(this.program)); }
    get indexing() { return this._indexing ?? (this._indexing = new IndexingModule(this.program)); }
    get misc() { return this._misc ?? (this._misc = new MiscModule(this.program)); }
    get session() { return this._session ?? (this._session = new SessionModule(this.program)); }
    get staking() { return this._staking ?? (this._staking = new StakingModule(this.program)); }
    get subscription() { return this._subscription ?? (this._subscription = new SubscriptionModule(this.program)); }
    get tools() { return this._tools ?? (this._tools = new ToolsModule(this.program)); }
    get vault() { return this._vault ?? (this._vault = new VaultModule(this.program)); }
    async fetchAccount(name, address) {
        try { // @ts-ignore
            return await this.program.account[name].fetch(address);
        }
        catch {
            return null;
        }
    }
    async buildTransaction(ixs, payer, priority) {
        const { TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = await import("@solana/web3.js");
        const { blockhash } = await this.connection.getLatestBlockhash();
        const instructions = [];
        if (priority?.microLamports) {
            instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priority.microLamports }));
        }
        if (priority?.limit) {
            instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: priority.limit }));
        }
        instructions.push(...ixs);
        const msg = new TransactionMessage({
            payerKey: payer, recentBlockhash: blockhash, instructions,
        }).compileToV0Message();
        return new VersionedTransaction(msg);
    }
    async sendTransaction(tx, signers, opts) {
        return await this.connection.sendTransaction(tx, signers, {
            preflightCommitment: opts?.commitment ?? "confirmed",
            maxRetries: opts?.maxRetries ?? 3,
        });
    }
}
export function createSapClient(rpcUrl, wallet) {
    return new SapClient({ rpcUrl, wallet });
}
//# sourceMappingURL=client.js.map