# synapse-sap CLI — Power Edition

> Complete toolbox for the Synapse Agent Protocol (SAP v2) on Solana.

## Installation

```bash
cd cli && npm install && npm run build
# link globally:
npm link
```

## Quick Start

```bash
# Setup environment
synapse-sap env init --template devnet
synapse-sap env check

# Generate a keypair
synapse-sap env keypair generate --out keys/my-agent.json

# Diagnostics
synapse-sap doctor run --quick

# List agents
synapse-sap agent list --active --protocol kamiyo

# Inspect an agent
synapse-sap agent info <WALLET> --fetch-tools --fetch-endpoints

# Health check
synapse-sap agent health <WALLET>
```

## Command Reference

### `agent` — Agent Lifecycle

| Command | Description |
|---------|-------------|
| `agent list` | List registered agents (`--active`, `--capability`, `--protocol`, `--search`) |
| `agent info <wallet>` | Full agent profile (`--fetch-tools`, `--fetch-endpoints`) |
| `agent tools <wallet>` | List tools published by an agent (`--category`, `--schema`) |
| `agent health <wallet>` | Ping endpoints, check escrow status (`--timeout`, `--retries`) |
| `agent register` | Register new agent from manifest or inline (`--manifest`, `--name`, `--simulate`) |

### `discovery` — Network Scanning

| Command | Description |
|---------|-------------|
| `discovery scan` | Scan the SAP network (`--limit`, `--sort`, `--output`, `--index`) |
| `discovery validate` | Validate agent endpoints (`--wallet`, `--all`, `--concurrency`) |
| `discovery cache` | Manage local discovery cache (`write`, `read`, `clear`) |

### `escrow` — Escrow Lifecycle

| Command | Description |
|---------|-------------|
| `escrow open <wallet>` | Create escrow (`--token`, `--mint`, `--deposit`, `--max-calls`, `--expires`) |
| `escrow deposit <wallet>` | Top up escrow (`--amount`) |
| `escrow withdraw <wallet>` | Withdraw funds (`--amount`) |
| `escrow close <wallet>` | Close and reclaim (`--force`) |
| `escrow dump <wallet>` | Display full escrow state (`--raw`) |
| `escrow list` | List all escrows for current wallet |
| `escrow monitor <wallet>` | Real-time balance polling |

### `x402` — Payment Flows

| Command | Description |
|---------|-------------|
| `x402 headers <wallet>` | Generate x402 payment headers (`--network`, `--output`) |
| `x402 call <wallet> <tool>` | End-to-end x402 call (`--args`, `--endpoint`, `--retries`, `--save`) |
| `x402 sign` | Sign a payment payload with current keypair |
| `x402 verify <signature>` | Verify a settlement transaction |
| `x402 settle <wallet>` | Agent-side settlement (`--calls`, `--service`) |
| `x402 replay <artifact>` | Replay a saved x402 call artifact |

### `tools` — Manifest & Schema

| Command | Description |
|---------|-------------|
| `tools manifest generate <wallet>` | Generate typed manifest from on-chain data (`--out`, `--include-schema`) |
| `tools manifest validate <file>` | Validate a manifest file |
| `tools typify <manifest>` | Generate TypeScript types from manifest (`--out`, `--format`) |
| `tools publish <manifest>` | Publish tool manifest to on-chain registry |
| `tools compare <walletA> <walletB>` | Diff capabilities between two agents |
| `tools doc <wallet>` | Auto-generate documentation (`--format`, `--out`) |

### `env` — Environment

| Command | Description |
|---------|-------------|
| `env init` | Generate .env from template (`--force`, `--template full\|devnet`) |
| `env check` | Validate environment variables (`--show-secrets`) |
| `env keypair show` | Display public key from configured keypair (`--as base58\|json`) |
| `env keypair generate` | Generate new Solana keypair (`--out`, `--vanity`) |
| `env keypair import <source>` | Import keypair from file/base58 (`--out`) |

### `config` — Configuration

| Command | Description |
|---------|-------------|
| `config show` | Display merged config (`--raw`) |
| `config set <key> <value>` | Set a config value |
| `config edit` | Open config in $EDITOR |
| `config reset` | Reset to defaults (`--confirm`) |
| `config path` | Print config file path |

### `doctor` — Diagnostics

| Command | Description |
|---------|-------------|
| `doctor run` | Run all diagnostic checks (`--quick`, `--save`) |

Checks: Node version, SDK version, env vars, keypair permissions, disk usage, RPC connectivity, fallback RPC, program deployment.

### `tmp` — Artifact Management

| Command | Description |
|---------|-------------|
| `tmp list` | List artifacts (`--sort`, `--filter`, `--older-than`) |
| `tmp cat <file>` | Print artifact contents (`--jq`, `--head`, `--tail`) |
| `tmp diff <a> <b>` | Diff two artifacts |
| `tmp clean` | Remove artifacts (`--older-than`, `--all`, `--dry-run`) |
| `tmp archive` | Compress artifacts (`--out`, `--older-than`, `--remove`) |

### `plugin` — Plugin System

| Command | Description |
|---------|-------------|
| `plugin list` | List built-in and installed plugins (`--installed`) |
| `plugin install <name>` | Install from npm (`--dev`) |
| `plugin create <name>` | Scaffold a new plugin project (`--template`) |
| `plugin validate <dir>` | Validate plugin project structure |

## Global Flags

| Flag | Description |
|------|-------------|
| `--rpc <url>` | Override primary RPC |
| `--fallback-rpc <url>` | Override fallback RPC |
| `--program <pubkey>` | Custom SAP program ID |
| `--cluster <cluster>` | Cluster override (mainnet-beta\|devnet\|localnet) |
| `--env-file <path>` | Custom .env file |
| `--json` | JSON output |
| `--silent` | Suppress logs |
| `--tmp-dir <path>` | Custom temp directory |
| `--config <path>` | Config file path |
| `--profile <name>` | Config profile name |
| `--dry-run` | Preview without sending transactions |
| `--fee-payer <path>` | Fee payer keypair |
| `--keypair <path>` | Wallet keypair path |

## Configuration

Config file: `~/.config/synapse-sap/config.json`

```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "cluster": "mainnet-beta",
  "programId": "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
  "tmpDir": "/tmp/synapse-sap",
  "jsonOutput": false,
  "silent": false
}
```

Priority: CLI flags > env vars > config file > defaults.
