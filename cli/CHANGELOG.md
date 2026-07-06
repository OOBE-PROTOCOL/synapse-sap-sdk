# Changelog

All notable changes to **synapse-sap-cli** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-06

First official stable release of the SAP CLI, aligned with SDK `1.0.0`.

### Added

- Stable CLI release metadata for npm and GitHub release consumers.
- Help text and banners aligned to the SAP `1.0.0` commerce release.
- `agent close` and `agent close-stake` commands for normal agent closure and
  legacy closed-agent StakePDA recovery.

### Changed

- Aligned CLI package version with SDK `1.0.0`.
- Updated the CLI SDK dependency range to `^1.0.0`.
- Updated README references and command metadata to the SAP `1.0.0` release.

### Fixed

- Removed stale V2 settlement receipt arguments from CLI escrow settlement
  builders.
- Replaced stale placeholder PDA derivations with canonical v1.0.0 accounts for
  agent registration, merchant registration, escrow V2, x402, and memory flows.
- Kept CLI settlement flows aligned with the canonical V2 IDL:
  `settle_calls_v2` uses 5 base accounts and `create_pending_settlement` uses
  4 arguments.

### Validation

- Verified CLI build with `npm --prefix cli run build`.

## [0.20.0] - 2026-06-08

### Changed

- Aligned CLI package version with SDK `0.20.0`.
- Updated the CLI SDK dependency range to `^0.20.0`.
- Switched CLI compilation to Node16-compatible ESM output.
- Added explicit `.js` extensions to local CLI imports so the compiled package runs correctly in native Node ESM.
- Updated CLI help text, README version references, and package metadata to `0.20.0`.

### Fixed

- Fixed CLI build compatibility with the SDK `exports` map introduced in `0.20.0`.
- Fixed runtime compatibility with ESM-only dependencies such as `chalk` and `ora`.
- Fixed runtime compatibility with `@coral-xyz/anchor` CommonJS exports by importing Anchor through its default export where the CLI needs `BN`.
- Fixed analytics context initialization by exposing the protocol treasury wallet through CLI context.

### Validation

- Verified CLI build with `npm --prefix cli run build`.
- Verified runtime startup with `node cli/dist/cli.js --help`.

## [0.18.0-rc.0] — 2026-05-23 — CLI PRO: Revenue Edition

### 🎉 Major Release — Professional CLI with Revenue Features

First production-ready CLI with complete revenue model integration, professional UI components, and advanced analytics.

### Added

#### Revenue Features
- **Treasury Integration** — Auto-collection of protocol fees to `J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P`
- **Fee Transparency** — All fee amounts displayed in help text and command output
- **Revenue Analytics** — New `analytics` command group for treasury tracking
  - `synapse-sap analytics revenue` — Revenue breakdown by fee type
  - `synapse-sap analytics treasury --watch` — Real-time treasury monitoring

