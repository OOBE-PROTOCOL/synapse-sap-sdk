/**
 * Wire-format regression tests — byte-exact encoding of struct-bearing args.
 *
 * Root cause this guards (Krexa field report, 2026-08-29):
 *   @coral-xyz/anchor's Program constructor camelizes the IDL and builds its
 *   BorshCoder from THAT (program/index.js:103-112), while src/idlTypes.ts
 *   used to expose snake_case fields. Users following idlTypes.ts passed
 *   `protocol_id` — an unknown key to the coder — which was silently
 *   dropped: capability metadata went on-chain EMPTY with no error.
 *   Caught only by asserting exact byte lengths.
 *
 * These tests pin exact encoded byte deltas for every instruction whose args
 * embed defined structs, on the SAME code path integrators use
 * (Program.methods + idlTypes). Any future type/coder drift breaks the build
 * instead of shipping empty metadata to mainnet.
 *
 * Borsh layout facts (empirically pinned against @coral-xyz/anchor 0.30.1):
 *   Option<T>:  None = 1B (0x00), Some = 1B (0x01) + size(T)  => delta = size(T)
 *   string:     4B LE length + N bytes
 *   Vec<T>:     4B LE length + Σ size(T)
 *   Unit enum:  1B discriminant; value form is a case-SENSITIVE camelized
 *               variant-tag object ({ usdc: null }) — the bare string "Usdc"
 *               throws "unable to infer src variant". Canonical SDK constants
 *               (src/types/enums.ts) use { variant: {} } and encode identically.
 *   Anchor 0.30 Program ctor is (idl, provider?) — programId comes from
 *   idl.address; passing (idl, programId, provider) silently treats
 *   programId as the provider and breaks the account namespace.
 */
import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import rawIdl from "../idl/synapse_agent_sap.json";
import type { Capability, PricingTier } from "../idlTypes";
import { TokenType } from "../types/enums";

const idl = rawIdl as unknown as Idl;

// Deterministic provider — encoder only, no network I/O ever attempted.
const connection = { getEndpoint: () => "http://127.0.0.1:1" } as never;
const payer = Keypair.generate();
const provider = new AnchorProvider(
  connection,
  {
    publicKey: payer.publicKey,
    signTransaction: async () => ({}),
    signAllTransactions: async (t: unknown) => t,
  } as never,
  {},
);
const program = new Program(idl, provider);

const REGISTER_ACCOUNTS = {
  wallet: payer.publicKey,
  agent: PublicKey.default,
  agentStats: PublicKey.default,
  pricingMenu: PublicKey.default,
  globalRegistry: PublicKey.default,
};

const baseCap: Capability = {
  id: "predict:sports",
  description: "Sports predictions",
  protocolId: "polymarket",
  version: "1.0.0",
};

const tier: PricingTier = {
  tierId: "standard",
  pricePerCall: new BN(100_000),
  minPricePerCall: null,
  maxPricePerCall: null,
  rateLimit: 60,
  maxCallsPerSession: 1000,
  burstLimit: null,
  tokenType: TokenType.Usdc, // canonical constant ({ usdc: {} }) — same wire form as { usdc: null }
  tokenMint: null,
  tokenDecimals: 6,
  settlementMode: { x402: null },
  minEscrowDeposit: null,
  batchIntervalSec: null,
  volumeCurve: null,
};

async function registerLen(caps: Capability[], pricing: PricingTier[] = []): Promise<number> {
  const ix = await program.methods
    .registerAgent("name", "desc", caps, pricing, [], null, null, null)
    .accounts(REGISTER_ACCOUNTS)
    .instruction();
  return ix.data.length;
}

async function updateAgentLen(capabilities: Capability[] | null): Promise<number> {
  const ix = await program.methods
    .updateAgent(null, null, capabilities as never, null, null, null, null, null)
    .accounts({
      wallet: payer.publicKey,
      agent: PublicKey.default,
      agentStats: PublicKey.default,
      globalRegistry: PublicKey.default,
    })
    .instruction();
  return ix.data.length;
}

describe("IDL/coder shape — the Krexa bug class", () => {
  it("coder-visible Capability fields are camelCase (source of truth)", () => {
    const p = program as unknown as {
      _idl: { types: Array<{ name: string; type: { fields: Array<{ name: string }> } }> };
    };
    const t = p._idl.types.find((x) => x.name.toLowerCase() === "capability");
    expect(t, "capability type present in program _idl").toBeTruthy();
    expect(t!.type.fields.map((f) => f.name)).toEqual(["id", "description", "protocolId", "version"]);
  });

  it("snake_case payload is silently DROPPED by the coder (the Krexa bug, made observable)", async () => {
    // Passing protocol_id encodes EXACTLY like protocolId: null — the unknown
    // key vanishes without error. Documented here; the @ts-expect-error test
    // below makes the payload class unshippable at compile time.
    const snakeLen = await registerLen([
      { id: "a:b", description: null, protocol_id: "polymarket", version: null } as unknown as Capability,
    ]);
    const noneLen = await registerLen([{ id: "a:b", description: null, protocolId: null, version: null }]);
    expect(snakeLen).toBe(noneLen); // dropped!
  });

  it("camelCase protocolId reaches the wire (+14 for 'polymarket')", async () => {
    const none = await registerLen([{ id: "a:b", description: null, protocolId: null, version: null }]);
    const some = await registerLen([{ id: "a:b", description: null, protocolId: "polymarket", version: null }]);
    // Option<string>: Some adds tag(1) + len(4) + payload(10); None is 1B => delta 4+10.
    expect(some - none).toBe(4 + 10);
  });

  it("snake_case no longer compiles against idlTypes (compile-time guard)", () => {
    // @ts-expect-error — the exact payload class Krexa shipped must NEVER typecheck.
    const snake: Capability = { id: "a:b", description: null, protocol_id: "polymarket", version: null };
    void (snake as unknown as Record<string, unknown>)["protocol_id"];
  });
});

