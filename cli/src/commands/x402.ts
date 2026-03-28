/**
 * @module cli/commands/x402
 * @description x402 payment commands: headers, call, sign, verify, settle, replay.
 */

import { Command } from "commander";
import * as fs from "fs";
import { loadConfig } from "../config";
import { buildContext, parseWallet } from "../context";
import { log, output, saveTmp } from "../logger";

export function registerX402Commands(program: Command): void {
  const x402 = program
    .command("x402")
    .description("x402 micropayment operations");

  // ── x402 headers ────────────────────────────────
  x402
    .command("headers <wallet>")
    .description("Generate x402 HTTP headers for an agent")
    .option("--network <id>", "Network identifier for X-Payment-Network")
    .option("--max-calls <n>", "Override max calls in header")
    .option("--price-override <n>", "Override price per call")
    .option("--output <path>", "Save headers to file")
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);

        // Try to build from existing escrow
        const headers = await ctx.client.x402.buildPaymentHeadersFromEscrow(
          agentWallet,
          { network: opts.network },
        );

        if (!headers) {
          log.error("No escrow found. Create one first: synapse-sap escrow open <wallet>");
          process.exit(1);
        }

        output(headers);

        if (opts.output) {
          const filePath = saveTmp(config.tmpDir, "x402-headers.json", headers);
          log.info(`Saved to ${filePath}`);
        }
      } catch (err) {
        log.error("Failed to build headers", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── x402 call ───────────────────────────────────
  x402
    .command("call <wallet> <tool>")
    .description("Make an x402 API call to an agent")
    .option("--args <json>", "Tool arguments as JSON string or file path")
    .option("--endpoint <url>", "Endpoint URL override")
    .option("--skip-payment", "Skip x402 headers (free call)")
    .option("--method <method>", "HTTP method override", "POST")
    .option("--headers <kv...>", "Additional headers (key=value)")
    .option("--save <type>", "Save response: body|headers|full")
    .option("--retries <n>", "Number of retries", "2")
    .option("--timeout <ms>", "Request timeout", "30000")
    .action(async (walletStr: string, tool: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);
        const profile = await ctx.client.discovery.getAgentProfile(agentWallet);

        if (!profile) {
          log.error("Agent not found");
          process.exit(1);
        }

        // Resolve endpoint
        const endpoint = opts.endpoint ?? profile.identity.x402Endpoint;
        if (!endpoint) {
          log.error("No endpoint found. Use --endpoint <url> or ensure agent has x402Endpoint");
          process.exit(1);
        }

        // Parse tool args
        let args: Record<string, unknown> = {};
        if (opts.args) {
          if (fs.existsSync(opts.args)) {
            args = JSON.parse(fs.readFileSync(opts.args, "utf-8"));
          } else {
            args = JSON.parse(opts.args);
          }
        }

        // Build headers
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (!opts.skipPayment) {
          const x402Headers = await ctx.client.x402.buildPaymentHeadersFromEscrow(agentWallet);
          if (x402Headers) {
            Object.assign(requestHeaders, x402Headers);
          } else {
            log.warn("No escrow found — sending without x402 headers");
          }
        }

        // Parse custom headers
        if (opts.headers) {
          for (const h of opts.headers) {
            const [key, ...vals] = h.split("=");
            requestHeaders[key] = vals.join("=");
          }
        }

        // Make the call
        const url = endpoint.endsWith("/") ? `${endpoint}${tool}` : `${endpoint}/${tool}`;
        log.info(`Calling ${opts.method} ${url}...`);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), parseInt(opts.timeout));
        const start = Date.now();

        const response = await fetch(url, {
          method: opts.method,
          headers: requestHeaders,
          body: opts.method !== "GET" ? JSON.stringify(args) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);
        const latencyMs = Date.now() - start;

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((v, k) => {
          responseHeaders[k] = v;
        });

        let body: unknown;
        const ct = response.headers.get("content-type") ?? "";
        if (ct.includes("json")) {
          body = await response.json();
        } else {
          body = await response.text();
        }

        const result = {
          status: response.status,
          statusText: response.statusText,
          latencyMs,
          headers: responseHeaders,
          body,
        };

        // Save if requested
        if (opts.save) {
          const filename = `x402-call-${tool}-${Date.now()}.json`;
          const saveData =
            opts.save === "body" ? body :
            opts.save === "headers" ? responseHeaders :
            result;
          saveTmp(config.tmpDir, filename, saveData);
          log.info(`Saved to ${config.tmpDir}/${filename}`);
        }

        output(
          opts.save === "body" ? body :
          opts.save === "headers" ? responseHeaders :
          result,
        );
      } catch (err) {
        log.error("x402 call failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── x402 sign ───────────────────────────────────
  x402
    .command("sign <wallet>")
    .description("Generate a payment signature for off-chain flows")
    .action(async (walletStr: string) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);
        const headers = await ctx.client.x402.buildPaymentHeadersFromEscrow(agentWallet);

        if (!headers) {
          log.error("No escrow found");
          process.exit(1);
        }

        // The x402 header set is the "signature" for off-chain verification
        output({
          protocol: headers["X-Payment-Protocol"],
          escrow: headers["X-Payment-Escrow"],
          agent: headers["X-Payment-Agent"],
          depositor: headers["X-Payment-Depositor"],
          network: headers["X-Payment-Network"],
          program: headers["X-Payment-Program"],
        });
      } catch (err) {
        log.error("Sign failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── x402 verify ─────────────────────────────────
  x402
    .command("verify <signature>")
    .description("Verify a settlement transaction")
    .action(async (sigStr: string) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        log.info(`Verifying settlement: ${sigStr}...`);

        // Parse the settlement transaction to verify it
        const { Connection } = await import("@solana/web3.js");
        const conn = new Connection(config.rpc, "confirmed");
        const tx = await conn.getTransaction(sigStr, { maxSupportedTransactionVersion: 0 });

        if (!tx) {
          log.error("Transaction not found");
          process.exit(1);
        }

        output({
          signature: sigStr,
          slot: tx.slot,
          blockTime: tx.blockTime,
          fee: tx.meta?.fee,
          err: tx.meta?.err ?? null,
          verified: !tx.meta?.err,
        });
      } catch (err) {
        log.error("Verification failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── x402 settle ─────────────────────────────────
  x402
    .command("settle <wallet>")
    .description("Agent-side: settle calls for payment")
    .requiredOption("--calls <n>", "Number of calls to settle")
    .option("--service <data>", "Service data hash or file path")
    .action(async (walletStr: string, opts: { calls: string; service?: string }) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const depositorWallet = parseWallet(walletStr);
        const serviceData = opts.service ?? `settle-${Date.now()}`;

        if (program.opts().dryRun) {
          log.info("DRY RUN — would settle:");
          output({ depositor: walletStr, calls: opts.calls, serviceData });
          return;
        }

        log.info(`Settling ${opts.calls} calls...`);
        const result = await ctx.client.x402.settle(
          depositorWallet,
          parseInt(opts.calls),
          serviceData,
        );

        log.info("Settlement complete!");
        output({
          txSignature: result.txSignature,
          callsSettled: result.callsSettled,
          amount: result.amount.toString(),
        });
      } catch (err) {
        log.error("Settlement failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── x402 replay ─────────────────────────────────
  x402
    .command("replay <artifact>")
    .description("Re-run a saved x402 call from an artifact file")
    .action(async (artifactPath: string) => {
      try {
        if (!fs.existsSync(artifactPath)) {
          log.error(`Artifact not found: ${artifactPath}`);
          process.exit(1);
        }

        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        log.info("Replaying saved call...");

        const response = await fetch(artifact.url ?? artifact.endpoint, {
          method: artifact.method ?? "POST",
          headers: artifact.headers ?? {},
          body: artifact.body ? JSON.stringify(artifact.body) : undefined,
        });

        const body = await response.json().catch(() => response.text());
        output({
          status: response.status,
          body,
          replayed: true,
          originalTimestamp: artifact.timestamp,
        });
      } catch (err) {
        log.error("Replay failed", { error: (err as Error).message });
        process.exit(1);
      }
    });
}
