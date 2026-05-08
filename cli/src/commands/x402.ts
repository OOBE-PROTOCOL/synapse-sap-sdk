/**
 * @module cli/commands/x402
 * @description x402 operations — v0.15.0 aligned.
 */
import { Command } from "commander";
import { loadConfig } from "../config";
import { buildContext, parseWallet } from "../context";
import { Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import { log, output } from "../logger";

export function registerX402Commands(program: Command): void {
  const x402 = program.command("x402").description("x402 micropayment operations");

  x402.command("headers <agent>")
    .description("Build x402 payment headers")
    .option("--network <id>", "Network identifier", "solana:mainnet-beta")
    .action(async (agentStr: string, opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const [agentPda] = Pdas.getAgentPDA(parseWallet(agentStr));
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, 0);
        const data = await ctx.client.fetchAccount("escrowAccount", escrowPda);
        if (!data) { log.error("No escrow found"); process.exit(1); }
        output({
          escrowPda: escrowPda.toBase58(),
          agent: agentStr,
          depositor: ctx.wallet.publicKey.toBase58(),
          network: opts.network,
        });
      } catch (err) { log.error("headers failed", { error: (err as Error).message }); process.exit(1); }
    });

  x402.command("verify <signature>")
    .description("Verify a transaction on-chain")
    .action(async (sig: string) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const tx = await ctx.client.connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
        output({ signature: sig, slot: tx?.slot, fee: tx?.meta?.fee, err: tx?.meta?.err });
      } catch (err) { log.error("verify failed", { error: (err as Error).message }); process.exit(1); }
    });
}
