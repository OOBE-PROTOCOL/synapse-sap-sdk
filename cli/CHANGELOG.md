# Changelog

All notable changes to **synapse-sap-cli** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.6.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-cli/releases/tag/v0.6.0
[Unreleased]: https://github.com/OOBE-PROTOCOL/synapse-sap-cli/compare/v0.6.0...HEAD
