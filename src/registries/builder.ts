/**
 * @module registries/builder
 * @description Fluent agent registration builder.
 *
 * Provides a chainable API for registering a fully-configured agent
 * in a single flow — identity, capabilities, pricing tiers, tools,
 * x402 endpoint, and discovery indexes.
 *
 * Instead of calling 5+ separate instructions manually, developers
 * use a single builder chain that validates inputs and batches
 * the registration cleanly.
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const result = await client.builder
 *   .agent("SwapBot")
 *   .description("AI-powered Jupiter swap agent")
 *   .x402Endpoint("https://swapbot.example.com/x402")
 *   .addCapability("jupiter:swap", { protocol: "jupiter", version: "6.0" })
 *   .addCapability("jupiter:quote", { protocol: "jupiter", version: "6.0" })
 *   .addPricingTier({
 *     tierId: "standard",
 *     pricePerCall: 1000,
 *     rateLimit: 60,
 *     tokenType: "sol",
 *     settlementMode: "x402",
 *   })
 *   .addProtocol("jupiter")
 *   .register();
 *
 * // Or register with tools:
 * const result = await client.builder
 *   .agent("DataBot")
 *   .description("Real-time DeFi data feeds")
 *   .addTool({ name: "getPrice", protocol: "pyth", category: "data", ... })
 *   .registerWithTools();
 * ```
 */

import {
  SystemProgram,
  type PublicKey,
  type TransactionSignature,
} from "@solana/web3.js";
import { type AnchorProvider, BN } from "@coral-xyz/anchor";
import type { SapProgram } from "../modules/base";
import {
  deriveAgent,
  deriveAgentStats,
  deriveTool,
  deriveGlobalRegistry,
} from "../pda";
import { sha256, hashToArray, assert } from "../utils";
import { LIMITS, TOOL_CATEGORY_VALUES, HTTP_METHOD_VALUES } from "../constants";
import type {
  Capability,
  PricingTier,
  TokenTypeKind,
  SettlementModeKind,
  VolumeCurveBreakpoint,
} from "../types";
import { TokenType, SettlementMode } from "../types";

// ═══════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface CapabilityInput
 * @name CapabilityInput
 * @description Simplified capability input for the builder.
 * Defines the protocol, version, and description of a capability
 * to register with the agent.
 * @category Registries
 * @since v0.1.0
 */
export interface CapabilityInput {
  readonly protocol?: string;
  readonly version?: string;
  readonly description?: string;
}

/**
 * @interface PricingTierInput
 * @name PricingTierInput
 * @description Simplified pricing tier input for the builder.
 * Supports flat-rate, tiered, and volume-curve pricing with
 * configurable token types and settlement modes.
 * @category Registries
 * @since v0.1.0
 */
export interface PricingTierInput {
  readonly tierId: string;
  readonly pricePerCall: number | string | BN;
  readonly rateLimit: number;
  readonly maxCallsPerSession?: number;
  readonly burstLimit?: number;
  readonly tokenType?: "sol" | "usdc" | "spl";
  readonly tokenMint?: PublicKey;
  readonly tokenDecimals?: number;
  readonly settlementMode?: "instant" | "escrow" | "batched" | "x402";
  readonly minEscrowDeposit?: number | string | BN;
  readonly batchIntervalSec?: number;
  readonly minPricePerCall?: number | string | BN;
  readonly maxPricePerCall?: number | string | BN;
  readonly volumeCurve?: Array<{ afterCalls: number; pricePerCall: number | string | BN }>;
}

/**
 * @interface ToolInput
 * @name ToolInput
 * @description Simplified tool input for batch registration via {@link AgentBuilder.registerWithTools}.
 * Defines the tool’s name, protocol, schemas, HTTP method, and category.
 * @category Registries
 * @since v0.1.0
 */
export interface ToolInput {
  readonly name: string;
  readonly protocol: string;
  readonly description: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly httpMethod?: "get" | "post" | "put" | "delete" | "compound";
  readonly category?: keyof typeof TOOL_CATEGORY_VALUES;
  readonly paramsCount: number;
  readonly requiredParams: number;
  readonly isCompound?: boolean;
}

/**
 * @interface RegisterResult
 * @name RegisterResult
 * @description Result of a successful agent registration.
 * Contains the transaction signature and derived PDA addresses.
 * Returned by {@link AgentBuilder.register}.
 * @category Registries
 * @since v0.1.0
 */
export interface RegisterResult {
  /** Transaction signature for agent registration. */
  readonly txSignature: TransactionSignature;
  /** Derived agent PDA. */
  readonly agentPda: PublicKey;
  /** Derived agent stats PDA. */
  readonly statsPda: PublicKey;
}

