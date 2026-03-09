/**
 * @module tools
 * @description Tool schema registry + session checkpoints.
 *
 * Covers: publish, inscribe schema, update, deactivate/reactivate,
 * close, report invocations, session checkpoints.
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

export class ToolsModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /** Derive the ToolDescriptor PDA. */
  deriveTool(
    agentPda: PublicKey,
    toolName: string,
  ): readonly [PublicKey, number] {
    return deriveTool(agentPda, sha256(toolName));
  }

  // ── Instructions ─────────────────────────────────────

  /** Publish a new tool descriptor for an agent. */
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
   * Convenience: publish a tool using string names (auto-hashes).
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

  /** Inscribe full JSON schema into TX logs (zero rent). */
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

  /** Update a tool's schema hashes and bump version. */
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

  /** Deactivate a tool (still discoverable but marked unavailable). */
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

  /** Reactivate a previously deactivated tool. */
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

  /** Close a tool PDA (rent returned to wallet). */
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

  /** Report tool invocation count. */
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

  /** Create a checkpoint snapshot of the current session state. */
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

  /** Close a checkpoint PDA (rent returned). */
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

  /** Fetch a tool descriptor. */
  async fetch(agentPda: PublicKey, toolName: string): Promise<ToolDescriptorData> {
    const [pda] = this.deriveTool(agentPda, toolName);
    return this.fetchAccount<ToolDescriptorData>("toolDescriptor", pda);
  }

  /** Fetch a tool descriptor, or `null`. */
  async fetchNullable(agentPda: PublicKey, toolName: string): Promise<ToolDescriptorData | null> {
    const [pda] = this.deriveTool(agentPda, toolName);
    return this.fetchAccountNullable<ToolDescriptorData>("toolDescriptor", pda);
  }

  /** Fetch a checkpoint by session PDA and index. */
  async fetchCheckpoint(
    sessionPda: PublicKey,
    checkpointIndex: number,
  ): Promise<SessionCheckpointData> {
    const [pda] = deriveCheckpoint(sessionPda, checkpointIndex);
    return this.fetchAccount<SessionCheckpointData>("sessionCheckpoint", pda);
  }
}
