/**
 * @module parser/instructions
 * @description Decode SAP instruction names from a pre-built `TransactionInstruction[]`.
 *
 * This is "Case 2B": you already have the decompiled instruction list
 * (for example, from a UI that constructs instructions before sending)
 * and want to identify which ones target the SAP program.
 *
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * import { parseSapInstructionsFromList } from "@synapse-sap/sdk/parser";
 * import { SAP_PROGRAM_ID } from "@synapse-sap/sdk";
 *
 * const decoded = parseSapInstructionsFromList(
 *   instructions,
 *   program.coder.instruction,
 *   SAP_PROGRAM_ID,
 * );
 * for (const ix of decoded) {
 *   console.log(ix.name, ix.args);
 * }
 * ```
 */

import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { DecodedSapInstruction, SapInstructionCoder } from "./types";

// ================================================================
//  Public API
// ================================================================

/**
 * Decode an array of `TransactionInstruction` and return only the
 * SAP instructions with their decoded names and arguments.
 *
 * Non-SAP instructions (system, token, other programs) are silently
 * skipped. Instructions whose data cannot be decoded against the IDL
 * are still included with `name: "unknown"` and `args: null` so that
 * consumers can detect IDL mismatches or unsupported instruction
 * variants.
 *
 * @param instructions - The instruction array to inspect.
 * @param coder - An Anchor instruction coder built from the SAP IDL.
 * @param sapProgramId - The SAP program public key to filter by.
 * @returns An array of decoded SAP instructions.
 *
 * @category Parser
 * @since v0.5.0
 */
export function parseSapInstructionsFromList(
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
 * Return only the instruction names for SAP instructions in the list.
 *
 * Convenience wrapper over {@link parseSapInstructionsFromList} for
 * callers that only need the string names.
 *
 * @param instructions - The instruction array to inspect.
 * @param coder - An Anchor instruction coder for the SAP IDL.
 * @param sapProgramId - The SAP program public key.
 * @returns An array of instruction name strings.
 *
 * @category Parser
 * @since v0.5.0
 */
export function parseSapInstructionNamesFromList(
  instructions: TransactionInstruction[],
  coder: SapInstructionCoder,
  sapProgramId: PublicKey,
): string[] {
  return parseSapInstructionsFromList(instructions, coder, sapProgramId).map(
    (ix) => ix.name,
  );
}

/**
 * Check whether any instruction in the list targets the SAP program.
 *
 * Useful as a fast pre-filter before committing to a full decode pass.
 *
 * @param instructions - The instruction array to inspect.
 * @param sapProgramId - The SAP program public key.
 * @returns `true` if at least one instruction targets the SAP program.
 *
 * @category Parser
 * @since v0.5.0
 */
export function containsSapInstruction(
  instructions: TransactionInstruction[],
  sapProgramId: PublicKey,
): boolean {
  return instructions.some((ix) => ix.programId.equals(sapProgramId));
}

// ================================================================
//  Internal
// ================================================================

/**
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
