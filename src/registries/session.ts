/**
 * @module registries/session
 * @description Unified session lifecycle manager.
 *
 * Wraps the vault + ledger modules into a single cohesive API
 * that manages the full memory session lifecycle:
 *   1. Ensure vault exists (create if needed)
 *   2. Open a named session
 *   3. Initialize a ledger for the session
 *   4. Write data (ring buffer + TX log)
 *   5. Read latest entries from ring buffer
 *   6. Seal the ring buffer into permanent archive pages
 *   7. Close ledger + session when done
 *
 * This is the RECOMMENDED way to manage agent memory.
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const session = client.session;
 *
 * // Start a new conversation session
 * const ctx = await session.start("conversation-123");
 *
 * // Write messages
 * await session.write(ctx, "Hello from the agent");
 * await session.write(ctx, "Processing your request...");
 *
 * // Read latest messages from ring buffer
 * const messages = await session.readLatest(ctx);
 *
 * // Seal into permanent archive
 * await session.seal(ctx);
 *
 * // Close when done
 * await session.close(ctx);
 * ```
 */

import {
  SystemProgram,
  type PublicKey,
  type TransactionSignature,
} from "@solana/web3.js";
import { type AnchorProvider } from "@coral-xyz/anchor";
import type { SapProgram } from "../modules/base";
import {
  deriveAgent,
  deriveVault,
  deriveSession,
  deriveLedger,
  deriveLedgerPage,
  deriveGlobalRegistry,
} from "../pda";
import { sha256, hashToArray } from "../utils";
import type {
  SessionLedgerData,
  MemoryLedgerData,
  LedgerPageData,
} from "../types";

// ═══════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface SessionContext
 * @name SessionContext
 * @description Resolved session context with all derived PDAs.
 * Created by {@link SessionManager.deriveContext} or {@link SessionManager.start}.
 * Contains the human-readable session ID, SHA-256 hash, and all
 * PDA addresses needed for session operations.
 * @category Registries
 * @since v0.1.0
 */
export interface SessionContext {
  /** Human-readable session identifier. */
  readonly sessionId: string;
  /** SHA-256 of the session ID. */
  readonly sessionHash: Uint8Array;
  /** Session hash as number[] for instruction args. */
  readonly sessionHashArray: number[];
  /** Agent PDA. */
  readonly agentPda: PublicKey;
  /** Memory vault PDA. */
  readonly vaultPda: PublicKey;
  /** Session ledger PDA. */
  readonly sessionPda: PublicKey;
  /** Memory ledger PDA (unified ring buffer). */
  readonly ledgerPda: PublicKey;
  /** Wallet public key. */
  readonly wallet: PublicKey;
}

/**
 * @interface WriteResult
 * @name WriteResult
 * @description Result of writing data to a session via {@link SessionManager.write}.
 * Contains the transaction signature, content hash, and data size.
 * @category Registries
 * @since v0.1.0
 */
export interface WriteResult {
  /** Transaction signature. */
  readonly txSignature: TransactionSignature;
  /** Content hash of the written data. */
  readonly contentHash: number[];
  /** Data size in bytes. */
  readonly dataSize: number;
}

/**
 * @interface SealResult
 * @name SealResult
 * @description Result of sealing the ring buffer into a permanent archive page
 * via {@link SessionManager.seal}.
 * @category Registries
 * @since v0.1.0
 */
export interface SealResult {
  /** Transaction signature. */
  readonly txSignature: TransactionSignature;
  /** Page index of the sealed archive. */
  readonly pageIndex: number;
}

/**
 * @interface RingBufferEntry
 * @name RingBufferEntry
 * @description Decoded ring buffer entry from the on-chain memory ledger.
 * Contains raw bytes, UTF-8 text representation, and byte size.
 * @category Registries
 * @since v0.1.0
 */
export interface RingBufferEntry {
  /** Raw data bytes. */
  readonly data: Uint8Array;
  /** Data decoded as UTF-8 string (if applicable). */
  readonly text: string;
  /** Size in bytes. */
  readonly size: number;
}

/**
 * @interface SessionStatus
 * @name SessionStatus
 * @description Full session status including vault, session, and ledger state.
 * Returned by {@link SessionManager.getStatus}.
 * @category Registries
 * @since v0.1.0
 */
