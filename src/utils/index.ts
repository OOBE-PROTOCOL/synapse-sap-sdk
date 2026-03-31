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

// ── v0.6.0  Hardening utilities ─────────────────────
export {
  normalizeNetworkId,
  isNetworkEquivalent,
  getNetworkGenesisHash,
  getNetworkClusterName,
  isKnownNetwork,
} from "./network-normalizer";

export {
  validateEndpoint,
  validateEndpointDescriptor,
  validateHealthCheck,
  validateAgentEndpoints,
} from "./endpoint-validator";
export type { ValidateEndpointOptions } from "./endpoint-validator";

export {
  getRpcUrl,
  getFallbackRpcUrl,
  createDualConnection,
  findATA,
  classifyAnchorError,
  extractAnchorErrorCode,
} from "./rpc-strategy";
export type { RpcConfig, DualConnection, AtaResult } from "./rpc-strategy";

export {
  createEnvSchema,
  createEndpointDescriptorSchema,
  createHealthCheckSchema,
  createToolManifestEntrySchema,
  createAgentManifestSchema,
  createPreparePaymentSchema,
  createRegisterAgentSchema,
  createCallArgsSchema,
  validateOrThrow,
} from "./schemas";

// ── v0.6.2  Priority Fee & Settle Options ───────────
export {
  buildPriorityFeeIxs,
  buildRpcOptions,
  FAST_SETTLE_OPTIONS,
  FAST_BATCH_SETTLE_OPTIONS,
  DEFAULT_SETTLE_PRIORITY_FEE,
  DEFAULT_SETTLE_COMPUTE_UNITS,
  DEFAULT_BATCH_SETTLE_COMPUTE_UNITS,
} from "./priority-fee";
export type {
  PriorityFeeConfig,
  SettleOptions,
} from "./priority-fee";
