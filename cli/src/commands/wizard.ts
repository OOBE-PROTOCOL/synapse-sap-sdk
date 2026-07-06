/**
 * @module cli/commands/wizard
 * @description Interactive configuration wizard for SAP MCP Server setup.
 * 
 * Creates:
 *   - ~/.config/sap-mcp/config.json (MCP Server config)
 *   - ~/.config/sap-mcp/agents/<name>-keypair.json (isolated keypair)
 *   - ~/.config/synapse-sap/config.json (CLI config)
 * 
 * Security: Isolated keypairs per agent/service (never expose main wallet)
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { log, output } from "../logger.js";

// ═══════════════════════════════════════════════════════════════════
//  Paths
// ═══════════════════════════════════════════════════════════════════

const MCP_CONFIG_DIR = path.join(os.homedir(), ".config", "sap-mcp");
const MCP_CONFIG_PATH = path.join(MCP_CONFIG_DIR, "config.json");
const MCP_AGENTS_DIR = path.join(MCP_CONFIG_DIR, "agents");
const CLI_CONFIG_DIR = path.join(os.homedir(), ".config", "synapse-sap");
const CLI_CONFIG_PATH = path.join(CLI_CONFIG_DIR, "config.json");

const DEFAULT_PROGRAM_ID = "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

interface WizardConfig {
  agentName: string;
  cluster: "mainnet-beta" | "devnet" | "localnet";
  rpcUrl: string;
  programId: string;
  enableRemoteMcp: boolean;
  remoteMcpUrl?: string;
  enableSigningProxy: boolean;
  signingProxyPort: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Helper Functions
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate a new isolated keypair for the agent
 */
function generateIsolatedKeypair(agentName: string): { keypair: Keypair; path: string } {
  const keypair = Keypair.generate();
  const keypairPath = path.join(MCP_AGENTS_DIR, `${agentName}-keypair.json`);
  
  // Ensure directory exists
  if (!fs.existsSync(MCP_AGENTS_DIR)) {
    fs.mkdirSync(MCP_AGENTS_DIR, { recursive: true });
    fs.chmodSync(MCP_AGENTS_DIR, 0o700); // rwx------
  }
  
  // Save keypair (secret key as JSON array)
  fs.writeFileSync(
    keypairPath,
    JSON.stringify(Array.from(keypair.secretKey), null, 2),
    { mode: 0o600 } // rw-------
  );
  
  log.info(`Generated isolated keypair: ${keypair.publicKey.toBase58()}`);
  log.info(`Saved to: ${keypairPath}`);
  
  return { keypair, path: keypairPath };
}

/**
 * Create or update MCP Server config
 */
function createMcpConfig(config: WizardConfig, keypairPath: string): void {
  // Ensure directory exists
  if (!fs.existsSync(MCP_CONFIG_DIR)) {
    fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
    fs.chmodSync(MCP_CONFIG_DIR, 0o700);
  }
  
  // Create subdirectories
  const logsDir = path.join(MCP_CONFIG_DIR, "logs");
  const sessionsDir = path.join(MCP_CONFIG_DIR, "sessions");
  const proxyDir = path.join(MCP_CONFIG_DIR, "proxy");
  
  [logsDir, sessionsDir, proxyDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.chmodSync(dir, 0o700);
    }
  });
  
  // Generate auth token for signing proxy
  const authToken = bs58.encode(Buffer.from(crypto.getRandomValues(new Uint8Array(32))));
  
  const mcpConfig = {
    $schema: "https://sap-mcp-server.schema.json",
    mode: "local-dev-keypair",
    rpcUrl: config.rpcUrl,
    walletPath: keypairPath,
    commitment: "confirmed",
    programId: config.programId,
    maxRetries: 3,
    retryDelayMs: 1000,
    cacheTtlSeconds: 300,
    maxTxValueSol: 1.0,
    dailyLimitSol: 5.0,
    enableRateLimit: true,
    rateLimitPerMinute: 60,
    logLevel: "info",
    enableMetrics: false,
    $security: {
      requireApprovalFor: ["mode", "walletPath", "maxTxValueSol"],
      approvalTimeout: 300,
      maxChangesPerDay: 10,
    },
    $audit: {
      enabled: true,
      logPath: path.join(os.homedir(), ".local", "share", "sap-mcp", "audit.jsonl"),
    },
    $meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: "0.1.0",
    },
    remoteMcp: {
      enabled: config.enableRemoteMcp,
      url: config.enableRemoteMcp ? (config.remoteMcpUrl || "") : "",
      apiKey: "",
    },
    signingProxy: {
      enabled: config.enableSigningProxy,
      port: config.signingProxyPort,
      host: "127.0.0.1",
      authToken,
    },
  };
  
  fs.writeFileSync(
    MCP_CONFIG_PATH,
    JSON.stringify(mcpConfig, null, 2) + "\n",
    { mode: 0o600 }
  );
  
  log.info(`MCP config created: ${MCP_CONFIG_PATH}`);
}

