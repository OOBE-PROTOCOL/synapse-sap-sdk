/**
 * @module parser/transaction
 * @description Decode SAP instruction names from a raw `TransactionResponse`.
 *
 * This is "Case 2A": you have a transaction response object obtained
 * from `connection.getTransaction(signature, ...)` and need to extract
 * the SAP instruction names, arguments, and account keys.
 *
 * The function handles both legacy and versioned (v0) transactions
 * by decompiling the message into `TransactionInstruction[]` and then
 * filtering for instructions whose `programId` matches the SAP program.
 *
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * import { parseSapInstructionsFromTransaction } from "@synapse-sap/sdk/parser";
 * import { SAP_PROGRAM_ID } from "@synapse-sap/sdk";
 *
 * const tx = await connection.getTransaction(sig, {
 *   commitment: "confirmed",
 *   maxSupportedTransactionVersion: 0,
 * });
 * if (!tx) throw new Error("Transaction not found");
 *
 * const decoded = parseSapInstructionsFromTransaction(
 *   tx,
 *   program.coder.instruction,
 *   SAP_PROGRAM_ID,
 * );
 * for (const ix of decoded) {
 *   console.log(ix.name, ix.args);
 * }
 * ```
 */

import {
  TransactionMessage,
  AddressLookupTableAccount,
  type PublicKey,
  type TransactionInstruction,
  type VersionedTransactionResponse,
  type TransactionResponse,
} from "@solana/web3.js";
import type { DecodedSapInstruction, SapInstructionCoder } from "./types";

// ================================================================
//  Public API
// ================================================================

/**
 * Extract and decode SAP instructions from a transaction response.
 *
 * Supports both legacy (`TransactionResponse`) and versioned
 * (`VersionedTransactionResponse`) formats. For versioned
 * transactions that use address lookup tables, pass the resolved
 * lookup table accounts so that `TransactionMessage.decompile`
 * can reconstruct the full account list.
 *
 * @param tx - The transaction response from `connection.getTransaction`.
 * @param coder - An Anchor instruction coder built from the SAP IDL.
 * @param sapProgramId - The SAP program public key to filter by.
 * @param addressLookupTables - Resolved lookup table accounts for v0 transactions.
 *   Required when the transaction uses address lookup tables; omit for legacy txs.
 * @returns An array of decoded SAP instructions found in the transaction.
 *
 * @throws {Error} When the transaction message cannot be decompiled.
 *
 * @category Parser
 * @since v0.5.0
 */
export function parseSapInstructionsFromTransaction(
  tx: TransactionResponse | VersionedTransactionResponse,
  coder: SapInstructionCoder,
  sapProgramId: PublicKey,
  addressLookupTables?: AddressLookupTableAccount[],
): DecodedSapInstruction[] {
  const instructions = decompileTransaction(tx, addressLookupTables);
  return decodeSapInstructions(instructions, coder, sapProgramId);
}

/**
 * Extract only the SAP instruction names from a transaction response.
 *
 * Lighter-weight alternative to {@link parseSapInstructionsFromTransaction}
 * when you only need the instruction names without decoded arguments.
 *
 * @param tx - The transaction response.
 * @param coder - An Anchor instruction coder built from the SAP IDL.
 * @param sapProgramId - The SAP program public key.
 * @param addressLookupTables - Resolved lookup table accounts for v0 transactions.
 * @returns An array of instruction name strings.
 *
 * @category Parser
 * @since v0.5.0
 */
export function parseSapInstructionNamesFromTransaction(
  tx: TransactionResponse | VersionedTransactionResponse,
  coder: SapInstructionCoder,
  sapProgramId: PublicKey,
  addressLookupTables?: AddressLookupTableAccount[],
): string[] {
  return parseSapInstructionsFromTransaction(
    tx,
    coder,
    sapProgramId,
    addressLookupTables,
  ).map((ix) => ix.name);
}

// ================================================================
//  Internal helpers
// ================================================================

/**
 * Decompile a transaction response into an array of `TransactionInstruction`.
 *
 * Handles both legacy messages (which already contain full account keys)
 * and versioned v0 messages (which require address lookup table resolution).
 *
 * @internal
 */
function decompileTransaction(
  tx: TransactionResponse | VersionedTransactionResponse,
  addressLookupTables?: AddressLookupTableAccount[],
): TransactionInstruction[] {
  const message = tx.transaction.message;

  // Versioned transactions expose `version` on the response object.
  // Legacy transactions have either `version = "legacy"` or no field at all.
  const isVersioned =
    "version" in tx && tx.version !== undefined && tx.version !== "legacy";

  if (isVersioned) {
    // VersionedMessage requires decompile with optional lookup tables
    const decompiledMessage = TransactionMessage.decompile(
      message as import("@solana/web3.js").VersionedMessage,
      addressLookupTables?.length
        ? { addressLookupTableAccounts: addressLookupTables }
        : undefined,
    );
    return decompiledMessage.instructions;
  }

  // Legacy message: decompile directly
  const decompiledMessage = TransactionMessage.decompile(
    message as import("@solana/web3.js").VersionedMessage,
  );
  return decompiledMessage.instructions;
}

/**
 * Decode a list of raw `TransactionInstruction` into typed SAP results.
 *
 * Filters for instructions whose `programId` matches the SAP program,
 * then runs each through the Anchor instruction coder.
 *
 * @internal
 */
function decodeSapInstructions(
  instructions: TransactionInstruction[],
  coder: SapInstructionCoder,
  sapProgramId: PublicKey,
): DecodedSapInstruction[] {
  const results: DecodedSapInstruction[] = [];

  for (const ix of instructions) {
    if (!ix.programId.equals(sapProgramId)) continue;

    const decoded = safeDecodeInstruction(coder, ix.data);
    results.push({
      name: decoded?.name ?? "unknown",
      args: decoded?.data ?? null,
      accounts: ix.keys.map((k) => k.pubkey),
      raw: ix,
    });
  }

  return results;
}

/**
 * Attempt to decode instruction data, returning `null` on failure
 * instead of throwing. This prevents a single malformed instruction
 * from breaking the entire parse pipeline.
 *
 * @internal
 */
function safeDecodeInstruction(
  coder: SapInstructionCoder,
  data: Buffer | Uint8Array,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): { name: string; data: Record<string, any> } | null {
  try {
    return coder.decode(Buffer.from(data));
  } catch {
    return null;
  }
}
