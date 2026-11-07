/**
 * @module cli/commands/sns
 * @description SNS (Solana Name Service) domain management commands —
 * Stage 1 (`.sns` namespace, unsigned SDK builders + local signing).
 *
 * Commands:
 * - sns check <domain> — Check domain availability
 * - sns register <domain> — Register domain for agent (signs & sends locally)
 * - sns resolve <domain> — Resolve domain to agent identity
 * - sns validate <domain> — Validate agent records
 * - sns primary <domain> — Set domain as primary (signs & sends locally)
 * - sns records <domain> — Fetch all records
 * - sns batch-check <domains...> — Availability for multiple domains
 * - sns pda <domain> — Derive domain and record PDAs
 *
 * @since v1.0.4
 */
import { Command } from 'commander';
import {
  Connection,
  Keypair,
  Transaction,
  type TransactionInstruction,
} from '@solana/web3.js';
import { loadConfig } from '../config.js';
import { log, output } from '../logger.js';
import { SnsModule } from '@oobe-protocol-labs/synapse-sap-sdk/modules/sns';
import { displayDomain } from '@oobe-protocol-labs/synapse-sap-sdk/utils';
import * as fs from 'fs';

const DEFAULT_PROGRAM_ID = 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ';
const RECORD_TYPES = [
  'SOL',
  'TXT',
  'Twitter',
  'Github',
  'Discord',
  'Telegram',
  'Email',
  'Url',
  'Pic',
] as const;

/** Signs the given instructions with the local wallet and sends the tx. */
async function signAndSend(
  connection: Connection,
  instructions: TransactionInstruction[],
  wallet: Keypair,
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: wallet.publicKey,
    blockhash,
    lastValidBlockHeight,
  });
  tx.add(...instructions);
  tx.sign(wallet);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );
  return signature;
}

function makeSnsModule(connection: Connection, programId?: string): SnsModule {
  return new SnsModule({ connection, sapProgramId: programId || DEFAULT_PROGRAM_ID });
}

function makeConnection(rpc: string | undefined, configRpc?: string): Connection {
  return new Connection(
    rpc || configRpc || 'https://api.mainnet-beta.solana.com',
    'confirmed',
  );
}

function loadKeypair(path: string): Keypair {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(path, 'utf-8')));
  return Keypair.fromSecretKey(secretKey);
}