/**
 * @interface RegisterWithToolsResult
 * @name RegisterWithToolsResult
 * @description Result of agent + tools registration.
 * Extends {@link RegisterResult} with tool publication transaction signatures.
 * Returned by {@link AgentBuilder.registerWithTools}.
 * @category Registries
 * @since v0.1.0
 */
export interface RegisterWithToolsResult extends RegisterResult {
  /** Transaction signatures for tool publications. */
  readonly toolSignatures: Array<{
    readonly name: string;
    readonly txSignature: TransactionSignature;
  }>;
}

// ═══════════════════════════════════════════════════════════════════
//  Agent Builder
// ═══════════════════════════════════════════════════════════════════

/**
 * @name AgentBuilder
 * @description Fluent builder for registering a fully-configured agent on-chain.
 *
 * Chains identity setters, capability/pricing/protocol adders, and tool
 * definitions into a single validated registration flow. Validates all
 * inputs against on-chain limits before sending transactions.
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const result = await client.builder
 *   .agent("SwapBot")
 *   .description("AI-powered Jupiter swap agent")
 *   .x402Endpoint("https://swapbot.example.com/x402")
 *   .addCapability("jupiter:swap", { protocol: "jupiter", version: "6.0" })
 *   .addPricingTier({ tierId: "standard", pricePerCall: 1000, rateLimit: 60 })
 *   .register();
 * ```
 */
export class AgentBuilder {
  private readonly wallet: PublicKey;
  private _name = "";
  private _description = "";
  private _agentId: string | null = null;
  private _agentUri: string | null = null;
  private _x402Endpoint: string | null = null;
  private _capabilities: Capability[] = [];
  private _pricing: PricingTier[] = [];
  private _protocols: string[] = [];
  private _tools: ToolInput[] = [];

  constructor(private readonly program: SapProgram) {
    this.wallet = (program.provider as AnchorProvider).wallet.publicKey;
  }

  // ── Fluent Setters ───────────────────────────────────

  /**
   * @name agent
   * @description Set the agent display name.
   * @param name - Display name (max 64 characters).
   * @returns `this` for chaining.
   * @since v0.1.0
   */
  agent(name: string): this {
    assert(name.length <= LIMITS.MAX_NAME_LEN, `Name exceeds ${LIMITS.MAX_NAME_LEN} chars`);
    this._name = name;
    return this;
  }

  /**
   * @name description
   * @description Set the agent description.
   * @param desc - Description text (max 256 characters).
   * @returns `this` for chaining.
   * @since v0.1.0
   */
  description(desc: string): this {
    assert(desc.length <= LIMITS.MAX_DESC_LEN, `Description exceeds ${LIMITS.MAX_DESC_LEN} chars`);
    this._description = desc;
    return this;
  }

  /**
   * @name agentId
   * @description Set a DID-style agent identifier.
   * @param id - Agent identifier string.
   * @returns `this` for chaining.
   * @since v0.1.0
   */
  agentId(id: string): this {
    assert(id.length <= LIMITS.MAX_AGENT_ID_LEN, `Agent ID exceeds ${LIMITS.MAX_AGENT_ID_LEN} chars`);
    this._agentId = id;
    return this;
  }

  /**
   * @name agentUri
   * @description Set an agent metadata URI.
   * @param uri - Metadata URI string.
   * @returns `this` for chaining.
   * @since v0.1.0
   */
  agentUri(uri: string): this {
    assert(uri.length <= LIMITS.MAX_URI_LEN, `URI exceeds ${LIMITS.MAX_URI_LEN} chars`);
    this._agentUri = uri;
    return this;
  }

  /**
   * @name x402Endpoint
   * @description Set the x402 payment endpoint URL.
   * @param url - The x402 endpoint URL for the agent.
   * @returns `this` for chaining.
   * @since v0.1.0
   */
  x402Endpoint(url: string): this {
    assert(url.length <= LIMITS.MAX_URI_LEN, `x402 endpoint exceeds ${LIMITS.MAX_URI_LEN} chars`);
    this._x402Endpoint = url;
    return this;
  }

