/**
 * @module parser
 * @description Transaction parsing utilities for SAP v2.
 *
 * Provides modular, composable functions for decoding on-chain SAP
 * transactions into typed instruction data, argument objects, account
 * lists, and protocol events.
 *
 * Three levels of parsing are available depending on your use case:
 *
 * | Function | Input | Output |
 * |----------|-------|--------|
 * | `parseSapInstructionsFromTransaction` | `TransactionResponse` (RPC) | Decoded instructions |
 * | `parseSapInstructionsFromList` | `TransactionInstruction[]` | Decoded instructions |
 * | `parseSapTransactionComplete` | `TransactionResponse` (RPC) | Instructions + events + inner calls |
 *
 * All functions are pure and stateless: they accept the Anchor coder
 * (or full Program) as a parameter, making them safe for server-side
 * indexer workers, edge functions (Node.js runtime), and test suites.
 *
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * import {
 *   parseSapTransactionComplete,
 *   parseSapInstructionsFromList,
 *   containsSapInstruction,
 * } from "@synapse-sap/sdk/parser";
 * ```
 */

// ── Types ────────────────────────────────────────────
export type {
  DecodedSapInstruction,
  DecodedInnerInstruction,
  ParsedSapTransaction,
  ParseFilterOptions,
  SapInstructionCoder,
} from "./types";

// ── Case 2A: from TransactionResponse ────────────────
export {
  parseSapInstructionsFromTransaction,
  parseSapInstructionNamesFromTransaction,
} from "./transaction";

// ── Case 2B: from TransactionInstruction[] ───────────
export {
  parseSapInstructionsFromList,
  parseSapInstructionNamesFromList,
  containsSapInstruction,
} from "./instructions";

// ── Case 2 Complete: instructions + events + inner ───
export {
  parseSapTransactionComplete,
  parseSapTransactionBatch,
} from "./complete";

// ── Inner instruction utilities ──────────────────────
export {
  decodeInnerInstructions,
  filterSapInnerInstructions,
  extractAccountKeys,
} from "./inner";
export type { CompiledInner, InnerInstructionGroup } from "./inner";

// ── OOP wrapper (for SapClient integration) ──────────
export { TransactionParser } from "./client";
