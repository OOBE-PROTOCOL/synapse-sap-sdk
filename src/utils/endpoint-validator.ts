/**
 * @module utils/endpoint-validator
 * @description Endpoint validation utilities for SAP agent discovery.
 *
 * Fetches advertised endpoints and verifies they respond with JSON,
 * proper CORS headers, and SAP-compatible behavior. Designed to
 * fail fast when an endpoint 404s, requires CSRF tokens, or
 * serves HTML instead of JSON.
 *
 * Used by:
 *   - CLI `discovery validate` command
 *   - SDK programmatic validation before x402 calls
 *   - Integration test harnesses
 *
 * @category Utils
 * @since v0.6.0
 */

import type {
  EndpointDescriptor,
  HealthCheckDescriptor,
  EndpointValidationResult,
} from "../types/endpoint";

// ═══════════════════════════════════════════════════════════════════
//  Validation Options
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface ValidateEndpointOptions
 * @description Options for endpoint validation.
 * @category Utils
 * @since v0.6.0
 */
export interface ValidateEndpointOptions {
  /** Timeout in milliseconds (default: 10000). */
  readonly timeoutMs?: number;
  /** Number of retries on failure (default: 1). */
  readonly retries?: number;
  /** HTTP method override (default: uses descriptor or HEAD). */
  readonly method?: string;
  /** Custom headers to include in the validation request. */
  readonly headers?: Record<string, string>;
  /** If true, also sends a preflight OPTIONS request. */
  readonly checkCors?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Core Validator
// ═══════════════════════════════════════════════════════════════════

/**
 * @name validateEndpoint
 * @description Validate a single endpoint URL for SAP compatibility.
 *
 * Performs the following checks:
 *   1. URL is reachable (no 4xx/5xx)
 *   2. Response Content-Type is JSON
 *   3. CORS headers are present (if checkCors enabled)
 *   4. No redirect to HTML login pages
 *   5. Measures response latency
 *
 * @param url - The endpoint URL to validate.
 * @param opts - Validation options.
 * @returns An {@link EndpointValidationResult} with detailed check results.
 *
 * @category Utils
 * @since v0.6.0
 *
 * @example
 * ```ts
 * const result = await validateEndpoint("https://api.example.com/x402");
 * if (!result.reachable) console.error(result.error);
 * ```
 */
export async function validateEndpoint(
  url: string,
  opts: ValidateEndpointOptions = {},
): Promise<EndpointValidationResult> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const retries = opts.retries ?? 1;
  const method = opts.method ?? "HEAD";
  const warnings: string[] = [];

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const start = Date.now();

      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(opts.headers ?? {}),
        },
        redirect: "follow",
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json") || contentType.includes("text/json");
      const hasCors = !!response.headers.get("access-control-allow-origin");

      // Check for HTML responses (login pages, CSRF gates)
      if (contentType.includes("text/html")) {
        warnings.push("Endpoint returns HTML — may require CSRF or browser session");
      }

      // Check for redirect chains
      if (response.redirected) {
        warnings.push(`Endpoint redirected to ${response.url}`);
      }

      // Check for common error statuses
      if (response.status === 403) {
        warnings.push("403 Forbidden — may require authentication or CSRF tokens");
      }
      if (response.status === 404) {
        warnings.push("404 Not Found — endpoint URL may be incorrect");
      }
      if (response.status === 405) {
        warnings.push(`405 Method Not Allowed — endpoint may not accept ${method}`);
      }

      // Determine SAP capability
      const isSapCapable =
        isJson &&
        response.status < 400 &&
        !contentType.includes("text/html");

      // CORS check if requested
      if (opts.checkCors && !hasCors) {
        warnings.push("No CORS headers — cross-origin requests will fail");
      }

      return {
        url,
        reachable: response.status < 500,
        statusCode: response.status,
        latencyMs,
        isJson,
        hasCors,
        isSapCapable,
        error:
          response.status >= 400
            ? `HTTP ${response.status}: ${response.statusText}`
            : undefined,
        warnings,
      };
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : String(err);
      if (attempt < retries) continue;
    }
  }

  return {
    url,
    reachable: false,
    statusCode: 0,
    latencyMs: 0,
    isJson: false,
    hasCors: false,
    isSapCapable: false,
    error: lastError ?? "Unknown error",
    warnings,
  };
}

