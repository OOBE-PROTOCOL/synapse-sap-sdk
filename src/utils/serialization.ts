/**
 * @module utils/serialization
 * @description JSON-safe serialization helpers for on-chain account data.
 *
 * On-chain Anchor account objects contain `PublicKey` and `BN` instances
 * that are not JSON-serializable. These helpers convert them to plain
 * strings (`base58` and decimal `string`) recursively.
 *
 * @category Utils
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { serializeAccount } from "@synapse-sap/sdk/utils";
 *
 * const raw = await program.account.agent.fetch(pda);
 * const json = serializeAccount(raw);
 * // { authority: "GBL...", totalCalls: "42", ... }
 * ```
 */

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

/**
 * Recursively convert a single value for JSON serialization.
 *
 * - `PublicKey` → base58 string
 * - `BN` → decimal string
 * - `Uint8Array` / `Buffer` → hex string
 * - `Array` → recursed
 * - plain `object` → recursed via {@link serializeAccount}
 * - primitives → identity
 *
 * @name serializeValue
 * @description Transforms a single Anchor-typed value into its JSON-safe equivalent.
 * @param value - The value to serialize.
 * @returns The JSON-safe representation of `value`.
 * @category Utils
 * @since v0.1.0
 * @example
 * ```ts
 * import { serializeValue } from "@synapse-sap/sdk/utils";
 *
 * serializeValue(new PublicKey("11111111111111111111111111111111")); // "1111..."
 * serializeValue(new BN(42)); // "42"
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeValue(value: unknown): any {
  if (value === null || value === undefined) return null;
  if (value instanceof PublicKey) return value.toBase58();
  if (BN.isBN(value)) return value.toString();
  if (value instanceof Uint8Array || Buffer.isBuffer(value))
    return Buffer.from(value).toString("hex");
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serializeAccount(value as Record<string, any>);
  }
  return value;
}

/**
 * Serialize an entire on-chain account object to a JSON-safe shape.
 *
 * Iterates over each key and delegates to {@link serializeValue}.
 * Handles `PublicKey` → base58, `BN` → string, and nested
 * objects / arrays recursively.
 *
 * @name serializeAccount
 * @description Converts all non-primitive fields in an Anchor account record to JSON-safe strings.
 * @param obj - The raw account object returned by `program.account.<name>.fetch()`.
 * @returns A new plain object with all values converted.
 * @category Utils
 * @since v0.1.0
 * @example
 * ```ts
 * import { serializeAccount } from "@synapse-sap/sdk/utils";
 *
 * const raw = await program.account.agent.fetch(pda);
 * const safe = serializeAccount(raw);
 * console.log(JSON.stringify(safe));
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = serializeValue(value);
  }
  return result;
}