#### Professional UI Components
- **ASCII Banner** — Custom "SAP-CLIENT" banner with violet (#9333EA) and aqua (#06B6D4) colors
- **Animated Banners** — Rainbow, ocean, fire, matrix, sunset color schemes
- **Loading Animations** — Typewriter effects, progress bars, spinners
- **Status Messages** — Color-coded success, error, warning, info, tip messages
- **Fee Display Tables** — Formatted revenue breakdown tables
- **Transaction Animations** — Multi-stage transaction confirmation feedback

#### Command Groups (11 groups, 50+ subcommands)

- **`analytics`** (NEW) — `revenue`, `treasury`
  Real-time revenue tracking and treasury wallet monitoring
  
- **`agent`** — Enhanced with revenue fees
  - `register` — Now displays 0.1 SOL fee
  - `close` — Now displays 0.05 SOL fee
  - All commands show treasury wallet

- **`escrow`** — Enhanced with settlement fees
  - `settle` — Now displays 0.5% fee
  - Fee calculation in output

- **`merchant`** — Enhanced with revenue features
  - `register` — Fee display
  - `settle` — Fee calculation
  - Treasury integration

- **`indexing`** — Featured listings
  - `feature` — 1 SOL fee display

- **`memory`** — On-chain memory systems
- **`skills`** — AI agent skills orchestration
- **`plugin`** — SynapseAgentKit plugins (110 tools)
- **`doctor`** — Enhanced diagnostics
- **`env`** — Environment management
- **`config`** — Configuration management
- **`x402`** — Payment flows

#### SDK Integration
- **@oobe-protocol-labs/synapse-sap-sdk ^0.18.0** — Revenue edition
- **TREASURY_WALLET constant** — Auto-included in all fee-collecting methods
- **Auto treasury inclusion** — No code changes required for developers

### Changed

- **Version bump** — 0.6.0 → 0.18.0 (aligned with SDK)
- **SDK dependency** — ^0.6.0 → ^0.18.0
- **Help text** — Enhanced with revenue fees and treasury info
- **Command output** — Now includes fee amounts and treasury wallet
- **UI/UX** — Professional color scheme and animations

### Technical Details

- **Package size**: 44.8 kB (compressed) / 221.3 kB (uncompressed)
- **Total files**: 64
- **Published**: npm (prerelease tag)
- **Build**: TypeScript strict mode, ESM + CJS dual format

### Migration Notes

- **No breaking changes** — All existing commands continue to work
- **Fee transparency** — Fees are now displayed in output (auto-collected)
- **Treasury wallet** — Visible in all relevant commands
- **Analytics** — New command group for revenue tracking

### Known Issues

- Analytics revenue breakdown uses simplified estimation (will be enhanced with Geyser streaming in next release)
- Treasury watch mode requires manual Ctrl+C to stop

---

## [0.6.0] — 2026-03-28

### 🎉 Initial Public Release

First standalone release of the Synapse Agent Protocol CLI toolkit.

### Added

#### Core Infrastructure
- **Standalone package** — extracted from `synapse-sap-sdk` monorepo into its own
  repository with `@oobe-protocol-labs/synapse-sap-sdk ^0.6.0` as external npm dependency.
- **Configuration system** — layered config with CLI flags > env vars > config file
  (`~/.config/synapse-sap/config.json`) > defaults. Multi-profile support.
- **Structured logging** — JSON output mode (`--json`), silent mode (`--silent`),
  file-based log persistence, table formatting.
- **Artifact persistence** — automatic tmp directory for saving command outputs,
  API responses, manifests, and diagnostic reports.
- **Plugin architecture** — scaffold, install, validate, and list plugins that extend
  CLI functionality.

#### Command Groups (10 groups, 40+ subcommands)

- **`agent`** — `list`, `info`, `tools`, `health`, `register`
  Full agent lifecycle management with filtering, endpoint validation, and dry-run
  registration.

- **`discovery`** — `scan`, `validate`, `cache`
  Network-wide agent scanning, x402 endpoint validation, and local discovery cache.

- **`escrow`** — `open`, `deposit`, `withdraw`, `close`, `dump`, `list`, `monitor`
  Complete escrow lifecycle including real-time balance polling.

- **`x402`** — `headers`, `call`, `sign`, `verify`, `settle`, `replay`
  End-to-end x402 payment flows with retry logic, response saving, and artifact
  replay.

- **`tools`** — `manifest generate`, `manifest validate`, `typify`, `publish`,
  `compare`, `doc`
  Tool manifest generation from on-chain data, TypeScript type generation, and
  automatic markdown documentation.

- **`env`** — `init`, `check`, `keypair show`, `keypair generate`, `keypair import`
  Environment bootstrapping with `.env` templates (full/devnet), secret redaction,
  and vanity keypair grinding.

- **`config`** — `show`, `set`, `edit`, `reset`, `path`
  CLI configuration management with `$EDITOR` integration.

- **`doctor`** — `run`
  8-point diagnostic suite: Node version, SDK version, env vars, keypair health,
  RPC connectivity + latency, fallback RPC, program deployment, disk space.

- **`tmp`** — `list`, `cat`, `diff`, `clean`, `archive`
  Artifact management with filtering, jq-style paths, line-by-line diffs, age-based
  cleanup, and tar.gz archival.

- **`plugin`** — `list`, `install`, `create`, `validate`
  Plugin ecosystem with npm-based installation and full project scaffolding.

#### Developer Experience
- 14 global flags for maximum flexibility.
- `--dry-run` mode across all write operations.
- OOBE Protocol RPC first-class support.
- Comprehensive `--help` for every command and subcommand.
- Zod-based input validation for all structured inputs.

### Infrastructure
- `.editorconfig`, `.prettierrc` for consistent code style.
- `CONTRIBUTING.md` with branch strategy, coding standards, and PR guidelines.
- Architecture documentation in `docs/`.

---

## [Unreleased]

_Nothing yet — contributions welcome!_

---

[Unreleased]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.20.0...HEAD
[0.20.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.19.8...v0.20.0
[0.18.0-rc.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.15.0...v0.18.0-rc.0
[0.6.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-cli/releases/tag/v0.6.0