  /**
   * @name addCapability
   * @description Add a capability to the agent.
   *
   * @param id - Capability identifier string (e.g. `"jupiter:swap"`).
   * @param opts - Optional capability metadata.
   * @param opts.protocol - Protocol the capability belongs to.
   * @param opts.version - Capability version string.
   * @param opts.description - Human-readable capability description.
   * @returns `this` for chaining.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * builder.addCapability("jupiter:swap", { protocol: "jupiter", version: "6.0" })
   * ```
   */
  addCapability(id: string, opts?: CapabilityInput): this {
    assert(
      this._capabilities.length < LIMITS.MAX_CAPABILITIES,
      `Max ${LIMITS.MAX_CAPABILITIES} capabilities`,
    );
    this._capabilities.push({
      id,
      description: opts?.description ?? null,
      protocolId: opts?.protocol ?? null,
      version: opts?.version ?? null,
    });
    return this;
  }

  /**
   * @name addPricingTier
   * @description Add a pricing tier for the agent's services.
   * Supports flat-rate, volume-curve, and configurable settlement modes.
   *
   * @param input - Pricing tier configuration.
   * @returns `this` for chaining.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * builder.addPricingTier({
   *   tierId: "standard",
   *   pricePerCall: 1000,
   *   rateLimit: 60,
   *   tokenType: "sol",
   *   settlementMode: "x402",
   * })
   * ```
   */
  addPricingTier(input: PricingTierInput): this {
    assert(
      this._pricing.length < LIMITS.MAX_PRICING_TIERS,
      `Max ${LIMITS.MAX_PRICING_TIERS} pricing tiers`,
    );

    const tokenType = this.resolveTokenType(input.tokenType ?? "sol");
    const settlementMode = input.settlementMode
      ? this.resolveSettlementMode(input.settlementMode)
      : null;
    const volumeCurve: VolumeCurveBreakpoint[] | null = input.volumeCurve
      ? input.volumeCurve.map((v) => ({
          afterCalls: v.afterCalls,
          pricePerCall: new BN(v.pricePerCall.toString()),
        }))
      : null;

    this._pricing.push({
      tierId: input.tierId,
      pricePerCall: new BN(input.pricePerCall.toString()),
      minPricePerCall: input.minPricePerCall
        ? new BN(input.minPricePerCall.toString())
        : null,
      maxPricePerCall: input.maxPricePerCall
        ? new BN(input.maxPricePerCall.toString())
        : null,
      rateLimit: input.rateLimit,
      maxCallsPerSession: input.maxCallsPerSession ?? 0,
      burstLimit: input.burstLimit ?? null,
      tokenType,
      tokenMint: input.tokenMint ?? null,
      tokenDecimals: input.tokenDecimals ?? null,
      settlementMode,
      minEscrowDeposit: input.minEscrowDeposit
        ? new BN(input.minEscrowDeposit.toString())
        : null,
      batchIntervalSec: input.batchIntervalSec ?? null,
      volumeCurve,
    });
    return this;
  }

  /**
   * @name addProtocol
   * @description Add a protocol the agent supports.
   * Duplicates are silently ignored.
   *
   * @param protocolId - Protocol identifier string (e.g. `"jupiter"`).
   * @returns `this` for chaining.
   * @since v0.1.0
   *
   * @example
   * ```ts
   * builder.addProtocol("jupiter")
   * ```
   */
  addProtocol(protocolId: string): this {
    assert(
      this._protocols.length < LIMITS.MAX_PROTOCOLS,
      `Max ${LIMITS.MAX_PROTOCOLS} protocols`,
    );
    if (!this._protocols.includes(protocolId)) {
      this._protocols.push(protocolId);
    }
    return this;
  }

  /**
   * @name addTool
   * @description Add a tool to be published after registration.
   * Only used with {@link AgentBuilder.registerWithTools}.
   *
   * @param tool - Tool configuration.
   * @returns `this` for chaining.
   * @since v0.1.0
   */
  addTool(tool: ToolInput): this {
    this._tools.push(tool);
    return this;
  }

  // ── Registration ─────────────────────────────────────

