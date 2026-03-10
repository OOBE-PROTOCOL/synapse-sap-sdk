/**
 * @module errors
 * @description Typed error classes for the SAP v2 SDK.
 *
 * All SDK errors extend {@link SapError} to allow catch-all handling,
 * while concrete subclasses enable fine-grained error matching.
 *
 * @category Errors
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SapError, SapRpcError, SapAccountNotFoundError } from "@synapse-sap/sdk/errors";
 *
 * try {
 *   const agent = await client.agent.fetch();
 * } catch (err) {
 *   if (err instanceof SapAccountNotFoundError) {
 *     console.log("Agent not registered yet");
 *   } else if (err instanceof SapRpcError) {
 *     console.error("RPC failure:", err.rpcCode);
 *   } else if (err instanceof SapError) {
 *     console.error("SAP error:", err.message);
 *   }
 * }
 * ```
 *
 * @see {@link SapError}
 * @see {@link SapValidationError}
 * @see {@link SapRpcError}
 * @see {@link SapAccountNotFoundError}
 * @see {@link SapTimeoutError}
 * @see {@link SapPermissionError}
 */

// ═══════════════════════════════════════════════════════════════════
//  Base Error
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapError
 * @description Base class for all SAP SDK errors.
 *
 * Extends `Error` and sets `name` automatically so `instanceof`
 * checks work correctly in both CJS and ESM environments.
 *
 * @category Errors
 * @since v0.1.0
 * @extends {Error}
 *
 * @example
 * ```ts
 * try {
 *   await client.agent.fetch();
 * } catch (err) {
 *   if (err instanceof SapError) {
 *     console.error(`[${err.code}] ${err.message}`);
 *   }
 * }
 * ```
 *
 * @see {@link SapValidationError}
 * @see {@link SapRpcError}
 * @see {@link SapAccountNotFoundError}
 * @see {@link SapTimeoutError}
 * @see {@link SapPermissionError}
 */
export class SapError extends Error {
  /**
   * @description Machine-readable error code for programmatic handling.
   * @readonly
   */
  readonly code: string;

