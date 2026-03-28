/**
 * @module cli/commands/doctor
 * @description Diagnostic health checks: env, RPC, keypair, disk, program, network.
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "../config";
import { log, output, saveTmp } from "../logger";

interface CheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  durationMs?: number;
}

async function checkEnvVars(): Promise<CheckResult> {
  const required = ["SAP_RPC_URL", "SAP_CLUSTER", "SAP_PROGRAM_ID"];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length === 0) {
    return { name: "env-vars", status: "pass", message: "All required env vars set" };
  }
  if (missing.length < required.length) {
    return { name: "env-vars", status: "warn", message: `Missing optional: ${missing.join(", ")}` };
  }
  return { name: "env-vars", status: "fail", message: `Missing: ${missing.join(", ")}` };
}

async function checkRpcConnection(rpcUrl: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { Connection } = await import("@solana/web3.js");
    const conn = new Connection(rpcUrl, "confirmed");
    const version = await conn.getVersion();
    const durationMs = Date.now() - start;
    return {
      name: "rpc-connection",
      status: durationMs > 5000 ? "warn" : "pass",
      message: `Connected to Solana ${version["solana-core"]} (${durationMs}ms)`,
      durationMs,
    };
  } catch (err) {
    return {
      name: "rpc-connection",
      status: "fail",
      message: `RPC unreachable: ${(err as Error).message}`,
      durationMs: Date.now() - start,
    };
  }
}

async function checkFallbackRpc(fallbackUrl: string | undefined): Promise<CheckResult> {
  if (!fallbackUrl) {
    return { name: "fallback-rpc", status: "warn", message: "No fallback RPC configured" };
  }

  const start = Date.now();
  try {
    const { Connection } = await import("@solana/web3.js");
    const conn = new Connection(fallbackUrl, "confirmed");
    await conn.getVersion();
    return {
      name: "fallback-rpc",
      status: "pass",
      message: `Fallback RPC reachable (${Date.now() - start}ms)`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "fallback-rpc",
      status: "warn",
      message: `Fallback RPC unreachable: ${(err as Error).message}`,
      durationMs: Date.now() - start,
    };
  }
}

async function checkKeypair(keypairPath: string | undefined): Promise<CheckResult> {
  if (!keypairPath) {
    return { name: "keypair", status: "warn", message: "No keypair configured (read-only mode)" };
  }

  try {
    if (fs.existsSync(keypairPath)) {
      const stat = fs.statSync(keypairPath);
      const mode = (stat.mode & 0o777).toString(8);

      if (mode !== "600" && mode !== "400") {
        return {
          name: "keypair",
          status: "warn",
          message: `Keypair file permissions too open (${mode}). Recommend: chmod 600`,
        };
      }

      const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
      if (!Array.isArray(raw) || raw.length !== 64) {
        return { name: "keypair", status: "fail", message: "Invalid keypair format (expected 64-byte JSON array)" };
      }

      return { name: "keypair", status: "pass", message: `Keypair loaded (file: ${mode})` };
    } else {
      // Might be base58 — try loading
      return { name: "keypair", status: "pass", message: "Keypair value set (inline)" };
    }
  } catch (err) {
    return { name: "keypair", status: "fail", message: `Keypair error: ${(err as Error).message}` };
  }
}

async function checkProgramDeployed(rpcUrl: string, programId: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { Connection, PublicKey } = await import("@solana/web3.js");
    const conn = new Connection(rpcUrl, "confirmed");
    const info = await conn.getAccountInfo(new PublicKey(programId));

    if (!info) {
      return { name: "program", status: "fail", message: `Program ${programId} not found on-chain` };
    }

    if (!info.executable) {
      return { name: "program", status: "fail", message: `Account ${programId} exists but is not executable` };
    }

    return {
      name: "program",
      status: "pass",
      message: `Program deployed (${info.data.length} bytes, owner: ${info.owner.toBase58().slice(0, 8)}...)`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "program",
      status: "fail",
      message: `Program check failed: ${(err as Error).message}`,
      durationMs: Date.now() - start,
    };
  }
}

async function checkDiskSpace(tmpDir: string): Promise<CheckResult> {
  try {
    if (!fs.existsSync(tmpDir)) {
      return { name: "disk", status: "pass", message: `Tmp dir ${tmpDir} does not exist yet (will be created)` };
    }

    const files = fs.readdirSync(tmpDir);
    let totalSize = 0;
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(tmpDir, f));
        totalSize += stat.size;
      } catch {
        // skip
      }
    }

    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    if (totalSize > 100 * 1024 * 1024) {
      return { name: "disk", status: "warn", message: `Tmp dir has ${files.length} files (${sizeMB} MB). Consider cleanup.` };
    }

    return { name: "disk", status: "pass", message: `Tmp dir: ${files.length} files (${sizeMB} MB)` };
  } catch (err) {
    return { name: "disk", status: "warn", message: `Disk check error: ${(err as Error).message}` };
  }
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0], 10);

  if (major < 18) {
    return { name: "node", status: "fail", message: `Node ${version} — minimum required: v18` };
  }
  if (major < 20) {
    return { name: "node", status: "warn", message: `Node ${version} — v20+ recommended` };
  }
  return { name: "node", status: "pass", message: `Node ${version}` };
}

async function checkSdkVersion(): Promise<CheckResult> {
  try {
    const pkgPath = require.resolve("@oobe-protocol-labs/synapse-sap-sdk/package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return { name: "sdk-version", status: "pass", message: `SDK v${pkg.version}` };
  } catch {
    try {
      // Try local resolution
      const localPkg = path.join(__dirname, "../../../package.json");
      if (fs.existsSync(localPkg)) {
        const pkg = JSON.parse(fs.readFileSync(localPkg, "utf-8"));
        return { name: "sdk-version", status: "pass", message: `SDK v${pkg.version} (local)` };
      }
    } catch {
      // Fall through
    }
    return { name: "sdk-version", status: "warn", message: "SDK not found in node_modules" };
  }
}

export function registerDoctorCommands(program: Command): void {
  const doctor = program
    .command("doctor")
    .description("Run diagnostic checks on your environment");

  doctor
    .command("run")
    .description("Run all diagnostic checks")
    .option("--quick", "Skip network checks (offline)")
    .option("--save", "Save report to tmp")
    .action(async (opts) => {
      const config = loadConfig(program.opts());
      log.info("Running diagnostics...\n");

      const results: CheckResult[] = [];

      // Fast local checks
      results.push(await checkNodeVersion());
      results.push(await checkSdkVersion());
      results.push(await checkEnvVars());
      results.push(await checkKeypair(config.walletPath));
      results.push(await checkDiskSpace(config.tmpDir));

      // Network checks (skip if --quick)
      if (!opts.quick) {
        results.push(await checkRpcConnection(config.rpc));
        results.push(await checkFallbackRpc(config.fallbackRpc));
        results.push(await checkProgramDeployed(config.rpc, config.programId ?? "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ"));
      } else {
        log.info("(skipping network checks — --quick mode)\n");
      }

      // Display results
      const statusIcon = { pass: "✓", warn: "⚠", fail: "✗" };
      const statusColor = { pass: "green", warn: "yellow", fail: "red" };

      for (const r of results) {
        const icon = statusIcon[r.status];
        const suffix = r.durationMs ? ` [${r.durationMs}ms]` : "";
        log.info(`  ${icon} ${r.name}: ${r.message}${suffix}`);
      }

      const failures = results.filter((r) => r.status === "fail");
      const warnings = results.filter((r) => r.status === "warn");

      log.info("");
      log.info(
        `${results.length} checks: ${results.length - failures.length - warnings.length} passed, ${warnings.length} warnings, ${failures.length} failures`
      );

      if (opts.save) {
        const report = {
          timestamp: new Date().toISOString(),
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          results,
        };
        saveTmp(config.tmpDir, "doctor-report.json", report);
      }

      if (failures.length > 0) {
        process.exit(1);
      }
    });

  // Shorthand — just `doctor` runs the checks
  doctor.action(async () => {
    // Forward to `doctor run`
    await doctor.commands.find((c: Command) => c.name() === "run")?.parseAsync(["run"], { from: "user" });
  });
}