  /**
   * @name register
   * @description Register the agent on-chain.
   * Validates all inputs before sending the transaction.
   *
   * @returns A {@link RegisterResult} with the transaction signature and derived PDAs.
   * @throws If validation fails (missing name, description, or limit exceeded).
   * @since v0.1.0
   */
  async register(): Promise<RegisterResult> {
    this.validate();

    const [agentPda] = deriveAgent(this.wallet);
    const [statsPda] = deriveAgentStats(agentPda);
    const [globalPda] = deriveGlobalRegistry();

    const txSignature = await this.methods
      .registerAgent(
        this._name,
        this._description,
        this._capabilities,
        this._pricing,
        this._protocols,
        this._agentId,
        this._agentUri,
        this._x402Endpoint,
      )
      .accounts({
        wallet: this.wallet,
        agent: agentPda,
        agentStats: statsPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { txSignature, agentPda, statsPda };
  }

  /**
   * @name registerWithTools
   * @description Register the agent AND publish all configured tools.
   * Sends agent registration first, then tool publications sequentially.
   *
   * @returns A {@link RegisterWithToolsResult} with agent and tool transaction signatures.
   * @throws If validation fails or any tool publication fails.
   * @since v0.1.0
   */
  async registerWithTools(): Promise<RegisterWithToolsResult> {
    const result = await this.register();
    const toolSignatures: Array<{
      name: string;
      txSignature: TransactionSignature;
    }> = [];

    const [globalPda] = deriveGlobalRegistry();

    for (const tool of this._tools) {
      const toolNameHash = hashToArray(sha256(tool.name));
      const [toolPda] = deriveTool(result.agentPda, new Uint8Array(toolNameHash));

      const httpMethod =
        HTTP_METHOD_VALUES[(tool.httpMethod ?? "post") as keyof typeof HTTP_METHOD_VALUES] ?? 1;
      const category =
        TOOL_CATEGORY_VALUES[(tool.category ?? "Custom") as keyof typeof TOOL_CATEGORY_VALUES] ?? 9;

      const txSignature = await this.methods
        .publishTool(
          tool.name,
          toolNameHash,
          hashToArray(sha256(tool.protocol)),
          hashToArray(sha256(tool.description)),
          hashToArray(sha256(tool.inputSchema)),
          hashToArray(sha256(tool.outputSchema)),
          httpMethod,
          category,
          tool.paramsCount,
          tool.requiredParams,
          tool.isCompound ?? false,
        )
        .accounts({
          wallet: this.wallet,
          agent: result.agentPda,
          tool: toolPda,
          globalRegistry: globalPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toolSignatures.push({ name: tool.name, txSignature });
    }

    return { ...result, toolSignatures };
  }

  // ── Reset ────────────────────────────────────────────

  /**
   * @name reset
   * @description Reset the builder to its initial state.
   * Clears all configured values so the builder can be reused.
   *
   * @returns `this` for chaining.
   * @since v0.1.0
   */
  reset(): this {
    this._name = "";
    this._description = "";
    this._agentId = null;
    this._agentUri = null;
    this._x402Endpoint = null;
    this._capabilities = [];
    this._pricing = [];
    this._protocols = [];
    this._tools = [];
    return this;
  }

  // ── Validation ───────────────────────────────────────

  /**
   * @name validate
   * @description Validate all builder inputs against on-chain limits.
   * @throws If any required field is missing or any limit is exceeded.
   * @private
   */
  private validate(): void {
    assert(this._name.length > 0, "Agent name is required");
    assert(this._description.length > 0, "Agent description is required");
    assert(
      this._capabilities.length <= LIMITS.MAX_CAPABILITIES,
      `Max ${LIMITS.MAX_CAPABILITIES} capabilities`,
    );
    assert(
      this._pricing.length <= LIMITS.MAX_PRICING_TIERS,
      `Max ${LIMITS.MAX_PRICING_TIERS} pricing tiers`,
    );
    assert(
      this._protocols.length <= LIMITS.MAX_PROTOCOLS,
      `Max ${LIMITS.MAX_PROTOCOLS} protocols`,
    );
  }

  // ── Helpers ──────────────────────────────────────────

  /**
   * @name resolveTokenType
   * @description Resolve a token type string to the on-chain enum variant.
   * @param t - Token type string (`"sol"`, `"usdc"`, or `"spl"`).
   * @returns The corresponding {@link TokenTypeKind} enum value.
   * @private
   */
  private resolveTokenType(t: "sol" | "usdc" | "spl"): TokenTypeKind {
    switch (t) {
      case "sol":
        return TokenType.Sol;
      case "usdc":
        return TokenType.Usdc;
      case "spl":
        return TokenType.Spl;
    }
  }

  /**
   * @name resolveSettlementMode
   * @description Resolve a settlement mode string to the on-chain enum variant.
   * @param m - Settlement mode string (`"instant"`, `"escrow"`, `"batched"`, or `"x402"`).
   * @returns The corresponding {@link SettlementModeKind} enum value.
   * @private
   */
  private resolveSettlementMode(
    m: "instant" | "escrow" | "batched" | "x402",
  ): SettlementModeKind {
    switch (m) {
      case "instant":
        return SettlementMode.Instant;
      case "escrow":
        return SettlementMode.Escrow;
      case "batched":
        return SettlementMode.Batched;
      case "x402":
        return SettlementMode.X402;
    }
  }

  /**
   * @name methods
   * @description Accessor for the Anchor program methods namespace.
   * @returns The program methods object for building RPC calls.
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get methods(): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.program.methods;
  }
}
