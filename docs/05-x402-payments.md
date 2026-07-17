# x402 Payments

SDK: `@oobe-protocol-labs/synapse-sap-sdk`
Program: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`

SAP uses Escrow V2 for agent commerce. V1 escrow instructions are not public 1.x flows and should not appear in new examples.

Amounts are always in the smallest unit of the escrow token:
- SOL: lamports
- USDC: micro-USDC

## Escrow V2 Parameters

`client.x402.preparePayment()` exposes the V2 fields used by the on-chain program:

| Field | Meaning |
|---|---|
| `nonce` | Escrow nonce. Defaults to `0`. |
| `pricePerCall` | Price per call in the smallest token unit. |
| `maxCalls` | Maximum funded calls, or `0` for unlimited. |
| `deposit` | Initial deposit in the smallest token unit. |
| `expiresAt` | Unix timestamp, or `0` for no expiry. |
| `volumeCurve` | Optional price curve. |
| `tokenMint` | `null` for SOL, USDC mint for USDC. |
| `tokenDecimals` | `9` for SOL, `6` for USDC. |
| `settlementSecurity` | `1` for CoSigned, `2` for DisputeWindow. Never default to `0`. |
| `disputeWindowSlots` | Required for DisputeWindow. |
| `coSigner` | Required for CoSigned. |
| `arbiter` | Reserved/optional IDL field. |

`settlementSecurity=0` / SelfReport is deprecated and rejected by the SDK before signing.

## USDC-First Commerce Example

```ts
import { AnchorProvider } from "@coral-xyz/anchor";
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

For SOL, use `tokenMint: null`, `tokenDecimals: 9`, and lamport amounts.

## Settlement

Agents settle served calls through V2:

```ts
const receipt = await client.x402.settle(depositorWallet, 5, servicePayloadHash, {
  nonce: 0,
  priorityFeeMicroLamports: 5_000,
  computeUnits: 100_000,
});
```

The SDK includes the treasury account automatically for SOL fees and the treasury ATA automatically for USDC fees.

For `DisputeWindow`, `settle_calls_v2` creates the `PendingSettlement` PDA atomically. Do not call the old standalone pending-settlement recipe in new integrations.

## Hosted SAP MCP Paid Tools

Hosted SAP MCP paid tool calls are MCP tool calls. Use the MCP schema exactly:

```ts
await mcp.callTool("sap_payments_call_paid_tool", {
  wallet: payerWallet,
  toolName: "swap_quote",
  input: { inMint, outMint, amount },
});
```

This flow is for SAP MCP-hosted paid tools only.

## Generic HTTP x402 Endpoints

Generic HTTP x402 endpoints use a separate HTTP challenge/sign/retry flow:

```ts
const challengeRes = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(input),
});

if (challengeRes.status !== 402) {
  throw new Error(`Expected HTTP 402 challenge, got ${challengeRes.status}`);
}

const challenge = await challengeRes.json();
const signature = await signChallengeLocally(challenge, wallet);

const paidRes = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "PAYMENT-SIGNATURE": signature,
  },
  body: JSON.stringify(input),
});

const receipt = await paidRes.json();
```

Do not imply hosted SAP MCP tools can call arbitrary HTTP x402 endpoints unless the connected MCP schema explicitly supports that.

## Balance And Cleanup

```ts
const balance = await client.x402.getBalance(agentWallet, undefined, { nonce: 0 });
await client.x402.addFunds(agentWallet, 500_000, { nonce: 0 });
await client.x402.withdrawFunds(agentWallet, 250_000, { nonce: 0 });
await client.x402.closeEscrow(agentWallet, { nonce: 0 });
```

Close succeeds only when the escrow has zero free balance and no pending settlement/dispute state.