/**
 * Update CLI config with cluster settings
 */
function updateCliConfig(config: WizardConfig): void {
  if (!fs.existsSync(CLI_CONFIG_DIR)) {
    fs.mkdirSync(CLI_CONFIG_DIR, { recursive: true });
  }
  
  let cliConfig = {};
  if (fs.existsSync(CLI_CONFIG_PATH)) {
    try {
      cliConfig = JSON.parse(fs.readFileSync(CLI_CONFIG_PATH, "utf-8"));
    } catch {
      // ignore malformed
    }
  }
  
  const updated = {
    ...cliConfig,
    rpc: config.rpcUrl,
    cluster: config.cluster,
    programId: config.programId,
  };
  
  fs.writeFileSync(
    CLI_CONFIG_PATH,
    JSON.stringify(updated, null, 2) + "\n",
    { mode: 0o600 }
  );
  
  log.info(`CLI config updated: ${CLI_CONFIG_PATH}`);
}

/**
 * Interactive prompt for cluster selection
 */
async function selectCluster(): Promise<"mainnet-beta" | "devnet" | "localnet"> {
  log.info("\nSelect cluster:");
  log.info("  [1] devnet (recommended for testing)");
  log.info("  [2] mainnet-beta (production)");
  log.info("  [3] localnet (local development)");
  
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question("Choice [1-3]: ", (answer) => {
      rl.close();
      const choice = answer.trim();
      if (choice === "2") return resolve("mainnet-beta");
      if (choice === "3") return resolve("localnet");
      resolve("devnet"); // default
    });
  });
}

/**
 * Interactive prompt for RPC URL
 */
async function selectRpcUrl(cluster: string): Promise<string> {
  const defaultRpcs: Record<string, string> = {
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
    devnet: "https://api.devnet.solana.com",
    localnet: "http://localhost:8899",
  };
  
  log.info(`\nRPC URL for ${cluster}:`);
  log.info(`  Default: ${defaultRpcs[cluster]}`);
  log.info("  (Press Enter for default, or enter custom URL)");
  
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question("RPC URL: ", (answer) => {
      rl.close();
      resolve(answer.trim() || defaultRpcs[cluster]);
    });
  });
}

/**
 * Interactive prompt for agent name
 */
function selectAgentName(): Promise<string> {
  const readline = import("readline").then(async rlModule => {
    const rl = rlModule.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise<string>((resolve) => {
      rl.question("\nAgent name (lowercase, hyphens allowed): ", (answer) => {
        rl.close();
        const sanitized = answer.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
        if (!sanitized) {
          resolve("sap-agent");
        } else if (sanitized.length < 3) {
          resolve(`${sanitized}-agent`);
        } else {
          resolve(sanitized);
        }
      });
    });
  });
  
  return readline;
}

// ═══════════════════════════════════════════════════════════════════
//  Wizard Command
// ═══════════════════════════════════════════════════════════════════

