#!/usr/bin/env node
/**
 * @module cli
 * @description synapse-sap CLI — v1.0.3 Edition
 *
 * Complete toolbox for the Synapse Agent Protocol (SAP v2):
 *   - Agent lifecycle management
 *   - Escrow v2 lifecycle (create, deposit, settle, info)
 *   - x402 micropayment headers
 *   - Merchant operations (register, delegate)
 *   - Memory systems (vault, session, inscribe)
 *   - SNS domain management (check, register, resolve, validate)
 *   - Environment & config management
 *
 * @since v1.0.0
 * @requires @oobe-protocol-labs/synapse-sap-sdk@^1.0.3
 */

import { Command } from "commander";
import { loadConfig } from "./config.js";
import { configureLogger } from "./logger.js";

// ── Command imports ──────────────────────────────────
import { registerAgentCommands } from "./commands/agent.js";
import { registerEscrowCommands } from "./commands/escrow.js";
import { registerX402Commands } from "./commands/x402.js";
import { registerMerchantCommands } from "./commands/merchant.js";
import { registerMemoryCommands } from "./commands/memory.js";
// import { registerSnsCommands } from "./commands/sns.js"; // TODO: Fix SNS integration errors
import { registerSkillsCommands } from "./commands/skills.js";
import { registerWizardCommands } from "./commands/wizard.js";
import { registerConfigCommands } from "./commands/config-cmd.js";

// ═══════════════════════════════════════════════════════════════════
//  Program
// ═══════════════════════════════════════════════════════════════════

const program = new Command();

program
  .name("synapse-sap")
  .description("synapse-sap CLI — v1.0.3 Edition\nComplete toolbox for the Synapse Agent Protocol (SAP v2) on Solana")
  .version("1.0.3")
  .addHelpText("after", `
Quick Start:
  $ synapse-sap wizard                        # Interactive MCP setup (recommended)
  $ synapse-sap agent register --name "My Agent"
  $ synapse-sap escrow create <AGENT> --deposit 1000000000
  $ synapse-sap memory vault init --nonce abcdef123456...

Command Groups:
  wizard      Interactive MCP Server setup (creates config + isolated keypair)
  agent       Agent lifecycle (list, info, register, close, close-stake)
  escrow      Escrow v2 (create, deposit, settle, info)
  x402        Payment flows (headers, verify)
  merchant    Merchant ops (register, delegate)
  memory      Memory systems (vault init, session open, inscribe)
  config      CLI & MCP config management (show, set, edit, mcp-init)
  skills      Skill management
  sns         SNS domain management (TEMPORARILY DISABLED - SDK type mismatch)

Documentation:
  SDK:      https://github.com/OOBE-PROTOCOL/synapse-sap-sdk
  RPC:      https://oobeprotocol.ai
`)
  .option("--rpc <url>", "Override primary RPC")
  .option("--cluster <cluster>", "Cluster (mainnet-beta|devnet|localnet)")
  .option("--json", "JSON output", false)
  .option("--silent", "Suppress logs (only JSON)", false)
  .option("--config <path>", "Config file path")
  .option("--dry-run", "Preview without sending", false)
  .option("--keypair <path>", "Wallet keypair path")
  .option("--api-key <key>", "OOBE API key")
  .hook("preAction", (cmd: Command) => {
    const opts = cmd.opts();
    configureLogger({ json: opts.json, silent: opts.silent });
  });

// ── Register all command groups ──────────────────────
registerAgentCommands(program);
registerEscrowCommands(program);
registerX402Commands(program);
registerMerchantCommands(program);
registerMemoryCommands(program);
registerSkillsCommands(program);
// registerSnsCommands(program); // TODO: Fix SNS integration errors
registerWizardCommands(program);
registerConfigCommands(program);

// ── Parse & execute ──────────────────────────────────
program.parse(process.argv);
