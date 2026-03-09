/**
 * @module utils
 * @description Shared utilities used across SDK modules.
 */

import { createHash } from "crypto";

/**
 * Compute SHA-256 hash of a UTF-8 string or buffer.
 * Returns a 32-byte `Uint8Array` suitable for PDA seeds
 * and instruction arguments.
 */
export const sha256 = (input: string | Buffer | Uint8Array): Uint8Array => {
  const hash = createHash("sha256");
  hash.update(
    typeof input === "string" ? Buffer.from(input, "utf-8") : input,
  );
  return new Uint8Array(hash.digest());
};

/**
 * Convert a `Uint8Array` (32 bytes) to a plain `number[]`
 * for Anchor instruction arguments (hash fields).
 */
export const hashToArray = (hash: Uint8Array): number[] => Array.from(hash);

/**
 * Assert that a value satisfies a constraint, throwing a
 * descriptive error if not.
 */
export function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new RangeError(`[SAP SDK] ${message}`);
  }
}
