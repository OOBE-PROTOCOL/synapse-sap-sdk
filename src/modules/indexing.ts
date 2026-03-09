/**
 * @module indexing
 * @description Scalable discovery — capability indexes, protocol indexes,
 * and tool category indexes.
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import {
  deriveAgent,
  deriveCapabilityIndex,
  deriveProtocolIndex,
  deriveToolCategoryIndex,
  deriveGlobalRegistry,
} from "../pda";
import type {
  CapabilityIndexData,
  ProtocolIndexData,
  ToolCategoryIndexData,
} from "../types";
import { sha256, hashToArray } from "../utils";

export class IndexingModule extends BaseModule {
  // ── Helpers ──────────────────────────────────────────

  /** Hash a capability or protocol ID string for PDA seed. */
  hash(id: string): Uint8Array {
    return sha256(id);
  }

  // ── Capability Index ─────────────────────────────────

  /**
   * Create a new capability index and add the caller's agent.
   */
  async initCapabilityIndex(
    capabilityId: string,
  ): Promise<TransactionSignature> {
    const capHash = this.hash(capabilityId);
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [capIdxPda] = deriveCapabilityIndex(capHash);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .initCapabilityIndex(capabilityId, hashToArray(capHash))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        capabilityIndex: capIdxPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Add the caller's agent to an existing capability index. */
  async addToCapabilityIndex(
    capabilityId: string,
  ): Promise<TransactionSignature> {
    const capHash = this.hash(capabilityId);
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [capIdxPda] = deriveCapabilityIndex(capHash);

    return this.methods
      .addToCapabilityIndex(hashToArray(capHash))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        capabilityIndex: capIdxPda,
      })
      .rpc();
  }

  /** Remove the caller's agent from a capability index. */
  async removeFromCapabilityIndex(
    capabilityId: string,
  ): Promise<TransactionSignature> {
    const capHash = this.hash(capabilityId);
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [capIdxPda] = deriveCapabilityIndex(capHash);

    return this.methods
      .removeFromCapabilityIndex(hashToArray(capHash))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        capabilityIndex: capIdxPda,
      })
      .rpc();
  }

  /** Close an empty capability index PDA. */
  async closeCapabilityIndex(
    capabilityId: string,
  ): Promise<TransactionSignature> {
    const capHash = this.hash(capabilityId);
    const [capIdxPda] = deriveCapabilityIndex(capHash);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .closeCapabilityIndex(hashToArray(capHash))
      .accounts({
        wallet: this.walletPubkey,
        capabilityIndex: capIdxPda,
        globalRegistry: globalPda,
      })
      .rpc();
  }

  // ── Protocol Index ───────────────────────────────────

  /** Create a new protocol index and add the caller's agent. */
  async initProtocolIndex(
    protocolId: string,
  ): Promise<TransactionSignature> {
    const protoHash = this.hash(protocolId);
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [protoIdxPda] = deriveProtocolIndex(protoHash);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .initProtocolIndex(protocolId, hashToArray(protoHash))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        protocolIndex: protoIdxPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Add the caller's agent to an existing protocol index. */
  async addToProtocolIndex(
    protocolId: string,
  ): Promise<TransactionSignature> {
    const protoHash = this.hash(protocolId);
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [protoIdxPda] = deriveProtocolIndex(protoHash);

    return this.methods
      .addToProtocolIndex(hashToArray(protoHash))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        protocolIndex: protoIdxPda,
      })
      .rpc();
  }

  /** Remove the caller's agent from a protocol index. */
  async removeFromProtocolIndex(
    protocolId: string,
  ): Promise<TransactionSignature> {
    const protoHash = this.hash(protocolId);
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [protoIdxPda] = deriveProtocolIndex(protoHash);

    return this.methods
      .removeFromProtocolIndex(hashToArray(protoHash))
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        protocolIndex: protoIdxPda,
      })
      .rpc();
  }

  /** Close an empty protocol index PDA. */
  async closeProtocolIndex(
    protocolId: string,
  ): Promise<TransactionSignature> {
    const protoHash = this.hash(protocolId);
    const [protoIdxPda] = deriveProtocolIndex(protoHash);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .closeProtocolIndex(hashToArray(protoHash))
      .accounts({
        wallet: this.walletPubkey,
        protocolIndex: protoIdxPda,
        globalRegistry: globalPda,
      })
      .rpc();
  }

  // ── Tool Category Index ──────────────────────────────

  /** Create a new tool category index. */
  async initToolCategoryIndex(
    category: number,
  ): Promise<TransactionSignature> {
    const [catIdxPda] = deriveToolCategoryIndex(category);

    return this.methods
      .initToolCategoryIndex(category)
      .accounts({
        wallet: this.walletPubkey,
        toolCategoryIndex: catIdxPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Add a tool to its matching category index. */
  async addToToolCategory(
    category: number,
    toolPda: PublicKey,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [catIdxPda] = deriveToolCategoryIndex(category);

    return this.methods
      .addToToolCategory(category)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
        toolCategoryIndex: catIdxPda,
      })
      .rpc();
  }

  /** Remove a tool from a category index. */
  async removeFromToolCategory(
    category: number,
    toolPda: PublicKey,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [catIdxPda] = deriveToolCategoryIndex(category);

    return this.methods
      .removeFromToolCategory(category)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        tool: toolPda,
        toolCategoryIndex: catIdxPda,
      })
      .rpc();
  }

  /** Close an empty tool category index PDA. */
  async closeToolCategoryIndex(
    category: number,
  ): Promise<TransactionSignature> {
    const [catIdxPda] = deriveToolCategoryIndex(category);

    return this.methods
      .closeToolCategoryIndex(category)
      .accounts({
        wallet: this.walletPubkey,
        toolCategoryIndex: catIdxPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /** Fetch a capability index by capability ID string. */
  async fetchCapabilityIndex(capabilityId: string): Promise<CapabilityIndexData> {
    const [pda] = deriveCapabilityIndex(this.hash(capabilityId));
    return this.fetchAccount<CapabilityIndexData>("capabilityIndex", pda);
  }

  /** Fetch a capability index, or `null`. */
  async fetchCapabilityIndexNullable(capabilityId: string): Promise<CapabilityIndexData | null> {
    const [pda] = deriveCapabilityIndex(this.hash(capabilityId));
    return this.fetchAccountNullable<CapabilityIndexData>("capabilityIndex", pda);
  }

  /** Fetch a protocol index by protocol ID string. */
  async fetchProtocolIndex(protocolId: string): Promise<ProtocolIndexData> {
    const [pda] = deriveProtocolIndex(this.hash(protocolId));
    return this.fetchAccount<ProtocolIndexData>("protocolIndex", pda);
  }

  /** Fetch a protocol index, or `null`. */
  async fetchProtocolIndexNullable(protocolId: string): Promise<ProtocolIndexData | null> {
    const [pda] = deriveProtocolIndex(this.hash(protocolId));
    return this.fetchAccountNullable<ProtocolIndexData>("protocolIndex", pda);
  }

  /** Fetch a tool category index by category number. */
  async fetchToolCategoryIndex(category: number): Promise<ToolCategoryIndexData> {
    const [pda] = deriveToolCategoryIndex(category);
    return this.fetchAccount<ToolCategoryIndexData>("toolCategoryIndex", pda);
  }

  /** Fetch a tool category index, or `null`. */
  async fetchToolCategoryIndexNullable(category: number): Promise<ToolCategoryIndexData | null> {
    const [pda] = deriveToolCategoryIndex(category);
    return this.fetchAccountNullable<ToolCategoryIndexData>("toolCategoryIndex", pda);
  }
}
