/**
 * @module cli/commands/agent
 * @description Agent lifecycle — v0.20.0 aligned.
 * Uses: client.agent.registerAgent(), client.agent.updateAgent(), deactivateAgent(), reactivateAgent()
 * Pdas: getAgentPDA(wallet), getAgentStatsPDA(wallet), getGlobalPDA()
 */
import { Command } from "commander";
import anchor from "@coral-xyz/anchor";
import { SystemProgram, type AccountInfo } from "@solana/web3.js";
import { loadConfig } from "../config.js";
import { buildContext, parseWallet } from "../context.js";
import { Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import { log, output } from "../logger.js";

const { BN } = anchor;

export function registerAgentCommands(program: Command): void {
  const agent = program.command("agent").description("Agent lifecycle management");

  agent.command("list")
    .description("List registered agents on-chain (via program account scan)")
    .option("--limit <n>", "Limit results", "50")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        log.info("Scanning agents...");
        const [globalPda] = Pdas.getGlobalPDA();
        const filter = [{ memcmp: { offset: 8, bytes: globalPda.toBase58() } }];
        const accounts = await ctx.client.connection.getProgramAccounts(ctx.programId, {
          filters: [{ dataSize: 1024 }],
        });
        const rows = accounts.slice(0, parseInt(opts.limit)).map((acc: { pubkey: { toBase58(): string }; account: AccountInfo<Buffer> }) => ({
          address: acc.pubkey.toBase58(),
          dataLen: acc.account.data.length,
        }));
        output(rows);
      } catch (err) { log.error("list failed", { error: (err as Error).message }); process.exit(1); }
    });

  agent.command("info <wallet>")
    .description("Fetch agent account data")
    .action(async (walletStr: string) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const wallet = parseWallet(walletStr);
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const data = await ctx.client.fetchAccount("agentAccount", agentPda);
        output(data ?? { error: "Agent not found", pda: agentPda.toBase58() });
      } catch (err) { log.error("info failed", { error: (err as Error).message }); process.exit(1); }
    });

  agent.command("register")
    .description("Register a new agent")
    .requiredOption("--name <name>", "Agent name")
    .option("--description <desc>", "Agent description", "SAP CLI agent")
    .option("--capabilities <list>", "Comma-separated capabilities")
    .option("--x402-endpoint <url>", "x402 endpoint URL")
    .option("--simulate", "Dry run")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const wallet = ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const [agentStats] = Pdas.getAgentStatsPDA(wallet);
        const [globalRegistry] = Pdas.getGlobalPDA();

        // Pricing menu PDA: derived from global registry + agent
        // Use placeholder for pricing menu
        const pricingMenu = Pdas.getGlobalPDA()[0]; // placeholder

        const caps = opts.capabilities ? opts.capabilities.split(",").map((s: string) => ({
          id: s.trim(), description: null, protocolId: "sap", version: "1.0",
        })) : [];

        const ix = await ctx.client.agent.registerAgent({
          signer: ctx.wallet,
          wallet,
          agent: agentPda,
          agentStats,
          pricingMenu,
          globalRegistry,
          name: opts.name,
          description: opts.description,
          capabilities: caps,
          pricing: [],
          protocols: ["sap"],
          agentId: null,
          agentUri: null,
          x402Endpoint: opts.x402Endpoint ?? null,
        });

        if (opts.simulate || program.opts().dryRun) {
          output({ dryRun: true, name: opts.name }); return;
        }

        const tx = await ctx.client.buildTransaction([ix], wallet);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        log.info("Agent registered!");
        output({ txSignature: sig, agentPda: agentPda.toBase58() });
      } catch (err) { log.error("register failed", { error: (err as Error).message }); process.exit(1); }
    });
}
