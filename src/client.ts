// ================================================================
//  synapse-sap-sdk / src/client.ts
//  SapClient v0.25.0 — modular Anchor program wrapper
// ================================================================

import {
  Connection, PublicKey, Commitment, Signer,
  TransactionInstruction, VersionedTransaction
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, setProvider, Idl } from "@coral-xyz/anchor";
import { createRequire } from "node:module";
import { PROGRAM_ID } from "./constants/index.js";
import {
  AgentModule, AttestationModule, DigestModule, DisputeModule,
  EscrowModule, GlobalModule, IndexingModule, MiscModule,
  SessionModule, StakingModule, SubscriptionModule, ToolsModule, VaultModule,
} from "./instructions/index.js";

const requireJson = createRequire(`${process.cwd()}/package.json`);
const idlJson = requireJson("@oobe-protocol-labs/synapse-sap-sdk/idl/synapse_agent_sap.json");

export interface SapClientOpts {
  connection?: Connection;
  rpcUrl?: string;
  commitment?: Commitment;
  wallet?: Wallet;
  programId?: PublicKey;
}

export class SapClient {
  readonly program: Program;
  readonly connection: Connection;
  readonly programId: PublicKey;
  private _provider: AnchorProvider;

  private _agent?: AgentModule;
  private _attestation?: AttestationModule;
  private _digest?: DigestModule;
  private _dispute?: DisputeModule;
  private _escrow?: EscrowModule;
  private _global?: GlobalModule;
  private _indexing?: IndexingModule;
  private _misc?: MiscModule;
  private _session?: SessionModule;
  private _staking?: StakingModule;
  private _subscription?: SubscriptionModule;
  private _tools?: ToolsModule;
  private _vault?: VaultModule;

  constructor(opts: SapClientOpts = {}) {
    this.connection = opts.connection ?? new Connection(
      opts.rpcUrl ?? "https://api.mainnet-beta.solana.com",
      opts.commitment ?? "confirmed"
    );
    this.programId = opts.programId ?? new PublicKey(PROGRAM_ID);
    const wallet = opts.wallet ?? ({} as Wallet);
    this._provider = new AnchorProvider(this.connection, wallet, {
      commitment: opts.commitment ?? "confirmed",
    });
    setProvider(this._provider);
    this.program = new Program(idlJson as Idl, this._provider);
  }

  get methods() { return this.program.methods; }

  get agent()     { return this._agent     ??= new AgentModule(this.program); }
  get attestation()  { return this._attestation ??= new AttestationModule(this.program); }
  get digest()    { return this._digest    ??= new DigestModule(this.program); }
  get dispute()   { return this._dispute   ??= new DisputeModule(this.program); }
  get escrow()    { return this._escrow    ??= new EscrowModule(this.program); }
  get global()    { return this._global    ??= new GlobalModule(this.program); }
  get indexing()  { return this._indexing  ??= new IndexingModule(this.program); }
  get misc()      { return this._misc      ??= new MiscModule(this.program); }
  get session()   { return this._session   ??= new SessionModule(this.program); }
  get staking()   { return this._staking   ??= new StakingModule(this.program); }
  get subscription() { return this._subscription ??= new SubscriptionModule(this.program); }
  get tools()     { return this._tools     ??= new ToolsModule(this.program); }
  get vault()     { return this._vault     ??= new VaultModule(this.program); }

  async fetchAccount<T = any>(name: string, address: PublicKey): Promise<T | null> {
    try { // @ts-ignore
    return await this.program.account[name].fetch(address) as T; }
    catch { return null; }
  }

  async buildTransaction(
    ixs: TransactionInstruction[], payer: PublicKey,
    priority?: { microLamports?: number; limit?: number }
  ): Promise<VersionedTransaction> {
    const { TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash();
    const instructions: TransactionInstruction[] = [];
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

  async sendTransaction(
    tx: VersionedTransaction, signers: Signer[],
    opts?: { commitment?: Commitment; maxRetries?: number }
  ): Promise<string> {
    // Sign transaction first
    tx.sign(signers);
    // Then send without signers (web3.js doesn't accept signers for VersionedTransaction)
    return await this.connection.sendTransaction(tx as any, {
      preflightCommitment: opts?.commitment ?? "confirmed",
      maxRetries: opts?.maxRetries ?? 3,
    });
  }
}

export function createSapClient(rpcUrl: string, wallet?: Wallet): SapClient {
  return new SapClient({ rpcUrl, wallet });
}
