# Contributing to @oobe-protocol-labs/synapse-sap-sdk

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) v2.1.
Be respectful, constructive, and inclusive.

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Yarn | ≥ 1.22 |
| TypeScript | ≥ 5.7 |
| Solana CLI | ≥ 1.18 |
| Anchor | ≥ 0.32 |

### Setup

```bash
# Clone the repository
git clone https://github.com/OOBE-PROTOCOL/synapse-sap-sdk.git
cd synapse-sap-sdk

# Install dependencies
yarn install

# Type-check
yarn typecheck

# Build
yarn build
```

### Project Structure

```
synapse-sap-sdk/
├── src/
│   ├── index.ts               # Barrel exports (everything)
│   ├── core/
│   │   ├── client.ts          # SapClient — main entry point
│   │   ├── connection.ts      # SapConnection — RPC factory
│   │   └── index.ts
│   ├── modules/
│   │   ├── base.ts            # Abstract BaseModule
│   │   ├── agent.ts           # Agent lifecycle
│   │   ├── attestation.ts     # Web-of-trust attestations
│   │   ├── escrow.ts          # x402 micropayments
│   │   ├── feedback.ts        # Reputation feedback
│   │   ├── indexing.ts        # Discovery indexes
│   │   ├── ledger.ts          # MemoryLedger (ring buffer)
│   │   ├── tools.ts           # Tool registry + checkpoints
│   │   ├── vault.ts           # Encrypted memory vault
│   │   └── index.ts
│   ├── registries/
│   │   ├── discovery.ts       # Agent/tool discovery
│   │   ├── x402.ts            # x402 payment lifecycle
│   │   ├── session.ts         # Unified session manager
│   │   ├── builder.ts         # Fluent AgentBuilder
│   │   └── index.ts
│   ├── plugin/
│   │   ├── index.ts           # SAPPlugin (52 tools)
│   │   ├── protocols.ts       # Protocol method definitions
│   │   └── schemas.ts         # Zod validation schemas
│   ├── postgres/
│   │   ├── adapter.ts         # SapPostgres database adapter
│   │   ├── sync.ts            # SapSyncEngine (periodic + WS)
│   │   ├── schema.sql         # 22-table DDL
│   │   ├── serializers.ts     # On-chain → SQL serializers
│   │   ├── types.ts           # Row types, config
│   │   └── index.ts
│   ├── constants/
│   │   ├── programs.ts        # Program IDs per cluster
│   │   ├── seeds.ts           # PDA seed prefixes (20)
│   │   ├── limits.ts          # Size limits, enum values
│   │   └── index.ts
│   ├── pda/
│   │   └── index.ts           # 17 derive*() functions
│   ├── events/
│   │   └── index.ts           # EventParser + 45 event types
│   ├── errors/
│   │   └── index.ts           # 6 error classes
│   ├── types/
│   │   ├── accounts.ts        # 22 account interfaces
│   │   ├── common.ts          # Shared structs
│   │   ├── enums.ts           # 5 enum types
│   │   ├── instructions.ts    # 11 instruction arg DTOs
│   │   └── index.ts
│   ├── utils/
│   │   ├── hash.ts            # sha256, hashToArray
│   │   ├── validation.ts      # assert helper
│   │   ├── serialization.ts   # Account serialization
│   │   └── index.ts
│   └── idl/
│       ├── index.ts           # IDL re-exports
│       └── synapse_agent_sap.json
│       ├── attestation.ts # Web-of-trust attestations
│       ├── escrow.ts      # x402 micropayments
│       ├── feedback.ts    # Reputation feedback
│       ├── indexing.ts    # Discovery indexes
│       ├── ledger.ts      # MemoryLedger (ring buffer)
│       ├── tools.ts       # Tool registry + checkpoints
│       └── vault.ts       # Encrypted memory vault
├── dist/                  # Build output (CJS + ESM + d.ts)
├── docs/                  # SDK documentation (11 guides)
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SKILL.md               # Complete technical reference
├── LICENSE
└── README.md
```

## Development Workflow

### Type-Checking

