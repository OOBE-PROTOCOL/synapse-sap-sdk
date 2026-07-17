---
name: sap-client
description: |
  Consumer/client skill for SAP SDK v1.0.x. Use when creating V2 escrows,
  funding SOL or USDC payments, building SAP x402 headers, checking balances,
  withdrawing funds, or filing disputes.
triggers:
  - sap consumer
  - sap depositor
  - sap x402 client
  - sap escrow v2
  - sap settlement check
---

# SAP SDK — Consumer / Client Guide

Package: `@oobe-protocol-labs/synapse-sap-sdk`
Program: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`

## Start SAP / Agent Bootstrap

1. Load `sap-overview` plus this role skill.
2. Inspect the exact SDK or MCP tool schemas before calling tools.
3. Do not assume any fixed tool count.
4. Do not guess wallet or keypair paths. Ask for the wallet/keypair path or use the wallet already provided by the runtime.
5. Use canonical field names: `wallet`, `category`, `tokenMint`, `tokenDecimals`, `settlementSecurity`, `disputeWindowSlots`, `coSigner`, `arbiter`, `expiresAt`, `nonce`.

Valid tool category values: `Swap`, `Lend`, `Stake`, `Nft`, `Payment`, `Data`, `Governance`, `Bridge`, `Analytics`, `Custom`.

## Escrow V2 Only

V1 escrow instructions are not public SDK paths. Do not generate code with `createEscrow`, `depositEscrow`, `settleEscrow`, `withdrawEscrow`, or `closeEscrow`.

Use `client.x402` for normal commerce flows and `client.escrowV2` only when you need low-level control.

Amounts are always in the smallest unit of the escrow token:
- SOL: lamports
- USDC: micro-USDC

## USDC-First x402 Commerce

```ts
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  SapClient,
  USDC_MINT_MAINNET,
} from "@oobe-protocol-labs/synapse-sap-sdk";

const client = SapClient.from(AnchorProvider.env());
const agentWallet = new PublicKey(process.env.SAP_AGENT_WALLET!);

const ctx = await client.x402.preparePayment(agentWallet, {
  nonce: 0,
  tokenMint: USDC_MINT_MAINNET,
  tokenDecimals: 6,
  pricePerCall: 10_000,       // 0.01 USDC, in micro-USDC
  maxCalls: 100,
  deposit: 1_000_000,         // 1 USDC, in micro-USDC
  settlementSecurity: 2,      // DisputeWindow
  disputeWindowSlots: 2_160,
  coSigner: null,
  arbiter: null,
  expiresAt: 0,
});

const headers = client.x402.buildPaymentHeaders(ctx);
```

SOL uses the same flow with `tokenMint: null`, `tokenDecimals: 9`, and lamport amounts.

## Hosted SAP MCP Paid Tool Calls

For SAP MCP paid tools, call the hosted MCP tool directly:

```ts
await mcp.callTool("sap_payments_call_paid_tool", {
  wallet: payerWallet,
  toolName: "swap_quote",
  input: { inMint, outMint, amount },
});
```

This is for SAP MCP-hosted paid tools only. It is not a generic HTTP x402 client.

## Generic HTTP x402 Endpoints

For arbitrary HTTP endpoints, use the endpoint's x402 challenge flow:

```ts
const first = await fetch(endpoint, { method: "POST", body: JSON.stringify(body) });
if (first.status !== 402) throw new Error(`Expected HTTP 402, got ${first.status}`);

const challenge = await first.json();
const signature = await signChallengeLocally(challenge, wallet);

const paid = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "PAYMENT-SIGNATURE": signature,
  },
  body: JSON.stringify(body),
});

const receipt = await paid.json();
```

Do not use hosted SAP MCP helpers for arbitrary HTTP endpoints unless the MCP schema explicitly says it supports that endpoint.

## Consumer Operations

```ts
await client.x402.addFunds(agentWallet, 500_000, { nonce: 0 });      // micro-USDC
await client.x402.withdrawFunds(agentWallet, 250_000, { nonce: 0 }); // micro-USDC
await client.x402.closeEscrow(agentWallet, { nonce: 0 });

const balance = await client.x402.getBalance(agentWallet, undefined, { nonce: 0 });
const escrow = await client.x402.fetchEscrow(agentWallet, undefined, { nonce: 0 });
```

For disputes in `DisputeWindow` mode, the agent settlement creates the `PendingSettlement` PDA. Use `client.escrowV2.fileDispute(...)` with the pending PDA emitted by the settlement flow.
