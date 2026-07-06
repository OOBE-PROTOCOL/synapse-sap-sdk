/**
 * @module cli/commands/sns
 * @description SNS (Solana Name Service) domain management commands
 * 
 * Commands:
 * - sns check <domain> — Check domain availability
 * - sns register <domain> — Register domain for agent
 * - sns resolve <domain> — Resolve domain to agent identity
 * - sns validate <domain> — Validate agent records
 * - sns primary <domain> — Set domain as primary
 * - sns records <domain> — Fetch all records
 * 
 * @since v0.3.0
 */
import { Command } from "commander";
import { loadConfig } from "../config.js";
import { buildContext, parseWallet } from "../context.js";
import { log, output } from "../logger.js";
import {
  SnsModule,
  Record,
} from "@oobe-protocol-labs/synapse-sap-sdk/modules/sns";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import * as fs from "fs";

export function registerSnsCommands(program: Command): void {
  const sns = program.command("sns").description("SNS domain management");

  // ═══════════════════════════════════════════════════════════════════
  //  sns check <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("check <domain>")
    .description("Check if a .sol domain is available for registration")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        const available = await snsModule.checkAvailability(domain);

        output({
          domain: domain.endsWith(".sol") ? domain : `${domain}.sol`,
          available,
          message: available
            ? `Domain ${domain}.sol is available for registration`
            : `Domain ${domain}.sol is already registered`,
        });
      } catch (err) {
        log.error("check failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns register <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("register <domain>")
    .description("Register a .sol domain for a SAP agent")
    .requiredOption("--role <merchant|citizen>", "Agent role")
    .option("--x402-endpoint <url>", "x402 endpoint (required for merchant)")
    .option("--agent-uri <url>", "Agent verification URI (required for citizen)")
    .option("--keypair <path>", "Wallet keypair path")
    .option("--set-primary", "Set as primary domain", false)
    .option("--space <bytes>", "Space allocation in bytes", "600")
    .option("--simulate", "Dry run (do not send transaction)")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        // Load wallet
        let wallet: Keypair;
        if (opts.keypair) {
          const secretKey = Uint8Array.from(
            JSON.parse(fs.readFileSync(opts.keypair, "utf-8"))
          );
          wallet = Keypair.fromSecretKey(secretKey);
        } else if (config.walletPath) {
          const secretKey = Uint8Array.from(
            JSON.parse(fs.readFileSync(config.walletPath, "utf-8"))
          );
          wallet = Keypair.fromSecretKey(secretKey);
        } else {
          log.error("No wallet configured. Use --keypair or set walletPath in config");
          process.exit(1);
        }

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        // Validate role
        // TODO: Restore role validation when SapAgentRole is exported from SDK
        const role = opts.role.toLowerCase();
        if (role !== 'merchant' && role !== 'citizen') {
          log.error("Invalid role. Must be 'merchant' or 'citizen'");
          process.exit(1);
        }

        // Validate role-specific requirements
        if (role === 'merchant' && !opts.x402Endpoint) {
          log.error("Merchant role requires --x402-endpoint");
          process.exit(1);
        }

        if (role === 'citizen' && !opts.agentUri) {
          log.error("Citizen role requires --agent-uri");
          process.exit(1);
        }

        // Check availability first
        const available = await snsModule.checkAvailability(domain);
        if (!available) {
          log.error(`Domain ${domain}.sol is already registered`);
          process.exit(1);
        }

        log.info(`Registering domain: ${domain}.sol`);
        log.info(`Role: ${role}`);
        log.info(`Wallet: ${wallet.publicKey.toBase58()}`);

        if (opts.simulate || program.opts().dryRun) {
          output({
            dryRun: true,
            domain: `${domain}.sol`,
            role,
            wallet: wallet.publicKey.toBase58(),
            message: "Simulation mode - transaction not sent",
          });
          return;
        }

        // Build DNS config based on role
        // TODO: Restore role-based config when SapAgentRole is exported from SDK
        const dnsConfig = {
          x402Endpoint: opts.x402Endpoint,
          agentUri: opts.agentUri,
        };

        // Register domain
        // TODO: Restore full params when SDK types are fixed
        const result = await snsModule.registerAgentDomain({
          agentWallet: wallet.publicKey,
          domainName: domain,
          signer: wallet,
          space: parseInt(opts.space),
          setAsPrimary: opts.setPrimary,
          // dnsConfig, // TODO: Restore when SDK accepts dnsConfig
          // x402Endpoint: opts.x402Endpoint,
          // agentUri: opts.agentUri,
        });

        log.info("Domain registered successfully!");
        output({
          domain: result.domain,
          signature: result.transactionSignature,
          domainPda: result.domainPda.toBase58(),
          agentPda: result.agentPda.toBase58(),
          // role: result.role, // TODO: Restore when SDK exports role
          records: result.records,
          recordPdas: Object.fromEntries(
            Object.entries(result.recordPdas).map(([k, v]) => [k, v.toBase58()])
          ),
          setAsPrimary: result.setAsPrimary,
        });
      } catch (err) {
        log.error("register failed", {
          error: (err as Error).message,
          stack: (err as Error).stack,
        });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns resolve <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("resolve <domain>")
    .description("Resolve a .sol domain to its SAP agent identity")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        const result = await snsModule.resolveAgentDomain(domain);

        if (!result) {
          output({
            domain: domain.endsWith(".sol") ? domain : `${domain}.sol`,
            found: false,
            message: "Domain not found or not linked to SAP agent",
          });
          return;
        }

        output({
          domain: result.domain,
          found: true,
          wallet: result.wallet.toBase58(),
          agentPda: result.agentPda.toBase58(),
          // role: result.role, // TODO: Restore when SDK exports role
          metadata: result.metadata,
          records: result.records,
        });
      } catch (err) {
        log.error("resolve failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns validate <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("validate <domain>")
    .description("Validate SNS records for SAP agent compliance")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        const validation = await snsModule.validateAgentRecords(domain);

        output({
          domain: domain.endsWith(".sol") ? domain : `${domain}.sol`,
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          message: validation.valid
            ? "Agent records are valid"
            : `Validation failed with ${validation.errors.length} error(s)`,
        });

        if (!validation.valid) {
          process.exit(1);
        }
      } catch (err) {
        log.error("validate failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns primary <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("primary <domain>")
    .description("Set a .sol domain as primary for the wallet")
    .requiredOption("--keypair <path>", "Wallet keypair path")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        // Load wallet
        const secretKey = Uint8Array.from(
          JSON.parse(fs.readFileSync(opts.keypair, "utf-8"))
        );
        const wallet = Keypair.fromSecretKey(secretKey);

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        log.info(`Setting ${domain}.sol as primary domain...`);

        // Note: This would require a separate method in SnsModule
        // For now, we'll use the standalone SDK approach
        // This is a placeholder - actual implementation depends on SDK
        output({
          domain: domain.endsWith(".sol") ? domain : `${domain}.sol`,
          wallet: wallet.publicKey.toBase58(),
          message: "Primary domain setting not yet implemented in CLI",
          todo: "Use SnsSdk.buildSetPrimaryDomainTx() and send transaction manually",
        });
      } catch (err) {
        log.error("primary failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns records <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("records <domain>")
    .description("Fetch all SNS records for a domain")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        // Fetch individual records
        const domainName = domain.endsWith(".sol") ? domain : `${domain}.sol`;
        const records: { [key: string]: string | null } = {};

        const recordTypes = [
          "SOL",
          "TXT",
          "Twitter",
          "Github",
          "Discord",
          "Telegram",
          "Email",
          "Url",
          "Pic",
        ];

        for (const recordType of recordTypes) {
          try {
            const recordPda = snsModule.getRecordPda(
              domainName,
              Record[recordType as keyof typeof Record]
            );
            const accountInfo = await connection.getAccountInfo(recordPda);

            if (accountInfo && accountInfo.data.length > 0) {
              // Parse record data (skip header)
              const headerSize = recordType === "TXT" ? 8 : 10;
              const rawData = accountInfo.data.slice(headerSize);
              const nullIndex = rawData.indexOf(0);
              const trimmedData =
                nullIndex > 0 ? rawData.slice(0, nullIndex) : rawData;
              const data = new TextDecoder().decode(trimmedData).trim();
              records[recordType] = data;
            } else {
              records[recordType] = null;
            }
          } catch {
            records[recordType] = null;
          }
        }

        // Filter out nulls for cleaner output
        const existingRecords = Object.fromEntries(
          Object.entries(records).filter(([_, v]) => v !== null)
        );

        output({
          domain: domainName,
          totalRecords: Object.keys(existingRecords).length,
          records: existingRecords,
        });
      } catch (err) {
        log.error("records failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns batch-check <domains...>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("batch-check <domains...>")
    .description("Check availability for multiple domains")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domains: string[], opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        const results = await snsModule.batchCheckAvailability(domains);

        const outputData = Array.from(results.entries()).map(
          ([domain, available]) => ({
            domain,
            available,
            status: available ? "AVAILABLE" : "TAKEN",
          })
        );

        // Summary
        const availableCount = outputData.filter((r) => r.available).length;
        const takenCount = outputData.filter((r) => !r.available).length;

        output({
          total: domains.length,
          available: availableCount,
          taken: takenCount,
          results: outputData,
        });
      } catch (err) {
        log.error("batch-check failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns pda <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command("pda <domain>")
    .description("Derive domain and record PDAs")
    .option("--record <type>", "Specific record type (optional)")
    .option("--rpc <url>", "Override RPC endpoint")
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const rpcUrl = opts.rpc || config.rpc || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        const snsModule = new SnsModule({
          connection,
          sapProgramId: config.programId || "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
        });

        const domainName = domain.endsWith(".sol") ? domain : `${domain}.sol`;
        const domainPda = snsModule.getDomainPda(domainName);

        if (opts.record) {
          const recordPda = snsModule.getRecordPda(
            domainName,
            Record[opts.record as keyof typeof Record]
          );
          output({
            domain: domainName,
            recordType: opts.record,
            recordPda: recordPda.toBase58(),
          });
        } else {
          // Show all common record PDAs
          const recordPdas: { [key: string]: string } = {};
          const recordTypes = ["SOL", "TXT", "Twitter", "Github", "Url"];

          for (const recordType of recordTypes) {
            const pda = snsModule.getRecordPda(
              domainName,
              Record[recordType as keyof typeof Record]
            );
            recordPdas[recordType] = pda.toBase58();
          }

          output({
            domain: domainName,
            domainPda: domainPda.toBase58(),
            recordPdas,
          });
        }
      } catch (err) {
        log.error("pda failed", { error: (err as Error).message });
        process.exit(1);
      }
    });
}
