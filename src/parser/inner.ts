/**
 * @module parser/inner
 * @description Decode inner (CPI) instructions from transaction metadata.
 *
 * When a SAP instruction triggers cross-program invocations, the
 * resulting inner instructions appear in `tx.meta.innerInstructions`.
 * These are stored in a "compiled" format that references account
 * indices rather than full public keys.
 *
 * This module reconstructs the full account keys from the transaction
 * message's account list and decodes any inner calls that target the
 * SAP program.
 *
 * @category Parser
 * @since v0.5.0
 *
 * @example
 * ```ts
 * import { decodeInnerInstructions } from "@synapse-sap/sdk/parser";
 *
 * const inner = decodeInnerInstructions(
 *   tx.meta?.innerInstructions ?? [],
 *   accountKeys,
 *   program.coder.instruction,
 *   SAP_PROGRAM_ID,
 * );
 * for (const cpi of inner) {
 *   if (cpi.name) console.log("SAP CPI:", cpi.name);
 * }
 * ```
 */

import { PublicKey } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import type { DecodedInnerInstruction, SapInstructionCoder } from "./types";

// ================================================================
//  Types matching Solana RPC response shapes
// ================================================================

/**
 * Shape of a single compiled inner instruction from `tx.meta.innerInstructions`.
 * Mirrors the Solana RPC `CompiledInnerInstruction` format.
 *
 * @interface CompiledInner
 * @category Parser
 * @since v0.5.0
 */
export interface CompiledInner {
  readonly programIdIndex: number;
  readonly accounts: number[];
  readonly data: string;
}

/**
 * Top-level inner instruction group from the transaction metadata.
 * Each group corresponds to one outer instruction by `index`.
 *
 * @interface InnerInstructionGroup
 * @category Parser
 * @since v0.5.0
 */
export interface InnerInstructionGroup {
  readonly index: number;
  readonly instructions: CompiledInner[];
}

// ================================================================
//  Public API
// ================================================================

/**
 * Decode inner (CPI) instructions from transaction metadata.
 *
 * Reconstructs full public keys from the compiled account indices
 * and attempts to decode each inner instruction that targets the
 * SAP program. Non-SAP inner instructions are included in the
 * result with `name: null` and `args: null`.
 *
 * @param innerInstructionGroups - The `tx.meta.innerInstructions` array.
 * @param accountKeys - Ordered list of all account public keys from the
 *   transaction message (`staticAccountKeys` for versioned, or
 *   `accountKeys` for legacy).
 * @param coder - An Anchor instruction coder built from the SAP IDL.
 * @param sapProgramId - The SAP program public key.
 * @returns An array of decoded inner instructions.
 *
 * @category Parser
 * @since v0.5.0
 */
export function decodeInnerInstructions(
  innerInstructionGroups: InnerInstructionGroup[],
  accountKeys: PublicKey[],
  coder: SapInstructionCoder,
  sapProgramId: PublicKey,
): DecodedInnerInstruction[] {
  const results: DecodedInnerInstruction[] = [];

  for (const group of innerInstructionGroups) {
    for (let innerIdx = 0; innerIdx < group.instructions.length; innerIdx++) {
      const compiled = group.instructions[innerIdx];
      if (!compiled) continue;

      const programId = resolveAccountKey(
        accountKeys,
        compiled.programIdIndex,
      );
      const accounts = compiled.accounts.map((idx) =>
        resolveAccountKey(accountKeys, idx),
      );

      let name: string | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let args: Record<string, any> | null = null;

      if (programId.equals(sapProgramId)) {
        const decoded = safeDecodeInstruction(coder, compiled.data);
        if (decoded) {
          name = decoded.name;
          args = decoded.data;
        }
      }

      results.push({
        outerIndex: group.index,
        innerIndex: innerIdx,
        name,
        args,
        accounts,
        programId,
      });
    }
  }

  return results;
}

/**
 * Filter decoded inner instructions to only those targeting the SAP program.
 *
 * @param inner - The full inner instruction list from {@link decodeInnerInstructions}.
 * @returns Only inner instructions where `name` is not `null`.
 *
 * @category Parser
 * @since v0.5.0
 */
export function filterSapInnerInstructions(
  inner: DecodedInnerInstruction[],
): DecodedInnerInstruction[] {
  return inner.filter((i) => i.name !== null);
}

// ================================================================
//  Helpers: extract account keys from various tx formats
// ================================================================

/**
 * Extract the full ordered list of account keys from a transaction
 * response, handling both legacy and versioned formats.
 *
 * For versioned transactions that include loaded addresses (from
 * address lookup tables), these are appended after the static keys
 * in the order: static, writable loaded, readonly loaded.
 *
 * @param tx - The raw transaction response from RPC.
 * @returns An ordered array of all account public keys.
 *
 * @category Parser
 * @since v0.5.0
 */
export function extractAccountKeys(
  tx: {
    transaction: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: any;
    };
    meta?: {
      loadedAddresses?: {
        writable: PublicKey[];
        readonly: PublicKey[];
      } | null;
    } | null;
  },
): PublicKey[] {
  const message = tx.transaction.message;

  // Versioned messages expose `staticAccountKeys`
  if ("staticAccountKeys" in message && Array.isArray(message.staticAccountKeys)) {
    const staticKeys: PublicKey[] = message.staticAccountKeys.map(toPubkey);
    const loaded = tx.meta?.loadedAddresses;
    if (loaded) {
      return [
        ...staticKeys,
        ...loaded.writable.map(toPubkey),
        ...loaded.readonly.map(toPubkey),
      ];
    }
    return staticKeys;
  }

  // Legacy messages expose `accountKeys`
  if ("accountKeys" in message && Array.isArray(message.accountKeys)) {
    return message.accountKeys.map(toPubkey);
  }

  return [];
}

// ================================================================
//  Internal
// ================================================================

/**
 * Safely resolve an account index to a public key, returning
 * `PublicKey.default` for out-of-bounds indices instead of throwing.
 *
 * @internal
 */
function resolveAccountKey(keys: PublicKey[], index: number): PublicKey {
  const key = keys[index];
  return key ?? PublicKey.default;
}

/**
 * Coerce a value to PublicKey. Handles both string base58 and
 * PublicKey instances returned by different RPC client versions.
 *
 * @internal
 */
function toPubkey(value: string | PublicKey): PublicKey {
  if (typeof value === "string") return new PublicKey(value);
  return value;
}

/**
 * @internal
 */
function safeDecodeInstruction(
  coder: SapInstructionCoder,
  data: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): { name: string; data: Record<string, any> } | null {
  try {
    // Inner instruction data from RPC is base58-encoded
    const buffer = Buffer.from(utils.bytes.bs58.decode(data));
    return coder.decode(buffer);
  } catch {
    // Fallback: try base64 encoding (some RPC responses use base64)
    try {
      return coder.decode(Buffer.from(data, "base64"));
    } catch {
      return null;
    }
  }
}
