/**
 * @module core/client
 * @description Core SapClient — thin wrapper around the Anchor program
 * that wires up provider, IDL, and exposes typed module accessors.
 *
 * This is the primary entry point for the `@synapse-sap/sdk` package.
 * All protocol domains (agent lifecycle, reputation, vault, escrow, etc.)
 * are available as lazily-instantiated, strongly-typed module accessors.
 *
 * @since v0.1.0
 * @category Core
 *
 * @example
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
import { SAP_PROGRAM_ID } from "../constants";
import { AgentModule } from "../modules/agent";
import { FeedbackModule } from "../modules/feedback";
import { IndexingModule } from "../modules/indexing";
import { ToolsModule } from "../modules/tools";
import { VaultModule } from "../modules/vault";
import { EscrowModule } from "../modules/escrow";
import { AttestationModule } from "../modules/attestation";
import { LedgerModule } from "../modules/ledger";
import { EventParser } from "../events";
import { DiscoveryRegistry } from "../registries/discovery";
import { X402Registry } from "../registries/x402";
import { SessionManager } from "../registries/session";
import { AgentBuilder } from "../registries/builder";

// IDL is embedded inside the SDK — no external workspace dependency
import idl from "../idl/synapse_agent_sap.json";

/** Re-usable Anchor program type (untyped — SDK provides its own types). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SapProgram = Program<any>;

/**
 * @name SapClient
 * @description Root entry point for the Solana Agent Protocol v2 TypeScript SDK.
 *
 * Each protocol domain is exposed as a lazily-instantiated module:
 * `agent`, `feedback`, `indexing`, `tools`, `vault`, `escrow`,
 * `attestation`, `ledger`, `events`.
 *
 * Higher-level abstractions (`discovery`, `x402`, `session`, `builder`)
 * compose the low-level modules into ergonomic workflows.
 *
 * Instantiate via the static factory methods {@link SapClient.from} or
 * {@link SapClient.fromProgram} — the constructor is private.
 *
 * @category Core
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SapClient } from "@synapse-sap/sdk";
 * import { AnchorProvider } from "@coral-xyz/anchor";
 *
 * const provider = AnchorProvider.env();
 * const client = SapClient.from(provider);
 *
 * // Register an agent
 * await client.agent.register({
 *   name: "SwapBot",
 *   description: "AI-powered swap agent",
 * });
 *
 * // Discover agents
 * const agents = await client.discovery.findAgentsByProtocol("jupiter");
 * ```
 */
export class SapClient {
  /**
   * @name program
   * @description The underlying Anchor `Program` instance used for all RPC
   * calls and account deserialization.
   * @readonly
   * @category Core
   * @since v0.1.0
   */
  readonly program: SapProgram;

  /**
   * @name walletPubkey
   * @description The provider wallet's public key, extracted from the
   * Anchor provider for convenience. This is the default authority /
   * payer used by module instructions unless overridden.
   * @readonly
   * @category Core
   * @since v0.1.0
   */
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

  // ── Lazy registry singletons ──────────────────────
  #discovery?: DiscoveryRegistry;
  #x402?: X402Registry;
  #session?: SessionManager;

  private constructor(program: SapProgram) {
    this.program = program;
    this.walletPubkey = (program.provider as AnchorProvider).wallet.publicKey;
  }

  // ═════════════════════════════════════════════
  //  Factory Methods
  // ═════════════════════════════════════════════

  /**
   * @name from
   * @description Create a {@link SapClient} from an `AnchorProvider`.
   * Automatically loads the embedded IDL shipped with the SDK.
   *
   * @param provider - A configured `AnchorProvider` with wallet and connection.
   * @param programId - Optional override for the SAP program ID.
   *   Defaults to `SAP_PROGRAM_ID` from `@synapse-sap/sdk/constants`.
   * @returns A fully-initialised `SapClient` ready for use.
   *
   * @category Core
   * @since v0.1.0
   * @see {@link SapClient.fromProgram} for an alternative accepting a pre-built `Program`.
   *
   * @example
   * ```ts
   * import { SapClient } from "@synapse-sap/sdk";
   * import { AnchorProvider } from "@coral-xyz/anchor";
   *
   * const provider = AnchorProvider.env();
   * const client = SapClient.from(provider);
   * ```
   *
   * @example Custom program ID (e.g. localnet)
   * ```ts
   * const client = SapClient.from(provider, myLocalProgramId);
   * ```
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
   * @name fromProgram
   * @description Create a {@link SapClient} from an existing Anchor `Program`
   * instance. Useful when the caller already has a configured program or
   * needs full control over IDL resolution.
   *
   * @param program - A pre-built Anchor `Program` targeting the SAP program.
   * @returns A fully-initialised `SapClient` wrapping the supplied program.
   *
   * @category Core
   * @since v0.1.0
   * @see {@link SapClient.from} for the convenience factory that auto-loads the IDL.
   *
   * @example
   * ```ts
   * import { Program } from "@coral-xyz/anchor";
   * import { SapClient } from "@synapse-sap/sdk";
   *
   * const program = new Program(idl, provider);
   * const client = SapClient.fromProgram(program);
   * ```
   */
  static fromProgram(program: SapProgram): SapClient {
    return new SapClient(program);
  }

  // ═════════════════════════════════════════════
  //  Module Accessors (lazy singletons)
  // ═════════════════════════════════════════════

