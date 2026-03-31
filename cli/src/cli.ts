#!/usr/bin/env node
/**
 * @module cli
 * @description synapse-sap CLI — Power Edition
 *
 * Complete toolbox for the Synapse Agent Protocol (SAP v2):
 *   - Agent lifecycle management
 *   - Endpoint discovery & validation
 *   - x402 escrow & payment flows
 *   - Tool manifest generation & typification
 *   - Environment & config management
 *   - Diagnostics & health checks
 *
 * @since v0.6.0
 */

import { Command } from "commander";
import { loadConfig, type CliConfig } from "./config";
import { configureLogger } from "./logger";

// ── Command imports ──────────────────────────────────
import { registerAgentCommands } from "./commands/agent";
import { registerDiscoveryCommands } from "./commands/discovery";
import { registerEscrowCommands } from "./commands/escrow";
import { registerX402Commands } from "./commands/x402";
import { registerToolsCommands } from "./commands/tools";
import { registerEnvCommands } from "./commands/env";
import { registerConfigCommands } from "./commands/config-cmd";
import { registerDoctorCommands } from "./commands/doctor";
import { registerTmpCommands } from "./commands/tmp";
import { registerPluginCommands } from "./commands/plugin";

// ═══════════════════════════════════════════════════════════════════
//  Program
// ═══════════════════════════════════════════════════════════════════

const program = new Command();

program
  .name("synapse-sap")
  .description("🧰 synapse-sap CLI — Power Edition\nComplete toolbox for the Synapse Agent Protocol (SAP v2) on Solana")
  .version("0.6.0")
  .addHelpText("after", `
Quick Start:
  $ synapse-sap env init --template devnet
  $ synapse-sap config set rpcUrl "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_..."
  $ synapse-sap agent list --active
  $ synapse-sap doctor run

Command Groups:
  agent       Agent lifecycle (list, info, tools, health, register)
  discovery   Network scanning (scan, validate, cache)
  escrow      Escrow lifecycle (open, deposit, withdraw, close, dump, list, monitor)
  x402        Payment flows (headers, call, sign, verify, settle, replay)
  tools       Manifest & schema (manifest, typify, publish, compare, doc)
  env         Environment (init, check, keypair)
  config      Configuration (show, set, edit, reset, path)
  doctor      Diagnostics (run)
  tmp         Artifacts (list, cat, diff, clean, archive)
  plugin      Plugins (list, install, create, validate)

Documentation:
  SDK:      https://github.com/OOBE-PROTOCOL/synapse-sap-sdk
  Explorer: https://synapse.oobeprotocol.ai
  RPC:      https://oobeprotocol.ai
`)
  .option("--rpc <url>", "Override primary RPC")
  .option("--fallback-rpc <url>", "Override fallback RPC for token ops")
  .option("--program <pubkey>", "Custom SAP program ID")
  .option("--cluster <cluster>", "Cluster override (mainnet-beta|devnet|localnet)")
  .option("--env-file <path>", "Custom env file")
  .option("--json", "JSON output", false)
  .option("--silent", "Suppress logs (only JSON)", false)
  .option("--tmp-dir <path>", "Custom temp directory")
  .option("--config <path>", "Config file path")
  .option("--profile <name>", "Config profile name")
  .option("--dry-run", "Preview RPC instructions without sending", false)
  .option("--fee-payer <path>", "Fee payer keypair path")
  .option("--keypair <path>", "Wallet keypair path")
  .hook("preAction", (cmd: Command) => {
    const opts = cmd.opts();

    // Load env file if specified
    if (opts.envFile) {
      try {
        const fs = require("fs");
        const content = fs.readFileSync(opts.envFile, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            process.env[key] = val;
          }
        }
      } catch {
        // ignore
      }
    }

    // Configure logger
    configureLogger({
      json: opts.json,
      silent: opts.silent,
    });
  });

// ── Register all command groups ──────────────────────
registerAgentCommands(program);
registerDiscoveryCommands(program);
registerEscrowCommands(program);
registerX402Commands(program);
registerToolsCommands(program);
registerEnvCommands(program);
registerConfigCommands(program);
registerDoctorCommands(program);
registerTmpCommands(program);
registerPluginCommands(program);

// ── Parse & execute ──────────────────────────────────
program.parse(process.argv);
