/**
 * @module ledger
 * @description Unified onchain memory — init, write, seal, close ledger.
 *
 * The recommended memory system: fixed-cost PDA with 4KB ring buffer,
 * automatic TX log persistence, rolling merkle proof.
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import { deriveLedger, deriveLedgerPage } from "../pda";
import type { MemoryLedgerData, LedgerPageData } from "../types";

export class LedgerModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  deriveLedger(sessionPda: PublicKey): readonly [PublicKey, number] {
    return deriveLedger(sessionPda);
  }

  deriveLedgerPage(
    ledgerPda: PublicKey,
    pageIndex: number,
  ): readonly [PublicKey, number] {
    return deriveLedgerPage(ledgerPda, pageIndex);
  }

  // ── Instructions ─────────────────────────────────────

  /** Create a MemoryLedger with 4KB ring buffer (~0.032 SOL). */
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
   * Write data to the ledger (ring buffer + TX log simultaneously).
   * Cost: TX fee only (~0.000005 SOL). ZERO additional rent.
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
   * Seal the ring buffer into a permanent LedgerPage.
   * Page is WRITE-ONCE, NEVER-DELETE: ~0.031 SOL per page.
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

  /** Close a ledger PDA, reclaim ~0.032 SOL rent. */
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

  /** Fetch a MemoryLedger. */
  async fetchLedger(sessionPda: PublicKey): Promise<MemoryLedgerData> {
    const [pda] = deriveLedger(sessionPda);
    return this.fetchAccount<MemoryLedgerData>("memoryLedger", pda);
  }

  /** Fetch a MemoryLedger, or `null`. */
  async fetchLedgerNullable(sessionPda: PublicKey): Promise<MemoryLedgerData | null> {
    const [pda] = deriveLedger(sessionPda);
    return this.fetchAccountNullable<MemoryLedgerData>("memoryLedger", pda);
  }

  /** Fetch a sealed LedgerPage. */
  async fetchPage(
    ledgerPda: PublicKey,
    pageIndex: number,
  ): Promise<LedgerPageData> {
    const [pda] = deriveLedgerPage(ledgerPda, pageIndex);
    return this.fetchAccount<LedgerPageData>("ledgerPage", pda);
  }

  /** Fetch a sealed LedgerPage, or `null`. */
  async fetchPageNullable(
    ledgerPda: PublicKey,
    pageIndex: number,
  ): Promise<LedgerPageData | null> {
    const [pda] = deriveLedgerPage(ledgerPda, pageIndex);
    return this.fetchAccountNullable<LedgerPageData>("ledgerPage", pda);
  }

  /**
   * Decode the ring buffer into individual entries.
   * Each entry format: `[u16 LE data_len][data bytes]`.
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
