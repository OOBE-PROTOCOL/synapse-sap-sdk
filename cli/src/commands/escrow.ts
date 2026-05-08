/**
 * @module cli/commands/escrow
 * @description Escrow v2 lifecycle — v0.14.0 aligned.
 * Uses: client.escrow.createEscrowV2, depositEscrowV2, settleCallsV2, closeEscrowV2
 * Pdas: getAgentPDA, getEscrowV2PDA, getAgentStatsPDA, getAgentStakePDA, getGlobalPDA
 */
import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { loadConfig } from "../config";
import { buildContext, parseWallet } from "../context";
import { Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import { log, output } from "../logger";

export function registerEscrowCommands(program: Command): void {
  const escrow = program.command("escrow").description("Escrow v2 lifecycle management");

  escrow.command("create <agent>")
    .description("Create escrow v2 for an agent")
    .option("--deposit <lamports>", "Initial deposit", "1000000000")
    .option("--price-per-call <n>", "Price per call", "10000")
    .option("--max-calls <n>", "Max calls", "100")
    .option("--expires <hours>", "Expiry in hours", "24")
    .option("--token-mint <pubkey>", "SPL token mint (optional)")
    .option("--simulate", "Dry run")
    .action(async (agentStr: string, opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const agentWallet = parseWallet(agentStr);
        const [agentPda] = Pdas.getAgentPDA(agentWallet);
        const [agentStake] = Pdas.getAgentStakePDA(agentWallet);
        const [agentStats] = Pdas.getAgentStatsPDA(agentWallet);
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, 0);
        const [globalPda] = Pdas.getGlobalPDA();
        const pricingMenu = globalPda; // placeholder

        const ix = await ctx.client.escrow.createEscrowV2({
          signer: ctx.wallet,
          depositor: ctx.wallet.publicKey,
          agent: agentPda,
          agentStake,
          agentStats,
          pricingMenu,
          escrow: escrowPda,
          escrowNonce: new BN(0),
          pricePerCall: new BN(opts.pricePerCall),
          maxCalls: new BN(opts.maxCalls),
          initialDeposit: new BN(opts.deposit),
          expiresAt: new BN(Math.floor(Date.now() / 1000) + (parseInt(opts.expires) || 0) * 3600),
          volumeCurve: [],
          tokenMint: opts.tokenMint ? new PublicKey(opts.tokenMint) : null,
          tokenDecimals: 9,
          settlementSecurity: 0,
          disputeWindowSlots: new BN(300),
          coSigner: null,
          arbiter: null,
        });

        if (opts.simulate || program.opts().dryRun) {
          output({ dryRun: true, escrowPda: escrowPda.toBase58() }); return;
        }

        const tx = await ctx.client.buildTransaction([ix], ctx.wallet.publicKey);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, escrowPda: escrowPda.toBase58() });
      } catch (err) { log.error("create failed", { error: (err as Error).message }); process.exit(1); }
    });

  escrow.command("deposit <agent>")
    .description("Deposit into escrow v2")
    .requiredOption("--amount <lamports>", "Amount")
    .action(async (agentStr: string, opts: { amount: string }) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const [agentPda] = Pdas.getAgentPDA(parseWallet(agentStr));
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, 0);

        const ix = await ctx.client.escrow.depositEscrowV2({
          signer: ctx.wallet,
          depositor: ctx.wallet.publicKey,
          escrow: escrowPda,
          escrowNonce: new BN(0),
          amount: new BN(opts.amount),
        });

        const tx = await ctx.client.buildTransaction([ix], ctx.wallet.publicKey);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig });
      } catch (err) { log.error("deposit failed", { error: (err as Error).message }); process.exit(1); }
    });

  escrow.command("settle <agent>")
    .description("Settle calls from escrow v2")
    .requiredOption("--calls <n>", "Calls to settle")
    .option("--service-data <data>", "Service data", "cli-settle")
    .action(async (agentStr: string, opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const [agentPda] = Pdas.getAgentPDA(parseWallet(agentStr));
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, 0);
        const [agentStats] = Pdas.getAgentStatsPDA(parseWallet(agentStr));
        const callsToSettle = parseInt(opts.calls);

        const ix = await ctx.client.escrow.settleCallsV2({
          signer: ctx.wallet,
          wallet: ctx.wallet.publicKey,
          agent: agentPda,
          agentStats,
          escrow: escrowPda,
          settlementReceipt: escrowPda, // placeholder - use getPendingSettlementPDA in prod
          escrowNonce: new BN(0),
          callsToSettle: new BN(callsToSettle),
          serviceHash: Array.from(Buffer.from(opts.serviceData)),
        });

        const tx = await ctx.client.buildTransaction([ix], ctx.wallet.publicKey);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, callsSettled: callsToSettle });
      } catch (err) { log.error("settle failed", { error: (err as Error).message }); process.exit(1); }
    });

  escrow.command("info <agent>")
    .description("Show escrow v2 data")
    .action(async (agentStr: string) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const [agentPda] = Pdas.getAgentPDA(parseWallet(agentStr));
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, 0);
        const data = await ctx.client.fetchAccount("escrowAccount", escrowPda);
        output(data ?? { error: "Escrow not found", escrowPda: escrowPda.toBase58() });
      } catch (err) { log.error("info failed", { error: (err as Error).message }); process.exit(1); }
    });
}
