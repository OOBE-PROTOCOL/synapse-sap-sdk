/**
 * @module cli/commands/memory
 * @description Memory vault & session — v0.3.0 aligned.
 * Uses: client.vault.initVault, client.session.openSession, client.vault.inscribeMemory
 * Pdas: getAgentPDA, getVaultPDA, getSessionLedgerPDA, getEpochPagePDA, getGlobalPDA
 */
import { Command } from "commander";
import anchor from "@coral-xyz/anchor";
import { loadConfig } from "../config.js";
import { buildContext } from "../context.js";
import { Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import { log, output } from "../logger.js";

const { BN } = anchor;

export function registerMemoryCommands(program: Command): void {
  const memory = program.command("memory").description("On-chain memory systems");

  memory.command("vault init")
    .description("Initialize memory vault")
    .requiredOption("--nonce <hex>", "32-byte nonce as hex (64 chars)")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const hex = opts.nonce.replace(/^0x/, "");
        if (hex.length !== 64) { log.error("Nonce must be 64 hex chars"); process.exit(1); }
        const nonce = Array.from(Buffer.from(hex, "hex"));
        const wallet = ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const [vaultPda] = Pdas.getVaultPDA(agentPda);
        const [globalPda] = Pdas.getGlobalPDA();

        const ix = await ctx.client.vault.initVault({
          signer: ctx.wallet, wallet, agent: agentPda, vault: vaultPda,
          globalRegistry: globalPda, vaultNonce: nonce,
        });

        const tx = await ctx.client.buildTransaction([ix], wallet);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, vaultPda: vaultPda.toBase58() });
      } catch (err) { log.error("init failed", { error: (err as Error).message }); process.exit(1); }
    });

  memory.command("session open")
    .description("Open a session")
    .requiredOption("--hash <hex>", "32-byte session hash (64 hex chars)")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const hex = opts.hash.replace(/^0x/, "");
        if (hex.length !== 64) { log.error("Hash must be 64 hex chars"); process.exit(1); }
        const sessionHash = Array.from(Buffer.from(hex, "hex"));
        const wallet = ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const [vaultPda] = Pdas.getVaultPDA(agentPda);
        const [sessionPda] = Pdas.getSessionLedgerPDA(vaultPda, new BN(0));

        const ix = await ctx.client.session.openSession({
          signer: ctx.wallet, wallet, agent: agentPda, vault: vaultPda,
          session: sessionPda, sessionHash,
        });

        const tx = await ctx.client.buildTransaction([ix], wallet);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig, sessionPda: sessionPda.toBase58() });
      } catch (err) { log.error("open failed", { error: (err as Error).message }); process.exit(1); }
    });

  memory.command("inscribe")
    .description("Inscribe encrypted data")
    .option("--data <base64>", "Encrypted payload", "")
    .option("--session <n>", "Session number", "0")
    .option("--epoch <n>", "Epoch index", "0")
    .action(async (opts) => {
      const ctx = buildContext(loadConfig(program.opts()));
      try {
        const wallet = ctx.wallet.publicKey;
        const [agentPda] = Pdas.getAgentPDA(wallet);
        const [vaultPda] = Pdas.getVaultPDA(agentPda);
        const [sessionPda] = Pdas.getSessionLedgerPDA(vaultPda, new BN(opts.session));
        const [epochPagePda] = Pdas.getEpochPagePDA(vaultPda, new BN(opts.epoch));
        const encryptedData = Buffer.from(opts.data || "test-payload", "base64");

        const ix = await ctx.client.vault.inscribeMemory({
          signer: ctx.wallet, wallet, agent: agentPda, vault: vaultPda,
          session: sessionPda, epochPage: epochPagePda,
          sequence: 0, encryptedData, nonce: Array(12).fill(0),
          contentHash: Array(32).fill(0), totalFragments: 1,
          fragmentIndex: 0, compression: 0, epochIndex: parseInt(opts.epoch),
        });

        const tx = await ctx.client.buildTransaction([ix], wallet);
        const sig = await ctx.client.sendTransaction(tx, [ctx.wallet]);
        output({ txSignature: sig });
      } catch (err) { log.error("inscribe failed", { error: (err as Error).message }); process.exit(1); }
    });
}
