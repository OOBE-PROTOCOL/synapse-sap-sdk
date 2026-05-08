/**
 * @module cli/commands/skills
 * @description Manage Hermes Agent skill files for SAP SDK.
 * Downloads the latest skill pack from the synapse-sap-sdk GitHub releases.
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { log, output } from "../logger";

const SKILLS_REPO = "OOBE-PROTOCOL/synapse-sap-sdk";
const SKILLS_TAG = "v0.14.0-skills";
const RAW_BASE = `https://raw.githubusercontent.com/${SKILLS_REPO}/${SKILLS_TAG}/skills`;

const DEFAULT_SKILLS = [
  "sap-overview",
  "sap-client",
  "sap-merchant",
  "sap-memory",
  "sap-metaplex",
];

function getSkillsDir(): string {
  // Hermes Agent skills directory
  const hermesDir = path.join(os.homedir(), ".hermes", "skills");
  // Fallback to CLI config dir
  if (!fs.existsSync(hermesDir)) {
    const cliDir = path.join(os.homedir(), ".config", "synapse-sap", "skills");
    return cliDir;
  }
  return hermesDir;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  const text = await response.text();
  fs.writeFileSync(dest, text, "utf-8");
}

export function registerSkillsCommands(program: Command): void {
  const skills = program
    .command("skills")
    .description("Manage SAP SDK skill files for Hermes Agent")
    .addHelpText("after", `
Examples:
  $ synapse-sap skills install           # Install all SAP skills
  $ synapse-sap skills install sap-client  # Install single skill
  $ synapse-sap skills list              # List installed skills
  $ synapse-sap skills update            # Update all skills to latest
  $ synapse-sap skills remove sap-memory   # Remove a skill
  $ synapse-sap skills path              # Show skills install directory
`);

  // ── skills install ──────────────────────────────
  skills
    .command("install [skill]")
    .description("Install SAP SDK skill files (default: all)")
    .option("--tag <tag>", "GitHub tag to fetch from", SKILLS_TAG)
    .option("--force", "Overwrite existing files")
    .action(async (skillName: string | undefined, opts) => {
      try {
        const skillsDir = getSkillsDir();
        ensureDir(skillsDir);
        const tag = opts.tag || SKILLS_TAG;
        const base = `https://raw.githubusercontent.com/${SKILLS_REPO}/${tag}/skills`;
        const toInstall = skillName ? [skillName] : DEFAULT_SKILLS;
        const installed: string[] = [];
        const skipped: string[] = [];

        for (const name of toInstall) {
          const skillDir = path.join(skillsDir, name);
          const skillFile = path.join(skillDir, "SKILL.md");
          const url = `${base}/${name}/SKILL.md`;

          if (!opts.force && fs.existsSync(skillFile)) {
            skipped.push(name);
            continue;
          }

          log.info(`Installing ${name}...`);
          ensureDir(skillDir);
          await downloadFile(url, skillFile);
          installed.push(name);
        }

        log.info(`\nDone. Installed: ${installed.length}, Skipped: ${skipped.length}`);
        output({ installed, skipped, skillsDir });
      } catch (err) {
        log.error("Install failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── skills list ─────────────────────────────────
  skills
    .command("list")
    .description("List installed SAP skills")
    .action(() => {
      try {
        const skillsDir = getSkillsDir();
        if (!fs.existsSync(skillsDir)) {
          output({ skills: [], message: "No skills directory found" });
          return;
        }
        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        const skills = entries
          .filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, "SKILL.md")))
          .map((e) => {
            const stat = fs.statSync(path.join(skillsDir, e.name, "SKILL.md"));
            return {
              name: e.name,
              size: stat.size,
              modified: stat.mtime.toISOString(),
            };
          });
        output(skills);
      } catch (err) {
        log.error("List failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── skills update ───────────────────────────────
  skills
    .command("update")
    .description("Update all installed skills to the latest release")
    .option("--tag <tag>", "GitHub tag to fetch from", SKILLS_TAG)
    .action(async (opts) => {
      try {
        const skillsDir = getSkillsDir();
        if (!fs.existsSync(skillsDir)) {
          log.error("No skills directory found. Run `skills install` first.");
          process.exit(1);
        }
        const tag = opts.tag || SKILLS_TAG;
        const base = `https://raw.githubusercontent.com/${SKILLS_REPO}/${tag}/skills`;
        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        const installed = entries.filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, "SKILL.md")));
        const updated: string[] = [];
        const failed: string[] = [];

        for (const entry of installed) {
          const name = entry.name;
          const skillFile = path.join(skillsDir, name, "SKILL.md");
          const url = `${base}/${name}/SKILL.md`;
          try {
            log.info(`Updating ${name}...`);
            await downloadFile(url, skillFile);
            updated.push(name);
          } catch (err) {
            log.warn(`Failed to update ${name}: ${(err as Error).message}`);
            failed.push(name);
          }
        }

        log.info(`\nDone. Updated: ${updated.length}, Failed: ${failed.length}`);
        output({ updated, failed, tag });
      } catch (err) {
        log.error("Update failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── skills remove ───────────────────────────────
  skills
    .command("remove <skill>")
    .description("Remove an installed skill")
    .action((skillName: string) => {
      try {
        const skillsDir = getSkillsDir();
        const skillDir = path.join(skillsDir, skillName);
        if (!fs.existsSync(skillDir)) {
          log.error(`Skill not found: ${skillName}`);
          process.exit(1);
        }
        fs.rmSync(skillDir, { recursive: true, force: true });
        log.info(`Removed ${skillName}`);
        output({ removed: skillName });
      } catch (err) {
        log.error("Remove failed", { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── skills path ─────────────────────────────────
  skills
    .command("path")
    .description("Show skills installation directory")
    .action(() => {
      output({ skillsDir: getSkillsDir() });
    });
}
