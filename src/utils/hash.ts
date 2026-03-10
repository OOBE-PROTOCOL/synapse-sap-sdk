/**
 * @module utils/hash
 * @description Cryptographic hashing utilities.
 *
 * @category Utils
 * @since v0.1.0
 */

import { createHash } from "crypto";

/**
 * Compute the SHA-256 hash of a UTF-8 string or byte buffer.
 *
 * Returns a 32-byte `Uint8Array` suitable for PDA seeds
 * and Anchor instruction arguments.
 *
 * @name sha256
 * @description Hashes the input using Node’s `crypto.createHash("sha256")`.
 * @param input - A UTF-8 string, `Buffer`, or `Uint8Array` to hash.
 * @returns {Uint8Array} 32-byte SHA-256 digest.
 * @category Utils
 * @since v0.1.0
 * @example
 * ```ts
 * import { sha256 } from "@synapse-sap/sdk/utils";
 *
 * const hash = sha256("jupiter:swap"); // Uint8Array (32 bytes)
 * ```
 */
export const sha256 = (input: string | Buffer | Uint8Array): Uint8Array => {
  const hash = createHash("sha256");
  hash.update(
    typeof input === "string" ? Buffer.from(input, "utf-8") : input,
  );
  return new Uint8Array(hash.digest());
};

/**
 * Convert a `Uint8Array` hash to a plain `number[]`.
 *
 * Anchor instruction argument types expect `number[]` for hash fields
 * rather than typed arrays.
 *
 * @name hashToArray
 * @description Converts a byte array (typically 32 bytes) to a plain JavaScript `number[]`.
 * @param hash - The byte array to convert.
 * @returns {number[]} Shallow copy as a plain array of numbers.
 * @category Utils
 * @since v0.1.0
 * @example
 * ```ts
 * import { sha256, hashToArray } from "@synapse-sap/sdk/utils";
 *
 * const arr = hashToArray(sha256("jupiter:swap")); // number[]
 * ```
 */
export const hashToArray = (hash: Uint8Array): number[] => Array.from(hash);
