#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const require = createRequire(import.meta.url);
const pkg = require(resolve(root, "package.json"));
const expectedSdkVersion = pkg.version;
const expectedCliVersion = "1.0.1";
const expectedProgramVersion = "1.0.0";

const checks = [];
const tmp = mkdtempSync(join(tmpdir(), "sap-release-verify-"));
const cache = join(tmp, "npm-cache");

function run(cwd, command, args, options = {}) {
  const res = spawnSync(command, args, {
    cwd,
    env: { ...process.env, npm_config_cache: cache },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (res.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd}\n${res.stdout}\n${res.stderr}`,
    );
  }
  return res.stdout.trim();
}

function ok(name, condition, detail = "") {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) {
    throw new Error(`release check failed: ${name}${detail ? ` (${detail})` : ""}`);
  }
}

function pack(cwd, expectedName) {
  const out = run(cwd, "npm", ["pack", "--json", "--pack-destination", tmp]);
  const meta = JSON.parse(out)[0];
  ok(`${expectedName} pack name`, meta.name === expectedName, meta.name);
  const tarball = join(tmp, meta.filename);
  const extractDir = join(tmp, expectedName.replaceAll("/", "_"));
  mkdirSync(extractDir, { recursive: true });
  run(tmp, "tar", ["-xzf", tarball, "-C", extractDir]);
  return { meta, tarball, unpacked: join(extractDir, "package") };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertInstruction(idl, name, accounts, args = undefined) {
  const ix = idl.instructions.find((candidate) => candidate.name === name);
  ok(`IDL has ${name}`, Boolean(ix));
  ok(`${name} accounts`, JSON.stringify(ix.accounts.map((account) => account.name)) === JSON.stringify(accounts));
  if (args) {
    ok(`${name} args`, JSON.stringify(ix.args.map((arg) => arg.name)) === JSON.stringify(args));
  }
}

function verifySdkTarball(unpacked) {
  const packageJson = readJson(join(unpacked, "package.json"));
  ok("SDK package version", packageJson.version === expectedSdkVersion, packageJson.version);

  const idl = readJson(join(unpacked, "dist/cjs/idl/synapse_agent_sap.json"));
  ok("IDL metadata version", idl.metadata?.version === expectedProgramVersion, idl.metadata?.version);
  assertInstruction(idl, "settle_calls_v2", ["wallet", "agent", "agent_stats", "escrow", "system_program"], [
    "escrow_nonce",
    "calls_to_settle",
    "service_hash",
  ]);
  assertInstruction(idl, "create_escrow_v2", [
    "depositor",
    "agent",
    "agent_stake",
    "agent_stats",
    "pricing_menu",
    "escrow",
    "system_program",
  ]);
  assertInstruction(idl, "close_stake", ["wallet", "agent", "stake"]);

  const pdasCjs = readFileSync(join(unpacked, "dist/cjs/pdas/index.js"), "utf8");
  const pdasDts = readFileSync(join(unpacked, "dist/esm/pdas/index.d.ts"), "utf8");
  ok("Pdas delegates to canonical pda module", pdasCjs.includes('require("../pda/index.js")'));
  ok("Pdas.getAgentStakePDA derives from agent", pdasCjs.includes("deriveStake)(agent)"));
  ok("Pdas.getEscrowV2PDA has depositor arg", pdasCjs.includes("function getEscrowV2PDA(agent, depositor"));
  ok("Pdas.getEscrowV2PDA delegates canonical V2", pdasCjs.includes("deriveEscrowV2)(agent, depositor"));
  ok("Pdas.hashString uses sha256", pdasCjs.includes("hash_js_1.sha256"));
  ok(
    "Pdas d.ts exposes depositor",
    /getEscrowV2PDA\(\s*agent: PublicKey,\s*depositor: PublicKey/s.test(pdasDts),
  );

  const agentCjs = readFileSync(join(unpacked, "dist/cjs/instructions/agent.js"), "utf8");
  ok("registerAgent includes pricingMenu", agentCjs.includes("pricingMenu: ctx.pricingMenu"));
  ok("updateAgent includes pricingMenu", agentCjs.includes("pricingMenu: ctx.pricingMenu"));
}

function verifyCliTarball(unpacked) {
  const packageJson = readJson(join(unpacked, "package.json"));
  ok("CLI package version", packageJson.version === expectedCliVersion, packageJson.version);
  ok("CLI SDK dependency", packageJson.dependencies["@oobe-protocol-labs/synapse-sap-sdk"] === `^${expectedSdkVersion}`);
  const agentCommand = readFileSync(join(unpacked, "dist/commands/agent.js"), "utf8");
  ok("CLI has agent close", agentCommand.includes('.command("close")'));
  ok("CLI has agent close-stake", agentCommand.includes("close-stake"));
}

function verifyConsumerInstall(sdkTarball, cliTarball) {
  const consumer = join(tmp, "consumer");
  run(tmp, "mkdir", ["-p", consumer]);
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ type: "module" }, null, 2));
  run(consumer, "npm", ["install", "--ignore-scripts", sdkTarball, cliTarball]);

  const cjs = `
    const { PublicKey } = require("@solana/web3.js");
    const sdk = require("@oobe-protocol-labs/synapse-sap-sdk");
    const idl = require("@oobe-protocol-labs/synapse-sap-sdk/idl/synapse_agent_sap.json");
    const wallet = new PublicKey("HXyv3RHndummXVjMcXTRaQo1L1sQtxutQtbgfnVC2Hxg");
    const depositor = new PublicKey("11111111111111111111111111111113");
    const agent = sdk.Pdas.getAgentPDA(wallet)[0];
    const stake = sdk.Pdas.getAgentStakePDA(agent)[0];
    const escrow = sdk.Pdas.getEscrowV2PDA(agent, depositor, 0)[0];
    if (idl.metadata.version !== "${expectedProgramVersion}") throw new Error("bad IDL version");
    if (agent.toBase58() !== "5y8Dz8cAFo1PbR51QyqA7qZpFJcAi95oVnsykeCaQP8W") throw new Error("bad agent PDA");
    if (stake.toBase58() !== "DQZxj56X43dkr7U1nvkcBQZ3e5VAdbhgdBdi1YhmwXv5") throw new Error("bad stake PDA");
    if (escrow.toBase58() === agent.toBase58()) throw new Error("bad escrow PDA");
  `;
  run(consumer, "node", ["-e", cjs]);

  const esm = `
    import { PublicKey } from "@solana/web3.js";
    import * as sdk from "@oobe-protocol-labs/synapse-sap-sdk";
    const wallet = new PublicKey("HXyv3RHndummXVjMcXTRaQo1L1sQtxutQtbgfnVC2Hxg");
    const agent = sdk.Pdas.getAgentPDA(wallet)[0];
    const stake = sdk.Pdas.getAgentStakePDA(agent)[0];
    if (stake.toBase58() !== "DQZxj56X43dkr7U1nvkcBQZ3e5VAdbhgdBdi1YhmwXv5") throw new Error("bad ESM stake PDA");
  `;
  run(consumer, "node", ["--input-type=module", "-e", esm]);

  const help = run(consumer, "node", ["node_modules/.bin/synapse-sap", "agent", "--help"]);
  ok("installed CLI exposes close-stake", help.includes("close-stake"));
}

function verifyNoSecretPatterns() {
  const patterns = ["sk_live_", "OpenVSX", "OPENVSX", "openvsx", "ovsx_", "postgresql://", "postgres://"];
  for (const pattern of patterns) {
    const res = spawnSync("git", ["grep", "-I", "-n", "-e", pattern, "HEAD", "--", "."], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    ok(`secret pattern absent: ${pattern}`, res.status === 1, res.stdout.trim());
  }
}

try {
  run(root, "npm", ["run", "build"]);
  run(root, "npm", ["run", "test", "--", "--run"]);
  run(join(root, "cli"), "npm", ["run", "build"]);

  const sdk = pack(root, "@oobe-protocol-labs/synapse-sap-sdk");
  const cli = pack(join(root, "cli"), "synapse-sap-cli");
  verifySdkTarball(sdk.unpacked);
  verifyCliTarball(cli.unpacked);
  verifyConsumerInstall(sdk.tarball, cli.tarball);
  verifyNoSecretPatterns();

  console.log(JSON.stringify({ ok: true, checks: checks.length, tmp }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(JSON.stringify({ ok: false, checks }, null, 2));
  process.exit(1);
}