  /**
   * @name agent
   * @description Agent lifecycle: register, update, deactivate, close, and
   * query agent metrics on-chain.
   * @returns {AgentModule} The lazily-instantiated `AgentModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link AgentModule}
   */
  get agent(): AgentModule {
    return (this.#agent ??= new AgentModule(this.program));
  }

  /**
   * @name feedback
   * @description Trustless reputation: give, update, revoke, and close
   * on-chain feedback entries for agents.
   * @returns {FeedbackModule} The lazily-instantiated `FeedbackModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link FeedbackModule}
   */
  get feedback(): FeedbackModule {
    return (this.#feedback ??= new FeedbackModule(this.program));
  }

  /**
   * @name indexing
   * @description Scalable discovery: capability, protocol, and tool-category
   * on-chain indexes for agent search.
   * @returns {IndexingModule} The lazily-instantiated `IndexingModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link IndexingModule}
   */
  get indexing(): IndexingModule {
    return (this.#indexing ??= new IndexingModule(this.program));
  }

  /**
   * @name tools
   * @description Tool schema registry: publish, inscribe, update, and close
   * on-chain tool definitions.
   * @returns {ToolsModule} The lazily-instantiated `ToolsModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link ToolsModule}
   */
  get tools(): ToolsModule {
    return (this.#tools ??= new ToolsModule(this.program));
  }

  /**
   * @name vault
   * @description Encrypted memory vault: initialise vaults, manage sessions,
   * inscribe data, and delegate access.
   * @returns {VaultModule} The lazily-instantiated `VaultModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link VaultModule}
   */
  get vault(): VaultModule {
    return (this.#vault ??= new VaultModule(this.program));
  }

  /**
   * @name escrow
   * @description x402 escrow settlement: create escrow accounts, deposit
   * funds, settle payments, and withdraw balances.
   * @returns {EscrowModule} The lazily-instantiated `EscrowModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link EscrowModule}
   */
  get escrow(): EscrowModule {
    return (this.#escrow ??= new EscrowModule(this.program));
  }

  /**
   * @name attestation
   * @description Web of trust: create, revoke, and close on-chain
   * attestations between agents.
   * @returns {AttestationModule} The lazily-instantiated `AttestationModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link AttestationModule}
   */
  get attestation(): AttestationModule {
    return (this.#attestation ??= new AttestationModule(this.program));
  }

  /**
   * @name ledger
   * @description Unified on-chain memory: initialise ledger accounts, write
   * entries, seal pages, and close ledgers.
   * @returns {LedgerModule} The lazily-instantiated `LedgerModule` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link LedgerModule}
   */
  get ledger(): LedgerModule {
    return (this.#ledger ??= new LedgerModule(this.program));
  }

  /**
   * @name events
   * @description Decode SAP protocol events from on-chain transaction logs.
   * @returns {EventParser} The lazily-instantiated `EventParser` singleton.
   * @category Modules
   * @since v0.1.0
   * @see {@link EventParser}
   */
  get events(): EventParser {
    return (this.#events ??= new EventParser(this.program));
  }

  // ═════════════════════════════════════════════
  //  Registry Accessors (high-level abstractions)
  // ═════════════════════════════════════════════

  /**
   * @name discovery
   * @description Agent & tool discovery across the SAP network.
   * Provides high-level queries for locating agents by capability,
   * protocol, or wallet address.
   *
   * @returns {DiscoveryRegistry} The lazily-instantiated `DiscoveryRegistry` singleton.
   * @category Registries
   * @since v0.1.0
   * @see {@link DiscoveryRegistry}
   *
   * @example
   * ```ts
   * const agents = await client.discovery.findAgentsByProtocol("jupiter");
   * const profile = await client.discovery.getAgentProfile(wallet);
   * ```
   */
  get discovery(): DiscoveryRegistry {
    return (this.#discovery ??= new DiscoveryRegistry(this.program));
  }

  /**
   * @name x402
   * @description x402 micropayment lifecycle — pricing, escrow, headers,
   * and settlement. Orchestrates the full pay-per-call flow between
   * consumer and agent.
   *
   * @returns {X402Registry} The lazily-instantiated `X402Registry` singleton.
   * @category Registries
   * @since v0.1.0
   * @see {@link X402Registry}
   *
   * @example
   * ```ts
   * const ctx = await client.x402.preparePayment(agentWallet, { ... });
   * const headers = client.x402.buildPaymentHeaders(ctx);
   * const receipt = await client.x402.settle(depositor, 5, serviceData);
   * ```
   */
  get x402(): X402Registry {
    return (this.#x402 ??= new X402Registry(this.program));
  }

  /**
   * @name session
   * @description Unified memory session lifecycle — vault, session, and
   * ledger management. Provides a single interface for starting
   * conversations, writing messages, and reading back history.
   *
   * @returns {SessionManager} The lazily-instantiated `SessionManager` singleton.
   * @category Registries
   * @since v0.1.0
   * @see {@link SessionManager}
   *
   * @example
   * ```ts
   * const ctx = await client.session.start("conversation-123");
   * await client.session.write(ctx, "Hello from agent");
   * const msgs = await client.session.readLatest(ctx);
   * ```
   */
  get session(): SessionManager {
    return (this.#session ??= new SessionManager(this.program));
  }

  /**
   * @name builder
   * @description Fluent agent registration builder.
   * Returns a **new** `AgentBuilder` on every access — use for one-shot
   * registration flows. Chain configuration calls and finalise with
   * `.register()`.
   *
   * @returns {AgentBuilder} A fresh `AgentBuilder` instance.
   * @category Registries
   * @since v0.1.0
   * @see {@link AgentBuilder}
   *
   * @example
   * ```ts
   * await client.builder
   *   .agent("SwapBot")
   *   .description("AI-powered swap agent")
   *   .x402Endpoint("https://api.example.com/x402")
   *   .addCapability("jupiter:swap", { protocol: "jupiter" })
   *   .addPricingTier({ tierId: "standard", pricePerCall: 1000, rateLimit: 60 })
   *   .register();
   * ```
   */
  get builder(): AgentBuilder {
    return new AgentBuilder(this.program);
  }
}