export function registerSnsCommands(program: Command): void {
  const sns = program.command('sns').description('SNS domain management (.sns)');

  // ═══════════════════════════════════════════════════════════════════
  //  sns check <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command('check <domain>')
    .description('Check if a .sns domain is available for registration')
    .option('--rpc <url>', 'Override RPC endpoint')
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const connection = makeConnection(opts.rpc, config.rpc);
        const snsModule = makeSnsModule(connection, config.programId);
        const available = await snsModule.checkAvailability(domain);
        const displayed = displayDomain(domain);

        output({
          domain: displayed,
          available,
          message: available
            ? `Domain ${displayed} is available for registration`
            : `Domain ${displayed} is already registered`,
        });
      } catch (err) {
        log.error('check failed', { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns register <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command('register <domain>')
    .description('Register a .sns domain for a SAP agent')
    .requiredOption('--role <merchant|citizen>', 'Agent role')
    .option('--x402-endpoint <url>', 'x402 endpoint (required for merchant)')
    .option('--agent-uri <url>', 'Agent verification URI (required for citizen)')
    .option('--keypair <path>', 'Wallet keypair path')
    .option('--set-primary', 'Set as primary domain', false)
    .option('--space <bytes>', 'Space allocation in bytes', '600')
    .option(
      '--simulate',
      'Dry run: print the unsigned instruction set, do not sign or send',
    )
    .option('--rpc <url>', 'Override RPC endpoint')
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const connection = makeConnection(opts.rpc, config.rpc);
        const snsModule = makeSnsModule(connection, config.programId);

        let wallet: Keypair;
        if (opts.keypair) {
          wallet = loadKeypair(opts.keypair);
        } else if (config.walletPath) {
          wallet = loadKeypair(config.walletPath);
        } else {
          log.error('No wallet configured. Use --keypair or set walletPath in config');
          process.exit(1);
          return;
        }

        const role = String(opts.role).toLowerCase();
        if (role !== 'merchant' && role !== 'citizen') {
          log.error("Invalid role. Must be 'merchant' or 'citizen'");
          process.exit(1);
        }
        if (role === 'merchant' && !opts.x402Endpoint) {
          log.error('Merchant role requires --x402-endpoint');
          process.exit(1);
        }
        if (role === 'citizen' && !opts.agentUri) {
          log.error('Citizen role requires --agent-uri');
          process.exit(1);
        }

        const fullName = displayDomain(domain);
        const available = await snsModule.checkAvailability(fullName);
        if (!available) {
          log.error(`Domain ${fullName} is already registered`);
          process.exit(1);
        }

        const sapRecords: Record<string, string> = {
          txt: JSON.stringify({
            role,
            agent_wallet: wallet.publicKey.toBase58(),
            sap_program_id: config.programId || DEFAULT_PROGRAM_ID,
            ...(role === 'merchant'
              ? { x402_endpoint: opts.x402Endpoint }
              : { agent_uri: opts.agentUri }),
          }),
        };
        const endpoint = opts.x402Endpoint ?? opts.agentUri;
        if (endpoint) {
          sapRecords.url = endpoint;
        }

        log.info(`Registering domain: ${fullName}`);
        log.info(`Role: ${role}`);
        log.info(`Wallet: ${wallet.publicKey.toBase58()}`);

        const result = await snsModule.registerAgentDomain({
          agentWallet: wallet.publicKey,
          domainName: fullName,
          signer: wallet,
          space: parseInt(opts.space, 10),
          setAsPrimary: opts.setPrimary,
          records: sapRecords,
        });

        if (opts.simulate || program.opts().dryRun) {
          output({
            dryRun: true,
            domain: result.domain,
            role,
            wallet: wallet.publicKey.toBase58(),
            instructions: result.instructions.length,
            recordTypes: result.records,
            message:
              'Simulation mode — the instruction set was built but not signed or sent.',
          });
          return;
        }

        const signature = await signAndSend(connection, result.instructions, wallet);
        log.info('Domain registered successfully!');
        output({
          domain: result.domain,
          signature,
          domainPda: result.domainPda.toBase58(),
          agentPda: result.agentPda.toBase58(),
          buyerTokenAccount: result.buyerTokenAccount.toBase58(),
          recordTypes: result.records,
          setAsPrimary: result.setAsPrimary,
        });
      } catch (err) {
        log.error('register failed', {
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
    .command('resolve <domain>')
    .description('Resolve a .sns domain to its SAP agent identity')
    .option('--rpc <url>', 'Override RPC endpoint')
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const connection = makeConnection(opts.rpc, config.rpc);
        const snsModule = makeSnsModule(connection, config.programId);
        const result = await snsModule.resolveAgentDomain(domain);

        if (!result) {
          output({
            domain: displayDomain(domain),
            found: false,
            message: 'Domain not found',
          });
          return;
        }

        output({
          domain: result.domain,
          found: true,
          wallet: result.wallet.toBase58(),
          agentPda: result.agentPda.toBase58(),
          metadata: result.metadata,
          records: result.records,
        });
      } catch (err) {
        log.error('resolve failed', { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns validate <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command('validate <domain>')
    .description('Validate SNS records for SAP agent compliance')
    .option('--rpc <url>', 'Override RPC endpoint')
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const connection = makeConnection(opts.rpc, config.rpc);
        const snsModule = makeSnsModule(connection, config.programId);
        const validation = await snsModule.validateAgentRecords(domain);
        const displayed = displayDomain(domain);

        output({
          domain: displayed,
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          message: validation.valid
            ? 'Agent records are valid'
            : `Validation failed with ${validation.errors.length} error(s)`,
        });

        if (!validation.valid) {
          process.exit(1);
        }
      } catch (err) {
        log.error('validate failed', { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns primary <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command('primary <domain>')
    .description('Set a .sns domain as primary for the wallet')
    .requiredOption('--keypair <path>', 'Wallet keypair path')
    .option('--rpc <url>', 'Override RPC endpoint')
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const connection = makeConnection(opts.rpc, config.rpc);
        const wallet = loadKeypair(opts.keypair);
        const snsModule = makeSnsModule(connection, config.programId);

        const fullName = displayDomain(domain);
        log.info(`Setting ${fullName} as the wallet primary domain...`);
        const instructions = await snsModule.buildSetPrimaryDomainInstructions(
          wallet.publicKey,
          fullName,
        );
        const signature = await signAndSend(connection, instructions, wallet);

        output({
          domain: fullName,
          wallet: wallet.publicKey.toBase58(),
          signature,
        });
      } catch (err) {
        log.error('primary failed', { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns records <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command('records <domain>')
    .description('Fetch all SNS records for a domain')
    .option('--rpc <url>', 'Override RPC endpoint')
    .action(async (domain: string, opts) => {
      try {
        const config = loadConfig(program.opts());
        const connection = makeConnection(opts.rpc, config.rpc);
        const snsModule = makeSnsModule(connection, config.programId);
        const fullName = displayDomain(domain);

        const records: { [key: string]: string | null } = {};
        for (const recordType of RECORD_TYPES) {
          try {
            records[recordType] = await snsModule.getRecordValue(fullName, recordType);
          } catch {
            records[recordType] = null;
          }
        }

        const existingRecords = Object.fromEntries(
          Object.entries(records).filter(([, v]) => v !== null),
        );

        output({
          domain: fullName,
          totalRecords: Object.keys(existingRecords).length,
          records: existingRecords,
        });
      } catch (err) {
        log.error('records failed', { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns batch-check <domains...>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command('batch-check <domains...>')
    .description('Check availability for multiple domains (max 25)')
    .option('--rpc <url>', 'Override RPC endpoint')
    .action(async (domains: string[], opts) => {
      try {
        const config = loadConfig(program.opts());
        const connection = makeConnection(opts.rpc, config.rpc);
        const snsModule = makeSnsModule(connection, config.programId);

        const results = await snsModule.batchCheckAvailability(domains);
        const outputData = Array.from(results.entries()).map(([domain, available]) => ({
          domain,
          available,
          status: available ? 'AVAILABLE' : 'TAKEN',
        }));
        const availableCount = outputData.filter((r) => r.available).length;

        output({
          total: domains.length,
          available: availableCount,
          taken: outputData.length - availableCount,
          results: outputData,
        });
      } catch (err) {
        log.error('batch-check failed', { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ═══════════════════════════════════════════════════════════════════
  //  sns pda <domain>
  // ═══════════════════════════════════════════════════════════════════
  sns
    .command('pda <domain>')
    .description('Derive domain and record PDAs')
    .option('--record <type>', 'Show only this record type (e.g. Pic, Url, TXT)')
    .action(async (domain: string, opts) => {
      try {
        const fullName = displayDomain(domain);

        if (opts.record) {
          const snsModule = makeSnsModule(
            new Connection('https://api.mainnet-beta.solana.com', 'confirmed'),
          );
          const recordType = String(opts.record);
          output({
            domain: fullName,
            recordType,
            recordPda: snsModule.getRecordPda(fullName, recordType).toBase58(),
          });
          return;
        }

        const snsModule = makeSnsModule(
          new Connection('https://api.mainnet-beta.solana.com', 'confirmed'),
        );
        const domainPda = snsModule.getDomainPda(fullName).toBase58();
        const recordTypes = ['SOL', 'TXT', 'Twitter', 'Github', 'Url', 'Pic'];
        const recordPdas: { [key: string]: string } = {};
        for (const recordType of recordTypes) {
          recordPdas[recordType] = snsModule
            .getRecordPda(fullName, recordType)
            .toBase58();
        }

        output({ domain: fullName, domainPda, recordPdas });
      } catch (err) {
        log.error('pda failed', { error: (err as Error).message });
        process.exit(1);
      }
    });
}

/** Local helper for pure (non-network) derivations. */
function require_sns(): SnsModule {
  return makeSnsModule(
    new Connection('https://api.mainnet-beta.solana.com', 'confirmed'),
  );
}
