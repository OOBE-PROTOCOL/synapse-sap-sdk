/**
 * @module ledger
 * @description Unified on-chain memory — init, write, seal, and close ledger.
 *
 * The recommended memory system: fixed-cost PDA with 4 KB ring buffer,
 * automatic TX log persistence, and rolling merkle proof.
 * Write cost is TX fee only (~0.000005 SOL). ZERO additional rent.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import { deriveLedger, deriveLedgerPage } from "../pda";
import type { MemoryLedgerData, LedgerPageData } from "../types";

/**
 * @name LedgerModule
 * @description Manage on-chain memory ledgers for sessions.
 * Each session can have one MemoryLedger PDA with a 4KB ring buffer for recent entries.
 * When the ring buffer fills, it can be sealed into a permanent LedgerPage.
 * Ledgers are designed for high-frequency writes with minimal cost (~0.000005 SOL per write).
 * Sealed pages are immutable and stored on-chain (~0.031 SOL per page).
 */
/**
 * @name LedgerModule
 * @description Manages the unified on-chain memory ledger for the Solana Agent
 *   Protocol. Provides methods to initialise a ledger with a 4 KB ring buffer,
 *   write data (TX fee only), seal pages permanently, close ledgers, and
 *   decode ring buffer contents.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * // Init ledger, write data, seal
 * await sap.ledger.init(sessionPda);
 * await sap.ledger.write(sessionPda, data, contentHash);
 * await sap.ledger.seal(sessionPda);
 * ```
 */
