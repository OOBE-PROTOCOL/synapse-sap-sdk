// ================================================================
//  synapse-sap-sdk / src/client.ts
//  SapClient v0.25.0 — modular Anchor program wrapper
// ================================================================

import {
  Connection, PublicKey, Commitment, Signer,
  TransactionInstruction, VersionedTransaction,
  BlockheightBasedTransactionConfirmationStrategy,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, setProvider, Idl } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "./constants";
import {
  AgentModule, AttestationModule, DigestModule, DisputeModule,
  EscrowModule, GlobalModule, IndexingModule, MiscModule,
  SessionModule, StakingModule, SubscriptionModule, ToolsModule, VaultModule,
} from "./instructions";
import idlJson from "./idl/synapse_agent_sap.json";

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
    const rpcUrl = opts.rpcUrl ?? "https://api.mainnet-beta.solana.com";
    if (!opts.rpcUrl && !opts.connection && typeof process !== "undefined" && process.env["NODE_ENV"] !== "production") {
      // Warn in development so users don't accidentally hit mainnet.
      console.warn(
        "[synapse-sap-sdk] No rpcUrl or connection provided — defaulting to mainnet-beta. " +
        "Pass rpcUrl or connection explicitly to avoid unintended mainnet usage."
      );
    }
    this.connection = opts.connection ?? new Connection(rpcUrl, opts.commitment ?? "confirmed");
    this.programId = opts.programId ?? new PublicKey(PROGRAM_ID);
    const wallet = opts.wallet ?? ({} as Wallet);
    if (!opts.wallet) {
      // A missing wallet is valid for read-only usage (fetching accounts),
      // but signing instructions will throw at runtime. Make it obvious.
      (wallet as Record<string, unknown>)["_readOnly"] = true;
    }
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

  /**
   * Fetch a named Anchor account by address.
   * Returns `null` if the account does not exist (AccountNotFound / AccountDiscriminatorMismatch).
   * Re-throws for genuine RPC or network errors so callers can distinguish
   * "not registered" from "couldn't reach the cluster".
   */
  async fetchAccount<T = unknown>(name: string, address: PublicKey): Promise<T | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      return await (this.program.account as any)[name].fetch(address) as T;
    } catch (err: unknown) {
      // Anchor wraps missing accounts in an error whose message contains one of these strings.
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("Account does not exist") ||
        msg.includes("AccountNotFound") ||
        msg.includes("AccountDiscriminatorMismatch") ||
        msg.includes("account discriminator")
      ) {
        return null;
      }
      // Real error (network, RPC, deserialization) — surface it.
      throw err;
    }
  }

  /**
   * Build a VersionedTransaction from the given instructions.
   * Returns the transaction together with the blockhash context so callers
   * can confirm via `connection.confirmTransaction(strategy)` with a deadline.
   */
  async buildTransaction(
    ixs: TransactionInstruction[], payer: PublicKey,
    priority?: { microLamports?: number; limit?: number }
  ): Promise<{ tx: VersionedTransaction; blockhash: string; lastValidBlockHeight: number }> {
    const { TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = await import("@solana/web3.js");
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    const instructions: TransactionInstruction[] = [];
    if (priority?.microLamports && priority.microLamports > 0) {
      instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priority.microLamports }));
    }
    if (priority?.limit && priority.limit > 0) {
      instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: priority.limit }));
    }
    instructions.push(...ixs);
    const msg = new TransactionMessage({
      payerKey: payer, recentBlockhash: blockhash, instructions,
    }).compileToV0Message();
    return { tx: new VersionedTransaction(msg), blockhash, lastValidBlockHeight };
  }

  /**
   * Sign, send, and confirm a VersionedTransaction.
   * Waits for on-chain confirmation before returning the signature,
   * and uses the blockhash expiry window to give a clear timeout error
   * instead of hanging indefinitely.
   */
  async sendTransaction(
    tx: VersionedTransaction, signers: Signer[],
    opts?: {
      commitment?: Commitment;
      maxRetries?: number;
      /** Provide lastValidBlockHeight from buildTransaction for deadline-based confirmation. */
      lastValidBlockHeight?: number;
      blockhash?: string;
    }
  ): Promise<string> {
    if (signers.length === 0) {
      throw new Error("sendTransaction: at least one signer is required");
    }
    tx.sign(signers);
    const signature = await this.connection.sendTransaction(tx, {
      preflightCommitment: opts?.commitment ?? "confirmed",
      maxRetries: opts?.maxRetries ?? 3,
    });

    // Confirm using blockheight strategy when caller passes blockhash context
    // (from buildTransaction), giving a clear expiry instead of an open-ended wait.
    if (opts?.blockhash && opts?.lastValidBlockHeight !== undefined) {
      const strategy: BlockheightBasedTransactionConfirmationStrategy = {
        signature,
        blockhash: opts.blockhash,
        lastValidBlockHeight: opts.lastValidBlockHeight,
      };
      const result = await this.connection.confirmTransaction(strategy, opts?.commitment ?? "confirmed");
      if (result.value.err) {
        throw new Error(`Transaction ${signature} failed on-chain: ${JSON.stringify(result.value.err)}`);
      }
    }

    return signature;
  }
}

export function createSapClient(rpcUrl: string, wallet?: Wallet): SapClient {
  return new SapClient({ rpcUrl, wallet });
}