export interface SessionStatus {
  /** Whether the vault exists. */
  readonly vaultExists: boolean;
  /** Whether the session exists. */
  readonly sessionExists: boolean;
  /** Whether the ledger exists. */
  readonly ledgerExists: boolean;
  /** Whether the session is closed. */
  readonly isClosed: boolean;
  /** Total entries written to the ledger. */
  readonly totalEntries: number;
  /** Total data size in bytes. */
  readonly totalDataSize: string;
  /** Number of sealed archive pages. */
  readonly numPages: number;
  /** Merkle root hex string. */
  readonly merkleRoot: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Session Manager
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SessionManager
 * @description Unified session lifecycle manager for agent memory.
 *
 * Wraps vault + ledger modules into a single API that manages
 * the full memory session lifecycle: create vault, open session,
 * write data, read ring buffer, seal archives, and close sessions.
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const session = client.session;
 * const ctx = await session.start("conversation-123");
 * await session.write(ctx, "Hello from the agent");
 * const entries = await session.readLatest(ctx);
 * await session.seal(ctx);
 * await session.close(ctx);
 * ```
 */
export class SessionManager {
  private readonly wallet: PublicKey;

  constructor(private readonly program: SapProgram) {
    this.wallet = (program.provider as AnchorProvider).wallet.publicKey;
  }

  // ── Context Derivation ───────────────────────────────

  /**
   * @name deriveContext
   * @description Derive all PDAs for a session without creating anything.
   * Pure computation — no network calls.
   *
   * @param sessionId - Human-readable session identifier (hashed for PDA derivation).
   * @returns A {@link SessionContext} with all resolved PDAs.
   * @since v0.1.0
   */
  deriveContext(sessionId: string): SessionContext {
    const sessionHash = sha256(sessionId);
    const [agentPda] = deriveAgent(this.wallet);
    const [vaultPda] = deriveVault(agentPda);
    const [sessionPda] = deriveSession(vaultPda, sessionHash);
    const [ledgerPda] = deriveLedger(sessionPda);

    return {
      sessionId,
      sessionHash,
      sessionHashArray: hashToArray(sessionHash),
      agentPda,
      vaultPda,
      sessionPda,
      ledgerPda,
      wallet: this.wallet,
    };
  }

  // ── Full Lifecycle ───────────────────────────────────

  /**
   * @name start
   * @description Start a new session: ensures vault exists, opens session,
   * and initializes a ledger. Idempotent — skips any step
   * that’s already done.
   *
   * @param sessionId - Human-readable session name (hashed for PDA).
   * @param vaultNonce - Optional 32-byte nonce for vault init (only used if vault doesn’t exist).
   * @returns A {@link SessionContext} with all resolved PDAs.
   * @since v0.1.0
   */
  async start(
    sessionId: string,
    vaultNonce?: number[],
  ): Promise<SessionContext> {
    const ctx = this.deriveContext(sessionId);

    // Step 1: Ensure vault exists
    const vaultExists = await this.accountExists(ctx.vaultPda);
    if (!vaultExists) {
      const nonce = vaultNonce ?? hashToArray(sha256(`vault-nonce-${Date.now()}`));
      const [globalPda] = deriveGlobalRegistry();
      await this.methods
        .initVault(nonce)
        .accounts({
          wallet: this.wallet,
          agent: ctx.agentPda,
          vault: ctx.vaultPda,
          globalRegistry: globalPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Step 2: Open session
    const sessionExists = await this.accountExists(ctx.sessionPda);
    if (!sessionExists) {
      await this.methods
        .openSession(ctx.sessionHashArray)
        .accounts({
          wallet: this.wallet,
          vault: ctx.vaultPda,
          session: ctx.sessionPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Step 3: Initialize ledger
    const ledgerExists = await this.accountExists(ctx.ledgerPda);
    if (!ledgerExists) {
      await this.methods
        .initLedger()
        .accounts({
          wallet: this.wallet,
          session: ctx.sessionPda,
          ledger: ctx.ledgerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    return ctx;
  }

  /**
   * @name write
   * @description Write data to a session (ring buffer + permanent TX log).
   * Cost: TX fee only (~0.000005 SOL per write).
   *
   * @param ctx - Session context from {@link SessionManager.start} or {@link SessionManager.deriveContext}.
   * @param data - UTF-8 string or raw bytes to write.
   * @returns A {@link WriteResult} with the transaction signature, content hash, and data size.
   * @since v0.1.0
   */
  async write(
    ctx: SessionContext,
    data: string | Buffer | Uint8Array,
  ): Promise<WriteResult> {
    const dataBuffer =
      typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
    const contentHash = hashToArray(sha256(dataBuffer));

    const txSignature = await this.methods
      .writeLedger(dataBuffer, contentHash)
      .accounts({
        wallet: this.wallet,
        session: ctx.sessionPda,
        ledger: ctx.ledgerPda,
      })
      .rpc();

    return {
      txSignature,
      contentHash,
      dataSize: dataBuffer.length,
    };
  }

  /**
   * @name readLatest
   * @description Read the latest entries from the ring buffer.
   * FREE — uses `getAccountInfo()` on any RPC (no archival needed).
   *
   * @param ctx - Session context.
   * @returns An array of {@link RingBufferEntry} from the current ring buffer.
   * @since v0.1.0
   */
  async readLatest(ctx: SessionContext): Promise<RingBufferEntry[]> {
    const ledger = await this.fetchNullable<MemoryLedgerData>(
      "memoryLedger",
      ctx.ledgerPda,
    );
    if (!ledger) return [];

    return this.decodeRingBuffer(ledger.ring);
  }

  /**
   * @name seal
   * @description Seal the ring buffer into a permanent LedgerPage.
   * Creates a write-once, never-delete archive (~0.031 SOL per page).
   *
   * @param ctx - Session context.
   * @returns A {@link SealResult} with the transaction signature and page index.
   * @since v0.1.0
   */
  async seal(ctx: SessionContext): Promise<SealResult> {
    const ledger = await this.fetch<MemoryLedgerData>(
      "memoryLedger",
      ctx.ledgerPda,
    );
    const pageIndex = ledger.numPages;
    const [pagePda] = deriveLedgerPage(ctx.ledgerPda, pageIndex);

    const txSignature = await this.methods
      .sealLedger()
      .accounts({
        wallet: this.wallet,
        session: ctx.sessionPda,
        ledger: ctx.ledgerPda,
        page: pagePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { txSignature, pageIndex };
  }

  /**
   * @name closeLedger
   * @description Close the ledger and reclaim ~0.032 SOL rent.
   *
   * @param ctx - Session context.
   * @returns The transaction signature.
   * @since v0.1.0
   */
  async closeLedger(ctx: SessionContext): Promise<TransactionSignature> {
    return this.methods
      .closeLedger()
      .accounts({
        wallet: this.wallet,
        session: ctx.sessionPda,
        ledger: ctx.ledgerPda,
      })
      .rpc();
  }

  /**
   * @name closeSession
   * @description Close the session (no more writes allowed).
   *
   * @param ctx - Session context.
   * @returns The transaction signature.
   * @since v0.1.0
   */
  async closeSession(ctx: SessionContext): Promise<TransactionSignature> {
    return this.methods
      .closeSession()
      .accounts({
        wallet: this.wallet,
        vault: ctx.vaultPda,
        session: ctx.sessionPda,
      })
      .rpc();
  }

  /**
   * @name close
   * @description Full session teardown: close ledger → close session.
   * Reclaims all rent. Idempotent — skips steps already done.
   *
   * @param ctx - Session context.
   * @returns Resolves when the session is fully closed.
   * @since v0.1.0
   */
  async close(ctx: SessionContext): Promise<void> {
    const ledgerExists = await this.accountExists(ctx.ledgerPda);
    if (ledgerExists) {
      await this.closeLedger(ctx);
    }

    const sessionData = await this.fetchNullable<SessionLedgerData>(
      "sessionLedger",
      ctx.sessionPda,
    );
    if (sessionData && !sessionData.isClosed) {
      await this.closeSession(ctx);
    }
  }

  // ── Status & Reading ─────────────────────────────────

  /**
   * @name getStatus
   * @description Get the full status of a session.
   * Returns vault/session/ledger existence, closure state, and metrics.
   *
   * @param ctx - Session context.
   * @returns A {@link SessionStatus} with all session state information.
   * @since v0.1.0
   */
  async getStatus(ctx: SessionContext): Promise<SessionStatus> {
    const [vaultExists, sessionData, ledgerData] = await Promise.all([
      this.accountExists(ctx.vaultPda),
      this.fetchNullable<SessionLedgerData>("sessionLedger", ctx.sessionPda),
      this.fetchNullable<MemoryLedgerData>("memoryLedger", ctx.ledgerPda),
    ]);

    return {
      vaultExists,
      sessionExists: sessionData !== null,
      ledgerExists: ledgerData !== null,
      isClosed: sessionData?.isClosed ?? false,
      totalEntries: ledgerData?.numEntries ?? 0,
      totalDataSize: ledgerData?.totalDataSize?.toString() ?? "0",
      numPages: ledgerData?.numPages ?? 0,
      merkleRoot: ledgerData
        ? Buffer.from(ledgerData.merkleRoot).toString("hex")
        : "0".repeat(64),
    };
  }

  /**
   * @name readPage
   * @description Read a sealed archive page by index.
   *
   * @param ctx - Session context.
   * @param pageIndex - Zero-based index of the sealed page.
   * @returns An array of {@link RingBufferEntry} from the sealed page.
   * @since v0.1.0
   */
  async readPage(
    ctx: SessionContext,
    pageIndex: number,
  ): Promise<RingBufferEntry[]> {
    const [pagePda] = deriveLedgerPage(ctx.ledgerPda, pageIndex);
    const page = await this.fetch<LedgerPageData>("ledgerPage", pagePda);
    return this.decodeRingBuffer(page.data);
  }

  /**
   * @name readAll
   * @description Read ALL data: ring buffer (latest) + all sealed pages (history).
   * Returns entries in chronological order (oldest first).
   *
   * @param ctx - Session context.
   * @returns An array of all {@link RingBufferEntry} in chronological order.
   * @since v0.1.0
   */
  async readAll(ctx: SessionContext): Promise<RingBufferEntry[]> {
    const ledger = await this.fetchNullable<MemoryLedgerData>(
      "memoryLedger",
      ctx.ledgerPda,
    );
    if (!ledger) return [];

    const allEntries: RingBufferEntry[] = [];

    // Read all sealed pages (oldest first)
    for (let i = 0; i < ledger.numPages; i++) {
      const pageEntries = await this.readPage(ctx, i);
      allEntries.push(...pageEntries);
    }

    // Append current ring buffer (latest)
    const ringEntries = this.decodeRingBuffer(ledger.ring);
    allEntries.push(...ringEntries);

    return allEntries;
  }

  // ── Internals ────────────────────────────────────────

  /**
   * @name decodeRingBuffer
   * @description Decode a raw ring buffer byte array into structured entries.
   * Parses length-prefixed (u16 LE) entries from the byte stream.
   * @param ring - Raw ring buffer bytes.
   * @returns An array of decoded {@link RingBufferEntry}.
   * @private
   */
  private decodeRingBuffer(ring: number[] | Uint8Array): RingBufferEntry[] {
    const buf = Buffer.from(ring);
    const entries: RingBufferEntry[] = [];
    let offset = 0;

    while (offset + 2 <= buf.length) {
      const len = buf.readUInt16LE(offset);
      if (len === 0) break;
      offset += 2;
      if (offset + len > buf.length) break;
      const data = new Uint8Array(buf.subarray(offset, offset + len));
      entries.push({
        data,
        text: Buffer.from(data).toString("utf-8"),
        size: len,
      });
      offset += len;
    }

    return entries;
  }

  /**
   * @name accountExists
   * @description Check if an on-chain account exists at the given PDA.
   * @param pda - Account public key to check.
   * @returns `true` if the account exists, `false` otherwise.
   * @private
   */
  private async accountExists(pda: PublicKey): Promise<boolean> {
    const info = await this.program.provider.connection.getAccountInfo(pda);
    return info !== null;
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

  /**
   * @name fetch
   * @description Fetch an on-chain account by name and PDA. Throws if not found.
   * @param name - Anchor account discriminator name.
   * @param pda - Account public key to fetch.
   * @returns The deserialized account data.
   * @throws If the account does not exist.
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetch<T>(name: string, pda: PublicKey): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[name].fetch(pda) as Promise<T>;
  }

  /**
   * @name fetchNullable
   * @description Fetch an on-chain account by name and PDA. Returns `null` if not found.
   * @param name - Anchor account discriminator name.
   * @param pda - Account public key to fetch.
   * @returns The deserialized account data, or `null` if the account does not exist.
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchNullable<T>(name: string, pda: PublicKey): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[name].fetchNullable(pda) as Promise<T | null>;
  }
}
