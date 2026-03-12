/**
 * @module indexing
 * @description Scalable discovery layer — capability indexes, protocol indexes,
 * and tool category indexes for the Synapse Agent Protocol.
 *
 * Indexes are shared PDA-based registries that map agents and tools to
 * discovery dimensions, enabling efficient on-chain lookups.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
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

/**
 * @name IndexingModule
 * @description Manages on-chain discovery indexes for the Synapse Agent Protocol.
 *   Provides methods to create, populate, prune, close, and fetch capability
 *   indexes, protocol indexes, and tool category indexes.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * // Create a capability index and add your agent
 * await sap.indexing.initCapabilityIndex("text-generation");
 * // Query agents by capability
 * const idx = await sap.indexing.fetchCapabilityIndex("text-generation");
 * ```
 */
export class IndexingModule extends BaseModule {
  // ── Helpers ──────────────────────────────────────────

  /**
   * @name hash
   * @description Hash a capability or protocol ID string for use as a PDA seed.
   *   Uses SHA-256 internally.
   * @param id - The capability or protocol identifier string.
   * @returns {Uint8Array} The 32-byte SHA-256 hash.
   * @since v0.1.0
   */
  hash(id: string): Uint8Array {
    return sha256(id);
  }

  // ── Capability Index ─────────────────────────────────

  /**
   * @name initCapabilityIndex
   * @description Create a new capability index and register the caller’s agent.
   *   The capability ID is hashed to derive the PDA.
   * @param capabilityId - Human-readable capability identifier (e.g. `"text-generation"`).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
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

  /**
   * @name addToCapabilityIndex
   * @description Add the caller’s agent to an existing capability index.
   * @param capabilityId - The capability identifier string.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name removeFromCapabilityIndex
   * @description Remove the caller’s agent from a capability index.
   * @param capabilityId - The capability identifier string.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name closeCapabilityIndex
   * @description Close an empty capability index PDA and reclaim rent.
   * @param capabilityId - The capability identifier string.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name initProtocolIndex
   * @description Create a new protocol index and register the caller’s agent.
   *   The protocol ID is hashed to derive the PDA.
   * @param protocolId - Human-readable protocol identifier (e.g. `"mcp-v1"`).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name addToProtocolIndex
   * @description Add the caller’s agent to an existing protocol index.
   * @param protocolId - The protocol identifier string.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name removeFromProtocolIndex
   * @description Remove the caller’s agent from a protocol index.
   * @param protocolId - The protocol identifier string.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name closeProtocolIndex
   * @description Close an empty protocol index PDA and reclaim rent.
   * @param protocolId - The protocol identifier string.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name initToolCategoryIndex
   * @description Create a new tool category index PDA.
   * @param category - Numeric tool category enum value.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name addToToolCategory
   * @description Add a tool to its matching category index.
   * @param category - Numeric tool category enum value.
   * @param toolPda - The tool descriptor PDA to add.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name removeFromToolCategory
   * @description Remove a tool from a category index.
   * @param category - Numeric tool category enum value.
   * @param toolPda - The tool descriptor PDA to remove.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name closeToolCategoryIndex
   * @description Close an empty tool category index PDA and reclaim rent.
   * @param category - Numeric tool category enum value.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name fetchCapabilityIndex
   * @description Fetch a deserialized `CapabilityIndex` account by capability ID.
   * @param capabilityId - The capability identifier string.
   * @returns {Promise<CapabilityIndexData>} The capability index data.
   * @throws Will throw if the capability index does not exist.
   * @since v0.1.0
   */
  async fetchCapabilityIndex(capabilityId: string): Promise<CapabilityIndexData> {
    const [pda] = deriveCapabilityIndex(this.hash(capabilityId));
    return this.fetchAccount<CapabilityIndexData>("capabilityIndex", pda);
  }

  /**
   * @name fetchCapabilityIndexNullable
   * @description Fetch a deserialized `CapabilityIndex` account, or `null`
   *   if it does not exist on-chain.
   * @param capabilityId - The capability identifier string.
   * @returns {Promise<CapabilityIndexData | null>} The capability index data or `null`.
   * @since v0.1.0
   */
  async fetchCapabilityIndexNullable(capabilityId: string): Promise<CapabilityIndexData | null> {
    const [pda] = deriveCapabilityIndex(this.hash(capabilityId));
    return this.fetchAccountNullable<CapabilityIndexData>("capabilityIndex", pda);
  }

  /**
   * @name fetchProtocolIndex
   * @description Fetch a deserialized `ProtocolIndex` account by protocol ID.
   * @param protocolId - The protocol identifier string.
   * @returns {Promise<ProtocolIndexData>} The protocol index data.
   * @throws Will throw if the protocol index does not exist.
   * @since v0.1.0
   */
  async fetchProtocolIndex(protocolId: string): Promise<ProtocolIndexData> {
    const [pda] = deriveProtocolIndex(this.hash(protocolId));
    return this.fetchAccount<ProtocolIndexData>("protocolIndex", pda);
  }

  /**
   * @name fetchProtocolIndexNullable
   * @description Fetch a deserialized `ProtocolIndex` account, or `null`
   *   if it does not exist on-chain.
   * @param protocolId - The protocol identifier string.
   * @returns {Promise<ProtocolIndexData | null>} The protocol index data or `null`.
   * @since v0.1.0
   */
  async fetchProtocolIndexNullable(protocolId: string): Promise<ProtocolIndexData | null> {
    const [pda] = deriveProtocolIndex(this.hash(protocolId));
    return this.fetchAccountNullable<ProtocolIndexData>("protocolIndex", pda);
  }

  /**
   * @name fetchToolCategoryIndex
   * @description Fetch a deserialized `ToolCategoryIndex` account by category number.
   * @param category - Numeric tool category enum value.
   * @returns {Promise<ToolCategoryIndexData>} The tool category index data.
   * @throws Will throw if the tool category index does not exist.
   * @since v0.1.0
   */
  async fetchToolCategoryIndex(category: number): Promise<ToolCategoryIndexData> {
    const [pda] = deriveToolCategoryIndex(category);
    return this.fetchAccount<ToolCategoryIndexData>("toolCategoryIndex", pda);
  }

  /**
   * @name fetchToolCategoryIndexNullable
   * @description Fetch a deserialized `ToolCategoryIndex` account, or `null`
   *   if it does not exist on-chain.
   * @param category - Numeric tool category enum value.
   * @returns {Promise<ToolCategoryIndexData | null>} The tool category index data or `null`.
   * @since v0.1.0
   */
  async fetchToolCategoryIndexNullable(category: number): Promise<ToolCategoryIndexData | null> {
    const [pda] = deriveToolCategoryIndex(category);
    return this.fetchAccountNullable<ToolCategoryIndexData>("toolCategoryIndex", pda);
  }
}
