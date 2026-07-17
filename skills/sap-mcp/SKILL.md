---
name: sap-mcp
description: |
  MCP integration skill for SAP MCP v0.9.x and the SAP SDK. Use when exposing
  SAP actions to agents, calling hosted SAP MCP paid tools, or wiring x402
  commerce into an MCP server.
triggers:
  - sap mcp
  - sap model context protocol
  - sap llm
  - sap paid tool
  - sap payments
---

# SAP MCP Integration

Use exact tool schemas from the connected MCP server. Never infer field names or hardcode a tool count.

Canonical public fields:
- `wallet` for owner/depositor/reader wallet inputs.
- `category` for tool category lookup.
- `tokenMint`, `tokenDecimals`, `settlementSecurity`, `disputeWindowSlots`, `coSigner`, `arbiter`, `expiresAt`, `nonce` for V2 escrow setup.

Valid category values: `Swap`, `Lend`, `Stake`, `Nft`, `Payment`, `Data`, `Governance`, `Bridge`, `Analytics`, `Custom`.

## Hosted SAP MCP Paid Tool Calls

Use this flow only for tools hosted by SAP MCP:

```ts
await mcp.callTool("sap_payments_call_paid_tool", {
  wallet: payerWallet,
  toolName: "swap_quote",
  input: {
    inMint,
    outMint,
    amount,
  },
});
```

The MCP server owns the paid-tool orchestration. Do not assume legacy paid-call aliases can call arbitrary HTTP endpoints.

## Generic HTTP x402 Endpoints

For a normal HTTP x402 endpoint, use the HTTP challenge flow:

```ts
const challengeRes = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(input),
});

if (challengeRes.status !== 402) {
  throw new Error(`Expected HTTP 402 challenge, got ${challengeRes.status}`);
}

const challenge = await challengeRes.json();
const signature = await signChallengeLocally(challenge, wallet);

const paidRes = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "PAYMENT-SIGNATURE": signature,
  },
  body: JSON.stringify(input),
});

const receipt = await paidRes.json();
```

## SDK V2 Escrow Baseline

V1 escrow is not a recommended or generated path. Do not expose MCP tools named `createEscrow`, `depositEscrow`, `settleEscrow`, `withdrawEscrow`, or `closeEscrow`.

Use `client.x402.preparePayment()` for commerce:

```ts
await client.x402.preparePayment(agentWallet, {
  nonce: 0,
  tokenMint: USDC_MINT_MAINNET,
  tokenDecimals: 6,
  pricePerCall: 10_000,
  maxCalls: 100,
  deposit: 1_000_000,
  settlementSecurity: 2,
  disputeWindowSlots: 2_160,
  coSigner: null,
  arbiter: null,
  expiresAt: 0,
});
```

Amounts are smallest token units: lamports for SOL, micro-USDC for USDC.
