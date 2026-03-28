/**
 * @module cli/commands/escrow
 * @description Escrow lifecycle commands: open, deposit, withdraw, close, dump, list, monitor.
 */

import { Command } from "commander";
import { loadConfig } from "../config";
import { buildContext, parseWallet } from "../context";
import { log, output, saveTmp } from "../logger";

export function registerEscrowCommands(program: Command): void {
  const escrow = program
    .command("escrow")
    .description("x402 escrow lifecycle management");

  // ── escrow open ─────────────────────────────────
  escrow
    .command("open <wallet>")
    .description("Open an escrow for an agent")
    .option("--token <type>", "Token type: sol|spl", "sol")
    .option("--mint <pubkey>", "SPL token mint (for spl type)")
    .option("--decimals <n>", "Token decimals", "9")
    .option("--price <lamports>", "Price per call", "1000")
    .option("--max-calls <n>", "Max calls (0=unlimited)", "0")
    .option("--deposit <lamports>", "Initial deposit amount")
    .option("--network <id>", "SapNetworkId for x402 headers")
    .option("--expires <timestamp>", "Expiry unix timestamp (0=never)", "0")
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);

        if (!opts.deposit) {
          log.error("--deposit is required");
          process.exit(1);
        }

        if (program.opts().dryRun) {
          log.info("DRY RUN — would create escrow:");
          output({
            agentWallet: walletStr,
            pricePerCall: opts.price,
            maxCalls: opts.maxCalls,
            deposit: opts.deposit,
            network: opts.network ?? "solana:mainnet-beta",
          });
          return;
        }

        log.info(`Opening escrow for agent ${walletStr}...`);

        const paymentCtx = await ctx.client.x402.preparePayment(agentWallet, {
          pricePerCall: parseInt(opts.price),
          maxCalls: parseInt(opts.maxCalls),
          deposit: parseInt(opts.deposit),
          expiresAt: parseInt(opts.expires),
          networkIdentifier: opts.network,
          tokenMint: opts.mint ? parseWallet(opts.mint) : undefined,
          tokenDecimals: parseInt(opts.decimals),
        });

        log.info("Escrow created!");
        output({
          txSignature: paymentCtx.txSignature,
          escrowPda: paymentCtx.escrowPda.toBase58(),
          agentPda: paymentCtx.agentPda.toBase58(),
          depositor: paymentCtx.depositorWallet.toBase58(),
          pricePerCall: paymentCtx.pricePerCall.toString(),
          maxCalls: paymentCtx.maxCalls.toString(),
          networkIdentifier: paymentCtx.networkIdentifier,
        });
      } catch (err) {
        log.error("Failed to open escrow", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── escrow deposit ──────────────────────────────
  escrow
    .command("deposit <wallet>")
    .description("Add funds to an existing escrow")
    .requiredOption("--amount <lamports>", "Amount to deposit")
    .action(async (walletStr: string, opts: { amount: string }) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);

        if (program.opts().dryRun) {
          log.info("DRY RUN — would deposit to escrow");
          return;
        }

        log.info(`Depositing ${opts.amount} to escrow...`);
        const sig = await ctx.client.x402.addFunds(agentWallet, opts.amount);
        log.info("Deposit successful!");
        output({ txSignature: sig });
      } catch (err) {
        log.error("Deposit failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── escrow withdraw ─────────────────────────────
  escrow
    .command("withdraw <wallet>")
    .description("Withdraw funds from an escrow")
    .requiredOption("--amount <lamports>", "Amount to withdraw")
    .action(async (walletStr: string, opts: { amount: string }) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);

        if (program.opts().dryRun) {
          log.info("DRY RUN — would withdraw from escrow");
          return;
        }

        log.info(`Withdrawing ${opts.amount} from escrow...`);
        const sig = await ctx.client.x402.withdrawFunds(agentWallet, opts.amount);
        log.info("Withdrawal successful!");
        output({ txSignature: sig });
      } catch (err) {
        log.error("Withdrawal failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── escrow close ────────────────────────────────
  escrow
    .command("close <wallet>")
    .description("Close an escrow (balance must be 0)")
    .option("--force", "Auto-withdraw remaining balance before closing")
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);

        if (opts.force) {
          const balance = await ctx.client.x402.getBalance(agentWallet);
          if (balance && balance.balance.toNumber() > 0) {
            log.info(`Withdrawing remaining balance: ${balance.balance.toString()}`);
            await ctx.client.x402.withdrawFunds(agentWallet, balance.balance);
          }
        }

        if (program.opts().dryRun) {
          log.info("DRY RUN — would close escrow");
          return;
        }

        log.info("Closing escrow...");
        const sig = await ctx.client.x402.closeEscrow(agentWallet);
        log.info("Escrow closed!");
        output({ txSignature: sig });
      } catch (err) {
        log.error("Close failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── escrow dump ─────────────────────────────────
  escrow
    .command("dump <wallet>")
    .description("Dump full escrow account data")
    .option("--raw", "Show raw base64 data")
    .option("--pretty", "Pretty JSON output")
    .action(async (walletStr: string, opts) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);
        const escrowData = await ctx.client.x402.fetchEscrow(agentWallet);

        if (!escrowData) {
          log.error("No escrow found for this agent");
          process.exit(1);
        }

        const dump = {
          depositor: escrowData.depositor.toBase58(),
          agent: escrowData.agent.toBase58(),
          pricePerCall: escrowData.pricePerCall.toString(),
          maxCalls: escrowData.maxCalls.toString(),
          balance: escrowData.balance.toString(),
          totalDeposited: escrowData.totalDeposited.toString(),
          totalSettled: escrowData.totalSettled.toString(),
          totalCallsSettled: escrowData.totalCallsSettled.toString(),
          expiresAt: escrowData.expiresAt.toString(),
          createdAt: escrowData.createdAt.toString(),
          volumeCurve: escrowData.volumeCurve?.map((v: any) => ({
            afterCalls: v.afterCalls,
            pricePerCall: v.pricePerCall.toString(),
          })),
        };

        output(dump);
      } catch (err) {
        log.error("Dump failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── escrow list ─────────────────────────────────
  escrow
    .command("list")
    .description("List all escrows for the current wallet")
    .action(async () => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        log.info(`Listing escrows for ${ctx.wallet.publicKey.toBase58()}...`);
        // Note: A full implementation would scan via getProgramAccounts
        log.info("Use 'escrow dump <agent-wallet>' to check specific escrows");
      } catch (err) {
        log.error("List failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── escrow monitor ──────────────────────────────
  escrow
    .command("monitor <wallet>")
    .description("Monitor escrow balance updates in real-time")
    .action(async (walletStr: string) => {
      const config = loadConfig(program.opts());
      const ctx = buildContext(config);

      try {
        const agentWallet = parseWallet(walletStr);
        log.info(`Monitoring escrow for ${walletStr}... (Ctrl+C to stop)`);

        const check = async () => {
          const balance = await ctx.client.x402.getBalance(agentWallet);
          if (balance) {
            log.info(`[${new Date().toISOString()}] Balance: ${balance.balance.toString()} | Calls remaining: ${balance.callsRemaining} | Expired: ${balance.isExpired}`);
          } else {
            log.warn("No escrow found");
          }
        };

        await check();
        const interval = setInterval(check, 5000);
        process.on("SIGINT", () => {
          clearInterval(interval);
          log.info("\nMonitoring stopped");
          process.exit(0);
        });
      } catch (err) {
        log.error("Monitor failed", { error: (err as Error).message });
        process.exit(1);
      }
    });
}
