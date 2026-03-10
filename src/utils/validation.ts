/**
 * @module utils/validation
 * @description Runtime assertion helpers.
 *
 * @category Utils
 * @since v0.1.0
 */

/**
 * Assert that a condition holds, throwing a descriptive error otherwise.
 *
 * Uses TypeScript’s `asserts condition` return type so the compiler
 * narrows the guarded value after the call.
 *
 * @name assert
 * @description Runtime guard — throws `RangeError` with a `[SAP SDK]` prefix when the condition is falsy.
 * @param condition - The boolean expression to verify.
 * @param message   - Human-readable message included in the thrown error.
 * @throws {RangeError} When `condition` is `false`.
 * @category Utils
 * @since v0.1.0
 * @example
 * ```ts
 * import { assert } from "@synapse-sap/sdk/utils";
 *
 * assert(name.length <= 64, "Agent name exceeds MAX_NAME_LEN");
 * ```
 */
export function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new RangeError(`[SAP SDK] ${message}`);
  }
}
