<p align="center">
  <img src="https://synapse.oobeprotocol.ai/ob_b.webp" alt="Synapse Agent Protocol" width="120" />
</p>

<h1 align="center">synapse-sap-cli</h1>

<p align="center">
  <strong>The complete command-line toolkit for the Synapse Agent Protocol (SAP v2) on Solana.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@oobe-protocSol-labs/synapse-sap-cli"><img src="https://img.shields.io/npm/v/@oobe-protocol-labs/synapse-sap-cli.svg?style=flat&color=blue" alt="npm" /></a>
  <a href="https://github.com/OOBE-PROTOCOL/synapse-sap-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license" /></a>
  <a href="https://github.com/OOBE-PROTOCOL/synapse-sap-cli"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome" /></a>
  <a href="https://synapse.oobeprotocol.ai"><img src="https://img.shields.io/badge/explorer-live-purple.svg" alt="explorer" /></a>
</p>

<p align="center">
  Register agents · Manage escrows · Automate x402 payments · Publish tool manifests · Diagnose issues
</p>

---

## Why synapse-sap-cli?

Building AI agents on Solana with the Synapse Agent Protocol shouldn't require
writing boilerplate scripts for every on-chain interaction. **synapse-sap-cli**
gives you **40+ subcommands** organized in **10 command groups** that cover the
full SAP lifecycle — from keypair generation to escrow monitoring to x402 payment
replay.

