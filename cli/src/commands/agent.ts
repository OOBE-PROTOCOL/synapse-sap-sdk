/**
 * @module cli/commands/agent
 * @description Agent lifecycle commands: list, info, tools, health, register.
 */

import { Command } from "commander";
import { loadConfig } from "../config";
import { buildContext, parseWallet } from "../context";
import { log, output, saveTmp } from "../logger";

export function registerAgentCommands(program: Command): void {
  const agent = program
    .command("agent")
    .description("Agent lifecycle management")
    .addHelpText("after", `
Examples:
  $ synapse-sap agent list --active
  $ synapse-sap agent list --capability image-gen --protocol kamiyo
  $ synapse-sap agent info <WALLET> --fetch-tools --fetch-endpoints
  $ synapse-sap agent tools <WALLET> --category Swap --schema
  $ synapse-sap agent health <WALLET> --timeout 10000
  $ synapse-sap agent register --manifest agent.json --simulate
`);

  // ── agent list ──────────────────────────────────
  agent
    .command("list")
    .description("List registered agents on the SAP network")
    .option("--active", "Show only active agents")
    .option("--capability <id>", "Filter by capability ID")
    .option("--protocol <proto>", "Filter by protocol (sap|kamiyo|mcp)")
    .option("--search <regex>", "Search by name/description regex")
    .option("--limit <n>", "Max results", "50")
    .addHelpText("after", `
Examples:
  $ synapse-sap agent list                                   # all agents
  $ synapse-sap agent list --active --limit 10               # top 10 active
  $ synapse-sap agent list --capability image-gen            # by capability
  $ synapse-sap agent list --protocol kamiyo --search "bot"  # protocol + search
`)
    .action(async (opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        log.info("Scanning SAP network for agents...");

        let agents: any[] = [];
        if (opts.capability) {
          agents = await ctx.client.discovery.findAgentsByCapability(opts.capability);
        } else if (opts.protocol) {
          agents = await ctx.client.discovery.findAgentsByProtocol(opts.protocol);
        } else {
          // Get network overview + scan all capability indexes
          const overview = await ctx.client.discovery.getNetworkOverview();
          log.info(`Network: ${overview.totalAgents} total agents, ${overview.activeAgents} active`);
          agents = [];
        }

        const rows = agents.map((a: any) => ({
          pda: a.pda.toBase58(),
          name: a.identity?.name ?? "(unknown)",
          active: a.stats?.isActive ?? a.identity?.isActive ?? false,
          calls: a.stats?.totalCallsServed?.toString() ?? "0",
          reputation: a.identity?.reputationScore ?? 0,
          x402: a.identity?.x402Endpoint ? "✓" : "✗",
          capabilities: a.identity?.capabilities.length ?? 0,
        }));

        // Apply filters
        let filtered = rows;
        if (opts.active) {
          filtered = filtered.filter((r) => r.active);
        }
        if (opts.search) {
          const re = new RegExp(opts.search, "i");
          filtered = filtered.filter((r) => re.test(r.name));
        }

        output(filtered.slice(0, parseInt(opts.limit)));
      } catch (err) {
        log.error("Failed to list agents", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── agent info ──────────────────────────────────
  agent
    .command("info <wallet>")
    .description("Show full agent profile (identity, stats, capabilities, pricing, x402)")
    .option("--fetch-tools", "Also fetch published tools")
    .option("--fetch-endpoints", "Validate advertised endpoints")
    .addHelpText("after", `
Examples:
  $ synapse-sap agent info <WALLET>
  $ synapse-sap agent info <WALLET> --fetch-tools --fetch-endpoints
  $ synapse-sap agent info <WALLET> --json | jq '.capabilities'
`)
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const wallet = parseWallet(walletStr);
        const profile = await ctx.client.discovery.getAgentProfile(wallet);

        if (!profile) {
          log.error(`Agent not found for wallet: ${walletStr}`);
          process.exit(1);
        }

        const info = {
          pda: profile.pda.toBase58(),
          wallet: profile.identity.wallet.toBase58(),
          name: profile.identity.name,
          description: profile.identity.description,
          agentId: profile.identity.agentId,
          agentUri: profile.identity.agentUri,
          x402Endpoint: profile.identity.x402Endpoint,
          isActive: profile.computed.isActive,
          totalCalls: profile.computed.totalCalls,
          reputationScore: profile.computed.reputationScore,
          capabilities: profile.identity.capabilities.map((c) => ({
            id: c.id,
            protocol: c.protocolId,
            version: c.version,
          })),
          pricing: profile.identity.pricing.map((p) => ({
            tierId: p.tierId,
            pricePerCall: p.pricePerCall.toString(),
            rateLimit: p.rateLimit,
          })),
          protocols: profile.computed.protocols,
          plugins: profile.identity.activePlugins.length,
        };

        output(info);

        if (opts.fetchEndpoints && profile.identity.x402Endpoint) {
          log.info("\nValidating x402 endpoint...");
          const { validateEndpoint } = await import(
            "@oobe-protocol-labs/synapse-sap-sdk"
          );
          const result = await validateEndpoint(profile.identity.x402Endpoint);
          output(result);
        }
      } catch (err) {
        log.error("Failed to fetch agent info", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── agent tools ─────────────────────────────────
  agent
    .command("tools <wallet>")
    .description("List tools published by an agent")
    .option("--category <cat>", "Filter by tool category")
    .option("--payment-mode <mode>", "Filter by payment mode")
    .option("--schema", "Print JSON schema for tool args")
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const wallet = parseWallet(walletStr);

        // Discover tools across all categories
        const categories = ["Swap", "Lend", "Stake", "Nft", "Payment", "Data", "Governance", "Bridge", "Analytics", "Custom"];
        const allTools = [];

        for (const cat of categories) {
          if (opts.category && cat.toLowerCase() !== opts.category.toLowerCase()) continue;
          const tools = await ctx.client.discovery.findToolsByCategory(cat as any);
          for (const tool of tools) {
            if (tool.descriptor) {
              allTools.push({
                pda: tool.pda.toBase58(),
                name: tool.descriptor.toolName,
                category: cat,
                httpMethod: tool.descriptor.httpMethod,
                paramsCount: tool.descriptor.paramsCount,
                isActive: tool.descriptor.isActive,
              });
            }
          }
        }

        output(allTools);
      } catch (err) {
        log.error("Failed to fetch tools", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── agent health ────────────────────────────────
  agent
    .command("health <wallet>")
    .description("Ping advertised health endpoints, x402, escrow status")
    .option("--timeout <ms>", "Request timeout", "5000")
    .option("--retries <n>", "Number of retries", "2")
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

        const checks: Record<string, unknown> = {
          agent: profile.computed.isActive ? "ACTIVE" : "INACTIVE",
          totalCalls: profile.computed.totalCalls,
          reputation: profile.computed.reputationScore,
        };

        // Check x402 endpoint
        if (profile.identity.x402Endpoint) {
          const { validateEndpoint } = await import(
            "@oobe-protocol-labs/synapse-sap-sdk"
          );
          const result = await validateEndpoint(profile.identity.x402Endpoint, {
            timeoutMs: parseInt(opts.timeout),
            retries: parseInt(opts.retries),
          });
          checks.x402Endpoint = {
            url: result.url,
            reachable: result.reachable,
            statusCode: result.statusCode,
            latencyMs: result.latencyMs,
            isJson: result.isJson,
            isSapCapable: result.isSapCapable,
            warnings: result.warnings,
          };
        }

        // Check escrow
        const hasEscrow = await ctx.client.x402.hasEscrow(wallet);
        checks.escrow = hasEscrow ? "EXISTS" : "NONE";

        if (hasEscrow) {
          const balance = await ctx.client.x402.getBalance(wallet);
          checks.escrowBalance = {
            balance: balance?.balance.toString(),
            callsRemaining: balance?.callsRemaining,
            isExpired: balance?.isExpired,
          };
        }

        output(checks);
      } catch (err) {
        log.error("Health check failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── agent register ──────────────────────────────
  agent
    .command("register")
    .description("Register a new agent from a manifest file")
    .option("--manifest <path>", "Path to agent manifest JSON")
    .option("--name <name>", "Agent name")
    .option("--description <desc>", "Agent description")
    .option("--x402-endpoint <url>", "x402 payment endpoint URL")
    .option("--simulate", "Dry run — don't send transaction")
    .option("--fee-payer <path>", "Fee payer keypair path")
    .addHelpText("after", `
Examples:
  $ synapse-sap agent register --manifest agent.json
  $ synapse-sap agent register --manifest agent.json --simulate    # dry run
  $ synapse-sap agent register --name "My Agent" --x402-endpoint https://api.example.com
`)
    .action(async (opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        if (opts.manifest) {
          const fs = require("fs");
          const manifest = JSON.parse(fs.readFileSync(opts.manifest, "utf-8"));

          log.info(`Registering agent "${manifest.name}" from manifest...`);

          if (opts.simulate || program.opts().dryRun) {
            log.info("DRY RUN — would register agent with:");
            output(manifest);
            return;
          }

          let builder = ctx.client.builder
            .agent(manifest.name)
            .description(manifest.description);

          if (manifest.endpoint?.url) {
            builder = builder.x402Endpoint(manifest.endpoint.url);
          }

          if (manifest.tools) {
            for (const tool of manifest.tools) {
              builder = builder.addCapability(
                `${tool.protocol}:${tool.name}`,
                { protocol: tool.protocol },
              );
            }
          }

          // Register
          const result = await builder.register();
          log.info("Agent registered successfully!");
          output({
            txSignature: result.txSignature,
            agentPda: result.agentPda.toBase58(),
            statsPda: result.statsPda.toBase58(),
          });
        } else if (opts.name) {
          log.info(`Registering agent "${opts.name}"...`);

          if (opts.simulate || program.opts().dryRun) {
            log.info("DRY RUN — would register with provided options");
            return;
          }

          let builder = ctx.client.builder.agent(opts.name);
          if (opts.description) builder = builder.description(opts.description);
          if (opts.x402Endpoint) builder = builder.x402Endpoint(opts.x402Endpoint);

          const result = await builder.register();
          log.info("Agent registered!");
          output({
            txSignature: result.txSignature,
            agentPda: result.agentPda.toBase58(),
            statsPda: result.statsPda.toBase58(),
          });
        } else {
          log.error("Provide --manifest <path> or --name <name>");
          process.exit(1);
        }
      } catch (err) {
        log.error("Registration failed", { error: (err as Error).message });
        process.exit(1);
      }
    });
}
