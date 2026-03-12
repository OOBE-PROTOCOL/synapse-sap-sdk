/**
 * @module tools
 * @description Tool schema registry and session checkpoints for the
 * Synapse Agent Protocol.
 *
 * Covers: publish, inscribe schema, update, deactivate/reactivate,
 * close, report invocations, and session checkpoint management.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import {
  deriveAgent,
  deriveTool,
  deriveCheckpoint,
  deriveGlobalRegistry,
} from "../pda";
import type {
  ToolDescriptorData,
  SessionCheckpointData,
  PublishToolArgs,
  UpdateToolArgs,
  InscribeToolSchemaArgs,
} from "../types";
import { sha256, hashToArray } from "../utils";

/**
 * @name ToolsModule
 * @description Manages tool descriptors and session checkpoints for the
 *   Synapse Agent Protocol. Provides methods to publish, update, deactivate,
 *   reactivate, close, and fetch tool descriptors, as well as inscribe
 *   JSON schemas into TX logs and manage session checkpoints.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * // Publish a tool by name (auto-hashes)
 * const sig = await sap.tools.publishByName(
 *   "getWeather", "mcp-v1", "Fetch weather",
 *   '{"type":"object"}', '{"type":"object"}',
 *   0, 1, 2, 1, false,
 * );
 * ```
 */
