/**
 * @module client
 * @description Core SapClient — thin wrapper around the Anchor program
 * that wires up provider, IDL, and exposes typed module accessors.
 *
 * Usage:
 * ```ts
 * import { SapClient } from "@synapse-sap/sdk";
 *
 * const client = SapClient.from(provider);          // auto-IDL
 * const client = SapClient.fromProgram(program);    // existing program
 *
 * // Use domain modules:
 * await client.agent.register({ ... });
 * await client.vault.initVault(vaultNonce);
 * const escrow = await client.escrow.fetch(escrowPda);
 * ```
 */

import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";
import { SAP_PROGRAM_ID } from "./constants";
import { AgentModule } from "./modules/agent";
import { FeedbackModule } from "./modules/feedback";
import { IndexingModule } from "./modules/indexing";
import { ToolsModule } from "./modules/tools";
import { VaultModule } from "./modules/vault";
import { EscrowModule } from "./modules/escrow";
import { AttestationModule } from "./modules/attestation";
import { LedgerModule } from "./modules/ledger";
import { EventParser } from "./events";

// IDL is loaded at runtime from the JSON artifact
import idl from "../../target/idl/synapse_agent_sap.json";

/** Re-usable Anchor program type (untyped — SDK provides its own types). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SapProgram = Program<any>;

/**
 * Root entry point for the SAP v2 TypeScript SDK.
 *
 * Each protocol domain is exposed as a lazily-instantiated module:
 * `agent`, `feedback`, `indexing`, `tools`, `vault`, `escrow`,
 * `attestation`, `ledger`, `events`.
 */
export class SapClient {
  /** The underlying Anchor `Program` instance. */
  readonly program: SapProgram;

  /** The provider wallet pubkey (convenience). */
  readonly walletPubkey: PublicKey;

  // ── Lazy module singletons ────────────────────────
  #agent?: AgentModule;
  #feedback?: FeedbackModule;
  #indexing?: IndexingModule;
  #tools?: ToolsModule;
  #vault?: VaultModule;
  #escrow?: EscrowModule;
  #attestation?: AttestationModule;
  #ledger?: LedgerModule;
  #events?: EventParser;

  private constructor(program: SapProgram) {
    this.program = program;
    this.walletPubkey = (program.provider as AnchorProvider).wallet.publicKey;
  }

  // ═════════════════════════════════════════════
  //  Factory Methods
  // ═════════════════════════════════════════════

  /**
   * Create a SapClient from an AnchorProvider.
   * Automatically loads the IDL from `target/idl/`.
   */
  static from(
    provider: AnchorProvider,
    programId: PublicKey = SAP_PROGRAM_ID,
  ): SapClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const program = new Program(idl as any, provider);
    // Override program ID if non-default
    if (!programId.equals(SAP_PROGRAM_ID)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (program as any).programId = programId;
    }
    return new SapClient(program);
  }

  /**
   * Create a SapClient from an existing Anchor `Program` instance.
   * Useful when the caller already has a configured program.
   */
  static fromProgram(program: SapProgram): SapClient {
    return new SapClient(program);
  }

  // ═════════════════════════════════════════════
  //  Module Accessors (lazy singletons)
  // ═════════════════════════════════════════════

  /** Agent lifecycle: register, update, deactivate, close, metrics. */
  get agent(): AgentModule {
    return (this.#agent ??= new AgentModule(this.program));
  }

  /** Trustless reputation: give, update, revoke, close feedback. */
  get feedback(): FeedbackModule {
    return (this.#feedback ??= new FeedbackModule(this.program));
  }

  /** Scalable discovery: capability, protocol, tool-category indexes. */
  get indexing(): IndexingModule {
    return (this.#indexing ??= new IndexingModule(this.program));
  }

  /** Tool schema registry: publish, inscribe, update, close. */
  get tools(): ToolsModule {
    return (this.#tools ??= new ToolsModule(this.program));
  }

  /** Encrypted memory vault: init, session, inscribe, delegate. */
  get vault(): VaultModule {
    return (this.#vault ??= new VaultModule(this.program));
  }

  /** x402 escrow settlement: create, deposit, settle, withdraw. */
  get escrow(): EscrowModule {
    return (this.#escrow ??= new EscrowModule(this.program));
  }

  /** Web of trust: create, revoke, close attestations. */
  get attestation(): AttestationModule {
    return (this.#attestation ??= new AttestationModule(this.program));
  }

  /** Unified onchain memory: init, write, seal, close ledger. */
  get ledger(): LedgerModule {
    return (this.#ledger ??= new LedgerModule(this.program));
  }

  /** Decode SAP events from transaction logs. */
  get events(): EventParser {
    return (this.#events ??= new EventParser(this.program));
  }
}
