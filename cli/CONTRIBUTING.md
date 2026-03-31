# Contributing to synapse-sap-cli

First off — **thank you** for considering a contribution!
Whether it's a bug fix, a new command, a plugin, or better docs, every PR makes
the Synapse Agent Protocol ecosystem stronger for everyone.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Branch Strategy](#branch-strategy)
4. [Development Workflow](#development-workflow)
5. [Project Structure](#project-structure)
6. [Adding a New Command](#adding-a-new-command)
7. [Coding Standards](#coding-standards)
8. [Commit Convention](#commit-convention)
9. [Pull Request Process](#pull-request-process)
10. [Release Process](#release-process)
11. [Plugin Development](#plugin-development)
12. [Need Help?](#need-help)

---

## Code of Conduct

We follow the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Be respectful, inclusive, and constructive. We have zero tolerance for harassment.

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| TypeScript | ≥ 5.4 |
| Solana CLI | ≥ 1.18 (optional, for keypair ops) |

### Setup

```bash
# Clone
git clone https://github.com/OOBE-PROTOCOL/synapse-sap-cli.git
cd synapse-sap-cli

# Install dependencies
npm install

# Build
npm run build

# Link globally for local testing
npm link

# Verify
synapse-sap --version
synapse-sap doctor run --quick
```

### Environment

```bash
# Bootstrap a devnet .env
synapse-sap env init --template devnet

# Or create manually
cp .env.example .env   # edit as needed
```

---

## Branch Strategy

We use a **trunk-based** model with short-lived feature branches.

```
main                ← stable, always releasable
 ├─ feat/<name>     ← new features / commands
 ├─ fix/<name>      ← bug fixes
 ├─ docs/<name>     ← documentation only
 ├─ refactor/<name> ← internal restructuring
 ├─ chore/<name>    ← deps, CI, tooling
 └─ plugin/<name>   ← plugin contributions
```

### Rules

| Rule | Details |
|------|---------|
| **Base branch** | Always branch from `main` |
| **Merge strategy** | Squash-and-merge for features; rebase for small fixes |
| **Branch lifetime** | < 1 week ideally — keep PRs small and focused |
| **Protected branch** | `main` requires passing CI + 1 review |
| **Tags** | `v0.6.0`, `v0.7.0`, etc. — created by maintainers at release time |

### Release branches

For major releases, we may create `release/v1.0` branches for stabilization.
Hotfixes go to `main` and are cherry-picked if needed.

---

## Development Workflow

```bash
# 1. Create a branch
git checkout -b feat/my-new-command

# 2. Make changes
#    Edit files under src/commands/ or src/

# 3. Build continuously
npm run build          # full build
npm run typecheck      # type-check only (fast)

# 4. Test locally
synapse-sap my-new-command --help
synapse-sap doctor run

# 5. Format
npm run format

# 6. Commit (see Commit Convention below)
git add -A
git commit -m "feat(commands): add my-new-command group"

# 7. Push and open PR
git push -u origin feat/my-new-command
```

---

## Project Structure

```
synapse-sap-cli/
├── src/
│   ├── cli.ts              # Entry point — Commander setup, global flags
│   ├── config.ts           # Layered configuration loader
│   ├── context.ts          # Execution context (connection, client, wallet)
│   ├── logger.ts           # Structured logging (JSON/table/silent)
│   └── commands/           # One file per command group
│       ├── agent.ts        # agent list | info | tools | health | register
│       ├── discovery.ts    # discovery scan | validate | cache
│       ├── escrow.ts       # escrow open | deposit | withdraw | close | …
│       ├── x402.ts         # x402 headers | call | sign | verify | settle | replay
│       ├── tools.ts        # tools manifest | typify | publish | compare | doc
│       ├── env.ts          # env init | check | keypair show|generate|import
│       ├── config-cmd.ts   # config show | set | edit | reset | path
│       ├── doctor.ts       # doctor run  (8-point diagnostics)
│       ├── tmp.ts          # tmp list | cat | diff | clean | archive
│       └── plugin.ts       # plugin list | install | create | validate
├── docs/                   # Architecture & design documentation
├── dist/                   # Compiled output (git-ignored)
├── package.json
├── tsconfig.json
├── CHANGELOG.md
├── CONTRIBUTING.md         # ← You are here
├── LICENSE
└── README.md
```

### Key architectural decisions

- **One file per command group** — each file exports a single Commander `Command`
  object. The entry point (`cli.ts`) registers all groups.
- **SDK as external dependency** — all Solana/Anchor/SAP logic lives in
  `@oobe-protocol-labs/synapse-sap-sdk`. The CLI is a thin orchestration layer.
- **Layered config** — CLI flags > env vars > config file > defaults.
  See `src/config.ts` for the merge algorithm.
- **Context pattern** — `buildContext()` in `context.ts` creates a shared
  `{ connection, client, wallet }` tuple that commands receive.

---

## Adding a New Command

### 1. Create the command file

```typescript
// src/commands/my-group.ts
import { Command } from 'commander';
import { buildContext } from '../context';
import { log, output } from '../logger';

export function registerMyGroup(program: Command): void {
  const group = program
    .command('my-group')
    .description('Short description of what this group does');

  group
    .command('subcommand')
    .description('What this subcommand does')
    .option('--flag <value>', 'Describe the flag')
    .action(async (opts) => {
      const ctx = await buildContext(program.opts());
      // ... implementation
      output(result, program.opts());
    });
}
```

### 2. Register in cli.ts

```typescript
import { registerMyGroup } from './commands/my-group';
// ... in the registration block:
registerMyGroup(program);
```

### 3. Add help text

Every command **must** have:
- A `.description()` — one line.
- `.option()` descriptions for all flags.
- `.addHelpText('after', ...)` with usage examples.

### 4. Update documentation

- Add to `README.md` command reference table.
- Add to `docs/architecture.md` if it introduces new concepts.
- Update `CHANGELOG.md` under `[Unreleased]`.

---

## Coding Standards

### TypeScript

- **Strict mode** — `strict: true` in tsconfig. No `any` unless absolutely necessary.
- **Async/await** — no raw `.then()` chains.
- **Explicit return types** on exported functions.
- **Zod** for runtime validation of external inputs (RPC responses, file contents).

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files | `kebab-case.ts` | `config-cmd.ts` |
| Functions | `camelCase` | `buildContext()` |
| Interfaces/Types | `PascalCase` | `CliConfig` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_RPC_URL` |
| Command names | `kebab-case` | `my-group subcommand` |

### Error handling

```typescript
try {
  const result = await riskyOperation();
  output(result, opts);
} catch (err: unknown) {
  log.error(`Operation failed: ${(err as Error).message}`);
  process.exit(1);
}
```

### Output

- Use `output()` from `logger.ts` — it auto-selects JSON vs table based on `--json`.
- Use `log.info()` for human-readable progress messages.
- Use `saveTmp()` for persisting artifacts.

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <short summary>
```

### Types

| Type | When |
|------|------|
| `feat` | New feature or command |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure (no behavior change) |
| `chore` | Deps, CI, tooling |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace |

### Scopes

| Scope | Covers |
|-------|--------|
| `commands` | Any file in `src/commands/` |
| `config` | `config.ts`, `context.ts` |
| `logger` | `logger.ts` |
| `cli` | `cli.ts`, global flags |
| `plugin` | Plugin system |
| `docs` | Documentation files |
| `deps` | Dependency updates |

### Examples

```
feat(commands): add agent deregister subcommand
fix(config): handle missing config directory on first run
docs(readme): add OOBE RPC setup instructions
chore(deps): bump synapse-sap-sdk to ^0.7.0
refactor(logger): extract table formatter into utility
```

---

## Pull Request Process

1. **Open a draft PR early** if you want feedback before finishing.
2. **Fill out the PR template** — describe what changed and why.
3. **Ensure the build passes**: `npm run build && npm run typecheck`.
4. **Self-review** your diff before requesting review.
5. **One approval** from a maintainer is required.
6. **Squash-and-merge** — keep `main` history clean.

### PR checklist

- [ ] Code compiles (`npm run build`)
- [ ] Types check (`npm run typecheck`)
- [ ] New commands have `--help` text with examples
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] README command table updated (if adding commands)
- [ ] No `console.log` — use `log.*` from `logger.ts`

---

## Release Process

Releases are managed by maintainers.

```bash
# 1. Update version
npm version minor          # or patch / major

# 2. Update CHANGELOG.md
#    Move [Unreleased] items under new version heading

# 3. Commit and tag
git add -A
git commit -m "chore: release v0.7.0"
git tag v0.7.0

# 4. Push
git push origin main --tags

# 5. Publish
npm publish --access public
```

### Versioning policy

| Change | Bump |
|--------|------|
| New commands, flags, features | Minor (`0.6.0` → `0.7.0`) |
| Bug/security fixes | Patch (`0.6.0` → `0.6.1`) |
| Breaking flag/output changes | Major (`0.x` → `1.0.0`) |

---

## Plugin Development

Want to extend the CLI without modifying core? Build a plugin!

```bash
# Scaffold a new plugin
synapse-sap plugin create my-plugin --template default

# Structure
my-plugin/
├── src/
│   ├── index.ts    # exports register(program: Command)
│   └── types.ts    # plugin-specific types
├── package.json     # name: synapse-sap-plugin-my-plugin
├── tsconfig.json
└── README.md
```

### Plugin naming convention

```
synapse-sap-plugin-<name>
```

Plugins are discovered via npm and registered at runtime. See `src/commands/plugin.ts`
for the loading mechanism.

---

## Need Help?

- **Issues**: [github.com/OOBE-PROTOCOL/synapse-sap-cli/issues](https://github.com/OOBE-PROTOCOL/synapse-sap-cli/issues)
- **SDK docs**: [github.com/OOBE-PROTOCOL/synapse-sap-sdk](https://github.com/OOBE-PROTOCOL/synapse-sap-sdk)
- **SAP on-chain program**: [github.com/OOBE-PROTOCOL/synapse-sap](https://github.com/OOBE-PROTOCOL/synapse-sap)
- **OOBE Protocol**: [oobeprotocol.ai](https://oobeprotocol.ai)
- **Synapse Explorer**: [synapse.oobeprotocol.ai](https://synapse.oobeprotocol.ai)

---

_Happy hacking! 🛠️_
