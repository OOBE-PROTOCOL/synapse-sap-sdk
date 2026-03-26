/**
 * @module parser/client
 * @description Object-oriented wrapper for transaction parsing.
 *
 * Binds the Anchor `Program` reference so callers do not need to
 * pass it on every call. Designed as a lazy singleton accessible
 * from {@link SapClient.parser}.
 *
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * const client = SapClient.from(provider);
 *
 * // Parse a full transaction
 * const parsed = client.parser.parseTransaction(txResponse);
 *
 * // Quick instruction names
 * const names = client.parser.instructionNames(txResponse);
 *
 * // From pre-built instructions
 * const decoded = client.parser.fromInstructions(ixList);
 * ```
 */

import type { Program } from "@coral-xyz/anchor";
import type {
  PublicKey,
  TransactionInstruction,
  TransactionResponse,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { AddressLookupTableAccount } from "@solana/web3.js";

import type {
  DecodedSapInstruction,
  ParsedSapTransaction,
  ParseFilterOptions,
  SapInstructionCoder,
} from "./types";
import { parseSapInstructionsFromTransaction } from "./transaction";
import { parseSapInstructionsFromList, containsSapInstruction } from "./instructions";
import { parseSapTransactionComplete, parseSapTransactionBatch } from "./complete";
import {
  decodeInnerInstructions,
  extractAccountKeys,
  type InnerInstructionGroup,
} from "./inner";

/**
 * Stateful transaction parser bound to a specific Anchor `Program`.
 *
 * Stores the program reference, instruction coder, and program ID
 * internally so that repeated parse calls require only the
 * transaction data as input.
 *
 * @name TransactionParser
 * @category Parser
 * @since v0.5.0
 */
export class TransactionParser {
  private readonly coder: SapInstructionCoder;
  private readonly programId: PublicKey;

  /**
   * Create a new TransactionParser.
   *
   * @param program - An Anchor `Program` built from the SAP IDL.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly program: Program<any>) {
    this.coder = program.coder.instruction as unknown as SapInstructionCoder;
    this.programId = program.programId;
  }

  /**
   * Full parse: instructions + inner calls + events.
   *
   * @param tx - Raw transaction response from `connection.getTransaction`.
   * @param options - Optional filters for instructions, events, and inner calls.
   * @param addressLookupTables - Resolved lookup tables for v0 transactions.
   * @returns Complete parsed transaction, or `null` if the input is nullish.
   *
   * @since v0.5.0
   */
  parseTransaction(
    tx: TransactionResponse | VersionedTransactionResponse | null | undefined,
    options?: ParseFilterOptions,
    addressLookupTables?: AddressLookupTableAccount[],
  ): ParsedSapTransaction | null {
    return parseSapTransactionComplete(
      tx,
      this.program,
      this.programId,
      options,
      addressLookupTables,
    );
  }

  /**
   * Parse a batch of transactions.
   *
   * @param txs - Array of transaction responses (may contain `null` entries).
   * @param options - Optional parse filters.
   * @param addressLookupTables - Resolved lookup tables for v0 transactions.
   * @returns Non-null parsed transactions.
   *
   * @since v0.5.0
   */
  parseBatch(
    txs: (TransactionResponse | VersionedTransactionResponse | null | undefined)[],
    options?: ParseFilterOptions,
    addressLookupTables?: AddressLookupTableAccount[],
  ): ParsedSapTransaction[] {
    return parseSapTransactionBatch(
      txs,
      this.program,
      this.programId,
      options,
      addressLookupTables,
    );
  }

  /**
   * Decode top-level SAP instructions from a transaction response.
   *
   * @param tx - Raw transaction response.
   * @param addressLookupTables - Resolved lookup tables for v0 transactions.
   * @returns Decoded SAP instructions.
   *
   * @since v0.5.0
   */
  instructionsFromTransaction(
    tx: TransactionResponse | VersionedTransactionResponse,
    addressLookupTables?: AddressLookupTableAccount[],
  ): DecodedSapInstruction[] {
    return parseSapInstructionsFromTransaction(
      tx,
      this.coder,
      this.programId,
      addressLookupTables,
    );
  }

  /**
   * Extract only the instruction names from a transaction response.
   *
   * @param tx - Raw transaction response.
   * @param addressLookupTables - Resolved lookup tables for v0 transactions.
   * @returns Instruction name strings.
   *
   * @since v0.5.0
   */
  instructionNames(
    tx: TransactionResponse | VersionedTransactionResponse,
    addressLookupTables?: AddressLookupTableAccount[],
  ): string[] {
    return this.instructionsFromTransaction(tx, addressLookupTables).map(
      (ix) => ix.name,
    );
  }

  /**
   * Decode SAP instructions from a pre-built instruction array.
   *
   * @param instructions - The instruction list to decode.
   * @returns Decoded SAP instructions.
   *
   * @since v0.5.0
   */
  fromInstructions(
    instructions: TransactionInstruction[],
  ): DecodedSapInstruction[] {
    return parseSapInstructionsFromList(instructions, this.coder, this.programId);
  }

  /**
   * Check if any instruction in the list targets the SAP program.
   *
   * @param instructions - The instruction array to inspect.
   * @returns `true` if at least one instruction targets SAP.
   *
   * @since v0.5.0
   */
  isSapTransaction(instructions: TransactionInstruction[]): boolean {
    return containsSapInstruction(instructions, this.programId);
  }

  /**
   * Decode inner (CPI) instructions from transaction metadata.
   *
   * @param innerGroups - The `tx.meta.innerInstructions` array.
   * @param tx - The transaction response (for account key resolution).
   * @returns Decoded inner instructions.
   *
   * @since v0.5.0
   */
  decodeInner(
    innerGroups: InnerInstructionGroup[],
    tx: TransactionResponse | VersionedTransactionResponse,
  ) {
    const accountKeys = extractAccountKeys(tx);
    return decodeInnerInstructions(
      innerGroups,
      accountKeys,
      this.coder,
      this.programId,
    );
  }
}