```bash
yarn typecheck          # base tsconfig (bundler)
npx tsc -p tsconfig.cjs.json --noEmit   # CJS
npx tsc -p tsconfig.esm.json --noEmit   # ESM
```

### Building

```bash
yarn build              # CJS + ESM + declarations
yarn clean              # Remove dist/
```

### Adding a New Module

1. Create `src/modules/<name>.ts` extending `BaseModule`.
2. Export from `src/modules/index.ts`.
3. Add lazy accessor in `src/core/client.ts`.
4. Export types from `src/index.ts`.
5. Add subpath export in `package.json` `"exports"` field.
6. Update `CHANGELOG.md`.

### Adding a New PDA

1. Add the seed constant to `SEEDS` in `src/constants/seeds.ts`.
2. Add the `derive*()` function in `src/pda/index.ts`.
3. Export from `src/index.ts`.

### Adding a New Account Type

1. Add the interface to `src/types/accounts.ts`.
2. Export from `src/types/index.ts` and `src/index.ts`.

### Adding a New Registry

1. Create `src/registries/<name>.ts`.
2. Export from `src/registries/index.ts`.
3. Add lazy accessor in `src/core/client.ts`.
4. Add subpath export in `package.json`.
5. Update `SKILL.md` and `CHANGELOG.md`.

## Pull Request Process

1. **Fork & branch** — create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Implement** — follow coding standards below.

3. **Type-check** — must pass:
   ```bash
   yarn typecheck
   ```

4. **Build** — must succeed:
   ```bash
   yarn clean && yarn build
   ```

5. **Update CHANGELOG** — add entry under `[Unreleased]`.

6. **Commit** — follow commit convention (see below).

7. **Open PR** — target `main`, fill out the template.

8. **Review** — at least 1 approval required. Address all feedback.

9. **Merge** — squash and merge into `main`.

## Coding Standards

### TypeScript

- **Strict mode** — all strict flags enabled, no `// @ts-ignore`.
- **Immutable-first** — use `readonly` on interfaces, `as const` on objects.
- **Explicit return types** on public methods.
- **No `any`** except where interfacing with Anchor's untyped internals
  (always add `// eslint-disable` comments explaining why).
- **Barrel exports** — every module must be re-exported from `src/index.ts`.

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `memory-vault.ts` |
| Interfaces | PascalCase + `Data` suffix | `MemoryVaultData` |
| Enum constants | PascalCase | `ToolCategory` |
| Methods | camelCase | `fetchVaultNullable` |
| PDA functions | `derive*` prefix | `deriveVaultDelegate` |
| Instruction args | PascalCase + `Args` suffix | `CreateEscrowArgs` |

### Documentation

- JSDoc on every public function/method.
- `@param` and `@returns` for non-trivial signatures.
- Module-level `@module` and `@description` JSDoc.

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) v1.0.0:

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace |
| `refactor` | Code change (no feature/fix) |
| `perf` | Performance improvement |
| `test` | Adding/fixing tests |
| `build` | Build system changes |
| `ci` | CI config changes |
| `chore` | Housekeeping |

### Scope

Use module names: `agent`, `vault`, `escrow`, `ledger`, `pda`, `types`, `client`, etc.

### Examples

```
feat(ledger): add decodeRingBuffer utility
fix(escrow): handle zero-balance SPL withdrawal
docs(readme): add quick start example
refactor(base): extract methods getter for type safety
```

### Breaking Changes

Add `BREAKING CHANGE:` footer or `!` after scope:
```
feat(vault)!: rename initVault to createVault

BREAKING CHANGE: initVault() is now createVault() for clarity.
```

## Release Process

1. Update `CHANGELOG.md` — move `[Unreleased]` entries to new version section.
2. Bump version in `package.json`:
   ```bash
   npm version patch|minor|major
   ```
3. Tag & push:
   ```bash
   git push origin main --tags
   ```
4. Publish:
   ```bash
   yarn clean && yarn build
   npm publish --access public
   ```

---

## Questions?

Open an issue or reach out on [Discord](https://discord.gg/oobe-protocol).
