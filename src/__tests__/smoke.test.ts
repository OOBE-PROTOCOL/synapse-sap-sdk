import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import idl from "../idl/synapse_agent_sap.json";
import { EscrowModule, EscrowV2Module } from "../modules";
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrow,
  deriveEscrowV2,
  derivePricingMenu,
  deriveStake,
} from "../pda";
import * as Pdas from "../pdas";

type IdlInstruction = {
  name: string;
  accounts: Array<{ name: string }>;
  args: Array<{ name: string }>;
};

const instructions = idl.instructions as IdlInstruction[];
const packageRoot = new URL("../../", import.meta.url).pathname;

function readPackageFile(relativePath: string): string {
  return readFileSync(join(packageRoot, relativePath), "utf8");
}

function listMarkdownFiles(relativeDir: string): string[] {
  const root = join(packageRoot, relativeDir);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === ".history" || entry === "node_modules" || entry === "dist") continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith(".md")) out.push(full);
    }
  };
  walk(root);
  return out;
}

function instruction(name: string): IdlInstruction {
  const found = instructions.find((ix) => ix.name === name);
  if (!found) {
    throw new Error(`Missing IDL instruction: ${name}`);
  }
  return found;
}

describe("SDK smoke", () => {
  it("ships the canonical 1.0.0 IDL without legacy escrow instructions", () => {
    expect(idl.metadata.version).toBe("1.0.0");

    const names = instructions.map((ix) => ix.name);
    expect(names).not.toContain("create_escrow");
    expect(names).not.toContain("deposit_escrow");
    expect(names).not.toContain("settle_calls");
    expect(names).not.toContain("withdraw_escrow");
    expect(names).not.toContain("close_escrow");
    expect(names).not.toContain("settle_batch");
  });

  it("keeps settle_calls_v2 aligned with the deployed 5-account shape", () => {
    const settle = instruction("settle_calls_v2");

    expect(settle.accounts.map((account) => account.name)).toEqual([
      "wallet",
      "agent",
      "agent_stats",
      "escrow",
      "system_program",
    ]);
    expect(settle.args.map((arg) => arg.name)).toEqual([
      "escrow_nonce",
      "calls_to_settle",
      "service_hash",
    ]);
  });

  it("keeps create_escrow_v2 aligned with stake/stats/pricing accounts", () => {
    const create = instruction("create_escrow_v2");

    expect(create.accounts.map((account) => account.name)).toEqual([
      "depositor",
      "agent",
      "agent_stake",
      "agent_stats",
      "pricing_menu",
      "escrow",
      "system_program",
    ]);
    expect(create.args.map((arg) => arg.name)).toEqual([
      "escrow_nonce",
      "price_per_call",
      "max_calls",
      "initial_deposit",
      "expires_at",
      "volume_curve",
      "token_mint",
      "token_decimals",
      "settlement_security",
      "dispute_window_slots",
      "co_signer",
      "arbiter",
    ]);
  });

  it("keeps agent lifecycle builders aligned with pricing/global accounts", () => {
    expect(instruction("register_agent").accounts.map((account) => account.name)).toEqual([
      "wallet",
      "agent",
      "agent_stats",
      "pricing_menu",
      "global_registry",
      "system_program",
    ]);
    expect(instruction("update_agent").accounts.map((account) => account.name)).toEqual([
      "wallet",
      "agent",
      "pricing_menu",
      "system_program",
    ]);
    expect(instruction("deactivate_agent").accounts.map((account) => account.name)).toEqual([
      "wallet",
      "agent",
      "agent_stats",
      "global_registry",
    ]);
    expect(instruction("reactivate_agent").accounts.map((account) => account.name)).toEqual([
      "wallet",
      "agent",
      "agent_stats",
      "global_registry",
    ]);
    expect(instruction("close_stake").accounts.map((account) => account.name)).toEqual([
      "wallet",
      "agent",
      "stake",
    ]);
  });

  it("maps legacy SDK escrow aliases to V2 nonce zero", () => {
    const agent = new PublicKey("11111111111111111111111111111112");
    const depositor = new PublicKey("11111111111111111111111111111113");

    const [legacyPda, legacyBump] = deriveEscrow(agent, depositor);
    const [v2Pda, v2Bump] = deriveEscrowV2(agent, depositor, 0);

    expect(legacyPda.toBase58()).toBe(v2Pda.toBase58());
    expect(legacyBump).toBe(v2Bump);
    expect(EscrowModule).toBe(EscrowV2Module);
  });

  it("keeps legacy Pdas aliases byte-aligned with canonical PDA helpers", () => {
    const wallet = new PublicKey("11111111111111111111111111111112");
    const depositor = new PublicKey("11111111111111111111111111111113");
    const [agent] = deriveAgent(wallet);

    expect(Pdas.getAgentPDA(wallet)[0].toBase58()).toBe(agent.toBase58());
    expect(Pdas.getAgentStatsPDA(agent)[0].toBase58()).toBe(deriveAgentStats(agent)[0].toBase58());
    expect(Pdas.getPricingMenuPDA(agent)[0].toBase58()).toBe(derivePricingMenu(agent)[0].toBase58());
    expect(Pdas.getAgentStakePDA(agent)[0].toBase58()).toBe(deriveStake(agent)[0].toBase58());
    expect(Pdas.getEscrowV2PDA(agent, depositor, 0)[0].toBase58()).toBe(
      deriveEscrowV2(agent, depositor, 0)[0].toBase58(),
    );
  });

  it("does not default Escrow V2 or CLI escrow creation to SelfReport", () => {
    const x402 = readPackageFile("src/registries/x402.ts");
    const cliEscrow = readPackageFile("cli/src/commands/escrow.ts");

    expect(x402).toContain("opts.settlementSecurity ?? 2");
    expect(cliEscrow).toContain('.option("--settlement-security <mode>"');
    expect(cliEscrow).not.toContain("settlementSecurity: 0");
    expect(cliEscrow).not.toContain("disputeWindowSlots: new BN(0)");
  });

  it("documents and serializes USDC V2 escrow args with nonce/token fields", () => {
    const create = instruction("create_escrow_v2");
    expect(create.args.map((arg) => arg.name)).toEqual([
      "escrow_nonce",
      "price_per_call",
      "max_calls",
      "initial_deposit",
      "expires_at",
      "volume_curve",
      "token_mint",
      "token_decimals",
      "settlement_security",
      "dispute_window_slots",
      "co_signer",
      "arbiter",
    ]);

    const docs = readPackageFile("docs/05-x402-payments.md");
    expect(docs).toContain("micro-USDC");
    expect(docs).toContain("tokenDecimals: 6");
    expect(docs).toContain("nonce: 0");
    expect(docs).toContain("settlementSecurity: 2");
  });

  it("keeps active skills/docs free of V1 escrow recipes and stale params", () => {
    const activeDocs = [
      "skills/sap-client/SKILL.md",
      "skills/sap-mcp/SKILL.md",
      "docs/05-x402-payments.md",
    ].map((file) => [file, readPackageFile(file)] as const);
    const banned = [
      "createEscrow(",
      "depositEscrow(",
      "settleEscrow(",
      "withdrawEscrow(",
      "settlementSecurity: 0",
      "agentPubkey",
      "280 tools",
    ];

    for (const [file, text] of activeDocs) {
      for (const pattern of banned) {
        expect(text, `${file} contains stale pattern ${pattern}`).not.toContain(pattern);
      }
      expect(text).toContain("sap_payments_call_paid_tool");
    }

    const skillText = listMarkdownFiles("skills")
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(skillText).not.toContain("settlementSecurity: 0");
    expect(skillText).not.toContain("agentPubkey");
    expect(skillText).not.toContain("280 tools");
    expect(skillText).not.toContain('findToolsByCategory("swap")');
  });

  it("separates hosted SAP MCP paid tools from generic HTTP x402 sign-and-retry flow", () => {
    const docs = readPackageFile("docs/05-x402-payments.md");

    expect(docs).toContain("sap_payments_call_paid_tool");
    expect(docs).toContain("status !== 402");
    expect(docs).toContain("signChallengeLocally");
    expect(docs).toContain("PAYMENT-SIGNATURE");
    expect(docs).toContain("Do not imply hosted SAP MCP tools can call arbitrary HTTP x402 endpoints");
  });
});
