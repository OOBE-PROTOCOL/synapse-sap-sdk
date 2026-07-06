/**
 * @module cli/commands/agent
 * @description Agent lifecycle — v1.0.0 aligned.
 * Uses: client.agent.registerAgent(), closeAgent(), and client.staking.closeStake()
 * Pdas: getAgentPDA(wallet), getAgentStatsPDA(agent), getPricingMenuPDA(agent), getAgentStakePDA(agent), getGlobalPDA()
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
        const [agentStats] = Pdas.getAgentStatsPDA(agentPda);
        const [pricingMenu] = Pdas.getPricingMenuPDA(agentPda);
        const [globalRegistry] = Pdas.getGlobalPDA();

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

  agent.command("close")
    .description("Close the current wallet's agent and return rent/stake when no active obligations remain")
    .option("--simulate", "Dry run")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const wallet = ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const [agentStats] = Pdas.getAgentStatsPDA(agentPda);
        const [vaultCheck] = Pdas.getVaultPDA(agentPda);
        const [pricingMenu] = Pdas.getPricingMenuPDA(agentPda);
        const [stake] = Pdas.getAgentStakePDA(agentPda);
        const [globalRegistry] = Pdas.getGlobalPDA();

        const ix = await ctx.client.agent.closeAgent({
          signer: ctx.wallet,
          wallet,
          agent: agentPda,
          agentStats,
          vaultCheck,
          pricingMenu,
          stake,
          globalRegistry,
        });

        if (opts.simulate || program.opts().dryRun) {
          output({ dryRun: true, agentPda: agentPda.toBase58(), stake: stake.toBase58() }); return;
        }

        const tx = await ctx.client.buildTransaction([ix], wallet);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, agentPda: agentPda.toBase58(), stake: stake.toBase58() });
      } catch (err) { log.error("close failed", { error: (err as Error).message }); process.exit(1); }
    });

  agent.command("close-stake [agentWallet]")
    .description("Recover a legacy StakePDA after its Agent PDA has already been closed")
    .option("--simulate", "Dry run")
    .action(async (agentWalletStr: string | undefined, opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const agentWallet = agentWalletStr ? parseWallet(agentWalletStr) : ctx.wallet.publicKey;
        if (!agentWallet.equals(ctx.wallet.publicKey)) {
          throw new Error("close-stake must be signed by the agent wallet; use --keypair for that wallet");
        }
        const [agentPda] = Pdas.getAgentPDA(agentWallet);
        const [stake] = Pdas.getAgentStakePDA(agentPda);

        const ix = await ctx.client.staking.closeStake({
          signer: ctx.wallet,
          wallet: ctx.wallet.publicKey,
          agent: agentPda,
          stake,
        });

        if (opts.simulate || program.opts().dryRun) {
          output({ dryRun: true, agentPda: agentPda.toBase58(), stake: stake.toBase58() }); return;
        }

        const tx = await ctx.client.buildTransaction([ix], ctx.wallet.publicKey);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, agentPda: agentPda.toBase58(), stake: stake.toBase58() });
      } catch (err) { log.error("close-stake failed", { error: (err as Error).message }); process.exit(1); }
    });
}
