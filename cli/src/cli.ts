#!/usr/bin/env node
/**
 * @module cli
 * @description synapse-sap CLI — v0.15.0 Edition
 *
 * Complete toolbox for the Synapse Agent Protocol (SAP v2):
 *   - Agent lifecycle management
 *   - Escrow v2 lifecycle (create, deposit, settle, info)
 *   - x402 micropayment headers
 *   - Merchant operations (register, delegate)
 *   - Memory systems (vault, session, inscribe)
 *   - Environment & config management
 *
 * @since v0.15.0
 * @requires @oobe-protocol-labs/synapse-sap-sdk@^0.15.0
 */

import { Command } from "commander";
import { loadConfig } from "./config";
import { configureLogger } from "./logger";

// ── Command imports ──────────────────────────────────
import { registerAgentCommands } from "./commands/agent";
import { registerEscrowCommands } from "./commands/escrow";
import { registerX402Commands } from "./commands/x402";
import { registerMerchantCommands } from "./commands/merchant";
import { registerMemoryCommands } from "./commands/memory";

// ═══════════════════════════════════════════════════════════════════
//  Program
// ═══════════════════════════════════════════════════════════════════

const program = new Command();

program
  .name("synapse-sap")
  .description("synapse-sap CLI — v0.15.0 Edition\nComplete toolbox for the Synapse Agent Protocol (SAP v2) on Solana")
  .version("0.15.0")
  .addHelpText("after", `
Quick Start:
  $ synapse-sap agent register --name "My Agent"
  $ synapse-sap escrow create <AGENT> --deposit 1000000000
  $ synapse-sap memory vault init --nonce abcdef123456...

Command Groups:
  agent       Agent lifecycle (list, info, register)
  escrow      Escrow v2 (create, deposit, settle, info)
  x402        Payment flows (headers, verify)
  merchant    Merchant ops (register, delegate)
  memory      Memory systems (vault init, session open, inscribe)

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

import { registerSkillsCommands } from "./commands/skills";

// ── Register all command groups ──────────────────────
registerAgentCommands(program);
registerEscrowCommands(program);
registerX402Commands(program);
registerMerchantCommands(program);
registerMemoryCommands(program);
registerSkillsCommands(program);

// ── Parse & execute ──────────────────────────────────
program.parse(process.argv);
