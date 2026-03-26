/**
 * @module parser/complete
 * @description Full SAP transaction parser: instructions + args + accounts + events.
 *
 * This is "Case 2 Complete": given a raw transaction response, produce a
 * single {@link ParsedSapTransaction} containing every decoded instruction,
 * all inner (CPI) calls, and all SAP events extracted from the logs.
 *
 * Designed for indexer pipelines where the decode step must be pure,
 * deterministic, and fully testable without an RPC connection.
 *
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * import { parseSapTransactionComplete } from "@synapse-sap/sdk/parser";
 * import { SAP_PROGRAM_ID, SAP_IDL } from "@synapse-sap/sdk";
 * import { Program } from "\@coral-xyz/anchor";
 *
 * const program = new Program(SAP_IDL, provider);
 * const tx = await connection.getTransaction(sig, {
 *   commitment: "confirmed",
 *   maxSupportedTransactionVersion: 0,
 * });
 *
 * const parsed = parseSapTransactionComplete(tx, program, SAP_PROGRAM_ID);
 * console.log(parsed.instructions.map(i => i.name));
 * console.log(parsed.events.map(e => e.name));
 * ```
 */

import {
  AddressLookupTableAccount,
  type PublicKey,
  type TransactionResponse,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import type { Program } from "@coral-xyz/anchor";

import type {
  ParsedSapTransaction,
  ParseFilterOptions,
  DecodedInnerInstruction,
  SapInstructionCoder,
} from "./types";
import type { ParsedEvent } from "../events";
import { EventParser } from "../events";
import { parseSapInstructionsFromTransaction } from "./transaction";
import {
  decodeInnerInstructions,
  extractAccountKeys,
  type InnerInstructionGroup,
} from "./inner";

// ================================================================
//  Public API
// ================================================================

/**
 * Parse a complete SAP transaction into a unified result.
 *
 * Combines three stages:
 * 1. **Instruction decode** - top-level SAP instructions with args and accounts
 * 2. **Inner instruction decode** - CPI calls with full account reconstruction
 * 3. **Event extraction** - SAP events decoded from the transaction logs
 *
 * All three stages are safe: malformed data produces `null` fields
 * rather than exceptions. This makes the function suitable for
 * batch-processing in indexer workers where a single bad transaction
 * must not halt the pipeline.
 *
 * @param tx - The raw transaction response from `connection.getTransaction`.
 * @param program - An Anchor `Program` instance built from the SAP IDL.
 *   The coder and program ID are extracted automatically.
 * @param sapProgramId - The SAP program public key. Passed explicitly so
 *   callers can target devnet/localnet deployments independently.
 * @param options - Optional filters for instructions, events, and inner calls.
 * @param addressLookupTables - Resolved lookup table accounts for v0 transactions.
 * @returns A fully parsed transaction, or `null` if the input is `null`/`undefined`.
 *
 * @category Parser
 * @since v0.5.0
 */
export function parseSapTransactionComplete(
  tx: TransactionResponse | VersionedTransactionResponse | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program: Program<any>,
  sapProgramId: PublicKey,
  options?: ParseFilterOptions,
  addressLookupTables?: AddressLookupTableAccount[],
): ParsedSapTransaction | null {
  if (!tx) return null;

  const opts: Required<ParseFilterOptions> = {
    includeInner: options?.includeInner ?? false,
    includeEvents: options?.includeEvents ?? true,
    instructionFilter: options?.instructionFilter ?? [],
    eventFilter: options?.eventFilter ?? [],
  };

  // Extract coder from the program
  const coder = program.coder.instruction as unknown as SapInstructionCoder;

  // 1. Top-level instructions
  let instructions = parseSapInstructionsFromTransaction(
    tx,
    coder,
    sapProgramId,
    addressLookupTables,
  );

  if (opts.instructionFilter.length > 0) {
    const filterSet = new Set(opts.instructionFilter);
    instructions = instructions.filter((ix) => filterSet.has(ix.name));
  }

  // 2. Inner (CPI) instructions
  let innerInstructions: DecodedInnerInstruction[] = [];
  if (opts.includeInner && tx.meta?.innerInstructions) {
    const accountKeys = extractAccountKeys(tx);
    innerInstructions = decodeInnerInstructions(
      tx.meta.innerInstructions as unknown as InnerInstructionGroup[],
      accountKeys,
      coder,
      sapProgramId,
    );
  }

  // 3. Events from logs
  let events: ParsedEvent[] = [];
  const logs = tx.meta?.logMessages ?? [];

  if (opts.includeEvents && logs.length > 0) {
    const eventParser = new EventParser(program);
    events = eventParser.parseLogs(logs);

    if (opts.eventFilter.length > 0) {
      const filterSet = new Set(opts.eventFilter);
      events = events.filter((e) => filterSet.has(e.name as never));
    }
  }

  // 4. Metadata
  const signature = extractSignature(tx);
  const slot = tx.slot ?? null;
  const blockTime = tx.blockTime ?? null;
  const success = tx.meta?.err === null || tx.meta?.err === undefined;

  return {
    signature,
    slot,
    blockTime,
    success,
    instructions,
    innerInstructions,
    events,
    logs,
  };
}

/**
 * Parse multiple transactions in batch.
 *
 * Convenience wrapper for indexer pipelines that process pages of
 * transactions. Skips `null` entries and failed decodes silently.
 *
 * @param txs - Array of transaction responses (may contain `null` entries).
 * @param program - The Anchor SAP program instance.
 * @param sapProgramId - The SAP program public key.
 * @param options - Optional parse filters applied to every transaction.
 * @param addressLookupTables - Lookup tables for v0 transactions.
 * @returns An array of non-null parsed transactions.
 *
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * const signatures = await connection.getSignaturesForAddress(agentPda);
 * const txs = await Promise.all(
 *   signatures.map(s => connection.getTransaction(s.signature, { ... }))
 * );
 * const parsed = parseSapTransactionBatch(txs, program, SAP_PROGRAM_ID, {
 *   includeEvents: true,
 *   includeInner: true,
 * });
 * ```
 */
export function parseSapTransactionBatch(
  txs: (TransactionResponse | VersionedTransactionResponse | null | undefined)[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program: Program<any>,
  sapProgramId: PublicKey,
  options?: ParseFilterOptions,
  addressLookupTables?: AddressLookupTableAccount[],
): ParsedSapTransaction[] {
  const results: ParsedSapTransaction[] = [];
  for (const tx of txs) {
    const parsed = parseSapTransactionComplete(
      tx,
      program,
      sapProgramId,
      options,
      addressLookupTables,
    );
    if (parsed) results.push(parsed);
  }
  return results;
}

// ================================================================
//  Internal
// ================================================================

/**
 * Extract the transaction signature from the response.
 * Different RPC clients expose it in different locations.
 *
 * @internal
 */
function extractSignature(
  tx: TransactionResponse | VersionedTransactionResponse,
): string | null {
  // Some clients expose signatures on the transaction object
  const txObj = tx.transaction;
  if ("signatures" in txObj && Array.isArray(txObj.signatures) && txObj.signatures.length > 0) {
    const first = txObj.signatures[0];
    if (typeof first === "string") return first;
  }
  return null;
}
