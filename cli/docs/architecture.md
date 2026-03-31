# synapse-sap-cli — Architecture

> Deep dive into how the CLI is structured, how data flows, and how to extend it.

---

## Table of Contents

1. [Overview](#overview)
2. [Execution Flow](#execution-flow)
3. [Module Responsibilities](#module-responsibilities)
4. [Command Registration Pattern](#command-registration-pattern)
5. [Configuration System](#configuration-system)
6. [Context & Connection](#context--connection)
7. [Output Pipeline](#output-pipeline)
8. [Error Handling](#error-handling)
9. [Artifact Lifecycle](#artifact-lifecycle)
10. [Plugin Loading](#plugin-loading)
11. [SDK Integration](#sdk-integration)
12. [Extension Points](#extension-points)

---

## Overview

The CLI follows a **thin-shell** architecture: it's a user-facing orchestration
layer that delegates all blockchain, protocol, and SDK logic to
`@oobe-protocol-labs/synapse-sap-sdk`. The CLI's job is to:

1. Parse and validate user input (Commander + Zod).
2. Build execution context (RPC connection, wallet, client).
3. Call SDK methods.
4. Format and present output (JSON, table, or silent).
5. Persist artifacts for later review.

```
User Input                           Output
   │                                    ▲
   ▼                                    │
┌─────────┐  flags/args  ┌──────────┐  │  ┌──────────┐
│Commander│─────────────▶│  Action  │──┼─▶│  Logger  │──▶ stdout
│  Parse  │              │ Handler  │  │  └──────────┘
└─────────┘              └────┬─────┘  │  ┌──────────┐
                              │        └─▶│ saveTmp  │──▶ disk
                              ▼           └──────────┘
                     ┌────────────────┐
                     │  buildContext() │
                     │  ┌────────────┐│
                     │  │SapConnection││
                     │  │  SapClient  ││
                     │  │   Wallet    ││
                     │  └────────────┘│
                     └───────┬────────┘
                             │
                             ▼
                     ┌────────────────┐
                     │   SAP SDK      │
                     │  (npm module)  │
                     └───────┬────────┘
                             │
                             ▼
                     ┌────────────────┐
                     │  Solana RPC    │
                     │ (OOBE / public)│
                     └────────────────┘
```

---

## Execution Flow

When a user runs `synapse-sap escrow open <wallet> --deposit 0.5`:

```
1.  cli.ts                    program.parse(process.argv)
2.  cli.ts preAction          load .env file, configure logger
3.  commander routing         match "escrow" → "open" subcommand
4.  escrow.ts action          async handler receives parsed options
5.  buildContext(opts)         create SapConnection + SapClient + Keypair
6.  sdk.escrow.open(...)      call SDK method (builds & sends transaction)
7.  output(result, opts)      format as JSON or table
8.  saveTmp(result)           persist to ~/.synapse-sap/tmp/
9.  process.exit(0)           clean exit
```

### preAction hook

Every command passes through a `preAction` hook in `cli.ts` that:
- Loads the `.env` file specified by `--env-file` (or default `.env`).
- Configures the logger based on `--json`, `--silent`, and `--tmp-dir`.

This ensures consistent environment setup across all 40+ subcommands.

---

## Module Responsibilities

### `cli.ts` — Entry Point

| Responsibility | Details |
|---------------|---------|
| Binary shebang | `#!/usr/bin/env node` |
| Commander program | Name, version, description |
| Global flags | 14 flags inherited by all commands |
| preAction hook | Env loading + logger config |
| Command registration | Imports and registers all 10 groups |
| Error boundary | Top-level catch for unhandled rejections |

### `config.ts` — Configuration

| Responsibility | Details |
|---------------|---------|
| `loadConfig()` | Merge layers: flags > env > file > defaults |
| `saveConfig()` | Write to `~/.config/synapse-sap/config.json` |
| `getConfigPath()` | Resolve config file path (respects `--config` flag) |
| `getConfigDir()` | Ensure config directory exists |
| `CliConfig` interface | Typed shape for all config values |

### `context.ts` — Execution Context

| Responsibility | Details |
|---------------|---------|
| `buildContext()` | Create `{ connection, client, wallet }` from config |
| `loadKeypair()` | Parse base64, JSON array, or file path into `Keypair` |
| `parseWallet()` | Distinguish pubkey string from keypair file path |

### `logger.ts` — Output

| Responsibility | Details |
|---------------|---------|
| `configureLogger()` | Set JSON/silent/file modes |
| `log.info/warn/error/debug` | Structured log levels |
| `log.json()` | Force JSON output |
| `log.table()` | Formatted table output |
| `output()` | Auto-select JSON vs table based on `--json` flag |
| `saveTmp()` | Write artifact to tmp directory |

### `commands/*.ts` — Command Groups

Each file exports a single `register*()` function:

```typescript
export function registerEscrow(program: Command): void {
  const cmd = program.command('escrow').description('...');
  cmd.command('open').action(async (opts) => { /* ... */ });
  cmd.command('deposit').action(async (opts) => { /* ... */ });
  // ...
}
```

---

## Command Registration Pattern

All command registration follows the same pattern:

```typescript
// src/commands/my-group.ts
import { Command } from 'commander';
import { buildContext } from '../context';
import { log, output, saveTmp } from '../logger';

export function registerMyGroup(program: Command): void {
  const group = program
    .command('my-group')
    .description('One-line description');

  group
    .command('subcommand')
    .description('What this does')
    .argument('<required>', 'description')
    .option('--flag <value>', 'description', 'default')
    .addHelpText('after', '\nExamples:\n  $ synapse-sap my-group subcommand ARG --flag value')
    .action(async (required, opts) => {
      const ctx = await buildContext(program.opts());
      // ... call SDK methods via ctx.client
      output(result, program.opts());
    });
}
```

Then in `cli.ts`:

```typescript
import { registerMyGroup } from './commands/my-group';
registerMyGroup(program);
```

**Rules:**
- One file per command group.
- Group command = noun (e.g., `escrow`, `agent`, `tools`).
- Subcommands = verbs (e.g., `open`, `list`, `generate`).
- All async actions use `async/await`.
- All output goes through `output()` or `log.*`.

---

## Configuration System

### Layer merge

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  CLI flags  │ >> │  Env vars   │ >> │ Config file │ >> │  Defaults   │
│ (highest)   │    │ (.env)      │    │ (~/.config/) │    │ (lowest)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Environment variables

| Variable | Maps to |
|----------|---------|
| `RPC_URL` | `rpcUrl` |
| `FALLBACK_RPC_URL` | `fallbackRpcUrl` |
| `SAP_PROGRAM_ID` | `programId` |
| `SOLANA_CLUSTER` | `cluster` |
| `WALLET_PATH` | `walletPath` |
| `PRIVATE_KEY` | `privateKey` |

### Profiles

The `--profile <name>` flag loads a namespaced config section, enabling
multi-environment configs (e.g., `--profile production` vs `--profile devnet`).

---

## Context & Connection

`buildContext()` is the bridge between CLI flags and the SDK:

```typescript
interface CliContext {
  connection: SapConnection;  // RPC connection with fallback
  client: SapClient;          // Full SAP client (all modules)
  wallet: Keypair;            // Transaction signer
}
```

The `SapConnection` from the SDK handles:
- Primary + fallback RPC with automatic retry.
- Network normalization (mainnet-beta, devnet, localnet).
- Commitment level configuration.

The `SapClient` provides access to all SDK modules:
- `client.agent.*` — agent operations
- `client.escrow.*` — escrow operations
- `client.tool.*` — tool registry
- `client.x402.*` — payment flows
- `client.discovery.*` — network scanning

---

## Output Pipeline

```
Command Result
    │
    ▼
output(data, opts)
    │
    ├── opts.json === true  →  JSON.stringify → stdout
    │
    └── opts.json === false →  log.table(data) → formatted table → stdout
    │
    └── (always)            →  saveTmp(data) → ~/.synapse-sap/tmp/
```

### JSON mode

When `--json` is passed, ALL output is valid JSON — no spinners, no colors, no
progress bars. This makes the CLI pipeable:

```bash
synapse-sap agent list --json | jq '.[0].wallet'
synapse-sap escrow dump <wallet> --json > escrow-state.json
```

### Silent mode

With `--silent`, no output is written to stdout/stderr. Artifacts are still saved
to disk. Useful in CI pipelines where you only care about the exit code.

---

## Error Handling

### Pattern

```typescript
try {
  const result = await ctx.client.escrow.open(params);
  output(result, opts);
} catch (err: unknown) {
  log.error(`Failed to open escrow: ${(err as Error).message}`);
  if (opts.verbose) log.debug(err);
  process.exit(1);
}
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (SDK, RPC, or validation failure) |
| `2` | Usage error (bad flags, missing arguments) |

### Dry-run

When `--dry-run` is active, transaction-sending commands build the transaction
but do **not** submit it. Instead, they output the serialized transaction for
inspection.

---

## Artifact Lifecycle

Artifacts are saved to `~/.synapse-sap/tmp/` (or `--tmp-dir`):

```
~/.synapse-sap/tmp/
├── escrow-open-2026-03-28T12:00:00.json
├── x402-call-generate-image-2026-03-28T12:05:00.json
├── discovery-scan-2026-03-28T12:10:00.json
└── doctor-report-2026-03-28T12:15:00.json
```

### Operations

| Command | What it does |
|---------|-------------|
| `tmp list` | List with sort/filter/age |
| `tmp cat <file>` | Print with optional jq-style path extraction |
| `tmp diff <a> <b>` | Line-by-line diff |
| `tmp clean` | Remove by age or all |
| `tmp archive` | Compress to tar.gz |
| `x402 replay <file>` | Re-execute a saved x402 call |

This enables powerful debugging workflows:
```bash
# Save a call
synapse-sap x402 call <wallet> generate --args '{}' --save

# Inspect the saved artifact
synapse-sap tmp cat x402-call-generate-*.json --jq '.response'

# Replay it
synapse-sap x402 replay x402-call-generate-*.json
```

---

## Plugin Loading

Plugins follow the npm naming convention `synapse-sap-plugin-*`.

### Discovery

```
1. Scan node_modules for packages matching synapse-sap-plugin-*
2. Require each package's main export
3. Call exported register(program) function
4. Plugin commands appear under the main CLI
```

### Plugin interface

```typescript
// synapse-sap-plugin-*/src/index.ts
import { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('my-command')
    .description('Added by my-plugin')
    .action(async () => { /* ... */ });
}
```

### Scaffolding

`synapse-sap plugin create <name>` generates a full project with:
- TypeScript setup
- Correct package name
- README template
- Type definitions

---

## SDK Integration

The CLI depends on `@oobe-protocol-labs/synapse-sap-sdk` as an **npm package**
(not a monorepo path alias). This means:

- CLI and SDK are versioned independently.
- SDK updates are pulled via `npm update`.
- The CLI can be developed and tested without the SDK source.

### Key SDK types used

| SDK Export | Used by |
|-----------|---------|
| `SapClient` | `context.ts` — main client |
| `SapConnection` | `context.ts` — RPC connection |
| `Keypair` (Solana) | `context.ts` — wallet |
| `PublicKey` (Solana) | All command files |
| Module methods | Command handlers call SDK methods |

---

## Extension Points

Want to add functionality? Here's where:

| What | Where | How |
|------|-------|-----|
| New command group | `src/commands/new-group.ts` | Create file, register in `cli.ts` |
| New subcommand | `src/commands/existing.ts` | Add `.command()` to existing group |
| New global flag | `src/cli.ts` | Add `.option()` to program |
| New config key | `src/config.ts` | Add to `CliConfig` interface + merge logic |
| New diagnostic check | `src/commands/doctor.ts` | Add check to the checks array |
| New plugin | `synapse-sap plugin create` | Scaffold + implement + publish |
| Custom output format | `src/logger.ts` | Extend `output()` function |

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full guide.
