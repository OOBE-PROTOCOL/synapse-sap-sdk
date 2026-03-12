/**
 * @module plugin
 * @description SynapsePlugin adapter for SAP v2.
 *
 * Exposes 52 tools across 8 on-chain protocol domains as a drop-in
 * `SynapsePlugin` for `SynapseAgentKit`:
 *
 * ```ts
 * import { SynapseAgentKit } from '@oobe-protocol-labs/synapse-client-sdk/ai/plugins';
 * import { createSAPPlugin } from '@synapse-sap/sdk/plugin';
 *
 * const sapPlugin = createSAPPlugin({ provider });
 * const kit = new SynapseAgentKit({ rpcUrl })
 *   .use(sapPlugin);
 *
 * const tools = kit.getTools();   // → StructuredTool[] (LangChain)
 * ```
 *
 * Architecture:
 *   1. Schemas (Zod) → runtime validation + LLM-friendly descriptions
 *   2. Protocols → 8 domain method registries (agent, feedback, …)
 *   3. Executor → dispatches tool calls to SapClient module methods
 *   4. Serialization → PublicKey↔string, BN↔string bridging
 *
 * @category Plugin
 * @since v0.1.0
 */

import { type AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { SapClient } from "../core/client";
import {
  SAP_PROTOCOLS,
  type PluginProtocol,
  type ProtocolMethod,
} from "./protocols";
import type {
  RegisterAgentArgs,
  UpdateAgentArgs,
  GiveFeedbackArgs,
  UpdateFeedbackArgs,
  CreateAttestationArgs,
  CreateEscrowArgs,
  Settlement,
  InscribeMemoryArgs,
  InscribeToolSchemaArgs,
  UpdateToolArgs,
  VolumeCurveBreakpoint,
} from "../types";
import { deriveAgent, deriveVault, deriveSession, deriveLedger } from "../pda";
import { hashToArray, sha256 } from "../utils";

// ═══════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════

/**
 * Plugin metadata exposed via {@link SynapsePlugin.meta}.
 *
 * @interface PluginMeta
 * @name PluginMeta
 * @description Describes a SynapsePlugin’s identity, version, and
 *   discovery tags for the SynapseAgentKit plugin registry.
 * @category Plugin
 * @since v0.1.0
 */
export interface PluginMeta {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly tags: readonly string[];
}

/**
 * Context injected by SynapseAgentKit during `install()`.
 *
 * @interface PluginContext
 * @name PluginContext
 * @description Provides the RPC transport and original AgentKit configuration
 *   to the plugin at installation time.
 * @category Plugin
 * @since v0.1.0
 */
export interface PluginContext {
  /** The SynapseClient providing RPC transport. */
  readonly client: {
    readonly transport: unknown;
  };
  /** Original AgentKitConfig. */
  readonly config: Record<string, unknown>;
}

/**
 * Result of `install()` containing the tool executor and optional teardown.
 *
 * @interface PluginInstallResult
 * @name PluginInstallResult
 * @description Returned by {@link SynapsePlugin.install}. The `executor`
 *   dispatches incoming tool calls to the correct SapClient module method.
 *   The optional `teardown` callback is invoked on `kit.destroy()`.
 * @category Plugin
 * @since v0.1.0
 */
export interface PluginInstallResult {
  /** Main executor dispatching method calls. */
  executor: (method: ProtocolMethod, input: unknown) => Promise<unknown>;
  /** Optional teardown for cleanup on `kit.destroy()`. */
  teardown?: () => Promise<void>;
}

/**
 * The SynapsePlugin interface (duck-typed for zero external deps).
 *
 * @interface SynapsePlugin
 * @name SynapsePlugin
 * @description Core contract for SynapseAgentKit plugins. Provides metadata,
 *   protocol definitions, and an `install()` entry point that yields
 *   a tool executor.
 * @category Plugin
 * @since v0.1.0
 */
export interface SynapsePlugin {
  readonly meta: PluginMeta;
  readonly protocols: readonly PluginProtocol[];
  install(context: PluginContext): PluginInstallResult;
}

/**
 * Configuration for the SAP plugin.
 *
 * @interface SAPPluginConfig
 * @name SAPPluginConfig
 * @description Options passed to {@link createSAPPlugin} to instantiate
 *   the SAP v2 plugin with an Anchor provider and optional program ID override.
 * @category Plugin
 * @since v0.1.0
 */
export interface SAPPluginConfig {
  /**
   * Anchor provider with wallet signer.
   * Required for all write operations (transactions).
   */
  readonly provider: AnchorProvider;

  /**
   * Override the SAP program ID.
   * Defaults to the canonical program ID from constants.
   */
  readonly programId?: PublicKey;
}

// ═══════════════════════════════════════════════════════════════════
//  Version
// ═══════════════════════════════════════════════════════════════════

/**
 * Current SAP plugin version string.
 *
 * @name SAP_PLUGIN_VERSION
 * @description Semver version embedded in the plugin’s {@link PluginMeta}.
 * @internal
 * @since v0.1.0
 */
const SAP_PLUGIN_VERSION = "0.1.0";

// ═══════════════════════════════════════════════════════════════════
//  Serialization Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Convert a base58 string to PublicKey.
 *
 * @name toPubkey
 * @description Returns `undefined` for nullish input, otherwise wraps
 *   the base58 string in a Solana `PublicKey`.
 * @param value - Base58-encoded public key or nullish
 * @returns A `PublicKey` instance, or `undefined`
 * @internal
 * @since v0.1.0
 */
function toPubkey(value: string | null | undefined): PublicKey | undefined {
  return value ? new PublicKey(value) : undefined;
}

/**
 * Convert a string amount to BN.
 *
 * @name toBN
 * @description Returns `undefined` for nullish input, otherwise parses
 *   the string as a `BN` (big number) instance.
 * @param value - Numeric string or nullish
 * @returns A `BN` instance, or `undefined`
 * @internal
 * @since v0.1.0
 */
function toBN(value: string | null | undefined): BN | undefined {
  return value ? new BN(value) : undefined;
}

/**
 * Convert a hex string to a Node.js Buffer.
 *
 * @name hexToBuffer
 * @description Used for encrypted data payloads before sending to
 *   on-chain instructions.
 * @param hex - Hex-encoded string
 * @returns Buffer of decoded bytes
 * @internal
 * @since v0.1.0
 */
function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

/**
 * Convert a hex string to Uint8Array for PDA seed derivation.
 *
 * @name hexToBytes
 * @description Wraps `Buffer.from(hex, 'hex')` into a `Uint8Array`
 *   suitable for Solana PDA seed arrays.
 * @param hex - Hex-encoded string
 * @returns Uint8Array of decoded bytes
 * @internal
 * @since v0.1.0
 */
function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/**
 * Map token type strings to Anchor enum variant objects.
 *
 * @name toTokenType
 * @description Converts `"sol"`, `"usdc"`, or `"spl"` to the
 *   corresponding Anchor enum variant. Defaults to `{ sol: {} }`.
 * @param s - Token type string
 * @returns Anchor-compatible enum variant object
 * @internal
 * @since v0.1.0
 */
function toTokenType(s: string): object {
  const map: Record<string, object> = {
    sol: { sol: {} },
    usdc: { usdc: {} },
    spl: { spl: {} },
  };
  return map[s] ?? { sol: {} };
}

/**
 * Map settlement mode strings to Anchor enum variant objects.
 *
 * @name toSettlementMode
 * @description Converts `"instant"`, `"escrow"`, `"batched"`, or `"x402"`
 *   to the corresponding Anchor enum variant. Returns `null` for nullish input.
 * @param s - Settlement mode string or nullish
 * @returns Anchor-compatible enum variant object, or `null`
 * @internal
 * @since v0.1.0
 */
function toSettlementMode(s: string | null | undefined): object | null {
  if (!s) return null;
  const map: Record<string, object> = {
    instant: { instant: {} },
    escrow: { escrow: {} },
    batched: { batched: {} },
    x402: { x402: {} },
  };
  return map[s] ?? null;
}

/**
 * Map HTTP method strings to numeric enum values.
 *
 * @name toHttpMethodNum
 * @description Converts lowercase method names (`"get"`, `"post"`, etc.)
 *   to their on-chain numeric representation. Defaults to `0` (GET).
 * @param s - HTTP method string
 * @returns Numeric enum value
 * @internal
 * @since v0.1.0
 */
function toHttpMethodNum(s: string): number {
  const map: Record<string, number> = {
    get: 0,
    post: 1,
    put: 2,
    delete: 3,
    compound: 4,
  };
  return map[s] ?? 0;
}

/**
 * Map category strings to numeric enum values.
 *
 * @name toCategoryNum
 * @description Converts category names (`"swap"`, `"lend"`, etc.)
 *   to their on-chain numeric representation. Defaults to `9` (custom).
 * @param s - Category string
 * @returns Numeric enum value
 * @internal
 * @since v0.1.0
 */
function toCategoryNum(s: string): number {
  const map: Record<string, number> = {
    swap: 0,
    lend: 1,
    stake: 2,
    nft: 3,
    payment: 4,
    data: 5,
    governance: 6,
    bridge: 7,
    analytics: 8,
    custom: 9,
  };
  return map[s] ?? 9;
}

/**
 * Map schema type strings to numeric enum values.
 *
 * @name toSchemaTypeNum
 * @description Converts `"input"`, `"output"`, or `"description"`
 *   to their on-chain numeric representation. Defaults to `0` (input).
 * @param s - Schema type string
 * @returns Numeric enum value
 * @internal
 * @since v0.1.0
 */
function toSchemaTypeNum(s: string): number {
  const map: Record<string, number> = { input: 0, output: 1, description: 2 };
  return map[s] ?? 0;
}

/**
 * Map compression type strings to numeric enum values.
 *
 * @name toCompressionNum
 * @description Converts `"none"`, `"deflate"`, `"gzip"`, or `"brotli"`
 *   to their on-chain numeric representation. Defaults to `0` (none).
 * @param s - Compression type string
 * @returns Numeric enum value
 * @internal
 * @since v0.1.0
 */
function toCompressionNum(s: string): number {
  const map: Record<string, number> = {
    none: 0,
    deflate: 1,
    gzip: 2,
    brotli: 3,
  };
  return map[s] ?? 0;
}

/**
 * Convert a JSON-serialized pricing tier from plugin input
 * into the SDK’s PricingTier shape with BN/PublicKey/enum conversions.
 *
 * @name toPricingTier
 * @description Transforms raw JSON input (string amounts, string enums)
 *   into the native Anchor-compatible shape with `BN`, `PublicKey`,
 *   and enum variant objects.
 * @param raw - Raw pricing tier object from Zod-validated plugin input
 * @returns Anchor-compatible PricingTier object
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPricingTier(raw: any): any {
  return {
    tierId: raw.tierId,
    pricePerCall: new BN(raw.pricePerCall),
    minPricePerCall: toBN(raw.minPricePerCall) ?? null,
    maxPricePerCall: toBN(raw.maxPricePerCall) ?? null,
    rateLimit: raw.rateLimit,
    maxCallsPerSession: raw.maxCallsPerSession,
    burstLimit: raw.burstLimit ?? null,
    tokenType: toTokenType(raw.tokenType),
    tokenMint: toPubkey(raw.tokenMint) ?? null,
    tokenDecimals: raw.tokenDecimals ?? null,
    settlementMode: toSettlementMode(raw.settlementMode),
    minEscrowDeposit: toBN(raw.minEscrowDeposit) ?? null,
    batchIntervalSec: raw.batchIntervalSec ?? null,
    volumeCurve: raw.volumeCurve
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? raw.volumeCurve.map((v: any) => ({
          afterCalls: v.afterCalls,
          pricePerCall: new BN(v.pricePerCall),
        }))
      : null,
  };
}

/**
 * Serialize an on-chain account object to a JSON-safe shape.
 *
 * @name serializeAccount
 * @description Recursively converts `PublicKey` → base58 string,
 *   `BN` → decimal string, and nested objects/arrays. Used to
 *   return tool output that is JSON-serializable for LLMs.
 * @param obj - Raw account data record from Anchor deserialization
 * @returns JSON-safe record with all Solana types converted to strings
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeAccount(obj: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (value instanceof PublicKey) {
      result[key] = value.toBase58();
    } else if (BN.isBN(value)) {
      result[key] = value.toString();
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item instanceof PublicKey) return item.toBase58();
        if (BN.isBN(item)) return item.toString();
        if (typeof item === "object" && item !== null)
          return serializeAccount(item);
        return item;
      });
    } else if (typeof value === "object") {
      result[key] = serializeAccount(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  Executor Builder
// ═══════════════════════════════════════════════════════════════════

/**
 * Build the executor function that dispatches incoming tool calls
 * to the appropriate SapClient module method.
 *
 * @name buildExecutor
 * @description Creates a closure over a `SapClient` instance that routes
 *   each incoming `ProtocolMethod` to the correct per-protocol dispatcher
 *   based on `method.protocol`.
 * @param client - Initialized SapClient for the configured provider
 * @returns Async executor function `(method, input) => Promise<unknown>`
 * @internal
 * @since v0.1.0
 */
function buildExecutor(
  client: SapClient,
): (method: ProtocolMethod, input: unknown) => Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (method: ProtocolMethod, raw: any): Promise<unknown> => {
    switch (method.protocol) {
      // ────────────────────── Agent ──────────────────────
      case "sap-agent":
        return executeAgent(client, method.name, raw);

      // ────────────────────── Feedback ───────────────────
      case "sap-feedback":
        return executeFeedback(client, method.name, raw);

      // ────────────────────── Attestation ────────────────
      case "sap-attestation":
        return executeAttestation(client, method.name, raw);

      // ────────────────────── Escrow ─────────────────────
      case "sap-escrow":
        return executeEscrow(client, method.name, raw);

      // ────────────────────── Tools ──────────────────────
      case "sap-tools":
        return executeTools(client, method.name, raw);

      // ────────────────────── Vault ──────────────────────
      case "sap-vault":
        return executeVault(client, method.name, raw);

      // ────────────────────── Indexing ───────────────────
      case "sap-indexing":
        return executeIndexing(client, method.name, raw);

      // ────────────────────── Ledger ─────────────────────
      case "sap-ledger":
        return executeLedger(client, method.name, raw);

      default:
        throw new Error(`Unknown SAP protocol: ${method.protocol}`);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Per-Protocol Dispatchers
// ═══════════════════════════════════════════════════════════════════

/**
 * Dispatch tool calls for the **sap-agent** protocol.
 *
 * @name executeAgent
 * @description Routes agent-domain method names to `client.agent.*` calls,
 *   handling argument conversion and account serialization.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"registerAgent"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAgent(client: SapClient, name: string, input: any) {
  switch (name) {
    case "registerAgent": {
      const args: RegisterAgentArgs = {
        name: input.name,
        description: input.description,
        capabilities: input.capabilities,
        pricing: (input.pricing ?? []).map(toPricingTier),
        protocols: input.protocols ?? [],
        agentId: input.agentId ?? null,
        agentUri: input.agentUri ?? null,
        x402Endpoint: input.x402Endpoint ?? null,
      };
      const tx = await client.agent.register(args);
      return { txSignature: tx };
    }

    case "updateAgent": {
      const args: UpdateAgentArgs = {
        name: input.name ?? null,
        description: input.description ?? null,
        capabilities: input.capabilities ?? null,
        pricing: input.pricing ? input.pricing.map(toPricingTier) : null,
        protocols: input.protocols ?? null,
        agentId: input.agentId ?? null,
        agentUri: input.agentUri ?? null,
        x402Endpoint: input.x402Endpoint ?? null,
      };
      const tx = await client.agent.update(args);
      return { txSignature: tx };
    }

    case "deactivateAgent": {
      const tx = await client.agent.deactivate();
      return { txSignature: tx };
    }

    case "reactivateAgent": {
      const tx = await client.agent.reactivate();
      return { txSignature: tx };
    }

    case "reportCalls": {
      const tx = await client.agent.reportCalls(input.callsServed);
      return { txSignature: tx };
    }

    case "updateReputation": {
      const tx = await client.agent.updateReputation(
        input.avgLatencyMs,
        input.uptimePercent,
      );
      return { txSignature: tx };
    }

    case "fetchAgent": {
      const wallet = toPubkey(input.wallet);
      const data = await client.agent.fetch(wallet);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    case "fetchGlobalRegistry": {
      const data = await client.agent.fetchGlobalRegistry();
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    default:
      throw new Error(`Unknown sap-agent method: ${name}`);
  }
}

/**
 * Dispatch tool calls for the **sap-feedback** protocol.
 *
 * @name executeFeedback
 * @description Routes feedback-domain method names to `client.feedback.*` calls.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"giveFeedback"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeFeedback(client: SapClient, name: string, input: any) {
  switch (name) {
    case "giveFeedback": {
      const agentWallet = new PublicKey(input.agentWallet);
      const args: GiveFeedbackArgs = {
        score: input.score,
        tag: input.tag,
        commentHash: input.commentHash ?? null,
      };
      const tx = await client.feedback.give(agentWallet, args);
      return { txSignature: tx };
    }

    case "updateFeedback": {
      const agentWallet = new PublicKey(input.agentWallet);
      const args: UpdateFeedbackArgs = {
        newScore: input.newScore,
        newTag: input.newTag ?? null,
        commentHash: input.commentHash ?? null,
      };
      const tx = await client.feedback.update(agentWallet, args);
      return { txSignature: tx };
    }

    case "revokeFeedback": {
      const tx = await client.feedback.revoke(
        new PublicKey(input.agentWallet),
      );
      return { txSignature: tx };
    }

    case "fetchFeedback": {
      const [agentPda] = deriveAgent(new PublicKey(input.agentWallet));
      const reviewer = toPubkey(input.reviewer);
      const data = await client.feedback.fetch(agentPda, reviewer);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    default:
      throw new Error(`Unknown sap-feedback method: ${name}`);
  }
}

/**
 * Dispatch tool calls for the **sap-attestation** protocol.
 *
 * @name executeAttestation
 * @description Routes attestation-domain method names to `client.attestation.*` calls.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"createAttestation"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAttestation(client: SapClient, name: string, input: any) {
  switch (name) {
    case "createAttestation": {
      const args: CreateAttestationArgs = {
        attestationType: input.attestationType,
        metadataHash: input.metadataHash,
        expiresAt: new BN(input.expiresAt),
      };
      const tx = await client.attestation.create(
        new PublicKey(input.agentWallet),
        args,
      );
      return { txSignature: tx };
    }

    case "revokeAttestation": {
      const tx = await client.attestation.revoke(
        new PublicKey(input.agentWallet),
      );
      return { txSignature: tx };
    }

    case "fetchAttestation": {
      const [agentPda] = deriveAgent(new PublicKey(input.agentWallet));
      const attester = toPubkey(input.attester);
      const data = await client.attestation.fetch(agentPda, attester);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    default:
      throw new Error(`Unknown sap-attestation method: ${name}`);
  }
}

/**
 * Dispatch tool calls for the **sap-escrow** protocol.
 *
 * @name executeEscrow
 * @description Routes escrow-domain method names to `client.escrow.*` calls,
 *   including BN conversion for amounts and volume curves.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"createEscrow"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeEscrow(client: SapClient, name: string, input: any) {
  switch (name) {
    case "createEscrow": {
      const args: CreateEscrowArgs = {
        pricePerCall: new BN(input.pricePerCall),
        maxCalls: new BN(input.maxCalls),
        initialDeposit: new BN(input.initialDeposit),
        expiresAt: new BN(input.expiresAt),
        volumeCurve: (input.volumeCurve ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (v: any): VolumeCurveBreakpoint => ({
            afterCalls: v.afterCalls,
            pricePerCall: new BN(v.pricePerCall),
          }),
        ),
        tokenMint: toPubkey(input.tokenMint) ?? null,
        tokenDecimals: input.tokenDecimals ?? 9,
      };
      const tx = await client.escrow.create(
        new PublicKey(input.agentWallet),
        args,
      );
      return { txSignature: tx };
    }

    case "depositEscrow": {
      const tx = await client.escrow.deposit(
        new PublicKey(input.agentWallet),
        new BN(input.amount),
      );
      return { txSignature: tx };
    }

    case "settleEscrow": {
      const tx = await client.escrow.settle(
        new PublicKey(input.depositorWallet),
        new BN(input.callsToSettle),
        input.serviceHash,
      );
      return { txSignature: tx };
    }

    case "withdrawEscrow": {
      const tx = await client.escrow.withdraw(
        new PublicKey(input.agentWallet),
        new BN(input.amount),
      );
      return { txSignature: tx };
    }

    case "batchSettle": {
      const settlements: Settlement[] = input.settlements.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => ({
          callsToSettle: new BN(s.callsToSettle),
          serviceHash: s.serviceHash,
        }),
      );
      const tx = await client.escrow.settleBatch(
        new PublicKey(input.depositorWallet),
        settlements,
      );
      return { txSignature: tx };
    }

    case "fetchEscrow": {
      const [agentPda] = deriveAgent(new PublicKey(input.agentWallet));
      const depositor = toPubkey(input.depositor);
      const data = await client.escrow.fetch(agentPda, depositor);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    default:
      throw new Error(`Unknown sap-escrow method: ${name}`);
  }
}

/**
 * Dispatch tool calls for the **sap-tools** protocol.
 *
 * @name executeTools
 * @description Routes tools-domain method names to `client.tools.*` calls,
 *   handling schema hashing and enum conversions.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"publishToolByName"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTools(client: SapClient, name: string, input: any) {
  switch (name) {
    case "publishToolByName": {
      const tx = await client.tools.publishByName(
        input.toolName,
        input.protocolId,
        input.description,
        input.inputSchema,
        input.outputSchema,
        toHttpMethodNum(input.httpMethod),
        toCategoryNum(input.category),
        input.paramsCount,
        input.requiredParams,
        input.isCompound ?? false,
      );
      return { txSignature: tx };
    }

    case "inscribeToolSchema": {
      const args: InscribeToolSchemaArgs = {
        schemaType: toSchemaTypeNum(input.schemaType),
        schemaData: Buffer.from(input.schemaData, "utf-8"),
        schemaHash: hashToArray(sha256(input.schemaData)),
        compression: toCompressionNum(input.compression ?? "none"),
      };
      const tx = await client.tools.inscribeSchema(input.toolName, args);
      return { txSignature: tx };
    }

    case "updateTool": {
      const args: UpdateToolArgs = {
        descriptionHash: null,
        inputSchemaHash: null,
        outputSchemaHash: null,
        httpMethod:
          input.httpMethod != null ? toHttpMethodNum(input.httpMethod) : null,
        category:
          input.category != null ? toCategoryNum(input.category) : null,
        paramsCount: input.paramsCount ?? null,
        requiredParams: input.requiredParams ?? null,
      };
      const tx = await client.tools.update(input.toolName, args);
      return { txSignature: tx };
    }

    case "deactivateTool": {
      const tx = await client.tools.deactivate(input.toolName);
      return { txSignature: tx };
    }

    case "reactivateTool": {
      const tx = await client.tools.reactivate(input.toolName);
      return { txSignature: tx };
    }

    case "reportInvocations": {
      const tx = await client.tools.reportInvocations(
        input.toolName,
        input.invocations,
      );
      return { txSignature: tx };
    }

    case "fetchTool": {
      const [agentPda] = deriveAgent(new PublicKey(input.agentWallet));
      const data = await client.tools.fetch(agentPda, input.toolName);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    default:
      throw new Error(`Unknown sap-tools method: ${name}`);
  }
}

/**
 * Dispatch tool calls for the **sap-vault** protocol.
 *
 * @name executeVault
 * @description Routes vault-domain method names to `client.vault.*` calls,
 *   handling hex-to-bytes conversion and PDA derivation for sessions.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"initVault"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeVault(client: SapClient, name: string, input: any) {
  switch (name) {
    case "initVault": {
      const tx = await client.vault.initVault(input.vaultNonce);
      return { txSignature: tx };
    }

    case "openSession": {
      const tx = await client.vault.openSession(input.sessionHash);
      return { txSignature: tx };
    }

    case "inscribeMemory": {
      const args: InscribeMemoryArgs = {
        sequence: input.sequence,
        encryptedData: hexToBuffer(input.encryptedData),
        nonce: input.nonce,
        contentHash: input.contentHash,
        totalFragments: input.totalFragments ?? 1,
        fragmentIndex: input.fragmentIndex ?? 0,
        compression: input.compression ?? 0,
        epochIndex: input.epochIndex ?? 0,
      };
      const tx = await client.vault.inscribe(args);
      return { txSignature: tx };
    }

    case "closeSession": {
      const [agentPda] = deriveAgent(client.walletPubkey);
      const [vaultPda] = deriveVault(agentPda);
      const sessionHashBytes = hexToBytes(input.sessionHash);
      const [sessionPda] = deriveSession(vaultPda, sessionHashBytes);
      const tx = await client.vault.closeSession(vaultPda, sessionPda);
      return { txSignature: tx };
    }

    case "closeVault": {
      const tx = await client.vault.closeVault();
      return { txSignature: tx };
    }

    case "rotateNonce": {
      const tx = await client.vault.rotateNonce(input.newNonce);
      return { txSignature: tx };
    }

    case "addDelegate": {
      const tx = await client.vault.addDelegate(
        new PublicKey(input.delegatePubkey),
        input.permissions,
        BigInt(input.expiresAt),
      );
      return { txSignature: tx };
    }

    case "revokeDelegate": {
      const tx = await client.vault.revokeDelegate(
        new PublicKey(input.delegatePubkey),
      );
      return { txSignature: tx };
    }

    case "fetchVault": {
      const wallet = toPubkey(input.agentWallet) ?? client.walletPubkey;
      const [agentPda] = deriveAgent(wallet);
      const data = await client.vault.fetchVault(agentPda);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    case "fetchSession": {
      const wallet = new PublicKey(input.agentWallet);
      const [agentPda] = deriveAgent(wallet);
      const [vaultPda] = deriveVault(agentPda);
      const sessionHashBytes = hexToBytes(input.sessionHash);
      const data = await client.vault.fetchSession(vaultPda, sessionHashBytes);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    default:
      throw new Error(`Unknown sap-vault method: ${name}`);
  }
}

/**
 * Dispatch tool calls for the **sap-indexing** protocol.
 *
 * @name executeIndexing
 * @description Routes indexing-domain method names to `client.indexing.*` calls
 *   for capability and protocol index management.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"initCapabilityIndex"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeIndexing(client: SapClient, name: string, input: any) {
  switch (name) {
    case "initCapabilityIndex": {
      const tx = await client.indexing.initCapabilityIndex(input.capabilityId);
      return { txSignature: tx };
    }
    case "addToCapabilityIndex": {
      const tx = await client.indexing.addToCapabilityIndex(input.capabilityId);
      return { txSignature: tx };
    }
    case "removeFromCapabilityIndex": {
      const tx = await client.indexing.removeFromCapabilityIndex(
        input.capabilityId,
      );
      return { txSignature: tx };
    }
    case "initProtocolIndex": {
      const tx = await client.indexing.initProtocolIndex(input.protocolId);
      return { txSignature: tx };
    }
    case "addToProtocolIndex": {
      const tx = await client.indexing.addToProtocolIndex(input.protocolId);
      return { txSignature: tx };
    }
    case "removeFromProtocolIndex": {
      const tx = await client.indexing.removeFromProtocolIndex(
        input.protocolId,
      );
      return { txSignature: tx };
    }
    case "fetchCapabilityIndex": {
      const data = await client.indexing.fetchCapabilityIndex(
        input.capabilityId,
      );
      return serializeAccount(data as unknown as Record<string, unknown>);
    }
    case "fetchProtocolIndex": {
      const data = await client.indexing.fetchProtocolIndex(input.protocolId);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }
    default:
      throw new Error(`Unknown sap-indexing method: ${name}`);
  }
}

/**
 * Dispatch tool calls for the **sap-ledger** protocol.
 *
 * @name executeLedger
 * @description Routes ledger-domain method names to `client.ledger.*` calls,
 *   deriving session PDAs from hex-encoded session hashes.
 * @param client - SapClient instance
 * @param name - Method name (e.g. `"initLedger"`)
 * @param input - Zod-validated input from the LLM tool call
 * @returns Transaction signature or serialized account data
 * @internal
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeLedger(client: SapClient, name: string, input: any) {
  const resolveSessionPda = (
    sessionHash: string,
    agentWallet?: string | null,
  ) => {
    const wallet = toPubkey(agentWallet) ?? client.walletPubkey;
    const [agentPda] = deriveAgent(wallet);
    const [vaultPda] = deriveVault(agentPda);
    const sessionHashBytes = hexToBytes(sessionHash);
    const [sessionPda] = deriveSession(vaultPda, sessionHashBytes);
    return sessionPda;
  };

  switch (name) {
    case "initLedger": {
      const sessionPda = resolveSessionPda(
        input.sessionHash,
        input.agentWallet,
      );
      const tx = await client.ledger.init(sessionPda);
      return { txSignature: tx };
    }

    case "writeLedger": {
      const sessionPda = resolveSessionPda(
        input.sessionHash,
        input.agentWallet,
      );
      const data = hexToBuffer(input.data);
      const tx = await client.ledger.write(sessionPda, data, input.contentHash);
      return { txSignature: tx };
    }

    case "sealLedger": {
      const sessionPda = resolveSessionPda(
        input.sessionHash,
        input.agentWallet,
      );
      const tx = await client.ledger.seal(sessionPda);
      return { txSignature: tx };
    }

    case "closeLedger": {
      const sessionPda = resolveSessionPda(
        input.sessionHash,
        input.agentWallet,
      );
      const tx = await client.ledger.close(sessionPda);
      return { txSignature: tx };
    }

    case "fetchLedger": {
      const sessionPda = resolveSessionPda(
        input.sessionHash,
        input.agentWallet,
      );
      const data = await client.ledger.fetchLedger(sessionPda);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    case "fetchLedgerPage": {
      const sessionPda = resolveSessionPda(
        input.sessionHash,
        input.agentWallet,
      );
      const [ledgerPda] = deriveLedger(sessionPda);
      const data = await client.ledger.fetchPage(ledgerPda, input.pageIndex);
      return serializeAccount(data as unknown as Record<string, unknown>);
    }

    default:
      throw new Error(`Unknown sap-ledger method: ${name}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Plugin Factory
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a SynapsePlugin for SAP v2.
 *
 * @name createSAPPlugin
 * @description Factory function that returns a fully configured
 *   {@link SynapsePlugin} exposing 52 tools across 8 on-chain
 *   protocol domains. The plugin can be installed into a
 *   `SynapseAgentKit` instance or used standalone.
 * @param config - Plugin configuration with Anchor provider and optional program ID
 * @returns A configured {@link SynapsePlugin} instance
 * @category Plugin
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { createSAPPlugin } from '@synapse-sap/sdk/plugin';
 *
 * const sapPlugin = createSAPPlugin({ provider });
 *
 * // Use with SynapseAgentKit:
 * kit.use(sapPlugin);
 *
 * // Or standalone:
 * const executor = sapPlugin.install({ client, config: {} }).executor;
 * await executor(someMethod, someInput);
 * ```
 */
export function createSAPPlugin(config: SAPPluginConfig): SynapsePlugin {
  return {
    meta: {
      id: "sap",
      name: "SAP v2 — Synapse Agent Protocol",
      version: SAP_PLUGIN_VERSION,
      description:
        "On-chain agent identity, reputation, tool registry, encrypted memory vault, x402 escrow, attestation, discovery indexes, and unified memory ledger on Solana",
      tags: [
        "solana",
        "agent",
        "identity",
        "reputation",
        "x402",
        "escrow",
        "vault",
        "memory",
        "tools",
        "attestation",
        "erc-8004",
      ],
    },

    protocols: SAP_PROTOCOLS,

    install(_context: PluginContext): PluginInstallResult {
      const client = SapClient.from(config.provider, config.programId);
      const executor = buildExecutor(client);

      return { executor };
    },
  };
}

/**
 * Pre-built plugin object for static use patterns.
 *
 * @name SAPPlugin
 * @description Convenience namespace exposing a `configure` method
 *   that delegates to {@link createSAPPlugin}. Useful for concise
 *   one-liner instantiation.
 * @category Plugin
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SAPPlugin } from '@synapse-sap/sdk/plugin';
 *
 * const plugin = SAPPlugin.configure({ provider });
 * kit.use(plugin);
 * ```
 */
export const SAPPlugin = {
  /** Create a configured SynapsePlugin from an AnchorProvider. */
  configure: createSAPPlugin,
} as const;