  /**
   * @param message - A human-readable description of the error.
   * @param code    - Machine-readable error code (defaults to `"SAP_ERROR"`).
   */
  constructor(message: string, code = "SAP_ERROR") {
    super(message);
    this.name = "SapError";
    this.code = code;
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Validation Error
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapValidationError
 * @description Thrown when SDK-side input validation fails before sending a
 * transaction or making an RPC call.
 *
 * @category Errors
 * @since v0.1.0
 * @extends {SapError}
 *
 * @example
 * ```ts
 * try {
 *   await client.agent.register({ name: "" });
 * } catch (err) {
 *   if (err instanceof SapValidationError) {
 *     console.error(`Validation failed on field "${err.field}": ${err.message}`);
 *   }
 * }
 * ```
 *
 * @see {@link SapError}
 */
export class SapValidationError extends SapError {
  /**
   * @description Field or parameter that failed validation (if applicable).
   * @readonly
   */
  readonly field?: string;

  /**
   * @param message - A human-readable description of the validation failure.
   * @param field   - The name of the field or parameter that failed validation.
   */
  constructor(message: string, field?: string) {
    super(message, "SAP_VALIDATION_ERROR");
    this.name = "SapValidationError";
    this.field = field;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  RPC / Transaction Error
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapRpcError
 * @description Wraps Solana RPC or Anchor transaction errors with additional
 * context (error code, logs).
 *
 * @category Errors
 * @since v0.1.0
 * @extends {SapError}
 *
 * @example
 * ```ts
 * try {
 *   await client.agent.register(params);
 * } catch (err) {
 *   if (err instanceof SapRpcError) {
 *     console.error(`RPC error ${err.rpcCode}: ${err.message}`);
 *     err.logs?.forEach((log) => console.debug(log));
 *   }
 * }
 * ```
 *
 * @see {@link SapRpcError.fromAnchor}
 * @see {@link SapError}
 */
export class SapRpcError extends SapError {
  /**
   * @description Anchor / program error code, if available.
   * @readonly
   */
  readonly rpcCode?: number;
  /**
   * @description Transaction logs returned by the RPC node.
   * @readonly
   */
  readonly logs?: readonly string[];

  /**
   * @param message - A human-readable description of the RPC or transaction error.
   * @param opts    - Optional additional context.
   * @param opts.rpcCode - Anchor or Solana program error code.
   * @param opts.logs    - Raw transaction logs from the RPC node.
   */
  constructor(
    message: string,
    opts?: { rpcCode?: number; logs?: readonly string[] },
  ) {
    super(message, "SAP_RPC_ERROR");
    this.name = "SapRpcError";
    this.rpcCode = opts?.rpcCode;
    this.logs = opts?.logs;
  }

  /**
   * @static
   * @description Create a {@link SapRpcError} from an Anchor-style error object.
   * Extracts `code` and `logs` automatically from the Anchor error shape.
   *
   * @param err - The raw Anchor or Solana error object.
   * @returns A new {@link SapRpcError} populated with extracted code, logs, and message.
   *
   * @example
   * ```ts
   * try {
   *   await program.methods.registerAgent(args).rpc();
   * } catch (raw) {
   *   throw SapRpcError.fromAnchor(raw);
   * }
   * ```
   *
   * @see {@link SapRpcError}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromAnchor(err: any): SapRpcError {
    const code = err?.error?.errorCode?.number ?? err?.code;
    const logs: string[] = err?.logs ?? err?.error?.logs ?? [];
    const msg =
      err?.error?.errorMessage ?? err?.message ?? "Unknown RPC error";
    return new SapRpcError(msg, { rpcCode: code, logs });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Account Not Found
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapAccountNotFoundError
 * @description Thrown when an expected on-chain account does not exist or has
 * been closed.
 *
 * @category Errors
 * @since v0.1.0
 * @extends {SapError}
 *
 * @example
 * ```ts
 * try {
 *   const agent = await client.agent.fetch(agentPda);
 * } catch (err) {
 *   if (err instanceof SapAccountNotFoundError) {
 *     console.warn(`Missing ${err.accountType ?? "account"}: ${err.address}`);
 *   }
 * }
 * ```
 *
 * @see {@link SapError}
 */
export class SapAccountNotFoundError extends SapError {
  /**
   * @description The base-58 encoded account address that was not found.
   * @readonly
   */
  readonly address: string;
  /**
   * @description The expected account type (e.g. `"AgentRecord"`, `"VaultAccount"`).
   * @readonly
   */
  readonly accountType?: string;

  /**
   * @param address     - The base-58 encoded address of the missing account.
   * @param accountType - Optional label for the expected account type.
   */
  constructor(address: string, accountType?: string) {
    const label = accountType ? `${accountType} account` : "Account";
    super(`${label} not found: ${address}`, "SAP_ACCOUNT_NOT_FOUND");
    this.name = "SapAccountNotFoundError";
    this.address = address;
    this.accountType = accountType;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Timeout Error
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapTimeoutError
 * @description Thrown when an operation (e.g., transaction confirmation) exceeds
 * the configured timeout.
 *
 * @category Errors
 * @since v0.1.0
 * @extends {SapError}
 *
 * @example
 * ```ts
 * try {
 *   await client.agent.register(params, { timeoutMs: 30_000 });
 * } catch (err) {
 *   if (err instanceof SapTimeoutError) {
 *     console.error(`Timed out after ${err.timeoutMs}ms: ${err.message}`);
 *   }
 * }
 * ```
 *
 * @see {@link SapError}
 */
export class SapTimeoutError extends SapError {
  /**
   * @description Timeout duration in milliseconds that was exceeded.
   * @readonly
   */
  readonly timeoutMs: number;

  /**
   * @param message   - A human-readable description of the timeout.
   * @param timeoutMs - The timeout threshold in milliseconds.
   */
  constructor(message: string, timeoutMs: number) {
    super(message, "SAP_TIMEOUT");
    this.name = "SapTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Permission Error
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SapPermissionError
 * @description Thrown when the current wallet lacks the required permission
 * (authority, delegate, etc.) for an operation.
 *
 * @category Errors
 * @since v0.1.0
 * @extends {SapError}
 *
 * @example
 * ```ts
 * try {
 *   await client.agent.update(agentPda, updates);
 * } catch (err) {
 *   if (err instanceof SapPermissionError) {
 *     console.error(`Permission denied: ${err.message}`);
 *   }
 * }
 * ```
 *
 * @see {@link SapError}
 */
export class SapPermissionError extends SapError {
  /**
   * @param message - A human-readable description of the permission failure.
   */
  constructor(message: string) {
    super(message, "SAP_PERMISSION_DENIED");
    this.name = "SapPermissionError";
  }
}