export class ToolsModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /**
   * @name deriveTool
   * @description Derive the `ToolDescriptor` PDA for a given agent and tool name.
   *   The tool name is SHA-256 hashed internally.
   * @param agentPda - The agent account PDA.
   * @param toolName - The human-readable tool name.
   * @returns A tuple of `[PublicKey, bump]` for the tool PDA.
   * @see {@link deriveTool} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveTool(
    agentPda: PublicKey,
    toolName: string,
  ): readonly [PublicKey, number] {
    return deriveTool(agentPda, sha256(toolName));
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * @name publish
   * @description Publish a new tool descriptor for an agent using pre-computed
   *   hashes. For auto-hashing, prefer {@link publishByName}.
   * @param args - Tool publication parameters (name, hashes, HTTP method, category, params, etc.).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async publish(args: PublishToolArgs): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [toolPda] = deriveTool(agentPda, new Uint8Array(args.toolNameHash));
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .publishTool(
        args.toolName,
        args.toolNameHash,
        args.protocolHash,
        args.descriptionHash,
        args.inputSchemaHash,
        args.outputSchemaHash,
        args.httpMethod,
        args.category,
        args.paramsCount,
        args.requiredParams,
        args.isCompound,
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name publishByName
   * @description Convenience method to publish a tool using string names.
   *   All string arguments are automatically SHA-256 hashed.
   * @param toolName - Human-readable tool name.
   * @param protocolId - Protocol identifier (e.g. `"mcp-v1"`).
   * @param description - Tool description text.
   * @param inputSchema - JSON schema string for input validation.
   * @param outputSchema - JSON schema string for output validation.
   * @param httpMethod - Numeric HTTP method enum value.
   * @param category - Numeric tool category enum value.
   * @param paramsCount - Total number of parameters.
   * @param requiredParams - Number of required parameters.
   * @param isCompound - Whether the tool is a compound (multi-step) tool.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async publishByName(
    toolName: string,
    protocolId: string,
    description: string,
    inputSchema: string,
    outputSchema: string,
    httpMethod: number,
    category: number,
    paramsCount: number,
    requiredParams: number,
    isCompound: boolean,
  ): Promise<TransactionSignature> {
    return this.publish({
      toolName,
      toolNameHash: hashToArray(sha256(toolName)),
      protocolHash: hashToArray(sha256(protocolId)),
      descriptionHash: hashToArray(sha256(description)),
      inputSchemaHash: hashToArray(sha256(inputSchema)),
      outputSchemaHash: hashToArray(sha256(outputSchema)),
      httpMethod,
      category,
      paramsCount,
      requiredParams,
      isCompound,
    });
  }

  /**
   * @name inscribeSchema
   * @description Inscribe a full JSON schema into the transaction log (zero rent).
   *   The schema is stored as TX log data, not as PDA account data.
   * @param toolName - The human-readable tool name.
   * @param args - Schema inscription parameters (type, data, hash, compression).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async inscribeSchema(
    toolName: string,
    args: InscribeToolSchemaArgs,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [toolPda] = this.deriveTool(agentPda, toolName);

    return this.methods
      .inscribeToolSchema(
        args.schemaType,
        args.schemaData,
        args.schemaHash,
        args.compression,
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
      })
      .rpc();
  }

  /**
   * @name update
   * @description Update a tool’s schema hashes and bump its version.
   *   All fields are optional — only non-null values are written.
   * @param toolName - The human-readable tool name.
   * @param args - Partial update parameters (hashes, method, category, params).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async update(
    toolName: string,
    args: UpdateToolArgs,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [toolPda] = this.deriveTool(agentPda, toolName);

    return this.methods
      .updateTool(
        args.descriptionHash ?? null,
        args.inputSchemaHash ?? null,
        args.outputSchemaHash ?? null,
        args.httpMethod ?? null,
        args.category ?? null,
        args.paramsCount ?? null,
        args.requiredParams ?? null,
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
      })
      .rpc();
  }

  /**
   * @name deactivate
   * @description Deactivate a tool. The tool remains discoverable but is
   *   marked as unavailable.
   * @param toolName - The human-readable tool name.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async deactivate(toolName: string): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [toolPda] = this.deriveTool(agentPda, toolName);

    return this.methods
      .deactivateTool()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
      })
      .rpc();
  }

  /**
   * @name reactivate
   * @description Reactivate a previously deactivated tool.
   * @param toolName - The human-readable tool name.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async reactivate(toolName: string): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [toolPda] = this.deriveTool(agentPda, toolName);

    return this.methods
      .reactivateTool()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
      })
      .rpc();
  }

  /**
   * @name close
   * @description Close a tool PDA and reclaim rent to the owner wallet.
   * @param toolName - The human-readable tool name.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async close(toolName: string): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [toolPda] = this.deriveTool(agentPda, toolName);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .closeTool()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
        globalRegistry: globalPda,
      })
      .rpc();
  }

  /**
   * @name reportInvocations
   * @description Report tool invocation count. Updates the on-chain counter
   *   for analytics and discovery ranking.
   * @param toolName - The human-readable tool name.
   * @param invocations - The number of invocations to report.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async reportInvocations(
    toolName: string,
    invocations: number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [toolPda] = this.deriveTool(agentPda, toolName);

    return this.methods
      .reportToolInvocations(this.bn(invocations))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
      })
      .rpc();
  }

  // ── Checkpoints ──────────────────────────────────────

  /**
   * @name createCheckpoint
   * @description Create a checkpoint snapshot of the current session state.
   *   Checkpoints are indexed by session PDA and checkpoint index.
   * @param sessionPda - The session ledger PDA.
   * @param checkpointIndex - The zero-based checkpoint index.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async createCheckpoint(
    sessionPda: PublicKey,
    checkpointIndex: number,
  ): Promise<TransactionSignature> {
    const [checkpointPda] = deriveCheckpoint(sessionPda, checkpointIndex);

    return this.methods
      .createSessionCheckpoint(checkpointIndex)
      .accounts({
        wallet: this.walletPubkey,
        session: sessionPda,
        checkpoint: checkpointPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name closeCheckpoint
   * @description Close a checkpoint PDA and reclaim rent.
   * @param sessionPda - The session ledger PDA.
   * @param checkpointIndex - The zero-based checkpoint index.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async closeCheckpoint(
    sessionPda: PublicKey,
    checkpointIndex: number,
  ): Promise<TransactionSignature> {
    const [checkpointPda] = deriveCheckpoint(sessionPda, checkpointIndex);

    return this.methods
      .closeCheckpoint(checkpointIndex)
      .accounts({
        wallet: this.walletPubkey,
        session: sessionPda,
        checkpoint: checkpointPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /**
   * @name fetch
   * @description Fetch a deserialized `ToolDescriptor` account.
   * @param agentPda - The agent account PDA.
   * @param toolName - The human-readable tool name.
   * @returns {Promise<ToolDescriptorData>} The tool descriptor data.
   * @throws Will throw if the tool descriptor does not exist.
   * @since v0.1.0
   */
  async fetch(agentPda: PublicKey, toolName: string): Promise<ToolDescriptorData> {
    const [pda] = this.deriveTool(agentPda, toolName);
    return this.fetchAccount<ToolDescriptorData>("toolDescriptor", pda);
  }

  /**
   * @name fetchNullable
   * @description Fetch a deserialized `ToolDescriptor` account, or `null`
   *   if it does not exist on-chain.
   * @param agentPda - The agent account PDA.
   * @param toolName - The human-readable tool name.
   * @returns {Promise<ToolDescriptorData | null>} The tool data or `null`.
   * @since v0.1.0
   */
  async fetchNullable(agentPda: PublicKey, toolName: string): Promise<ToolDescriptorData | null> {
    const [pda] = this.deriveTool(agentPda, toolName);
    return this.fetchAccountNullable<ToolDescriptorData>("toolDescriptor", pda);
  }

  /**
   * @name fetchCheckpoint
   * @description Fetch a deserialized `SessionCheckpoint` account by session PDA and index.
   * @param sessionPda - The session ledger PDA.
   * @param checkpointIndex - The zero-based checkpoint index.
   * @returns {Promise<SessionCheckpointData>} The checkpoint data.
   * @throws Will throw if the checkpoint does not exist.
   * @since v0.1.0
   */
  async fetchCheckpoint(
    sessionPda: PublicKey,
    checkpointIndex: number,
  ): Promise<SessionCheckpointData> {
    const [pda] = deriveCheckpoint(sessionPda, checkpointIndex);
    return this.fetchAccount<SessionCheckpointData>("sessionCheckpoint", pda);
  }
}
