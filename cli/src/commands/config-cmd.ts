/**
 * @module cli/commands/config-cmd
 * @description CLI configuration management: show, set, edit.
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, saveConfig, type CliConfig } from "../config";
import { log, output } from "../logger";

const EDITABLE_KEYS = [
  "rpcUrl",
  "fallbackRpcUrl",
  "cluster",
  "programId",
  "tmpDir",
  "defaultProfile",
  "jsonOutput",
  "silent",
] as const;

export function registerConfigCommands(program: Command): void {
  const cfg = program
    .command("config")
    .description("CLI configuration management")
    .addHelpText("after", `
Examples:
  $ synapse-sap config show
  $ synapse-sap config show --raw
  $ synapse-sap config set rpcUrl "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_..."
  $ synapse-sap config set cluster devnet
  $ synapse-sap config edit
  $ synapse-sap config reset --confirm
  $ synapse-sap config path
`);

  // ── config show ─────────────────────────────────
  cfg
    .command("show")
    .description("Display current configuration (merged flags > env > file > defaults)")
    .option("--raw", "Show raw config file only (no merging)")
    .action(async (opts) => {
      if (opts.raw) {
        const configPath = program.opts().config || path.join(process.env.HOME || "~", ".synapse-sap", "config.json");
        if (fs.existsSync(configPath)) {
          const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          output(raw);
        } else {
          log.info(`No config file at ${configPath}`);
        }
        return;
      }

      const config = loadConfig(program.opts());
      // Redact sensitive fields
      const display = {
        ...config,
        privateKey: config.privateKey ? "***" : undefined,
        walletPath: config.walletPath ?? undefined,
      };
      output(display);
    });

  // ── config set ──────────────────────────────────
  cfg
    .command("set <key> <value>")
    .description(`Set a config value. Keys: ${EDITABLE_KEYS.join(", ")}`)
    .action(async (key: string, value: string) => {
      if (!EDITABLE_KEYS.includes(key as any)) {
        log.error(`Unknown config key: ${key}`);
        log.info(`Allowed keys: ${EDITABLE_KEYS.join(", ")}`);
        process.exit(1);
      }

      const configPath = program.opts().config || path.join(process.env.HOME || "~", ".synapse-sap", "config.json");
      let existing: Record<string, unknown> = {};

      if (fs.existsSync(configPath)) {
        existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }

      // Type coercion for booleans
      let coerced: unknown = value;
      if (value === "true") coerced = true;
      else if (value === "false") coerced = false;
      else if (/^\d+$/.test(value)) coerced = parseInt(value, 10);

      existing[key] = coerced;

      // Ensure directory
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
      log.info(`Set ${key} = ${value}`);
    });

  // ── config edit ─────────────────────────────────
  cfg
    .command("edit")
    .description("Open config file in $EDITOR")
    .action(async () => {
      const configPath = program.opts().config || path.join(process.env.HOME || "~", ".synapse-sap", "config.json");

      // Create default config if it doesn't exist
      if (!fs.existsSync(configPath)) {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(
          configPath,
          JSON.stringify(
            {
              rpcUrl: "https://api.mainnet-beta.solana.com",
              cluster: "mainnet-beta",
              programId: "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
              tmpDir: "/tmp/synapse-sap",
              jsonOutput: false,
              silent: false,
            },
            null,
            2
          ) + "\n"
        );
        log.info(`Created default config at ${configPath}`);
      }

      const editor = process.env.EDITOR || process.env.VISUAL || "vi";
      const { execSync } = await import("child_process");

      try {
        execSync(`${editor} "${configPath}"`, { stdio: "inherit" });
        log.info("Config updated");
      } catch {
        log.error(`Failed to open editor: ${editor}`);
        log.info(`Set $EDITOR or edit manually: ${configPath}`);
      }
    });

  // ── config reset ────────────────────────────────
  cfg
    .command("reset")
    .description("Reset config to defaults")
    .option("--confirm", "Skip confirmation prompt")
    .action(async (opts) => {
      const configPath = program.opts().config || path.join(process.env.HOME || "~", ".synapse-sap", "config.json");

      if (!fs.existsSync(configPath)) {
        log.info("No config file to reset");
        return;
      }

      if (!opts.confirm) {
        log.warn(`This will delete ${configPath}. Use --confirm to proceed.`);
        return;
      }

      fs.unlinkSync(configPath);
      log.info("Config reset to defaults");
    });

  // ── config path ─────────────────────────────────
  cfg
    .command("path")
    .description("Print the config file path")
    .action(() => {
      const configPath = program.opts().config || path.join(process.env.HOME || "~", ".synapse-sap", "config.json");
      log.info(configPath);
    });
}
