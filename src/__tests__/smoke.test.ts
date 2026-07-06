import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
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
});