describe("wire format — Capability fields", () => {
  it("description Some vs None: delta exactly 4+N", async () => {
    const none = await registerLen([{ id: "a:b", description: null, protocolId: null, version: null }]);
    const some = await registerLen([{ id: "a:b", description: "12345", protocolId: null, version: null }]);
    expect(some - none).toBe(4 + 5);
  });

  it("version Some vs None: delta exactly 4+N", async () => {
    const none = await registerLen([{ id: "a:b", description: null, protocolId: null, version: null }]);
    const some = await registerLen([{ id: "a:b", description: null, protocolId: null, version: "9.9.9" }]);
    expect(some - none).toBe(4 + 5);
  });

  it("second capability adds exactly the full element size (id + 3 Some-options)", async () => {
    const one = await registerLen([baseCap]);
    const two = await registerLen([baseCap, { ...baseCap, id: "predict:crypto" }]);
    // element c2 = id(4+14) + Some(desc):1+4+18 + Some(protocolId):1+4+10 + Some(version):1+4+5
    expect(two - one).toBe((4 + 14) + (1 + 4 + 18) + (1 + 4 + 10) + (1 + 4 + 5));
  });
});

describe("wire format — PricingTier", () => {
  it("tierId length drives exactly +1 byte per character", async () => {
    const one = await registerLen([], [{ ...tier, tierId: "a" }]);
    const two = await registerLen([], [{ ...tier, tierId: "ab" }]);
    expect(two - one).toBe(1);
  });

  it("min/max price Some vs None: 8 bytes each (Option<u64>)", async () => {
    const none = await registerLen([], [{ ...tier, minPricePerCall: null, maxPricePerCall: null }]);
    const some = await registerLen([], [{ ...tier, minPricePerCall: new BN(1), maxPricePerCall: new BN(2) }]);
    expect(some - none).toBe(2 * 8);
  });

  it("volumeCurve Some([]) vs None: +4 (vec length prefix)", async () => {
    const none = await registerLen([], [{ ...tier, volumeCurve: null }]);
    const empty = await registerLen([], [{ ...tier, volumeCurve: [] }]);
    expect(empty - none).toBe(4);
  });

  it("token_type enum encodes as a single byte regardless of variant", async () => {
    const usdc = await registerLen([], [{ ...tier, tokenType: TokenType.Usdc }]);
    const sol = await registerLen([], [{ ...tier, tokenType: TokenType.Sol }]);
    expect(usdc).toBe(sol);
  });

  it("SDK enum constants and literal null-tag objects encode IDENTICALLY", async () => {
    const viaConstant = await registerLen([], [{ ...tier, tokenType: TokenType.Usdc }]);
    const viaLiteral = await registerLen([], [{ ...tier, tokenType: { usdc: null } as never }]);
    expect(viaConstant).toBe(viaLiteral);
  });
});

describe("wire format — update_agent Option wrappers", () => {
  it("capabilities Some(vec[cap]) vs None: +4 vec prefix + cap size", async () => {
    const none = await updateAgentLen(null);
    const some = await updateAgentLen([{ id: "a:b", description: null, protocolId: null, version: null }]);
    // cap = id(4+3) + 3 × Option-none(1) = 10
    expect(some - none).toBe(4 + 10);
  });
});

describe("wire format — create_escrow_v2 volume_curve", () => {
  const ESCROW_ACCOUNTS = {
    depositor: payer.publicKey,
    agent: PublicKey.default,
    agentStake: PublicKey.default,
    agentStats: PublicKey.default,
    pricingMenu: PublicKey.default,
    escrow: PublicKey.default,
  };

  async function escrowLen(curveLen: 0 | 1): Promise<number> {
    const curve = Array.from({ length: curveLen }, (_, i) => ({
      afterCalls: new BN(100 + i),
      pricePerCall: new BN(90_000 - i),
    }));
    const ix = await program.methods
      .createEscrowV2(
        new BN(1),          // escrowNonce
        new BN(100_000),    // pricePerCall
        new BN(1000),       // maxCalls
        new BN(1_000_000),  // initialDeposit
        new BN(0),          // expiresAt
        curve as never,     // volumeCurve
        null,               // tokenMint
        6,                  // tokenDecimals
        2,                  // settlementSecurity
        new BN(10),         // disputeWindowSlots
        null,               // coSigner
        null,               // arbiter
      )
      .accounts(ESCROW_ACCOUNTS)
      .instruction();
    return ix.data.length;
  }

  it("each VolumeCurveBreakpoint contributes exactly 4(u32)+8(u64) bytes", async () => {
    const zero = await escrowLen(0);
    const one = await escrowLen(1);
    expect(one - zero).toBe(4 + 8);
  });
});