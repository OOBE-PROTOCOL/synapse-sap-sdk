// ===============================================================
//  Legacy Memory Module — IDL v1.0.0+
//  Buffer, Digest, Memory, and Plugin instructions
// ===============================================================

import { PublicKey, Signer, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';

/**
 * LegacyMemoryModule provides methods for buffer, digest, memory,
 * and plugin operations on the Synapse Agent Protocol (SAP).
 * 
 * @deprecated v1.0.0 — Legacy memory system is deprecated.
 * Use the new Vault/Memory system (`VaultModule`, `inscribeMemory()`) for new deployments.
 * This module is kept for backward compatibility with existing legacy deployments.
 * 
 * @see {@link VaultModule} for modern memory inscription
 * @see {@link inscribeMemory} for new memory API
 */
export class LegacyMemoryModule {
  constructor(private program: Program) {}

  // ═══════════════════════════════════════════════════════════
  //  Buffer System (3 instructions)
  // ═══════════════════════════════════════════════════════════

  /**
   * @deprecated v1.0.0 — Use `VaultModule.inscribeMemory()` instead.
   * Create a buffer for chunked data uploads.
   * @description Initializes a buffer PDA for paginated memory storage.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Buffer authority wallet
   * @param {PublicKey} ctx.session - Session PDA
   * @param {PublicKey} ctx.buffer - Buffer PDA to create
   * @param {number} ctx.pageIndex - Page index for pagination
   * @param {number} ctx.maxSize - Maximum buffer size in bytes
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async createBuffer(ctx: { signer: Signer; authority: PublicKey; session: PublicKey; buffer: PublicKey; pageIndex: number; maxSize: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.createBuffer(ctx.pageIndex, ctx.maxSize)
      .accounts({
        authority: ctx.authority,
        session: ctx.session,
        buffer: ctx.buffer,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule.inscribeMemory()` instead.
   * Append data to an existing buffer.
   * @description Adds encrypted data chunk to buffer page.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Buffer authority wallet
   * @param {PublicKey} ctx.buffer - Buffer PDA
   * @param {Buffer} ctx.data - Data chunk to append
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async appendBuffer(ctx: { signer: Signer; authority: PublicKey; buffer: PublicKey; data: Buffer; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.appendBuffer(Array.from(ctx.data))
      .accounts({
        authority: ctx.authority,
        buffer: ctx.buffer,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule.closeMemoryEntry()` instead.
   * Close a buffer and reclaim rent.
   * @description Permanently closes a buffer PDA, transferring remaining rent to authority.
   * @param {Object} ctx - Context object containing required accounts and signers
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Buffer authority wallet
   * @param {PublicKey} ctx.buffer - Buffer PDA to close
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async closeBuffer(ctx: { signer: Signer; authority: PublicKey; buffer: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeBuffer()
      .accounts({
        authority: ctx.authority,
        buffer: ctx.buffer,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  // ═══════════════════════════════════════════════════════════
  //  Digest System (5 instructions)
  // ═══════════════════════════════════════════════════════════

  /**
   * @deprecated v1.0.0 — Use `VaultModule` + `DigestModule` instead.
   * Initialize a digest account.
   * @description Creates a digest PDA for proof-of-memory verification.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Digest authority wallet
   * @param {PublicKey} ctx.session - Session PDA
   * @param {PublicKey} ctx.digest - Digest PDA to create
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async initDigest(ctx: { signer: Signer; authority: PublicKey; session: PublicKey; digest: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.initDigest()
      .accounts({
        authority: ctx.authority,
        session: ctx.session,
        digest: ctx.digest,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule.inscribeMemory()` instead.
   * Post data to digest for inscription.
   * @description Adds data chunk to digest merkle chain.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Digest authority wallet
   * @param {PublicKey} ctx.digest - Digest PDA
   * @param {Buffer} ctx.data - Data chunk to post
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async postDigest(ctx: { signer: Signer; authority: PublicKey; digest: PublicKey; data: Buffer; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.postDigest(Array.from(ctx.data))
      .accounts({
        authority: ctx.authority,
        digest: ctx.digest,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule` inscription flow instead.
   * Inscribe digest to transaction log.
   * @description Permanently inscribes merkle root and content hash to TX log.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Digest authority wallet
   * @param {PublicKey} ctx.digest - Digest PDA
   * @param {number[]} ctx.contentHash - SHA-256 hash of content
   * @param {number[]} ctx.merkleRoot - Merkle root of data chunks
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async inscribeToDigest(ctx: { signer: Signer; authority: PublicKey; digest: PublicKey; contentHash: number[]; merkleRoot: number[]; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.inscribeToDigest(ctx.contentHash, ctx.merkleRoot)
      .accounts({
        authority: ctx.authority,
        digest: ctx.digest,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Not needed with new Vault system.
   * Update digest storage metadata.
   * @description Updates digest merkle root and chunk count.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Digest authority wallet
   * @param {PublicKey} ctx.digest - Digest PDA
   * @param {number[]} ctx.merkleRoot - New merkle root
   * @param {number} ctx.totalChunks - Total chunks count
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async updateDigestStorage(ctx: { signer: Signer; authority: PublicKey; digest: PublicKey; merkleRoot: number[]; totalChunks: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.updateDigestStorage(ctx.merkleRoot, ctx.totalChunks)
      .accounts({
        authority: ctx.authority,
        digest: ctx.digest,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule.closeMemoryEntry()` instead.
   * Close a digest account and reclaim rent.
   * @description Permanently closes a digest PDA, transferring remaining rent to authority.
   * @param {Object} ctx - Context object containing required accounts and signers
   * @param {Signer} ctx.signer - Transaction signer (authority)
   * @param {PublicKey} ctx.authority - Digest authority wallet
   * @param {PublicKey} ctx.digest - Digest PDA to close
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async closeDigest(ctx: { signer: Signer; authority: PublicKey; digest: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeDigest()
      .accounts({
        authority: ctx.authority,
        digest: ctx.digest,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  // ═══════════════════════════════════════════════════════════
  //  Memory System (4 instructions)
  // ═══════════════════════════════════════════════════════════

  /**
   * @deprecated v1.0.0 — Use `VaultModule.inscribeMemory()` instead.
   * Store memory entry permanently.
   * @description Creates a memory entry PDA and inscribes proof to TX log.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (wallet)
   * @param {PublicKey} ctx.wallet - Wallet authority
   * @param {PublicKey} ctx.agent - Agent PDA
   * @param {PublicKey} ctx.vault - Memory vault PDA
   * @param {PublicKey} ctx.session - Session PDA
   * @param {PublicKey} ctx.memoryEntry - Memory entry PDA to create
   * @param {number} ctx.sequence - Sequence number
   * @param {number[]} ctx.contentHash - SHA-256 hash of content
   * @param {number} ctx.totalBytes - Total bytes stored
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async storeMemory(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; memoryEntry: PublicKey; sequence: number; contentHash: number[]; totalBytes: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.storeMemory(ctx.sequence, ctx.contentHash, ctx.totalBytes)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        memoryEntry: ctx.memoryEntry,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule.inscribeMemory()` with chunked flow instead.
   * Append memory chunk to vault.
   * @description Adds encrypted data fragment to memory vault.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (wallet)
   * @param {PublicKey} ctx.wallet - Wallet authority
   * @param {PublicKey} ctx.agent - Agent PDA
   * @param {PublicKey} ctx.vault - Memory vault PDA
   * @param {PublicKey} ctx.session - Session PDA
   * @param {PublicKey} ctx.chunk - Memory chunk PDA
   * @param {number} ctx.sequence - Sequence number
   * @param {Buffer} ctx.encryptedData - Encrypted data fragment
   * @param {number[]} ctx.nonce - Encryption nonce
   * @param {number} ctx.totalFragments - Total fragments count
   * @param {number} ctx.fragmentIndex - Current fragment index
   * @param {number} ctx.compression - Compression type (0=none, 1=gzip, 2=zstd)
   * @param {number} ctx.epochIndex - Epoch index for rotation
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async appendMemoryChunk(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; vault: PublicKey; session: PublicKey; chunk: PublicKey; sequence: number; encryptedData: Buffer; nonce: number[]; totalFragments: number; fragmentIndex: number; compression: number; epochIndex: number; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.appendMemoryChunk(
        ctx.sequence,
        Array.from(ctx.encryptedData),
        ctx.nonce,
        ctx.totalFragments,
        ctx.fragmentIndex,
        ctx.compression,
        ctx.epochIndex
      )
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        vault: ctx.vault,
        session: ctx.session,
        chunk: ctx.chunk,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule.closeMemoryEntry()` instead.
   * Close a memory chunk and reclaim rent.
   * @description Permanently closes a memory chunk PDA, transferring remaining rent.
   * @param {Object} ctx - Context object containing required accounts and signers
   * @param {Signer} ctx.signer - Transaction signer (wallet)
   * @param {PublicKey} ctx.wallet - Wallet authority
   * @param {PublicKey} ctx.vault - Memory vault PDA
   * @param {PublicKey} ctx.chunk - Memory chunk PDA to close
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async closeMemoryChunk(ctx: { signer: Signer; wallet: PublicKey; vault: PublicKey; chunk: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeMemoryChunk()
      .accounts({
        wallet: ctx.wallet,
        vault: ctx.vault,
        chunk: ctx.chunk,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Use `VaultModule.closeMemoryEntry()` instead.
   * Close a memory entry and reclaim rent.
   * @description Permanently closes a memory entry PDA, transferring remaining rent.
   * @param {Object} ctx - Context object containing required accounts and signers
   * @param {Signer} ctx.signer - Transaction signer (wallet)
   * @param {PublicKey} ctx.wallet - Wallet authority
   * @param {PublicKey} ctx.vault - Memory vault PDA
   * @param {PublicKey} ctx.memoryEntry - Memory entry PDA to close
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async closeMemoryEntry(ctx: { signer: Signer; wallet: PublicKey; vault: PublicKey; memoryEntry: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closeMemoryEntry()
      .accounts({
        wallet: ctx.wallet,
        vault: ctx.vault,
        memoryEntry: ctx.memoryEntry,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  // ═══════════════════════════════════════════════════════════
  //  Plugin System (2 instructions)
  // ═══════════════════════════════════════════════════════════

  /**
   * @deprecated v1.0.0 — Plugin system is deprecated. Use direct tool publishing instead.
   * Register a plugin for an agent.
   * @description Creates a plugin reference PDA with metadata.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer (agent owner)
   * @param {PublicKey} ctx.wallet - Agent owner's wallet
   * @param {PublicKey} ctx.agent - Agent PDA
   * @param {PublicKey} ctx.pluginRef - Plugin reference PDA to create
   * @param {number[]} ctx.pluginId - Unique plugin identifier (32 bytes)
   * @param {string} ctx.pluginUri - Plugin metadata URI
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async registerPlugin(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; pluginRef: PublicKey; pluginId: number[]; pluginUri: string; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.registerPlugin(ctx.pluginId, ctx.pluginUri)
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        pluginRef: ctx.pluginRef,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

  /**
   * @deprecated v1.0.0 — Plugin system is deprecated.
   * Close a plugin reference and reclaim rent.
   * @description Permanently closes a plugin reference PDA, transferring remaining rent.
   * @param {Object} ctx - Context object containing required accounts and signers
   * @param {Signer} ctx.signer - Transaction signer (agent owner)
   * @param {PublicKey} ctx.wallet - Agent owner's wallet
   * @param {PublicKey} ctx.agent - Agent PDA
   * @param {PublicKey} ctx.pluginRef - Plugin reference PDA to close
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async closePlugin(ctx: { signer: Signer; wallet: PublicKey; agent: PublicKey; pluginRef: PublicKey; remainingAccounts?: any[] }): Promise<TransactionInstruction> {
    return this.program
      .methods.closePlugin()
      .accounts({
        wallet: ctx.wallet,
        agent: ctx.agent,
        pluginRef: ctx.pluginRef,
      })
      .remainingAccounts(ctx.remainingAccounts ?? [])
      .signers([ctx.signer])
      .instruction();
  }

}
