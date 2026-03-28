/**
 * @module utils/schemas
 * @description Zod schemas for runtime validation of environment variables,
 * tool arguments, agent manifests, and x402 payment parameters.
 *
 * These schemas enforce correctness at the boundary: CLI scripts refuse
 * to run if required fields are missing or mis-typed, and SDK methods
 * validate inputs before hitting the chain.
 *
 * Zod is a peer dependency — these schemas are tree-shaken if not imported.
 *
 * @category Utils
 * @since v0.6.0
 */

// ═══════════════════════════════════════════════════════════════════
//  Dynamic Zod import (peer dependency)
// ═══════════════════════════════════════════════════════════════════

// We use a lazy getter pattern to avoid hard failures when zod is not installed
let _z: typeof import("zod") | null = null;

function getZod(): typeof import("zod") {
  if (!_z) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _z = require("zod");
    } catch {
      throw new Error(
        "[SAP SDK] Zod is required for schema validation. Install it: npm install zod",
      );
    }
  }
  return _z!;
}

// ═══════════════════════════════════════════════════════════════════
//  Environment Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * @name createEnvSchema
 * @description Create a Zod schema for SAP SDK environment variables.
 * Validates that all required env vars are present and correctly typed.
 *
 * @returns A Zod schema object for env validation.
 *
 * @category Utils
 * @since v0.6.0
 *
 * @example
 * ```ts
 * import { createEnvSchema } from "@synapse-sap/sdk";
 *
 * const schema = createEnvSchema();
 * const env = schema.parse(process.env);
 * // env.SOLANA_CLUSTER is typed as "mainnet-beta" | "devnet" | "localnet"
 * ```
 */
