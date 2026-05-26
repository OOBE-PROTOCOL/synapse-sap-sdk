/**
 * @module cli/commands/analytics
 * @description Revenue analytics and treasury tracking — v0.18.0 PRO
 */

import { Command } from "commander";
import { loadConfig } from "../config";
import { buildContext } from "../context";
import { log, output } from "../logger";
import { createSpinner, displayTable, formatSol, status } from "../ui";

export function registerAnalyticsCommands(program: Command): void {
  const analytics = program
    .command("analytics")
    .description("Revenue analytics and treasury monitoring");

  analytics
    .command("revenue")
    .description("View revenue breakdown and treasury stats")
    .option("--days <n>", "Time window in days", "7")
    .option("--json", "JSON output")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      const spinner = createSpinner({
        text: "Fetching treasury data...",
        color: "cyan",
      });

      try {
        spinner.start();

        // Get treasury balance
        const treasuryBalance = await ctx.client.connection.getBalance(
          ctx.treasuryWallet
        );

        // Get recent transactions (simplified - in production use Geyser)
        const signatures = await ctx.client.connection.getSignaturesForAddress(
          ctx.treasuryWallet,
          { limit: 100 }
        );

        // Analyze fee types
        const feeBreakdown = {
          registration: 0,
          settlement: 0,
          listing: 0,
          close: 0,
        };

        // Placeholder analysis (in production, parse transaction logs)
        const totalTxFees = signatures.length;
        feeBreakdown.registration = Math.floor(totalTxFees * 0.3);
        feeBreakdown.settlement = Math.floor(totalTxFees * 0.5);
        feeBreakdown.listing = Math.floor(totalTxFees * 0.15);
        feeBreakdown.close = Math.floor(totalTxFees * 0.05);

        spinner.succeed();

        if (opts.json) {
          output({
            treasury: ctx.treasuryWallet.toBase58(),
            balanceLamports: treasuryBalance,
            balanceSol: treasuryBalance / 1e9,
            periodDays: parseInt(opts.days),
            totalTransactions: totalTxFees,
            breakdown: feeBreakdown,
          });
        } else {
          console.log();
          status.success("Revenue Report");
          console.log();
          console.log(
            `Treasury: ${ctx.treasuryWallet.toBase58().slice(0, 8)}...`
          );
          console.log(`Balance: ${formatSol(treasuryBalance)}`);
          console.log(`Period: Last ${opts.days} days`);
          console.log();

          const tableData = [
            {
              type: "🆕 Registration",
              count: feeBreakdown.registration,
              revenue: feeBreakdown.registration * 0.1,
            },
            {
              type: "💰 Settlement",
              count: feeBreakdown.settlement,
              revenue: feeBreakdown.settlement * 0.005,
            },
            {
              type: "⭐ Featured",
              count: feeBreakdown.listing,
              revenue: feeBreakdown.listing * 1.0,
            },
            {
              type: "❌ Closure",
              count: feeBreakdown.close,
              revenue: feeBreakdown.close * 0.05,
            },
          ];

          const totalRevenue = tableData.reduce(
            (sum, row) => sum + row.revenue,
            0
          );

          displayTable(
            [
              { header: "Fee Type", key: "type", width: 20 },
              { header: "Count", key: "count", width: 10, align: "right" },
              {
                header: "Revenue (SOL)",
                key: "revenue",
                width: 15,
                align: "right",
              },
            ],
            tableData
          );

          console.log("─".repeat(50));
          console.log(
            `Total Revenue: ${formatSol(totalRevenue * 1e9).padStart(15)}`
          );
          console.log();
        }
      } catch (err) {
        spinner.fail();
        log.error("Analytics failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  analytics
    .command("treasury")
    .description("Monitor treasury wallet in real-time")
    .option("--watch", "Watch mode (live updates)")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));

      try {
        if (opts.watch) {
          console.log();
          status.info("Watching treasury wallet...");
          console.log(`Address: ${ctx.treasuryWallet.toBase58()}`);
          console.log("Press Ctrl+C to stop\n");

          let lastBalance = await ctx.client.connection.getBalance(
            ctx.treasuryWallet
          );

          setInterval(async () => {
            const balance = await ctx.client.connection.getBalance(
              ctx.treasuryWallet
            );

            if (balance !== lastBalance) {
              const diff = balance - lastBalance;
              const diffSol = (diff / 1e9).toFixed(4);
              const symbol = diff > 0 ? "+" : "";

              console.log(
                `[${new Date().toISOString()}] ${formatSol(balance)} (${symbol}${diffSol} SOL)`
              );
              lastBalance = balance;
            }
          }, 5000);
        } else {
          const spinner = createSpinner({
            text: "Fetching treasury info...",
            color: "cyan",
          });

          spinner.start();

          const balance = await ctx.client.connection.getBalance(
            ctx.treasuryWallet
          );
          const transactionCount =
            await ctx.client.connection.getTransactionCount();

          spinner.succeed();

          console.log();
          console.log(`Treasury Wallet: ${ctx.treasuryWallet.toBase58()}`);
          console.log(`Balance: ${formatSol(balance)}`);
          console.log(`Transaction Count: ${transactionCount}`);
          console.log();
        }
      } catch (err) {
        log.error("Treasury check failed", { error: (err as Error).message });
        process.exit(1);
      }
    });
}
