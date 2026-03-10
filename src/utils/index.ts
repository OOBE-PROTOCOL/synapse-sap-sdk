/**
 * @module utils
 * @description Shared utilities used across SDK modules.
 *
 * @category Utils
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { sha256, hashToArray, assert } from "@synapse-sap/sdk/utils";
 *
 * const hash = sha256("jupiter:swap");
 * const arr  = hashToArray(hash);      // number[] for Anchor args
 * ```
 */

export { sha256, hashToArray } from "./hash";
export { assert } from "./validation";
export { serializeAccount, serializeValue } from "./serialization";
