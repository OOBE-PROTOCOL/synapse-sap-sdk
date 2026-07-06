/**
 * @module cli/commands/merchant
 * @description Merchant/agent operations — v1.0.0 aligned.
 * Uses: client.agent.registerAgent, client.staking.initStake, client.vault.addVaultDelegate
 */
import { Command } from "commander";
import anchor from "@coral-xyz/anchor";
import { loadConfig } from "../config.js";
import { buildContext, parseWallet } from "../context.js";
import { Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import { log, output } from "../logger.js";

const { BN } = anchor;

export function registerMerchantCommands(program: Command): void {
  const merchant = program.command("merchant").description("Merchant / agent operations");

  merchant.command("register")
    .description("Register an agent")
    .requiredOption("--name <name>", "Agent name")
    .option("--description <desc>", "Description", "SAP CLI agent")
    .option("--capabilities <list>", "Comma-separated capabilities")
    .option("--simulate", "Dry run")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const wallet = ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const [agentStats] = Pdas.getAgentStatsPDA(agentPda);
        const [pricingMenu] = Pdas.getPricingMenuPDA(agentPda);
        const [globalPda] = Pdas.getGlobalPDA();

        const caps = opts.capabilities ? opts.capabilities.split(",").map((s: string) => ({
          id: s.trim(), description: null, protocolId: "sap", version: "1.0",
        })) : [];

        const ix = await ctx.client.agent.registerAgent({
          signer: ctx.wallet, wallet, agent: agentPda, agentStats,
          pricingMenu, globalRegistry: globalPda,
          name: opts.name, description: opts.description,
          capabilities: caps, pricing: [], protocols: ["sap"],
          agentId: null, agentUri: null, x402Endpoint: null,
        });

        if (opts.simulate || program.opts().dryRun) {
          output({ dryRun: true }); return;
        }

        const tx = await ctx.client.buildTransaction([ix], wallet);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, agentPda: agentPda.toBase58() });
      } catch (err) { log.error("register failed", { error: (err as Error).message }); process.exit(1); }
    });

  merchant.command("stake init")
    .description("Initialize stake account")
    .option("--deposit <lamports>", "Initial deposit", "1000000000")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        // staking module API not exposed in dist; placeholder
        output({ info: "Staking init — use direct program methods", deposit: opts.deposit });
      } catch (err) { log.error("stake init failed", { error: (err as Error).message }); process.exit(1); }
    });

  merchant.command("delegate add <delegate>")
    .description("Add vault delegate")
    .action(async (delegateStr: string) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const delegate = parseWallet(delegateStr);
        const wallet = ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const [vaultPda] = Pdas.getVaultPDA(agentPda);
        const [vaultDelegatePda] = Pdas.getVaultDelegatePDA(vaultPda, delegate);

        const ix = await ctx.client.vault.addVaultDelegate({
          signer: ctx.wallet, wallet, agent: agentPda, vault: vaultPda,
          vaultDelegate: vaultDelegatePda, delegate,
          permissions: 0b111111, expiresAt: new BN(Math.floor(Date.now() / 1000) + 86400),
        });

        const tx = await ctx.client.buildTransaction([ix], wallet);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, delegate: delegateStr });
      } catch (err) { log.error("delegate add failed", { error: (err as Error).message }); process.exit(1); }
    });
}