export function createEnvSchema() {
  const z = getZod();

  return z.object({
    SOLANA_CLUSTER: z
      .enum(["mainnet-beta", "devnet", "localnet"])
      .default("devnet")
      .describe("Solana cluster"),
    SOLANA_RPC_URL: z
      .string()
      .url()
      .optional()
      .describe("Primary RPC endpoint URL"),
    SOLANA_FALLBACK_RPC_URL: z
      .string()
      .url()
      .optional()
      .describe("Fallback RPC for SPL token ops"),
    SOLANA_WS_URL: z
      .string()
      .url()
      .optional()
      .describe("WebSocket endpoint URL"),
    WALLET_KEYPAIR_PATH: z
      .string()
      .optional()
      .describe("Path to keypair JSON file"),
    WALLET_PRIVATE_KEY: z
      .string()
      .optional()
      .describe("Base58 private key (alternative to file)"),
    SAP_PROGRAM_ID: z
      .string()
      .optional()
      .describe("Custom SAP program ID override"),
    DATABASE_URL: z
      .string()
      .optional()
      .describe("PostgreSQL connection URL"),
    LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .default("info")
      .describe("Log level"),
    X402_ENDPOINT: z
      .string()
      .url()
      .optional()
      .describe("Agent x402 payment endpoint"),
    AGENT_URI: z
      .string()
      .url()
      .optional()
      .describe("Agent public API URI"),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Endpoint Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * @name createEndpointDescriptorSchema
 * @description Zod schema for {@link EndpointDescriptor}.
 * @returns A Zod schema for endpoint descriptor validation.
 * @category Utils
 * @since v0.6.0
 */
export function createEndpointDescriptorSchema() {
  const z = getZod();

  return z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
    contentType: z.string().default("application/json"),
    requiresAuth: z.boolean().default(false),
    authType: z.enum(["bearer", "api-key", "x402", "none"]).optional(),
    requiresCSRF: z.boolean().default(false),
    requiresCookies: z.boolean().default(false),
    corsOrigins: z.array(z.string()).optional(),
    requiredHeaders: z.record(z.string(), z.string()).optional(),
  });
}

/**
 * @name createHealthCheckSchema
 * @description Zod schema for {@link HealthCheckDescriptor}.
 * @returns A Zod schema for health check validation.
 * @category Utils
 * @since v0.6.0
 */
export function createHealthCheckSchema() {
  const z = getZod();

  return z.object({
    url: z.string().url(),
    expectedStatus: z.number().int().min(100).max(599).default(200),
    timeoutMs: z.number().int().min(100).max(60_000).default(5000),
    method: z.enum(["GET", "HEAD"]).default("GET"),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Tool Manifest Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * @name createToolManifestEntrySchema
 * @description Zod schema for a single tool in an agent manifest.
 * @returns A Zod schema for tool manifest entry validation.
 * @category Utils
 * @since v0.6.0
 */
export function createToolManifestEntrySchema() {
  const z = getZod();

  return z.object({
    name: z.string().min(1).max(64),
    description: z.string().max(256),
    protocol: z.string().min(1).max(64),
    category: z.string().min(1),
    inputSchema: z.record(z.string(), z.unknown()),
    outputSchema: z.record(z.string(), z.unknown()),
    httpMethod: z.enum(["GET", "POST", "PUT", "DELETE", "COMPOUND"]).default("POST"),
    paymentMode: z.enum(["x402", "free", "prepaid", "subscription"]).default("x402"),
    pricePerCall: z.number().int().min(0).default(0),
    requiredArgs: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    endpointOverride: createEndpointDescriptorSchema().optional(),
  });
}

/**
 * @name createAgentManifestSchema
 * @description Zod schema for a complete agent manifest.
 * @returns A Zod schema for manifest validation.
 * @category Utils
 * @since v0.6.0
 *
 * @example
 * ```ts
 * import { createAgentManifestSchema } from "@synapse-sap/sdk";
 *
 * const schema = createAgentManifestSchema();
 * const manifest = schema.parse(JSON.parse(fs.readFileSync("manifest.json", "utf-8")));
 * ```
 */
export function createAgentManifestSchema() {
  const z = getZod();

  return z.object({
    version: z.literal("1.0.0"),
    wallet: z.string().min(32).max(50),
    name: z.string().min(1).max(64),
    description: z.string().max(256),
    endpoint: createEndpointDescriptorSchema(),
    healthCheck: createHealthCheckSchema().optional(),
    tools: z.array(createToolManifestEntrySchema()),
    supportedNetworks: z.array(z.string()).min(1),
    generatedAt: z.string().datetime(),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  x402 Payment Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * @name createPreparePaymentSchema
 * @description Zod schema for x402 payment preparation parameters.
 * @returns A Zod schema for payment option validation.
 * @category Utils
 * @since v0.6.0
 */
export function createPreparePaymentSchema() {
  const z = getZod();

  return z.object({
    pricePerCall: z.union([z.number(), z.string(), z.bigint()]),
    maxCalls: z.union([z.number(), z.string(), z.bigint()]).optional(),
    deposit: z.union([z.number(), z.string(), z.bigint()]),
    expiresAt: z.union([z.number(), z.string(), z.bigint()]).optional(),
    volumeCurve: z
      .array(
        z.object({
          afterCalls: z.number().int().min(1),
          pricePerCall: z.union([z.number(), z.string(), z.bigint()]),
        }),
      )
      .optional(),
    tokenMint: z.string().optional(),
    tokenDecimals: z.number().int().min(0).max(18).default(9),
    networkIdentifier: z.string().optional(),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Agent Registration Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * @name createRegisterAgentSchema
 * @description Zod schema for agent registration arguments.
 * @returns A Zod schema for registration validation.
 * @category Utils
 * @since v0.6.0
 */
export function createRegisterAgentSchema() {
  const z = getZod();

  return z.object({
    name: z.string().min(1).max(64),
    description: z.string().min(1).max(256),
    agentId: z.string().max(128).optional().nullable(),
    agentUri: z.string().max(256).optional().nullable(),
    x402Endpoint: z.string().url().max(256).optional().nullable(),
    capabilities: z
      .array(
        z.object({
          id: z.string().min(1),
          description: z.string().nullable().optional(),
          protocolId: z.string().nullable().optional(),
          version: z.string().nullable().optional(),
        }),
      )
      .max(10)
      .default([]),
    protocols: z.array(z.string()).max(5).default([]),
    pricing: z
      .array(
        z.object({
          tierId: z.string().min(1),
          pricePerCall: z.union([z.number(), z.string()]),
          rateLimit: z.number().int().min(0),
          tokenType: z.enum(["sol", "usdc", "spl"]).default("sol"),
          settlementMode: z.enum(["instant", "escrow", "batched", "x402"]).default("x402"),
        }),
      )
      .max(5)
      .default([]),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  CLI Script Argument Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * @name createCallArgsSchema
 * @description Zod schema for `npm run call` script arguments.
 * Ensures all required fields are present before executing an x402 call.
 *
 * @returns A Zod schema for call argument validation.
 * @category Utils
 * @since v0.6.0
 */
export function createCallArgsSchema() {
  const z = getZod();

  return z.object({
    agentWallet: z.string().min(32).max(50).describe("Agent wallet (base58)"),
    tool: z.string().min(1).describe("Tool name to invoke"),
    args: z.record(z.string(), z.unknown()).default({}).describe("Tool arguments (JSON)"),
    endpoint: z.string().url().optional().describe("Endpoint URL override"),
    network: z.string().optional().describe("Network identifier override"),
    maxRetries: z.number().int().min(0).max(10).default(2),
    timeoutMs: z.number().int().min(1000).max(120_000).default(30_000),
  });
}

/**
 * @name validateOrThrow
 * @description Validate a value against a Zod schema, throwing a SapValidationError
 * with a friendly message if validation fails.
 *
 * @param schema - A Zod schema.
 * @param value - The value to validate.
 * @param label - A label for error messages (e.g. "environment", "call args").
 * @returns The parsed and typed value.
 * @throws {Error} With formatted validation errors.
 *
 * @category Utils
 * @since v0.6.0
 */
export function validateOrThrow<T>(
  schema: { parse: (v: unknown) => T; safeParse: (v: unknown) => { success: boolean; error?: { issues: Array<{ path: Array<string | number>; message: string }> } } },
  value: unknown,
  label: string,
): T {
  const result = schema.safeParse(value);
  if (result.success) return schema.parse(value);

  const issues = result.error?.issues ?? [];
  const formatted = issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");

  throw new Error(
    `[SAP SDK] Invalid ${label}:\n${formatted}`,
  );
}