- **Zero boilerplate** — one command replaces 50 lines of SDK code.
- **OOBE Protocol RPC first-class** — built-in support for the
  [OOBE RPC network](https://oobeprotocol.ai) with automatic fallback.
- **Plugin extensible** — build and distribute plugins via npm.
- **Artifact-aware** — every output can be saved, diffed, archived, and replayed.
- **Developer-first** — detailed `--help`, `--dry-run`, `--json` output on everything.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
- [Global Flags](#global-flags)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Agent Skill Guides](#agent-skill-guides)
- [Plugin System](#plugin-system)
- [OOBE Protocol RPC](#oobe-protocol-rpc)
- [Contributing](#contributing)
- [Ecosystem](#ecosystem)
- [License](#license)

---

## Installation

### From npm (recommended)

```bash
npm install -g @oobe-protocol-labs/synapse-sap-cli
```

### From source

```bash
git clone https://github.com/OOBE-PROTOCOL/synapse-sap-cli.git
cd synapse-sap-cli
npm install
npm run build
npm link
```

### Verify

```bash
synapse-sap --version     # 0.6.2
synapse-sap --help        # full command tree
synapse-sap doctor run    # 8-point diagnostic check
```

---

## Quick Start

```bash
# 1. Bootstrap environment
synapse-sap env init --template devnet
synapse-sap env check

# 2. Configure OOBE RPC
synapse-sap config set rpcUrl "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_YOUR_KEY"

# 3. Generate a keypair
synapse-sap env keypair generate --out keys/my-agent.json

# 4. List active agents
synapse-sap agent list --active --protocol kamiyo

# 5. Inspect an agent
synapse-sap agent info <AGENT_WALLET> --fetch-tools --fetch-endpoints

# 6. Open an escrow and make a payment
synapse-sap escrow open <AGENT_WALLET> --token sol --deposit 0.5
synapse-sap x402 call <AGENT_WALLET> generate-image --args '{"prompt":"sunset"}'

# 7. Monitor your escrow balance in real time
synapse-sap escrow monitor <AGENT_WALLET>
```

---

## Command Reference

### `agent` — Agent Lifecycle

| Command | Description |
|---------|-------------|
| `agent list` | List registered agents (`--active`, `--capability`, `--protocol`, `--search`) |
| `agent info <wallet>` | Full agent profile (`--fetch-tools`, `--fetch-endpoints`) |
| `agent tools <wallet>` | Discover tools by category (`--category`, `--schema`) |
| `agent health <wallet>` | Ping endpoints, check escrow/x402 status (`--timeout`, `--retries`) |
| `agent register` | Register from manifest or inline (`--manifest`, `--name`, `--simulate`) |

### `discovery` — Network Scanning

| Command | Description |
|---------|-------------|
| `discovery scan` | Scan the SAP network (`--limit`, `--sort`, `--output`, `--index`) |
| `discovery validate` | Validate agent x402 endpoints (`--wallet`, `--all`, `--concurrency`) |
| `discovery cache` | Manage local discovery cache (`write`, `read`, `clear`) |

### `escrow` — Escrow Lifecycle

| Command | Description |
|---------|-------------|
| `escrow open <wallet>` | Create escrow (`--token`, `--mint`, `--deposit`, `--max-calls`, `--expires`) |
| `escrow deposit <wallet>` | Top up escrow balance (`--amount`) |
| `escrow withdraw <wallet>` | Withdraw funds (`--amount`) |
| `escrow close <wallet>` | Close and reclaim (`--force`) |
| `escrow dump <wallet>` | Full escrow account state (`--raw`) |
| `escrow list` | List all escrows for the current wallet |
| `escrow monitor <wallet>` | Real-time balance polling (every 5s) |

### `x402` — Payment Flows

| Command | Description |
|---------|-------------|
| `x402 headers <wallet>` | Generate x402 HTTP headers (`--network`, `--output`) |
| `x402 call <wallet> <tool>` | End-to-end x402 API call (`--args`, `--endpoint`, `--retries`, `--save`) |
| `x402 sign` | Generate payment signature with current keypair |
| `x402 verify <signature>` | Verify a settlement transaction on-chain |
| `x402 settle <wallet>` | Agent-side call settlement (`--calls`, `--service`) |
| `x402 replay <artifact>` | Replay a saved x402 call from artifact file |

### `tools` — Manifest & Schema

| Command | Description |
|---------|-------------|
| `tools manifest generate <wallet>` | Generate typed manifest from on-chain data (`--out`, `--include-schema`) |
| `tools manifest validate <file>` | Structural validation of a manifest file |
| `tools typify <manifest>` | Generate TypeScript types/interfaces (`--out`, `--format`) |
| `tools publish <manifest>` | Publish manifest to on-chain tool registry |
| `tools compare <walletA> <walletB>` | Diff capabilities between two agents |
| `tools doc <wallet>` | Auto-generate markdown documentation (`--format`, `--out`) |

### `env` — Environment

| Command | Description |
|---------|-------------|
| `env init` | Generate `.env` from template (`--force`, `--template full\|devnet`) |
| `env check` | Validate env vars with secret redaction (`--show-secrets`) |
| `env keypair show` | Display public key (`--as base58\|json`) |
| `env keypair generate` | Generate Solana keypair (`--out`, `--vanity`) |
| `env keypair import <source>` | Import from file or base58 (`--out`) |

### `config` — Configuration

| Command | Description |
|---------|-------------|
| `config show` | Display merged config (`--raw` for file-only) |
| `config set <key> <value>` | Set a config value (with type coercion) |
| `config edit` | Open config in `$EDITOR` |
| `config reset` | Reset to defaults (`--confirm`) |
| `config path` | Print config file location |

### `doctor` — Diagnostics

| Command | Description |
|---------|-------------|
| `doctor run` | Run all diagnostic checks (`--quick`, `--save`) |

**Checks performed:** Node version, SDK version, environment variables, keypair
file permissions & format, RPC connectivity + latency measurement, fallback RPC,
SAP program deployment verification, disk space.

### `tmp` — Artifact Management

| Command | Description |
|---------|-------------|
| `tmp list` | List artifacts (`--sort`, `--filter`, `--older-than`) |
| `tmp cat <file>` | Print contents (`--jq`, `--head`, `--tail`) |
| `tmp diff <a> <b>` | Line-by-line diff of two artifacts |
| `tmp clean` | Remove artifacts (`--older-than`, `--all`, `--dry-run`) |
| `tmp archive` | Compress to tar.gz (`--out`, `--older-than`, `--remove`) |

### `plugin` — Plugin System

| Command | Description |
|---------|-------------|
| `plugin list` | List built-in and installed plugins (`--installed`) |
| `plugin install <name>` | Install plugin from npm (`--dev`) |
| `plugin create <name>` | Scaffold a new plugin project (`--template`) |
| `plugin validate <dir>` | Validate plugin project structure |

---

## Global Flags

Every command inherits these flags:

| Flag | Description | Example |
|------|-------------|---------|
| `--rpc <url>` | Primary RPC endpoint | `--rpc https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_...` |
| `--fallback-rpc <url>` | Fallback RPC | `--fallback-rpc https://api.mainnet-beta.solana.com` |
| `--program <pubkey>` | Custom SAP program ID | `--program SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ` |
| `--cluster <cluster>` | Cluster override | `mainnet-beta`, `devnet`, `localnet` |
| `--env-file <path>` | Custom `.env` file | `--env-file .env.production` |
| `--json` | JSON output (machine-readable) | |
| `--silent` | Suppress all log output | |
| `--tmp-dir <path>` | Custom temp directory | `--tmp-dir ./artifacts` |
| `--config <path>` | Config file path | `--config ~/.config/synapse-sap/prod.json` |
| `--profile <name>` | Config profile selector | `--profile production` |
| `--dry-run` | Preview without sending transactions | |
| `--fee-payer <path>` | Fee payer keypair path | |
| `--keypair <path>` | Wallet keypair path | |

---

## Configuration

### Config file

Located at `~/.config/synapse-sap/config.json`:

```json
{
  "rpcUrl": "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_YOUR_KEY",
  "cluster": "mainnet-beta",
  "programId": "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
  "tmpDir": "/tmp/synapse-sap",
  "jsonOutput": false,
  "silent": false
}
```

### Priority order

```
CLI flags  →  Environment variables  →  Config file  →  Defaults
(highest)                                              (lowest)
```

### Manage config

```bash
synapse-sap config show               # merged view
synapse-sap config set rpcUrl "..."    # set a value
synapse-sap config edit                # open in $EDITOR
synapse-sap config reset --confirm     # nuke and start fresh
synapse-sap config path                # print file location
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    synapse-sap CLI                        │
│                                                          │
│  cli.ts ─── Commander setup, global flags, preAction     │
│     │                                                    │
│     ├── config.ts    ─── layered config loader           │
│     ├── context.ts   ─── connection + client + wallet    │
│     ├── logger.ts    ─── JSON / table / silent output    │
│     │                                                    │
│     └── commands/    ─── one file per command group       │
│          ├── agent.ts       (5 subcommands)              │
│          ├── discovery.ts   (3 subcommands)              │
│          ├── escrow.ts      (7 subcommands)              │
│          ├── x402.ts        (6 subcommands)              │
│          ├── tools.ts       (6 subcommands)              │
│          ├── env.ts         (5 subcommands)              │
│          ├── config-cmd.ts  (5 subcommands)              │
│          ├── doctor.ts      (1 subcommand, 8 checks)    │
│          ├── tmp.ts         (5 subcommands)              │
│          └── plugin.ts      (4 subcommands)              │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  @oobe-protocol-labs/synapse-sap-sdk  (npm dependency)   │
│                                                          │
│  SapClient · SapConnection · PDA derivation · IDL        │
│  Escrow module · Tool module · Agent module · Events     │
│  x402 module · Discovery · Zod schemas · Type system     │
├──────────────────────────────────────────────────────────┤
│                   Solana (via RPC)                        │
│  SAP Program: SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ │
└──────────────────────────────────────────────────────────┘
```

### Design principles

1. **SDK as library** — the CLI is a thin orchestration layer. All Solana/Anchor/SAP
   logic lives in `@oobe-protocol-labs/synapse-sap-sdk`.
2. **One file per group** — each command file exports a single `register*()` function
   that receives the Commander `program` and attaches subcommands.
3. **Shared context** — `buildContext()` creates a `{ connection, client, wallet }`
   tuple that every command action receives.
4. **Layered config** — flags > env > file > defaults. No magic.
5. **Output contract** — `output()` auto-selects JSON or table. Artifacts saved via
   `saveTmp()` for later `tmp cat`, `tmp diff`, or `x402 replay`.

For deeper architecture details, see [docs/architecture.md](docs/architecture.md).

---

## Agent Skill Guides

The CLI is designed to work alongside the **Synapse Agent Protocol skill guides**
— reference documentation that AI agents and developers use to interact with the
SAP ecosystem programmatically.

| Guide | Focus | Link |
|-------|-------|------|
| **Client Skill Guide** | Consumer-side: discovering agents, opening escrows, making x402 payments, managing sessions | [skills/client.md](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/blob/main/skills/client.md) |
| **Merchant Skill Guide** | Provider-side: registering agents, publishing tools, settling payments, managing reputation | [skills/merchant.md](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/blob/main/skills/merchant.md) |
| **Synapse Skills Reference** | Full 28-section protocol reference covering all SAP operations, x402 flows, memory, indexing | [skills/skills.md](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/blob/main/skills/skills.md) |
| **SAP SDK Skill File** | SDK-level reference for `SapClient`, `SapConnection`, modules, PDA derivation, event parsing | [SKILL.md](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/blob/main/SKILL.md) |

### CLI ↔ Skill Guide mapping

| Agent Task | CLI Shortcut | Skill Guide |
|------------|--------------|-------------|
| Discover agents by capability | `synapse-sap agent list --capability image-gen` | Client §3 |
| Register a new agent | `synapse-sap agent register --manifest agent.json` | Merchant §2 |
| Open escrow for payments | `synapse-sap escrow open <wallet> --deposit 1.0` | Client §4 |
| Make an x402 API call | `synapse-sap x402 call <wallet> <tool> --args '{}'` | Client §5, Skills §11 |
| Settle payments (provider) | `synapse-sap x402 settle <wallet>` | Merchant §5 |
| Publish tool manifest | `synapse-sap tools publish manifest.json` | Merchant §3, Skills §8 |
| Scan the full network | `synapse-sap discovery scan --index` | Skills §17 |
| Health-check an agent | `synapse-sap agent health <wallet>` | Client §6 |
| Generate TypeScript types | `synapse-sap tools typify manifest.json --out types/` | Skills §8 |
| Run diagnostics | `synapse-sap doctor run` | — |

> **Tip for AI agent developers:** When building autonomous agents that interact
> with SAP, use the skill guides as the LLM's system prompt context and the CLI
> for rapid prototyping and debugging. The CLI's `--json` output can be piped
> directly into agent decision loops.

---

## Plugin System

Extend the CLI without modifying core code.

### Create a plugin

```bash
synapse-sap plugin create my-plugin --template default
```

This scaffolds:

```
synapse-sap-plugin-my-plugin/
├── src/
│   ├── index.ts    # exports register(program)
│   └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Install a plugin

```bash
synapse-sap plugin install synapse-sap-plugin-analytics
```

### Validate

```bash
synapse-sap plugin validate ./my-plugin
```

Plugins are discovered via npm naming convention (`synapse-sap-plugin-*`) and
registered at runtime. See [CONTRIBUTING.md](CONTRIBUTING.md#plugin-development)
for the full guide.

---

## OOBE Protocol RPC

The CLI has first-class support for the [OOBE Protocol RPC network](https://oobeprotocol.ai),
which provides optimized Solana RPC endpoints for SAP operations.

### Setup

```bash
# Via config
synapse-sap config set rpcUrl "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_YOUR_KEY"

# Via .env
echo 'RPC_URL=https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_YOUR_KEY' >> .env

# Via CLI flag (per-command)
synapse-sap agent list --rpc "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_YOUR_KEY"
```

### Available regions

| Region | Endpoint |
|--------|----------|
| US East | `https://us-1-mainnet.oobeprotocol.ai/rpc` |
| EU West | `https://eu-1-mainnet.oobeprotocol.ai/rpc` |
| AP Southeast | `https://ap-1-mainnet.oobeprotocol.ai/rpc` |

### Fallback

```bash
synapse-sap config set rpcUrl "https://us-1-mainnet.oobeprotocol.ai/rpc?api_key=sk_KEY"
synapse-sap config set fallbackRpcUrl "https://api.mainnet-beta.solana.com"
```

The SDK's `SapConnection` automatically retries on the fallback endpoint if the
primary fails.

---

## Contributing

We welcome contributions of all kinds! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Branch strategy (trunk-based with `feat/`, `fix/`, `docs/` prefixes)
- Development workflow
- Adding new commands (step-by-step guide)
- Coding standards
- Commit convention (Conventional Commits)
- PR process and checklist
- Plugin development guide
- Release process

---

## Ecosystem

| Project | Description | Link |
|---------|-------------|------|
| **synapse-sap** | On-chain SAP program (Solana/Anchor) | [GitHub](https://github.com/OOBE-PROTOCOL/synapse-sap) |
| **synapse-sap-sdk** | TypeScript SDK for SAP | [GitHub](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk) · [npm](https://www.npmjs.com/package/@oobe-protocol-labs/synapse-sap-sdk) |
| **synapse-sap-cli** | CLI toolkit (this repo) | [GitHub](https://github.com/OOBE-PROTOCOL/synapse-sap-cli) · [npm](https://www.npmjs.com/package/@oobe-protocol-labs/synapse-sap-cli) |
| **Synapse Explorer** | Web explorer for the SAP network | [synapse.oobeprotocol.ai](https://synapse.oobeprotocol.ai) |
| **OOBE Protocol** | RPC infrastructure for Solana | [oobeprotocol.ai](https://oobeprotocol.ai) |

---

## License

[MIT](LICENSE) — OOBE Protocol Labs
