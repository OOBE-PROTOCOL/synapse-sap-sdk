"use strict";
// ================================================================
//  synapse-sap-sdk / src/client.ts
//  SapClient v0.25.0 — modular Anchor program wrapper
// ================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SapClient = void 0;
exports.createSapClient = createSapClient;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const constants_1 = require("./constants");
const instructions_1 = require("./instructions");
// @ts-ignore — JSON resolution handled by bundler
const idlJson = require("./idl.json");
class SapClient {
    constructor(opts = {}) {
        this.connection = opts.connection ?? new web3_js_1.Connection(opts.rpcUrl ?? "https://api.mainnet-beta.solana.com", opts.commitment ?? "confirmed");
        this.programId = opts.programId ?? new web3_js_1.PublicKey(constants_1.PROGRAM_ID);
        const wallet = opts.wallet ?? {};
        this._provider = new anchor_1.AnchorProvider(this.connection, wallet, {
            commitment: opts.commitment ?? "confirmed",
        });
        (0, anchor_1.setProvider)(this._provider);
        this.program = new anchor_1.Program(idlJson, this._provider);
    }
    get methods() { return this.program.methods; }
    get agent() { return this._agent ?? (this._agent = new instructions_1.AgentModule(this.program)); }
    get attestation() { return this._attestation ?? (this._attestation = new instructions_1.AttestationModule(this.program)); }
    get digest() { return this._digest ?? (this._digest = new instructions_1.DigestModule(this.program)); }
    get dispute() { return this._dispute ?? (this._dispute = new instructions_1.DisputeModule(this.program)); }
    get escrow() { return this._escrow ?? (this._escrow = new instructions_1.EscrowModule(this.program)); }
    get global() { return this._global ?? (this._global = new instructions_1.GlobalModule(this.program)); }
    get indexing() { return this._indexing ?? (this._indexing = new instructions_1.IndexingModule(this.program)); }
    get misc() { return this._misc ?? (this._misc = new instructions_1.MiscModule(this.program)); }
    get session() { return this._session ?? (this._session = new instructions_1.SessionModule(this.program)); }
    get staking() { return this._staking ?? (this._staking = new instructions_1.StakingModule(this.program)); }
    get subscription() { return this._subscription ?? (this._subscription = new instructions_1.SubscriptionModule(this.program)); }
    get tools() { return this._tools ?? (this._tools = new instructions_1.ToolsModule(this.program)); }
    get vault() { return this._vault ?? (this._vault = new instructions_1.VaultModule(this.program)); }
    async fetchAccount(name, address) {
        try { // @ts-ignore
            return await this.program.account[name].fetch(address);
        }
        catch {
            return null;
        }
    }
    async buildTransaction(ixs, payer, priority) {
        const { TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = await Promise.resolve().then(() => __importStar(require("@solana/web3.js")));
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
exports.SapClient = SapClient;
function createSapClient(rpcUrl, wallet) {
    return new SapClient({ rpcUrl, wallet });
}
//# sourceMappingURL=client.js.map