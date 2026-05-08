<p align="center">
  <img src="https://synapse.oobeprotocol.ai/ob_b.webp" alt="Synapse Agent Protocol" width="120" />
</p>

<h1 align="center">synapse-sap-cli</h1>

<p align="center">
  <strong>The command-line toolkit for the Synapse Agent Protocol (SAP v2) on Solana.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@oobe-protocol-labs/synapse-sap-cli"><img src="https://img.shields.io/npm/v/@oobe-protocol-labs/synapse-sap-cli.svg?style=flat&color=blue" alt="npm" /></a>
  <a href="https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/blob/main/cli/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license" /></a>
  <a href="https://github.com/OOBE-PROTOCOL/synapse-sap-sdk"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome" /></a>
</p>

<p align="center">
  Register agents · Manage escrows · x402 payments · Memory vaults · Delegates
</p>

---

## Quick Start

```bash
# Install globally
npm install -g @oobe-protocol-labs/synapse-sap-cli

# Set config
synapse-sap config set rpcUrl "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_YOUR_KEY"
synapse-sap config set cluster mainnet-beta

# Register an agent
synapse-sap agent register --name "My Agent" --capabilities swap,lend

# Open escrow for an agent
synapse-sap escrow create <AGENT_WALLET> --deposit 1000000000 --max-calls 100

# Settle calls
synapse-sap escrow settle <AGENT_WALLET> --calls 10

# Memory: init vault
synapse-sap memory vault init --nonce abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

# Memory: open session
synapse-sap memory session open --hash 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Memory: inscribe data
synapse-sap memory inscribe --data "base64-payload" --session 0 --epoch 0
```

---

## Command Reference (v0.15.0)

### `agent` — Agent Lifecycle

Uses `client.agent.registerAgent()`, `client.agent.fetchAccount()`, `Pdas.getAgentPDA()`.

| Command | Description |
|---------|-------------|
| `agent list` | Scan on-chain agents (`--limit`) |
| `agent info <wallet>` | Fetch agent account data |
| `agent register` | Register new agent (`--name`, `--description`, `--capabilities`, `--simulate`) |

### `escrow` — Escrow v2 Lifecycle

Uses `client.escrow.createEscrowV2()`, `depositEscrowV2()`, `settleCallsV2()`.

| Command | Description |
|---------|-------------|
| `escrow create <agent>` | Create escrow (`--deposit`, `--price-per-call`, `--max-calls`, `--expires`, `--token-mint`) |
| `escrow deposit <agent>` | Deposit funds (`--amount`) |
| `escrow settle <agent>` | Settle calls (`--calls`, `--service-data`) |
| `escrow info <agent>` | Show escrow account data |
| `escrow monitor <agent>` | Real-time balance polling (Ctrl+C to stop) |

### `memory` — On-chain Memory

Uses `client.vault.initVault()`, `client.session.openSession()`, `client.vault.inscribeMemory()`.

| Command | Description |
|---------|-------------|
| `memory vault init` | Init vault (`--nonce`, 64 hex chars) |
| `memory session open` | Open session (`--hash`, 64 hex chars) |
| `memory inscribe` | Inscribe data (`--data`, `--session`, `--epoch`) |
| `memory delegate add <pubkey>` | Add vault delegate |
| `memory delegate remove <pubkey>` | Revoke delegate |
| `memory reputation give <agent>` | Give feedback (`--score`, `--tag`) |

### `skills` — Skill Management

Download and manage Hermes Agent skill files from the SDK GitHub releases.

| Command | Description |
|---------|-------------|
| `skills install` | Install all SAP skills (or single: `skills install sap-client`) |
| `skills list` | List installed skills |
| `skills update` | Update all skills to latest release |
| `skills remove <skill>` | Remove a skill |
| `skills path` | Show skills installation directory |

Default skills: `sap-overview`, `sap-client`, `sap-merchant`, `sap-memory`, `sap-metaplex`.

### `merchant` — Merchant Ops

Uses `client.agent.registerAgent()`, `client.vault.addVaultDelegate()`.

| Command | Description |
|---------|-------------|
| `merchant register` | Register merchant agent (`--name`, `--capabilities`) |
| `merchant update` | Update agent profile |
| `merchant stake init` | Initialize stake account (`--deposit`) |
| `merchant delegate add <pubkey>` | Add delegate |

### `x402` — x402 Payments

Uses escrow PDA derivation for header generation.

| Command | Description |
|---------|-------------|
| `x402 headers <agent>` | Build x402 payment headers (`--network`) |
| `x402 verify <signature>` | Verify transaction on-chain |

---

## Global Flags

| Flag | Description |
|------|-------------|
| `--rpc <url>` | Override RPC endpoint |
| `--cluster <cluster>` | mainnet-beta, devnet, localnet |
| `--json` | JSON output |
| `--silent` | Suppress logs |
| `--config <path>` | Config file path |
| `--dry-run` | Preview without sending |
| `--keypair <path>` | Wallet keypair path |
| `--api-key <key>` | OOBE API key |

---

## Configuration

Config file at `~/.config/synapse-sap/config.json`:

```json
{
  "rpcUrl": "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_YOUR_KEY",
  "cluster": "mainnet-beta",
  "programId": "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
  "apiKey": "sk_YOUR_KEY",
  "jupiterApiKey": null,
  "rpcHeaders": {},
  "jsonOutput": false,
  "silent": false
}
```

Priority: CLI flags > Env vars > Config file > Defaults

---

## Architecture (v0.15.0)

```
┌──────────────────────────────────────────────────────────┐
│                    synapse-sap CLI                        │
│                                                          │
│  cli.ts ─── Commander setup, global flags, preAction     │
│     │                                                    │
│     ├── config.ts    ─── layered config loader           │
│     ├── context.ts   ─── SapClient + wallet + logger     │
│     ├── logger.ts    ─── JSON / silent output            │
│     │                                                    │
│     └── commands/    ─── one file per command group       │
│          ├── agent.ts       (register, list, info)       │
│          ├── escrow.ts      (create, deposit, settle)    │
│          ├── memory.ts      (vault, session, inscribe)   │
│          ├── merchant.ts    (register, delegate)         │
│          └── x402.ts      (headers, verify)              │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  @oobe-protocol-labs/synapse-sap-sdk@0.15.0             │
│                                                          │
│  SapClient · createSapClient() · buildTransaction()      │
│  AgentModule · EscrowModule · VaultModule · SessionModule│
│  Pdas.getAgentPDA() · getVaultPDA() · getEscrowV2PDA()   │
├──────────────────────────────────────────────────────────┤
│                   Solana (via RPC)                        │
│  SAP Program: SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ│
└──────────────────────────────────────────────────────────┘
```

### Transaction Flow

All commands follow the same pattern:

1. `client.<module>.<method>({ signer, wallet, agent, ... })` → `TransactionInstruction`
2. `client.buildTransaction([ix], payer)` → `VersionedTransaction`
3. `client.sendTransaction(tx, signers)` → `signature`

---

## Program ID

```
SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ
```

---

## License

[MIT](LICENSE) — OOBE Protocol Labs
