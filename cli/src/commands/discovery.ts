/**
 * @module cli/commands/discovery
 * @description Discovery commands: scan, validate, cache.
 */

import { Command } from "commander";
import { loadConfig } from "../config";
import { buildContext, parseWallet } from "../context";
import { log, output, saveTmp } from "../logger";

export function registerDiscoveryCommands(program: Command): void {
  const discovery = program
    .command("discovery")
    .description("Network discovery & endpoint validation")
    .addHelpText("after", `
Examples:
  $ synapse-sap discovery scan --limit 50 --output network.json
  $ synapse-sap discovery validate --wallet <PUBKEY>
  $ synapse-sap discovery validate --all --concurrency 10
  $ synapse-sap discovery cache clear
`);

  // ── discovery scan ──────────────────────────────
  discovery
    .command("scan")
    .description("Scan the SAP network for agents and tools")
    .option("--limit <n>", "Max agents to return", "100")
    .option("--offset <n>", "Pagination offset", "0")
    .option("--sort <field>", "Sort by: name|latency|price")
    .option("--output <path>", "Save scan results to file")
    .option("--index <type>", "Build secondary index: capability|protocol|category")
    .addHelpText("after", `
Examples:
  $ synapse-sap discovery scan
  $ synapse-sap discovery scan --limit 200 --output scan-results.json
  $ synapse-sap discovery scan --index capability --json
`)
    .action(async (opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        log.info("Scanning SAP network...");

        const overview = await ctx.client.discovery.getNetworkOverview();
        log.info(`Network overview: ${overview.totalAgents} agents, ${overview.totalTools} tools`);

        // Scan tool categories for a full picture
        const catSummary = await ctx.client.discovery.getToolCategorySummary();
        const results = {
          overview: {
            totalAgents: overview.totalAgents,
            activeAgents: overview.activeAgents,
            totalTools: overview.totalTools,
            totalVaults: overview.totalVaults,
            totalAttestations: overview.totalAttestations,
            authority: overview.authority.toBase58(),
          },
          categories: catSummary,
          timestamp: new Date().toISOString(),
        };

        if (opts.output) {
          const filePath = saveTmp(
            config.tmpDir,
            opts.output.includes("/") ? opts.output.split("/").pop()! : opts.output,
            results,
          );
          log.info(`Saved to ${filePath}`);
        }

        output(results);
      } catch (err) {
        log.error("Scan failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── discovery validate ──────────────────────────
  discovery
    .command("validate")
    .description("Validate agent endpoints for SAP compatibility")
    .option("--wallet <pubkey>", "Validate a specific agent's endpoints")
    .option("--all", "Validate all discovered agents")
    .option("--http-method <method>", "HTTP method: GET|POST|HEAD", "HEAD")
    .option("--body <path>", "Request body file for POST validation")
    .option("--concurrency <n>", "Parallel checks", "5")
    .option("--timeout <ms>", "Request timeout", "10000")
    .action(async (opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const { validateEndpoint } = await import(
          "@oobe-protocol-labs/synapse-sap-sdk"
        );

        if (opts.wallet) {
          const wallet = parseWallet(opts.wallet);
          const profile = await ctx.client.discovery.getAgentProfile(wallet);

          if (!profile?.identity.x402Endpoint) {
            log.error("Agent has no x402 endpoint configured");
            process.exit(1);
          }

          log.info(`Validating: ${profile.identity.x402Endpoint}`);
          const result = await validateEndpoint(profile.identity.x402Endpoint, {
            method: opts.httpMethod,
            timeoutMs: parseInt(opts.timeout),
          });

          output({
            agent: profile.identity.name,
            wallet: opts.wallet,
            ...result,
          });

          if (!result.isSapCapable) {
            log.warn("⚠ Endpoint is NOT SAP-capable");
            if (result.warnings.length > 0) {
              result.warnings.forEach((w: string) => log.warn(`  ${w}`));
            }
          } else {
            log.info("✓ Endpoint is SAP-capable");
          }
        } else {
          log.info("Use --wallet <pubkey> to validate a specific agent");
          log.info("Use --all to validate all discovered agents");
        }
      } catch (err) {
        log.error("Validation failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── discovery cache ─────────────────────────────
  discovery
    .command("cache <action>")
    .description("Manage discovery cache (write|read|clear)")
    .action(async (action: string) => {
      const config = loadConfig(program.opts());
      const fs = require("fs");
      const path = require("path");
      const cacheDir = path.join(config.tmpDir, "cache");

      switch (action) {
        case "write":
          log.info("Writing discovery cache...");
          // Would persist scan results
          log.info(`Cache dir: ${cacheDir}`);
          break;

        case "read":
          if (fs.existsSync(cacheDir)) {
            const files = fs.readdirSync(cacheDir);
            output(files);
          } else {
            log.info("No cache found");
          }
          break;

        case "clear":
          if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true });
            log.info("Cache cleared");
          } else {
            log.info("No cache to clear");
          }
          break;

        default:
          log.error('Unknown action. Use: write|read|clear');
      }
    });
}
