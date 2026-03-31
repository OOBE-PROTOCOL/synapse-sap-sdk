/**
 * @module cli/commands/tmp
 * @description Artifact / tmp directory management: list, cat, diff, clean, archive.
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "../config";
import { log, output } from "../logger";

function getTmpDir(program: Command): string {
  const config = loadConfig(program.opts());
  return config.tmpDir;
}

function ensureTmpDir(tmpDir: string): void {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}

interface TmpFileInfo {
  name: string;
  size: number;
  sizeHuman: string;
  modified: string;
  ageMs: number;
}

function listTmpFiles(tmpDir: string): TmpFileInfo[] {
  if (!fs.existsSync(tmpDir)) return [];

  const files = fs.readdirSync(tmpDir);
  const now = Date.now();

  return files
    .map((name) => {
      try {
        const fullPath = path.join(tmpDir, name);
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return null;

        const sizeKB = stat.size / 1024;
        return {
          name,
          size: stat.size,
          sizeHuman: sizeKB < 1024 ? `${sizeKB.toFixed(1)} KB` : `${(sizeKB / 1024).toFixed(2)} MB`,
          modified: stat.mtime.toISOString(),
          ageMs: now - stat.mtime.getTime(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as TmpFileInfo[];
}

export function registerTmpCommands(program: Command): void {
  const tmp = program
    .command("tmp")
    .description("Manage tmp artifacts (responses, manifests, reports)")
    .addHelpText("after", `
Examples:
  $ synapse-sap tmp list --sort size
  $ synapse-sap tmp list --older-than 7d
  $ synapse-sap tmp cat x402-call-*.json --jq .body
  $ synapse-sap tmp cat report.json --head 20
  $ synapse-sap tmp diff scan-1.json scan-2.json
  $ synapse-sap tmp clean --older-than 30d --dry-run
  $ synapse-sap tmp clean --all
  $ synapse-sap tmp archive --older-than 7d --remove
`);

  // ── tmp list ────────────────────────────────────
  tmp
    .command("list")
    .description("List artifacts in tmp directory")
    .option("--sort <field>", "Sort by: name | size | modified", "modified")
    .option("--filter <glob>", 'Filter filenames (e.g., "*.json")')
    .option("--older-than <duration>", "Show only files older than (e.g., 1h, 7d)")
    .action(async (opts) => {
      const tmpDir = getTmpDir(program);
      let files = listTmpFiles(tmpDir);

      if (files.length === 0) {
        log.info(`No artifacts in ${tmpDir}`);
        return;
      }

      // Filter by glob
      if (opts.filter) {
        const pattern = opts.filter.replace(/\*/g, ".*");
        const re = new RegExp(`^${pattern}$`, "i");
        files = files.filter((f) => re.test(f.name));
      }

      // Filter by age
      if (opts.olderThan) {
        const ms = parseDuration(opts.olderThan);
        if (ms) {
          files = files.filter((f) => f.ageMs > ms);
        }
      }

      // Sort
      switch (opts.sort) {
        case "name":
          files.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "size":
          files.sort((a, b) => b.size - a.size);
          break;
        case "modified":
        default:
          files.sort((a, b) => b.ageMs - a.ageMs);
          break;
      }

      output(files.map(({ name, sizeHuman, modified }) => ({ name, size: sizeHuman, modified })));
      log.info(`${files.length} artifact(s) in ${tmpDir}`);
    });

  // ── tmp cat ─────────────────────────────────────
  tmp
    .command("cat <filename>")
    .description("Print contents of a tmp artifact")
    .option("--jq <expr>", "Apply jq-like path (e.g., .data.tools)")
    .option("--head <n>", "Show first N lines")
    .option("--tail <n>", "Show last N lines")
    .action(async (filename: string, opts) => {
      const tmpDir = getTmpDir(program);
      const filePath = path.join(tmpDir, filename);

      if (!fs.existsSync(filePath)) {
        log.error(`Not found: ${filePath}`);
        process.exit(1);
      }

      let content = fs.readFileSync(filePath, "utf-8");

      // jq-like path extraction
      if (opts.jq) {
        try {
          let data = JSON.parse(content);
          const parts = opts.jq.replace(/^\./g, "").split(".");
          for (const part of parts) {
            if (part === "") continue;
            // Handle array index
            const arrMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrMatch) {
              data = data[arrMatch[1]][parseInt(arrMatch[2], 10)];
            } else {
              data = data[part];
            }
            if (data === undefined) break;
          }
          content = JSON.stringify(data, null, 2);
        } catch {
          log.warn("--jq: content is not valid JSON, showing raw");
        }
      }

      // head/tail
      if (opts.head || opts.tail) {
        const lines = content.split("\n");
        if (opts.head) {
          content = lines.slice(0, parseInt(opts.head, 10)).join("\n");
        } else if (opts.tail) {
          content = lines.slice(-parseInt(opts.tail, 10)).join("\n");
        }
      }

      process.stdout.write(content + "\n");
    });

  // ── tmp diff ────────────────────────────────────
  tmp
    .command("diff <fileA> <fileB>")
    .description("Show diff between two tmp artifacts")
    .action(async (fileA: string, fileB: string) => {
      const tmpDir = getTmpDir(program);
      const pathA = path.join(tmpDir, fileA);
      const pathB = path.join(tmpDir, fileB);

      if (!fs.existsSync(pathA)) {
        log.error(`Not found: ${pathA}`);
        process.exit(1);
      }
      if (!fs.existsSync(pathB)) {
        log.error(`Not found: ${pathB}`);
        process.exit(1);
      }

      const contentA = fs.readFileSync(pathA, "utf-8").split("\n");
      const contentB = fs.readFileSync(pathB, "utf-8").split("\n");

      // Simple line-by-line diff
      const maxLines = Math.max(contentA.length, contentB.length);
      let diffCount = 0;

      for (let i = 0; i < maxLines; i++) {
        const lineA = contentA[i];
        const lineB = contentB[i];

        if (lineA !== lineB) {
          diffCount++;
          if (lineA !== undefined) {
            log.info(`- L${i + 1}: ${lineA}`);
          }
          if (lineB !== undefined) {
            log.info(`+ L${i + 1}: ${lineB}`);
          }
        }
      }

      if (diffCount === 0) {
        log.info("Files are identical");
      } else {
        log.info(`\n${diffCount} line(s) differ`);
      }
    });

  // ── tmp clean ───────────────────────────────────
  tmp
    .command("clean")
    .description("Remove artifacts from tmp directory")
    .option("--older-than <duration>", "Remove only files older than (e.g., 1h, 7d, 30d)")
    .option("--all", "Remove all artifacts")
    .option("--dry-run", "Show what would be removed without deleting")
    .action(async (opts) => {
      const tmpDir = getTmpDir(program);
      let files = listTmpFiles(tmpDir);

      if (files.length === 0) {
        log.info("No artifacts to clean");
        return;
      }

      if (opts.olderThan) {
        const ms = parseDuration(opts.olderThan);
        if (ms) {
          files = files.filter((f) => f.ageMs > ms);
        }
      } else if (!opts.all) {
        log.error("Specify --older-than or --all");
        process.exit(1);
      }

      if (files.length === 0) {
        log.info("No matching artifacts to clean");
        return;
      }

      if (opts.dryRun || program.opts().dryRun) {
        log.info(`Would remove ${files.length} artifact(s):`);
        for (const f of files) {
          log.info(`  ${f.name} (${f.sizeHuman})`);
        }
        return;
      }

      let removed = 0;
      let totalBytes = 0;

      for (const f of files) {
        try {
          fs.unlinkSync(path.join(tmpDir, f.name));
          removed++;
          totalBytes += f.size;
        } catch (err) {
          log.warn(`Failed to remove ${f.name}: ${(err as Error).message}`);
        }
      }

      const savedMB = (totalBytes / (1024 * 1024)).toFixed(2);
      log.info(`Removed ${removed} artifact(s) (${savedMB} MB freed)`);
    });

  // ── tmp archive ─────────────────────────────────
  tmp
    .command("archive")
    .description("Compress tmp artifacts into a tar.gz archive")
    .option("--out <path>", "Output archive path")
    .option("--older-than <duration>", "Archive only files older than")
    .option("--remove", "Remove originals after archiving")
    .action(async (opts) => {
      const tmpDir = getTmpDir(program);
      let files = listTmpFiles(tmpDir);

      if (files.length === 0) {
        log.info("No artifacts to archive");
        return;
      }

      if (opts.olderThan) {
        const ms = parseDuration(opts.olderThan);
        if (ms) {
          files = files.filter((f) => f.ageMs > ms);
        }
      }

      if (files.length === 0) {
        log.info("No matching artifacts to archive");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const outPath = opts.out || path.join(tmpDir, `archive-${timestamp}.tar.gz`);

      try {
        const { execSync } = await import("child_process");
        const fileList = files.map((f) => f.name).join(" ");
        execSync(`cd "${tmpDir}" && tar -czf "${outPath}" ${fileList}`, { stdio: "pipe" });

        const stat = fs.statSync(outPath);
        const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
        log.info(`Archived ${files.length} file(s) to ${outPath} (${sizeMB} MB)`);

        if (opts.remove) {
          for (const f of files) {
            try {
              fs.unlinkSync(path.join(tmpDir, f.name));
            } catch {
              // skip
            }
          }
          log.info(`Removed ${files.length} original file(s)`);
        }
      } catch (err) {
        log.error("Archive failed", { error: (err as Error).message });
        process.exit(1);
      }
    });
}

/**
 * Parse human-readable duration to milliseconds.
 * Supports: 30s, 5m, 1h, 7d
 */
function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;

  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return val * 1000;
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}
