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

/**
 * Compute the deterministic batch root used by `settle_batch` (v0.10.0).
 *
 * The on-chain program enforces:
 *   `batch_root == sha256(s_0 || s_1 || ... || s_{N-1})`
 * where each `s_i` is a 32-byte service hash, in the same order as the
 * `settlements: Settlement[]` array passed to the instruction.
 *
 * Use this helper to derive the seed for the {@link deriveSettlementReceipt}
 * PDA when batching settlements.
 *
 * @name computeBatchRoot
 * @param serviceHashes - Array of 32-byte service hashes (Buffer/Uint8Array/number[]).
 * @returns {Uint8Array} 32-byte batch root.
 * @throws If any `serviceHashes[i]` is not exactly 32 bytes long.
 * @category Utils
 * @since v0.10.0
 *
 * @example
 * ```ts
 * import { computeBatchRoot, hashToArray } from "@synapse-sap/sdk/utils";
 *
 * const root = computeBatchRoot([h1, h2, h3]);
 * await client.escrow.settleBatch(depositor, settlements, root);
 * ```
 */
export const computeBatchRoot = (
  serviceHashes: ReadonlyArray<Uint8Array | Buffer | number[]>,
): Uint8Array => {
  if (serviceHashes.length === 0) {
    throw new Error("computeBatchRoot: serviceHashes must not be empty");
  }
  const hash = createHash("sha256");
  for (let i = 0; i < serviceHashes.length; i++) {
    const h = serviceHashes[i];
    let buf: Buffer;
    if (h instanceof Uint8Array) {
      buf = Buffer.from(h);
    } else if (Array.isArray(h)) {
      buf = Buffer.from(h);
    } else {
      throw new Error(
        `computeBatchRoot: serviceHashes[${i}] is undefined or unsupported type`,
      );
    }
    if (buf.length !== 32) {
      throw new Error(
        `computeBatchRoot: serviceHashes[${i}] must be 32 bytes, got ${buf.length}`,
      );
    }
    hash.update(buf);
  }
  return new Uint8Array(hash.digest());
};

