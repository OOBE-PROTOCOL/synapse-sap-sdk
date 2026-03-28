/**
 * @module cli/logger
 * @description CLI logging and output formatting.
 */

import * as fs from "fs";
import * as path from "path";

let _json = false;
let _silent = false;
let _logDir: string | null = null;

export function configureLogger(opts: {
  json?: boolean;
  silent?: boolean;
  logDir?: string;
}): void {
  _json = opts.json ?? false;
  _silent = opts.silent ?? false;
  _logDir = opts.logDir ?? null;
}

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: string, msg: string, data?: unknown): void {
  const entry = { timestamp: timestamp(), level, msg, data };

  // File logging
  if (_logDir) {
    try {
      if (!fs.existsSync(_logDir)) {
        fs.mkdirSync(_logDir, { recursive: true });
      }
      const date = new Date().toISOString().split("T")[0];
      const logPath = path.join(_logDir, `${date}.log`);
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch {
      // ignore logging errors
    }
  }

  if (_silent) return;

  if (_json) {
    process.stdout.write(JSON.stringify(entry) + "\n");
    return;
  }

  const prefix = level === "error" ? "✗" : level === "warn" ? "⚠" : level === "debug" ? "●" : "▸";
  const text = data ? `${msg} ${JSON.stringify(data)}` : msg;
  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(`${prefix} ${text}\n`);
}

export const log = {
  info: (msg: string, data?: unknown) => write("info", msg, data),
  warn: (msg: string, data?: unknown) => write("warn", msg, data),
  error: (msg: string, data?: unknown) => write("error", msg, data),
  debug: (msg: string, data?: unknown) => write("debug", msg, data),
  json: (data: unknown) => {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  },
  table: (rows: Record<string, unknown>[]) => {
    if (_json) {
      process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
      return;
    }
    if (rows.length === 0) {
      process.stdout.write("(empty)\n");
      return;
    }
    console.table(rows);
  },
};

/**
 * Print data as JSON or formatted table depending on --json flag.
 */
export function output(data: unknown): void {
  if (_json || _silent) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  } else if (Array.isArray(data)) {
    log.table(data);
  } else {
    log.json(data);
  }
}

/**
 * Save an artifact to the tmp directory.
 */
export function saveTmp(tmpDir: string, filename: string, data: unknown): string {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  return filePath;
}