export function registerWizardCommands(program: Command): void {
  const wizard = program
    .command("wizard")
    .description("Interactive configuration wizard for SAP MCP Server setup")
    .addHelpText("after", `
Examples:
  $ synapse-sap wizard                    # Interactive setup
  $ synapse-sap wizard --agent my-agent   # Non-interactive with name
  $ synapse-sap wizard --devnet           # Quick devnet setup
  $ synapse-sap wizard --reset            # Reset and start over
`);

  // ── wizard (interactive) ───────────────────────────
  wizard
    .option("--agent <name>", "Agent name (non-interactive)")
    .option("--devnet", "Use devnet cluster")
    .option("--mainnet", "Use mainnet-beta cluster")
    .option("--localnet", "Use localnet cluster")
    .option("--rpc <url>", "Custom RPC URL")
    .option("--reset", "Reset existing config")
    .action(async (opts) => {
      log.info("╔════════════════════════════════════════════════╗");
      log.info("║  SAP MCP Server Configuration Wizard          ║");
      log.info("║  v1.0.0                                      ║");
      log.info("╚════════════════════════════════════════════════╝");
      
      // Check for existing config
      if (fs.existsSync(MCP_CONFIG_PATH) && !opts.reset) {
        log.warn(`\nExisting MCP config found: ${MCP_CONFIG_PATH}`);
        log.info("Use --reset to overwrite existing configuration.\n");
        
        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        await new Promise<void>((resolve) => {
          rl.question("Continue anyway? [y/N]: ", (answer) => {
            rl.close();
            if (answer.toLowerCase() !== "y") {
              log.info("Aborted.");
              process.exit(0);
            }
            resolve();
          });
        });
      }
      
      // Step 1: Agent Name
      let agentName = opts.agent;
      if (!agentName) {
        agentName = await selectAgentName();
      }
      log.info(`✓ Agent name: ${agentName}`);
      
      // Step 2: Cluster
      let cluster: WizardConfig["cluster"];
      if (opts.devnet) cluster = "devnet";
      else if (opts.mainnet) cluster = "mainnet-beta";
      else if (opts.localnet) cluster = "localnet";
      else cluster = await selectCluster();
      log.info(`✓ Cluster: ${cluster}`);
      
      // Step 3: RPC URL
      let rpcUrl = opts.rpc;
      if (!rpcUrl) {
        const defaultRpc = cluster === "devnet" ? "https://api.devnet.solana.com" : 
                          cluster === "mainnet-beta" ? "https://api.mainnet-beta.solana.com" : 
                          "http://localhost:8899";
        log.info(`\nRPC URL for ${cluster}:`);
        log.info(`  Default: ${defaultRpc}`);
        log.info("  (Press Enter for default, or enter custom URL)");
        
        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        rpcUrl = await new Promise((resolve) => {
          rl.question("RPC URL: ", (answer) => {
            rl.close();
            resolve(answer.trim() || defaultRpc);
          });
        });
      }
      log.info(`✓ RPC URL: ${rpcUrl}`);
      
      // Step 4: Program ID (only prompt in fully interactive mode)
      let programId = DEFAULT_PROGRAM_ID;
      const isInteractive = !opts.agent && !opts.devnet && !opts.mainnet && !opts.localnet && !opts.rpc;
      if (isInteractive) {
        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        programId = await new Promise<string>((resolve) => {
          rl.question(`\nProgram ID [${DEFAULT_PROGRAM_ID}]: `, (answer) => {
            rl.close();
            resolve(answer.trim() || DEFAULT_PROGRAM_ID);
          });
        });
      }
      log.info(`✓ Program ID: ${programId}`);
      
      // Step 5: Remote MCP (optional)
      const enableRemoteMcp = false; // default disabled for security
      log.info(`✓ Remote MCP: disabled (can enable later in config)`);
      
      // Step 6: Signing Proxy
      const enableSigningProxy = true;
      const signingProxyPort = 8765;
      log.info(`✓ Signing Proxy: enabled on port ${signingProxyPort}`);
      
      // Build config object
      const wizardConfig: WizardConfig = {
        agentName,
        cluster,
        rpcUrl,
        programId,
        enableRemoteMcp,
        enableSigningProxy,
        signingProxyPort,
      };
      
      // Generate isolated keypair
      log.info("\n╔════════════════════════════════════════════════╗");
      log.info("║  Generating Isolated Keypair                  ║");
      log.info("╚════════════════════════════════════════════════╝");
      const { keypair, path: keypairPath } = generateIsolatedKeypair(agentName);
      
      // Create MCP config
      log.info("\n╔════════════════════════════════════════════════╗");
      log.info("║  Creating MCP Server Config                   ║");
      log.info("╚════════════════════════════════════════════════╝");
      createMcpConfig(wizardConfig, keypairPath);
      
      // Update CLI config
      log.info("\n╔════════════════════════════════════════════════╗");
      log.info("║  Updating CLI Config                          ║");
      log.info("╚════════════════════════════════════════════════╝");
      updateCliConfig(wizardConfig);
      
      // Summary
      log.info("\n╔════════════════════════════════════════════════╗");
      log.info("║  Configuration Complete ✓                     ║");
      log.info("╚════════════════════════════════════════════════╝");
      log.info(`\nAgent Name:      ${agentName}`);
      log.info(`Cluster:         ${cluster}`);
      log.info(`RPC URL:         ${rpcUrl}`);
      log.info(`Program ID:      ${programId}`);
      log.info(`Agent Wallet:    ${keypair.publicKey.toBase58()}`);
      log.info(`Keypair Path:    ${keypairPath}`);
      log.info(`MCP Config:      ${MCP_CONFIG_PATH}`);
      log.info(`CLI Config:      ${CLI_CONFIG_PATH}`);
      
      log.info("\nNext steps:");
      log.info("  1. Fund the agent wallet with devnet SOL (if using devnet)");
      log.info(`     $ solana airdrop 2 ${keypair.publicKey.toBase58()} --url ${rpcUrl}`);
      log.info("  2. Start the MCP server:");
      log.info("     $ npx sap-mcp-server");
      log.info("  3. Register your agent on-chain:");
      log.info(`     $ synapse-sap agent register --name "${agentName}"`);
      
      output({
        success: true,
        agentName,
        cluster,
        rpcUrl,
        programId,
        agentWallet: keypair.publicKey.toBase58(),
        keypairPath,
        mcpConfigPath: MCP_CONFIG_PATH,
        cliConfigPath: CLI_CONFIG_PATH,
      });
      
      // Ensure process exits cleanly
      setTimeout(() => process.exit(0), 100);
    });

  // ── wizard reset ─────────────────────────────────
  wizard
    .command("reset")
    .description("Reset all SAP MCP configuration")
    .option("--confirm", "Skip confirmation")
    .action(async (opts) => {
      log.warn("This will delete all SAP MCP configuration:");
      log.warn(`  - ${MCP_CONFIG_PATH}`);
      log.warn(`  - ${MCP_AGENTS_DIR}/`);
      log.warn(`  - ${CLI_CONFIG_PATH}`);
      
      if (!opts.confirm) {
        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        await new Promise<void>((resolve) => {
          rl.question("\nAre you sure? [y/N]: ", (answer) => {
            rl.close();
            if (answer.toLowerCase() !== "y") {
              log.info("Aborted.");
              process.exit(0);
            }
            resolve();
          });
        });
      }
      
      // Delete files
      if (fs.existsSync(MCP_CONFIG_PATH)) {
        fs.unlinkSync(MCP_CONFIG_PATH);
        log.info(`Deleted: ${MCP_CONFIG_PATH}`);
      }
      
      if (fs.existsSync(MCP_AGENTS_DIR)) {
        fs.rmSync(MCP_AGENTS_DIR, { recursive: true, force: true });
        log.info(`Deleted: ${MCP_AGENTS_DIR}`);
      }
      
      if (fs.existsSync(CLI_CONFIG_PATH)) {
        fs.unlinkSync(CLI_CONFIG_PATH);
        log.info(`Deleted: ${CLI_CONFIG_PATH}`);
      }
      
      log.info("\nConfiguration reset complete.");
      log.info("Run 'synapse-sap wizard' to start fresh setup.");
      
      output({ success: true, message: "Configuration reset complete" });
    });
}
