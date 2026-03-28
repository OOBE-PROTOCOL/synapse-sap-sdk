# Changelog

All notable changes to `@oobe-protocol-labs/synapse-sap-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-03-28

### Added — SDK Hardening (Kamiyo / AceDataCloud feedback)

- **Phase A — Endpoint Discovery Hardening**
  - `EndpointDescriptor`, `HealthCheckDescriptor`, `ToolManifestEntry`, `AgentManifest`, `EndpointValidationResult` types (`src/types/endpoint.ts`)
  - `validateEndpoint()`, `validateEndpointDescriptor()`, `validateHealthCheck()`, `validateAgentEndpoints()` utilities (`src/utils/endpoint-validator.ts`)
  - Fail-fast on 404, HTML responses, CSRF-required endpoints

- **Phase B — Network Normalization**
  - `normalizeNetworkId()`, `isNetworkEquivalent()`, `getNetworkGenesisHash()`, `getNetworkClusterName()`, `isKnownNetwork()` (`src/utils/network-normalizer.ts`)
  - Single source of truth for `solana:mainnet-beta` vs `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` equivalence

- **Phase C — RPC Strategy & Error Classification**
  - `getRpcUrl()`, `getFallbackRpcUrl()`, `createDualConnection()` for dual-RPC resilience (`src/utils/rpc-strategy.ts`)
  - `findATA()` for Associated Token Account lookup
  - `classifyAnchorError()`, `extractAnchorErrorCode()` for friendly Anchor error messages (codes 6000–6019)

- **Phase D — Zod Runtime Schemas**
  - `createEnvSchema()`, `createEndpointDescriptorSchema()`, `createHealthCheckSchema()`, `createToolManifestEntrySchema()`, `createAgentManifestSchema()`, `createPreparePaymentSchema()`, `createRegisterAgentSchema()`, `createCallArgsSchema()`, `validateOrThrow()` (`src/utils/schemas.ts`)
  - Zod v4 compatible (peer dependency)

### Added — CLI (Power Edition)

- **`synapse-sap` CLI** (`cli/`) — 10 command groups, 40+ subcommands
  - `agent` — list, info, tools, health, register
  - `discovery` — scan, validate, cache
  - `escrow` — open, deposit, withdraw, close, dump, list, monitor
  - `x402` — headers, call, sign, verify, settle, replay
  - `tools` — manifest generate/validate, typify, publish, compare, doc
  - `env` — init, check, keypair show/generate/import
  - `config` — show, set, edit, reset, path
  - `doctor` — run (8 diagnostic checks: node, sdk, env, keypair, disk, rpc, fallback, program)
  - `tmp` — list, cat (jq-like), diff, clean, archive
  - `plugin` — list, install, create (scaffold), validate

### Changed

- `buildPaymentHeaders()` now uses `ctx.networkIdentifier` with proper fallback chain instead of hardcoded `"mainnet-beta"`
- All new utility exports added to main barrel (`src/index.ts`)
- Zod `z.record()` calls updated for Zod v4 (requires key + value args)

## [0.5.0] - 2026-03-27

### Added

- **SapNetwork constant** (`src/constants/network.ts`) with four x402 network identifier values: `SOLANA_MAINNET`, `SOLANA_MAINNET_GENESIS`, `SOLANA_DEVNET`, `SOLANA_DEVNET_NAMED`. Solves the genesis-hash mismatch with Kamiyo, Helius x402, and other providers that validate against `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` instead of `solana:mainnet-beta`.
- **`SapNetworkId` type** -- Union of all known `SapNetwork` values; accepts custom strings where needed.
- **`networkIdentifier` field on `PreparePaymentOptions`** -- Optional `SapNetworkId | string` to pin the x402 network at escrow creation time.
- **`networkIdentifier` field on `PaymentContext`** -- Persisted value so subsequent `buildPaymentHeaders(ctx)` calls automatically use the correct network without re-specifying it.
- **`skills/` directory** with two comprehensive developer guides:
  - `skills/merchant.md` -- Full merchant/seller skill guide covering agent registration, pricing, tool publishing, discovery indexing, settlement, memory, attestations, metrics, events, plugin adapter, PostgreSQL mirror, dual-role pattern, and complete type reference.
  - `skills/client.md` -- Full client/consumer skill guide covering agent discovery, x402 payment flow, header building, escrow management, cost estimation, feedback, attestations, ledger reading, transaction parsing, events, dual-role pattern, and complete type reference.

### Changed

- **`buildPaymentHeaders()`** -- Resolution order for `X-Payment-Network` is now: (1) `opts.network` per-call override, (2) `ctx.networkIdentifier` persisted at escrow creation, (3) `SapNetwork.SOLANA_MAINNET` fallback. The `opts.network` parameter type widened from `string` to `SapNetworkId | string`.
- **`buildPaymentHeadersFromEscrow()`** -- Network parameter default changed from `"mainnet-beta"` to `SapNetwork.SOLANA_MAINNET`. Parameter type widened to `SapNetworkId | string`.
- **`preparePayment()`** -- Now accepts optional `networkIdentifier` and persists it in the returned `PaymentContext`.

## [0.4.2] - 2026-03-26

### Added

- **Transaction parser module** (`src/parser/`) with 7 source files for full on-chain transaction decoding.
  - `parseSapInstructionsFromTransaction` - Decode SAP instructions from a raw `TransactionResponse` (RPC `getTransaction`). Handles both legacy and versioned (v0) messages with address lookup table support.
  - `parseSapInstructionsFromList` - Decode SAP instructions from a pre-built `TransactionInstruction[]`.
  - `parseSapTransactionComplete` - Full parse combining instruction decode, inner CPI instruction decode, and event extraction from transaction logs into a single `ParsedSapTransaction` result.
  - `parseSapTransactionBatch` - Batch processing for indexer pipelines.
  - `decodeInnerInstructions` - Reconstruct full public keys from compiled inner instruction indices and decode CPI calls targeting the SAP program.
  - `extractAccountKeys` - Extract the full ordered account key list from both legacy and versioned transaction formats.
  - `containsSapInstruction` - Fast pre-filter check before committing to a full decode pass.
  - `filterSapInnerInstructions` - Filter decoded inner instructions to SAP-only calls.
  - `TransactionParser` - OOP wrapper that binds the Anchor `Program` once for repeated parse calls.
- **`SapClient.parser`** accessor - Lazy singleton `TransactionParser` instance on the core client.
- **Subpath export** `@oobe-protocol-labs/synapse-sap-sdk/parser` for direct deep imports.
- **Types** - `DecodedSapInstruction`, `DecodedInnerInstruction`, `ParsedSapTransaction`, `ParseFilterOptions`, `SapInstructionCoder`, `CompiledInner`, `InnerInstructionGroup`.

## [0.2.1] - 2025-07-13

### Added

- **SKILL.md** — Comprehensive technical reference (23 sections) covering all SDK modules, constants, enums, PDA derivation, code examples, and integration with `synapse-client-sdk`.
- **.env.example** — Environment variable template for RPC, wallet, PostgreSQL, sync engine, and logging.
- **CONTRIBUTING.md** — Updated project structure to reflect current modular architecture (11 directories, 37+ source files).

### Changed

- Updated CHANGELOG to use correct package name and GitHub URLs.

## [0.2.0] - 2025-07-13

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

## [0.1.0] - 2025-03-09

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

[Unreleased]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.4.1...v0.4.2
[0.2.1]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/releases/tag/v0.1.0
