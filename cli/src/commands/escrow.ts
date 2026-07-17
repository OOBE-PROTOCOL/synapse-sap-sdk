/**
 * @module cli/commands/escrow
 * @description Escrow v2 lifecycle — v1.0.0 aligned.
 * Uses: client.escrow.createEscrowV2, depositEscrowV2, settleCallsV2, closeEscrowV2
 * Pdas: getAgentPDA, getEscrowV2PDA, getAgentStatsPDA, getAgentStakePDA, getPricingMenuPDA
 */
import { Command } from "commander";
import anchor from "@coral-xyz/anchor";
import { PublicKey, type AccountMeta } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createHash } from "node:crypto";
import { loadConfig } from "../config.js";
import { buildContext, parseWallet } from "../context.js";
import { Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import { log, output } from "../logger.js";

const { BN } = anchor;

function parseSecurity(input?: string): 1 | 2 {
  const value = (input ?? "dispute-window").toLowerCase();
  if (value === "1" || value === "co-signed" || value === "cosigned") return 1;
  if (value === "2" || value === "dispute-window" || value === "disputewindow") return 2;
  throw new Error("Invalid --settlement-security. Use co-signed/1 or dispute-window/2.");
}

function sha256Bytes(data: string): number[] {
  return Array.from(createHash("sha256").update(data).digest());
}

export function registerEscrowCommands(program: Command): void {
  const escrow = program.command("escrow").description("Escrow v2 lifecycle management");

  escrow.command("create <agent>")
    .description("Create escrow v2 for an agent")
    .option("--deposit <amount>", "Initial deposit in smallest unit of escrow token", "1000000000")
    .option("--price-per-call <n>", "Price per call in smallest unit of escrow token", "10000")
    .option("--max-calls <n>", "Max calls", "100")
    .option("--expires <hours>", "Expiry in hours", "24")
    .option("--nonce <n>", "Escrow nonce", "0")
    .option("--token-mint <pubkey>", "SPL token mint (optional)")
    .option("--token-decimals <n>", "Token decimals (defaults to 9 for SOL, 6 for SPL)", "")
    .option("--settlement-security <mode>", "co-signed/1 or dispute-window/2", "dispute-window")
    .option("--dispute-window-slots <slots>", "Dispute window slots for dispute-window mode", "2160")
    .option("--co-signer <pubkey>", "Required co-signer public key for co-signed mode")
    .option("--arbiter <pubkey>", "Optional arbiter public key")
    .option("--simulate", "Dry run")
    .action(async (agentStr: string, opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const agentWallet = parseWallet(agentStr);
        const [agentPda] = Pdas.getAgentPDA(agentWallet);
        const [agentStake] = Pdas.getAgentStakePDA(agentPda);
        const [agentStats] = Pdas.getAgentStatsPDA(agentPda);
        const nonce = parseInt(opts.nonce, 10);
        const tokenMint = opts.tokenMint ? new PublicKey(opts.tokenMint) : null;
        const tokenDecimals = opts.tokenDecimals === ""
          ? (tokenMint ? 6 : 9)
          : parseInt(opts.tokenDecimals, 10);
        const settlementSecurity = parseSecurity(opts.settlementSecurity);
        const coSigner = opts.coSigner ? new PublicKey(opts.coSigner) : null;
        if (settlementSecurity === 1 && !coSigner) {
          throw new Error("--co-signer is required when --settlement-security=co-signed");
        }
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, ctx.wallet.publicKey, nonce);
        const [pricingMenu] = Pdas.getPricingMenuPDA(agentPda);
        const remainingAccounts: AccountMeta[] = tokenMint
          ? [
              { pubkey: getAssociatedTokenAddressSync(tokenMint, ctx.wallet.publicKey), isSigner: false, isWritable: true },
              { pubkey: getAssociatedTokenAddressSync(tokenMint, escrowPda, true), isSigner: false, isWritable: true },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ]
          : [];

        const ix = await ctx.client.escrow.createEscrowV2({
          signer: ctx.wallet,
          depositor: ctx.wallet.publicKey,
          agent: agentPda,
          agentStake,
          agentStats,
          pricingMenu,
          escrow: escrowPda,
          escrowNonce: new BN(nonce),
          pricePerCall: new BN(opts.pricePerCall),
          maxCalls: new BN(opts.maxCalls),
          initialDeposit: new BN(opts.deposit),
          expiresAt: new BN(Math.floor(Date.now() / 1000) + (parseInt(opts.expires) || 0) * 3600),
          volumeCurve: [],
          tokenMint,
          tokenDecimals,
          settlementSecurity,
          disputeWindowSlots: new BN(opts.disputeWindowSlots),
          coSigner,
          arbiter: opts.arbiter ? new PublicKey(opts.arbiter) : null,
          remainingAccounts,
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
    .requiredOption("--amount <amount>", "Amount in smallest unit of escrow token")
    .option("--nonce <n>", "Escrow nonce", "0")
    .action(async (agentStr: string, opts: { amount: string; nonce?: string }) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const nonce = parseInt(opts.nonce ?? "0", 10);
        const [agentPda] = Pdas.getAgentPDA(parseWallet(agentStr));
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, ctx.wallet.publicKey, nonce);
        const escrowData = await ctx.client.fetchAccount<any>("escrowAccountV2", escrowPda);
        const tokenMint = escrowData?.tokenMint ? new PublicKey(escrowData.tokenMint) : null;
        const remainingAccounts: AccountMeta[] = tokenMint
          ? [
              { pubkey: getAssociatedTokenAddressSync(tokenMint, ctx.wallet.publicKey), isSigner: false, isWritable: true },
              { pubkey: getAssociatedTokenAddressSync(tokenMint, escrowPda, true), isSigner: false, isWritable: true },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ]
          : [];

        const ix = await ctx.client.escrow.depositEscrowV2({
          signer: ctx.wallet,
          depositor: ctx.wallet.publicKey,
          escrow: escrowPda,
          escrowNonce: new BN(nonce),
          amount: new BN(opts.amount),
          remainingAccounts,
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
    .option("--depositor <wallet>", "Depositor wallet; defaults to CLI wallet")
    .option("--nonce <n>", "Escrow nonce", "0")
    .action(async (agentStr: string, opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const nonce = parseInt(opts.nonce, 10);
        const depositor = opts.depositor ? parseWallet(opts.depositor) : ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(parseWallet(agentStr));
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, depositor, nonce);
        const [agentStats] = Pdas.getAgentStatsPDA(agentPda);
        const callsToSettle = parseInt(opts.calls);
        const escrowData = await ctx.client.fetchAccount<any>("escrowAccountV2", escrowPda);
        if (!escrowData) throw new Error(`Escrow not found: ${escrowPda.toBase58()}`);
        const isDisputeWindow = typeof escrowData.settlementSecurity === "object"
          && escrowData.settlementSecurity !== null
          && "disputeWindow" in escrowData.settlementSecurity;
        const tokenMint = escrowData.tokenMint ? new PublicKey(escrowData.tokenMint) : null;
        const remainingAccounts: AccountMeta[] = tokenMint
          ? [
              { pubkey: getAssociatedTokenAddressSync(tokenMint, escrowPda, true), isSigner: false, isWritable: true },
              { pubkey: getAssociatedTokenAddressSync(tokenMint, ctx.wallet.publicKey), isSigner: false, isWritable: true },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
              { pubkey: getAssociatedTokenAddressSync(tokenMint, ctx.treasuryWallet, true), isSigner: false, isWritable: true },
            ]
          : [{ pubkey: ctx.treasuryWallet, isSigner: false, isWritable: true }];
        if (isDisputeWindow) {
          const [pendingPda] = Pdas.getPendingSettlementPDA(escrowPda, escrowData.settlementIndex);
          remainingAccounts.push({ pubkey: pendingPda, isSigner: false, isWritable: true });
        }

        const ix = await ctx.client.escrow.settleCallsV2({
          signer: ctx.wallet,
          wallet: ctx.wallet.publicKey,
          agent: agentPda,
          agentStats,
          escrow: escrowPda,
          escrowNonce: new BN(nonce),
          callsToSettle: new BN(callsToSettle),
          serviceHash: sha256Bytes(opts.serviceData),
          remainingAccounts,
        });

        const tx = await ctx.client.buildTransaction([ix], ctx.wallet.publicKey);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, callsSettled: callsToSettle });
      } catch (err) { log.error("settle failed", { error: (err as Error).message }); process.exit(1); }
    });

  escrow.command("info <agent>")
    .description("Show escrow v2 data")
    .option("--depositor <wallet>", "Depositor wallet; defaults to CLI wallet")
    .option("--nonce <n>", "Escrow nonce", "0")
    .action(async (agentStr: string, opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const nonce = parseInt(opts.nonce, 10);
        const depositor = opts.depositor ? parseWallet(opts.depositor) : ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(parseWallet(agentStr));
        const [escrowPda] = Pdas.getEscrowV2PDA(agentPda, depositor, nonce);
        const data = await ctx.client.fetchAccount("escrowAccountV2", escrowPda);
        output(data ?? { error: "Escrow not found", escrowPda: escrowPda.toBase58() });
      } catch (err) { log.error("info failed", { error: (err as Error).message }); process.exit(1); }
    });
}
