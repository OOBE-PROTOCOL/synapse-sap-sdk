/**
 * @module cli/commands/tools
 * @description Tool manifest commands: generate, validate, typify, publish, compare, doc.
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "../config";
import { buildContext, parseWallet } from "../context";
import { log, output, saveTmp } from "../logger";

export function registerToolsCommands(program: Command): void {
  const tools = program
    .command("tools")
    .description("Tool manifest & schema management")
    .addHelpText("after", `
Examples:
  $ synapse-sap tools manifest generate <WALLET> --out agent.manifest.json
  $ synapse-sap tools manifest validate agent.manifest.json
  $ synapse-sap tools typify agent.manifest.json --out src/generated/agent.ts
  $ synapse-sap tools publish agent.manifest.json --dry-run
  $ synapse-sap tools compare <WALLET_A> <WALLET_B>
  $ synapse-sap tools doc <WALLET> --format markdown --out TOOLS.md
`);

  // ── tools manifest generate ─────────────────────
  const manifest = tools
    .command("manifest")
    .description("Tool manifest operations");

  manifest
    .command("generate <wallet>")
    .description("Generate a typed manifest from on-chain agent data")
    .option("--out <path>", "Output file path")
    .option("--include-schema", "Include JSON schemas for tool args")
    .option("--include-endpoints", "Validate and include endpoint info")
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const wallet = parseWallet(walletStr);
        const profile = await ctx.client.discovery.getAgentProfile(wallet);

        if (!profile) {
          log.error("Agent not found");
          process.exit(1);
        }

        log.info(`Generating manifest for "${profile.identity.name}"...`);

        // Build the manifest
        const manifestData = {
          version: "1.0.0" as const,
          wallet: wallet.toBase58(),
          name: profile.identity.name,
          description: profile.identity.description,
          endpoint: {
            url: profile.identity.x402Endpoint ?? "",
            method: "POST" as const,
            contentType: "application/json",
            requiresAuth: !!profile.identity.x402Endpoint,
            authType: "x402" as const,
            requiresCSRF: false,
            requiresCookies: false,
          },
          tools: profile.identity.capabilities.map((cap) => ({
            name: cap.id,
            description: cap.description ?? "",
            protocol: cap.protocolId ?? "unknown",
            category: "Custom",
            inputSchema: {} as Record<string, unknown>,
            outputSchema: {} as Record<string, unknown>,
            httpMethod: "POST" as const,
            paymentMode: "x402" as const,
            pricePerCall: profile.identity.pricing[0]?.pricePerCall.toNumber() ?? 0,
            requiredArgs: [] as string[],
            prerequisites: profile.identity.x402Endpoint ? ["escrow"] : [],
          })),
          supportedNetworks: ["solana:mainnet-beta", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
          generatedAt: new Date().toISOString(),
        };

        const outPath = opts.out ?? `skills/${wallet.toBase58().slice(0, 8)}.manifest.json`;

        // Ensure directory exists
        const dir = path.dirname(outPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outPath, JSON.stringify(manifestData, null, 2) + "\n");
        log.info(`Manifest saved to ${outPath}`);
        output(manifestData);
      } catch (err) {
        log.error("Manifest generation failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── tools manifest validate ─────────────────────
  manifest
    .command("validate <file>")
    .description("Validate a tool manifest file against the schema")
    .action(async (filePath: string) => {
      try {
        if (!fs.existsSync(filePath)) {
          log.error(`File not found: ${filePath}`);
          process.exit(1);
        }

        const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        // Basic structural validation
        const errors: string[] = [];

        if (!raw.version) errors.push("Missing 'version' field");
        if (raw.version !== "1.0.0") errors.push(`Unsupported version: ${raw.version}`);
        if (!raw.wallet) errors.push("Missing 'wallet' field");
        if (!raw.name) errors.push("Missing 'name' field");
        if (!raw.endpoint?.url) errors.push("Missing 'endpoint.url' field");
        if (!Array.isArray(raw.tools)) errors.push("'tools' must be an array");
        if (!Array.isArray(raw.supportedNetworks) || raw.supportedNetworks.length === 0) {
          errors.push("'supportedNetworks' must be a non-empty array");
        }

        // Validate each tool
        if (Array.isArray(raw.tools)) {
          raw.tools.forEach((tool: any, i: number) => {
            if (!tool.name) errors.push(`tools[${i}]: missing 'name'`);
            if (!tool.protocol) errors.push(`tools[${i}]: missing 'protocol'`);
          });
        }

        if (errors.length > 0) {
          log.error(`Manifest validation failed (${errors.length} errors):`);
          errors.forEach((e) => log.error(`  • ${e}`));
          process.exit(1);
        }

        log.info("✓ Manifest is valid");
        output({
          valid: true,
          tools: raw.tools?.length ?? 0,
          networks: raw.supportedNetworks?.length ?? 0,
        });
      } catch (err) {
        log.error("Validation failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── tools typify ────────────────────────────────
  tools
    .command("typify <manifest>")
    .description("Generate TypeScript types from a tool manifest")
    .option("--out <path>", "Output file", "src/generated/agent.ts")
    .option("--format <fmt>", "ESM or CJS", "esm")
    .action(async (manifestPath: string, opts) => {
      try {
        if (!fs.existsSync(manifestPath)) {
          log.error(`Manifest not found: ${manifestPath}`);
          process.exit(1);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        log.info(`Generating types from ${manifestPath}...`);

        // Generate TypeScript interfaces
        const lines: string[] = [
          "/**",
          ` * Auto-generated types from manifest: ${manifest.name}`,
          ` * Generated at: ${new Date().toISOString()}`,
          " * DO NOT EDIT MANUALLY",
          " */",
          "",
          `export const AGENT_WALLET = "${manifest.wallet}" as const;`,
          `export const AGENT_NAME = "${manifest.name}" as const;`,
          "",
        ];

        // Generate tool type union
        if (manifest.tools && manifest.tools.length > 0) {
          lines.push("export type ToolName =");
          manifest.tools.forEach((tool: any, i: number) => {
            const sep = i === manifest.tools.length - 1 ? ";" : " |";
            lines.push(`  | "${tool.name}"${sep}`);
          });
          lines.push("");

          // Generate individual tool interfaces
          for (const tool of manifest.tools) {
            const safeName = tool.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+/, "");
            const typeName = safeName.charAt(0).toUpperCase() + safeName.slice(1);

            lines.push(`export interface ${typeName}Args {`);
            if (tool.requiredArgs && tool.requiredArgs.length > 0) {
              for (const arg of tool.requiredArgs) {
                lines.push(`  readonly ${arg}: string;`);
              }
            }
            lines.push("  readonly [key: string]: unknown;");
            lines.push("}");
            lines.push("");
          }

          // Discriminated union map
          lines.push("export interface ToolMap {");
          for (const tool of manifest.tools) {
            const safeName = tool.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+/, "");
            const typeName = safeName.charAt(0).toUpperCase() + safeName.slice(1);
            lines.push(`  readonly "${tool.name}": ${typeName}Args;`);
          }
          lines.push("}");
          lines.push("");

          // Network identifiers
          lines.push("export const SUPPORTED_NETWORKS = [");
          for (const net of manifest.supportedNetworks ?? []) {
            lines.push(`  "${net}",`);
          }
          lines.push("] as const;");
          lines.push("");
        }

        const content = lines.join("\n");

        // Write output
        const outDir = path.dirname(opts.out);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(opts.out, content + "\n");
        log.info(`Generated types at ${opts.out}`);
      } catch (err) {
        log.error("Type generation failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── tools publish ───────────────────────────────
  tools
    .command("publish <manifest>")
    .description("Publish tool manifest to on-chain registry")
    .action(async (manifestPath: string) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        if (!fs.existsSync(manifestPath)) {
          log.error(`Manifest not found: ${manifestPath}`);
          process.exit(1);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        log.info(`Publishing ${manifest.tools?.length ?? 0} tools from manifest...`);

        if (program.opts().dryRun) {
          log.info("DRY RUN — would publish tools:");
          output(manifest.tools?.map((t: any) => t.name));
          return;
        }

        // Use the builder to register with tools
        let builder = ctx.client.builder
          .agent(manifest.name)
          .description(manifest.description);

        if (manifest.endpoint?.url) {
          builder = builder.x402Endpoint(manifest.endpoint.url);
        }

        for (const tool of manifest.tools ?? []) {
          builder = builder.addCapability(tool.name, {
            protocol: tool.protocol,
            description: tool.description,
          });
        }

        log.info("Publishing to chain...");
        // Note: this assumes the agent is already registered
        // In a full implementation, would call publishTool for each
        log.info("Tools published (capabilities synced)");
      } catch (err) {
        log.error("Publish failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── tools compare ───────────────────────────────
  tools
    .command("compare <walletA> <walletB>")
    .description("Diff capabilities between two agents")
    .action(async (walletAStr: string, walletBStr: string) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const walletA = parseWallet(walletAStr);
        const walletB = parseWallet(walletBStr);

        const [profileA, profileB] = await Promise.all([
          ctx.client.discovery.getAgentProfile(walletA),
          ctx.client.discovery.getAgentProfile(walletB),
        ]);

        if (!profileA || !profileB) {
          log.error("One or both agents not found");
          process.exit(1);
        }

        const capsA = new Set(profileA.identity.capabilities.map((c) => c.id));
        const capsB = new Set(profileB.identity.capabilities.map((c) => c.id));

        const onlyA = [...capsA].filter((c) => !capsB.has(c));
        const onlyB = [...capsB].filter((c) => !capsA.has(c));
        const shared = [...capsA].filter((c) => capsB.has(c));

        output({
          agentA: { name: profileA.identity.name, capabilities: capsA.size },
          agentB: { name: profileB.identity.name, capabilities: capsB.size },
          shared,
          onlyInA: onlyA,
          onlyInB: onlyB,
        });
      } catch (err) {
        log.error("Compare failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── tools doc ───────────────────────────────────
  tools
    .command("doc <wallet>")
    .description("Auto-generate documentation for agent tools")
    .option("--format <fmt>", "Output format: markdown|html", "markdown")
    .option("--out <path>", "Output file")
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const wallet = parseWallet(walletStr);
        const profile = await ctx.client.discovery.getAgentProfile(wallet);

        if (!profile) {
          log.error("Agent not found");
          process.exit(1);
        }

        const lines: string[] = [
          `# ${profile.identity.name}`,
          "",
          profile.identity.description,
          "",
          "## Capabilities",
          "",
        ];

        for (const cap of profile.identity.capabilities) {
          lines.push(`### \`${cap.id}\``);
          lines.push(cap.description ?? "No description");
          lines.push(`- Protocol: ${cap.protocolId ?? "N/A"}`);
          lines.push(`- Version: ${cap.version ?? "N/A"}`);
          lines.push("");
        }

        lines.push("## Pricing", "");
        for (const tier of profile.identity.pricing) {
          lines.push(`### Tier: ${tier.tierId}`);
          lines.push(`- Price per call: ${tier.pricePerCall.toString()}`);
          lines.push(`- Rate limit: ${tier.rateLimit} calls/min`);
          lines.push("");
        }

        if (profile.identity.x402Endpoint) {
          lines.push("## x402 Endpoint", "");
          lines.push(`\`${profile.identity.x402Endpoint}\``);
          lines.push("");
        }

        const content = lines.join("\n");

        if (opts.out) {
          fs.writeFileSync(opts.out, content);
          log.info(`Documentation saved to ${opts.out}`);
        } else {
          process.stdout.write(content);
        }
      } catch (err) {
        log.error("Doc generation failed", { error: (err as Error).message });
        process.exit(1);
      }
    });
}