export class LedgerModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /**
   * @name deriveLedger
   * @description Derive the `MemoryLedger` PDA for a given session.
   * @param sessionPda - The session ledger PDA.
   * @returns A tuple of `[PublicKey, bump]` for the ledger PDA.
   * @see {@link deriveLedger} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveLedger(sessionPda: PublicKey): readonly [PublicKey, number] {
    return deriveLedger(sessionPda);
  }

  /**
   * @name deriveLedgerPage
   * @description Derive a `LedgerPage` PDA for a given ledger and page index.
   * @param ledgerPda - The memory ledger PDA.
   * @param pageIndex - The zero-based page index.
   * @returns A tuple of `[PublicKey, bump]` for the page PDA.
   * @see {@link deriveLedgerPage} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveLedgerPage(
    ledgerPda: PublicKey,
    pageIndex: number,
  ): readonly [PublicKey, number] {
    return deriveLedgerPage(ledgerPda, pageIndex);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * @name init
   * @description Create a `MemoryLedger` with a 4 KB ring buffer (~0.032 SOL rent).
   * @param sessionPda - The session ledger PDA to attach the ledger to.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async init(sessionPda: PublicKey): Promise<TransactionSignature> {
    const [ledgerPda] = deriveLedger(sessionPda);

    return this.methods
      .initLedger()
      .accounts({
        wallet: this.walletPubkey,
        session: sessionPda,
        ledger: ledgerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name write
   * @description Write data to the ledger (ring buffer + TX log simultaneously).
   *   Cost: TX fee only (~0.000005 SOL). ZERO additional rent.
   * @param sessionPda - The session ledger PDA.
   * @param data - The data payload to write (Buffer or Uint8Array).
   * @param contentHash - A 32-byte SHA-256 content hash for verification.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async write(
    sessionPda: PublicKey,
    data: Buffer | Uint8Array,
    contentHash: number[],
  ): Promise<TransactionSignature> {
    const [ledgerPda] = deriveLedger(sessionPda);

    return this.methods
      .writeLedger(Buffer.from(data), contentHash)
      .accounts({
        wallet: this.walletPubkey,
        session: sessionPda,
        ledger: ledgerPda,
      })
      .rpc();
  }

  /**
   * @name seal
   * @description Seal the ring buffer into a permanent `LedgerPage`.
   *   Pages are WRITE-ONCE, NEVER-DELETE: ~0.031 SOL per page.
   *   Automatically fetches the current page index from the ledger.
   * @param sessionPda - The session ledger PDA.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async seal(sessionPda: PublicKey): Promise<TransactionSignature> {
    const [ledgerPda] = deriveLedger(sessionPda);
    // Fetch ledger to get current page index
    const ledger = await this.fetchLedger(sessionPda);
    const [pagePda] = deriveLedgerPage(ledgerPda, ledger.numPages);

    return this.methods
      .sealLedger()
      .accounts({
        wallet: this.walletPubkey,
        session: sessionPda,
        ledger: ledgerPda,
        page: pagePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name close
   * @description Close a ledger PDA and reclaim ~0.032 SOL rent.
   * @param sessionPda - The session ledger PDA.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async close(sessionPda: PublicKey): Promise<TransactionSignature> {
    const [ledgerPda] = deriveLedger(sessionPda);

    return this.methods
      .closeLedger()
      .accounts({
        wallet: this.walletPubkey,
        session: sessionPda,
        ledger: ledgerPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /**
   * @name fetchLedger
   * @description Fetch a deserialized `MemoryLedger` account.
   * @param sessionPda - The session ledger PDA.
   * @returns {Promise<MemoryLedgerData>} The memory ledger data.
   * @throws Will throw if the ledger does not exist.
   * @since v0.1.0
   */
  async fetchLedger(sessionPda: PublicKey): Promise<MemoryLedgerData> {
    const [pda] = deriveLedger(sessionPda);
    return this.fetchAccount<MemoryLedgerData>("memoryLedger", pda);
  }

  /**
   * @name fetchLedgerNullable
   * @description Fetch a deserialized `MemoryLedger` account, or `null`
   *   if it does not exist on-chain.
   * @param sessionPda - The session ledger PDA.
   * @returns {Promise<MemoryLedgerData | null>} The ledger data or `null`.
   * @since v0.1.0
   */
  async fetchLedgerNullable(sessionPda: PublicKey): Promise<MemoryLedgerData | null> {
    const [pda] = deriveLedger(sessionPda);
    return this.fetchAccountNullable<MemoryLedgerData>("memoryLedger", pda);
  }

  /**
   * @name fetchPage
   * @description Fetch a deserialized sealed `LedgerPage` account.
   * @param ledgerPda - The memory ledger PDA.
   * @param pageIndex - The zero-based page index.
   * @returns {Promise<LedgerPageData>} The ledger page data.
   * @throws Will throw if the page does not exist.
   * @since v0.1.0
   */
  async fetchPage(
    ledgerPda: PublicKey,
    pageIndex: number,
  ): Promise<LedgerPageData> {
    const [pda] = deriveLedgerPage(ledgerPda, pageIndex);
    return this.fetchAccount<LedgerPageData>("ledgerPage", pda);
  }

  /**
   * @name fetchPageNullable
   * @description Fetch a deserialized sealed `LedgerPage` account, or `null`
   *   if it does not exist on-chain.
   * @param ledgerPda - The memory ledger PDA.
   * @param pageIndex - The zero-based page index.
   * @returns {Promise<LedgerPageData | null>} The page data or `null`.
   * @since v0.1.0
   */
  async fetchPageNullable(
    ledgerPda: PublicKey,
    pageIndex: number,
  ): Promise<LedgerPageData | null> {
    const [pda] = deriveLedgerPage(ledgerPda, pageIndex);
    return this.fetchAccountNullable<LedgerPageData>("ledgerPage", pda);
  }

  /**
   * @name decodeRingBuffer
   * @description Decode the ring buffer into individual entries.
   *   Each entry is stored as `[u16 LE data_len][data bytes]`.
   *   An entry with `data_len === 0` acts as the empty sentinel.
   * @param ring - Raw ring buffer data (byte array or Uint8Array).
   * @returns {Uint8Array[]} Array of decoded data entries.
   * @since v0.1.0
   */
  decodeRingBuffer(ring: number[] | Uint8Array): Uint8Array[] {
    const buf = Buffer.from(ring);
    const entries: Uint8Array[] = [];
    let offset = 0;

    while (offset + 2 <= buf.length) {
      const len = buf.readUInt16LE(offset);
      if (len === 0) break; // empty sentinel
      offset += 2;
      if (offset + len > buf.length) break;
      entries.push(new Uint8Array(buf.subarray(offset, offset + len)));
      offset += len;
    }

    return entries;
  }
}
