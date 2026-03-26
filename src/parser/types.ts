/**
 * @module parser/types
 * @description Type definitions for SAP v2 transaction parsing.
 *
 * Provides strongly-typed interfaces for decoded instruction data,
 * account metadata, inner (CPI) instructions, and the full parsed
 * transaction result used by indexers and explorers.
 *
 * @category Parser
 * @since v0.5.0
 */

import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { ParsedEvent, SapEventName } from "../events";

// ================================================================
//  Decoded Instruction
// ================================================================

/**
 * A single SAP instruction decoded from on-chain transaction data.
 *
 * Contains the human-readable instruction name (as declared in the
 * Anchor IDL), the decoded argument object, the ordered list of
 * account keys, and the raw instruction for advanced consumers.
 *
 * @interface DecodedSapInstruction
 * @category Parser
 * @since v0.5.0
 */
export interface DecodedSapInstruction {
  /** Instruction name matching the Anchor IDL method (e.g. `"registerAgent"`). */
  readonly name: string;
  /**
   * Decoded arguments object. Keys match the Anchor IDL argument names.
   * Returns `null` when decoding fails (e.g. IDL mismatch).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly args: Record<string, any> | null;
  /** Ordered list of account public keys passed to the instruction. */
  readonly accounts: PublicKey[];
  /** The original `TransactionInstruction`, useful for re-simulation or forwarding. */
  readonly raw: TransactionInstruction;
}

// ================================================================
//  Inner (CPI) Instruction
// ================================================================

/**
 * An inner instruction produced by cross-program invocation (CPI)
 * within a SAP transaction.
 *
 * Inner instructions are indexed by the outer instruction position
 * that triggered them. Each entry includes the decoded SAP name
 * when the inner call targets the SAP program, or `null` otherwise.
 *
 * @interface DecodedInnerInstruction
 * @category Parser
 * @since v0.5.0
 */
export interface DecodedInnerInstruction {
  /** Zero-based index of the outer instruction that triggered this CPI call. */
  readonly outerIndex: number;
  /** Zero-based position within the inner instruction set of the parent. */
  readonly innerIndex: number;
  /** SAP instruction name if the CPI targets the SAP program, `null` otherwise. */
  readonly name: string | null;
  /** Decoded arguments when the CPI targets SAP and decoding succeeds. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly args: Record<string, any> | null;
  /** Ordered account keys for this inner instruction. */
  readonly accounts: PublicKey[];
  /** The program that was invoked by this inner call. */
  readonly programId: PublicKey;
}

// ================================================================
//  Parsed Transaction (complete result)
// ================================================================

/**
 * Full parse result for a single SAP transaction.
 *
 * Combines top-level instruction decoding, inner instruction
 * analysis, and event extraction into one unified structure
 * suitable for indexing, analytics dashboards, and protocol
 * explorers.
 *
 * @interface ParsedSapTransaction
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * const result = parseSapTransactionComplete(tx, program, SAP_PROGRAM_ID);
 * for (const ix of result.instructions) {
 *   console.log(ix.name, ix.args);
 * }
 * for (const event of result.events) {
 *   console.log(event.name, event.data);
 * }
 * ```
 */
export interface ParsedSapTransaction {
  /** Transaction signature (base-58), extracted from the response when available. */
  readonly signature: string | null;
  /** Slot at which the transaction was confirmed. */
  readonly slot: number | null;
  /** Block timestamp (unix seconds) or `null` if unavailable. */
  readonly blockTime: number | null;
  /** Whether the transaction succeeded (`true`) or failed. */
  readonly success: boolean;
  /** Top-level SAP instructions found in the transaction. */
  readonly instructions: DecodedSapInstruction[];
  /** All inner (CPI) instructions, including non-SAP programs. */
  readonly innerInstructions: DecodedInnerInstruction[];
  /** Decoded SAP events extracted from the transaction logs. */
  readonly events: ParsedEvent[];
  /** Raw log lines from the transaction, for additional debugging. */
  readonly logs: string[];
}

// ================================================================
//  Filter helpers
// ================================================================

/**
 * Options for filtering parsed instruction results.
 *
 * @interface ParseFilterOptions
 * @category Parser
 * @since v0.5.0
 */
export interface ParseFilterOptions {
  /**
   * When `true`, include inner (CPI) instructions in the parse
   * result. Defaults to `false` because inner instruction
   * reconstruction requires additional account-table lookups.
   */
  readonly includeInner?: boolean;
  /**
   * When `true`, decode and attach SAP events from the
   * transaction logs. Defaults to `true`.
   */
  readonly includeEvents?: boolean;
  /**
   * Restrict the result to instructions matching one of these
   * names. When `undefined` or empty, all SAP instructions are
   * returned.
   */
  readonly instructionFilter?: string[];
  /**
   * Restrict events to those matching one of these names.
   * When `undefined` or empty, all events are returned.
   */
  readonly eventFilter?: SapEventName[];
}

// ================================================================
//  Coder interface (minimal contract)
// ================================================================

/**
 * Minimal interface for the Anchor instruction coder.
 *
 * Extracted so that parser functions can accept either a full
 * `Program` instance or a standalone coder/IDL pair without
 * requiring a live RPC connection.
 *
 * @interface SapInstructionCoder
 * @category Parser
 * @since v0.5.0
 */
export interface SapInstructionCoder {
  /** Decode raw instruction data into a name and typed argument object. */
  decode(
    data: Buffer | Uint8Array,
    encoding?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): { name: string; data: Record<string, any> } | null;
}