/**
 * @name validateEndpointDescriptor
 * @description Validate an {@link EndpointDescriptor} with context-aware checks.
 *
 * Uses the descriptor's method, auth requirements, and other metadata to
 * perform a more targeted validation than raw URL checking.
 *
 * @param descriptor - The endpoint descriptor to validate.
 * @param opts - Additional options.
 * @returns An {@link EndpointValidationResult}.
 *
 * @category Utils
 * @since v0.6.0
 */
export async function validateEndpointDescriptor(
  descriptor: EndpointDescriptor,
  opts: ValidateEndpointOptions = {},
): Promise<EndpointValidationResult> {
  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
    ...(descriptor.requiredHeaders ?? {}),
  };

  // Use the descriptor's method, falling back to HEAD for safety
  const method = opts.method ?? (descriptor.method === "GET" ? "GET" : "HEAD");

  const result = await validateEndpoint(descriptor.url, {
    ...opts,
    method,
    headers,
  });

  // Add descriptor-specific warnings
  const warnings = [...result.warnings];

  if (descriptor.requiresCSRF) {
    warnings.push("Endpoint declares requiresCSRF — automated calls may need token management");
  }
  if (descriptor.requiresCookies) {
    warnings.push("Endpoint declares requiresCookies — stateless calls may fail");
  }
  if (descriptor.requiresAuth && !descriptor.authType) {
    warnings.push("Endpoint requires auth but no authType specified");
  }

  return { ...result, warnings };
}

/**
 * @name validateHealthCheck
 * @description Validate an agent's health-check endpoint.
 *
 * @param health - The health-check descriptor.
 * @returns An {@link EndpointValidationResult}.
 *
 * @category Utils
 * @since v0.6.0
 */
export async function validateHealthCheck(
  health: HealthCheckDescriptor,
): Promise<EndpointValidationResult> {
  const result = await validateEndpoint(health.url, {
    timeoutMs: health.timeoutMs,
    method: health.method ?? "GET",
  });

  const warnings = [...result.warnings];

  if (result.reachable && result.statusCode !== health.expectedStatus) {
    warnings.push(
      `Expected status ${health.expectedStatus}, got ${result.statusCode}`,
    );
  }

  return {
    ...result,
    isSapCapable: result.reachable && result.statusCode === health.expectedStatus,
    warnings,
  };
}

/**
 * @name validateAgentEndpoints
 * @description Validate all endpoints for an agent (primary + health + tool overrides).
 *
 * @param params - Object containing the endpoints to validate.
 * @param params.endpoint - Primary endpoint descriptor.
 * @param params.healthCheck - Optional health-check descriptor.
 * @param params.toolEndpoints - Optional array of tool-specific endpoint overrides.
 * @param opts - Validation options.
 * @returns A map of `label → EndpointValidationResult`.
 *
 * @category Utils
 * @since v0.6.0
 */
export async function validateAgentEndpoints(
  params: {
    endpoint: EndpointDescriptor;
    healthCheck?: HealthCheckDescriptor;
    toolEndpoints?: Array<{ name: string; endpoint: EndpointDescriptor }>;
  },
  opts: ValidateEndpointOptions = {},
): Promise<Map<string, EndpointValidationResult>> {
  const results = new Map<string, EndpointValidationResult>();

  // Validate primary endpoint
  const primary = await validateEndpointDescriptor(params.endpoint, opts);
  results.set("primary", primary);

  // Validate health check
  if (params.healthCheck) {
    const health = await validateHealthCheck(params.healthCheck);
    results.set("health", health);
  }

  // Validate tool-specific endpoints
  if (params.toolEndpoints) {
    for (const { name, endpoint } of params.toolEndpoints) {
      const toolResult = await validateEndpointDescriptor(endpoint, opts);
      results.set(`tool:${name}`, toolResult);
    }
  }

  return results;
}
