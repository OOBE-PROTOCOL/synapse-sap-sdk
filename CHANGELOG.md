# Changelog

All notable changes to `@oobe-protocol-labs/synapse-sap-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] — 2025-07-13

### Added

- **SKILL.md** — Comprehensive technical reference (23 sections) covering all SDK modules, constants, enums, PDA derivation, code examples, and integration with `synapse-client-sdk`.
- **.env.example** — Environment variable template for RPC, wallet, PostgreSQL, sync engine, and logging.
- **CONTRIBUTING.md** — Updated project structure to reflect current modular architecture (11 directories, 37+ source files).

### Changed

- Updated CHANGELOG to use correct package name and GitHub URLs.

## [0.2.0] — 2025-07-13

### Added

- **PostgreSQL off-chain mirror** — `SapPostgres` adapter, `SapSyncEngine`, 22-table schema, 16 serializers, real-time event streaming via WebSocket.
- **Plugin adapter** — `createSAPPlugin()` with 52 tools, Zod schemas, protocol definitions for AI agent framework integration.
- **Registries** — `DiscoveryRegistry`, `X402Registry`, `SessionManager`, `AgentBuilder` for high-level workflows.
- **Modular architecture** — Restructured into 11 directories with 37+ source files (core/, modules/, registries/, plugin/, postgres/, constants/, pda/, events/, errors/, types/, utils/).
- **Subpath exports** — 20+ deep imports (`./core`, `./postgres`, `./plugin`, `./registries/*`, etc.).
- **Professional JSDoc** — Complete documentation annotations on all exported functions, classes, and types.
- **SDK documentation** — 11 markdown guides (overview, architecture, agent lifecycle, memory, x402, discovery, tools, plugin, best practices, RPC).

### Changed

- Package renamed from `@synapse-sap/sdk` to `@oobe-protocol-labs/synapse-sap-sdk`.
- Standalone decoupling — SDK works independently without monorepo structure.

## [0.1.0] — 2025-03-09

### Added

- **Core client** — `SapClient.from(provider)` / `SapClient.fromProgram(program)`.
- **AgentModule** — `register`, `update`, `deactivate`, `reactivate`, `close`, `reportCalls`, `updateReputation` + fetch helpers.
- **FeedbackModule** — `give`, `update`, `revoke`, `close` + fetch helpers.
- **IndexingModule** — capability / protocol / tool-category index CRUD with auto-hashing.
- **ToolsModule** — `publish`, `publishByName`, `inscribeSchema`, `update`, `deactivate`, `reactivate`, `close`, `reportInvocations`, session checkpoints.
- **VaultModule** — `initVault`, `openSession`, `inscribe`, `inscribeWithAccounts`, `compactInscribe`, `closeSession`, `closeVault`, `closeSessionPda`, `closeEpochPage`, `rotateNonce`, delegation (`addDelegate`, `revokeDelegate`, `inscribeDelegated`).
- **EscrowModule** — `create`, `deposit`, `settle`, `withdraw`, `close`, `settleBatch` with SPL remaining-accounts support.
- **AttestationModule** — `create`, `revoke`, `close` + fetch helpers.
- **LedgerModule** — `init`, `write`, `seal`, `close`, `decodeRingBuffer` + fetch helpers.
- **EventParser** — typed event parsing with `parseLogs()` and `filterByName()`.
- **PDA derivation** — 17 deterministic `derive*()` functions mirroring on-chain seeds.
- **Types** — fully typed interfaces for all 18 account types, 11 instruction arg DTOs, enum constants.
- **Constants** — `SAP_PROGRAM_ID`, `SEEDS`, `LIMITS`, protocol versions.
- **Utilities** — `sha256`, `hashToArray`, `assert`.
- **Dual output** — CJS + ESM with separate TypeScript declarations.
- **Subpath exports** — `@synapse-sap/sdk/agent`, `@synapse-sap/sdk/pda`, etc.
- **Strict TypeScript** — `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.

[Unreleased]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/releases/tag/v0.1.0
