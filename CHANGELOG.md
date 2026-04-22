# Changelog

All notable changes to `@oobe-protocol-labs/synapse-sap-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2026-04-22

### Added — Metaplex Core Bridge (`AgentIdentity` + EIP-8004)

Single-transaction bridge between SAP agents and Metaplex Core assets.
Built on the **real** `mpl-core` 1.9.0 surface ([PR #258](https://github.com/metaplex-foundation/mpl-core/pull/258)) — the
`AgentIdentity` external plugin adapter (one URI field) plus an EIP-8004
agent-registration JSON served live by the SAP indexer. After the initial
attach, every SAP write propagates to MPL consumers without a second
transaction.

- **`MetaplexBridge`** (`client.metaplex`) — new lazy registry singleton
- **`buildAttachAgentIdentityIx(opts)`** — single MPL ix wrapping `addExternalPluginAdapterV1` with `AgentIdentity` + `[Execute, CanApprove]` lifecycle check
- **`buildUpdateAgentIdentityUriIx(opts)`** — wraps `updateExternalPluginAdapterV1` for registry-host migration
- **`buildEip8004Registration({ sapAgentOwner, services?, extra? })`** — server-side EIP-8004 JSON builder rendered from on-chain SAP state
- **`deriveRegistrationUrl(sapAgentPda, baseUrl)`** — pure helper for the canonical `<base>/agents/<pda>/eip-8004.json` URL
- **`getUnifiedProfile({ wallet?, asset?, rpcUrl })`** — merged read (SAP `AgentAccount` + MPL Core asset + EIP-8004 JSON)
- **`verifyLink({ asset, sapAgentPda, rpcUrl })`** — bidirectional cryptographic link check
- New types: `Eip8004Registration`, `Eip8004Service`, `AttachAgentIdentityOpts`, `UpdateAgentIdentityUriOpts`, `MplAgentSnapshot`, `UnifiedProfile`
- Optional peer deps: `@metaplex-foundation/mpl-core` `>=1.9.0`, `@metaplex-foundation/umi-bundle-defaults` `>=0.9.0` (lazy-loaded; consumers that don't use the bridge incur zero overhead)
- New skill guide: `skills/metaplex-bridge.md`
- New doc: `docs/11-metaplex-bridge.md`
- Updated `skills/skills.md` and `skills/merchant.md` to reference the bridge

### Notes

- **Zero on-chain SAP changes.** The 8 mainnet agents continue to work
  unmodified; linking is expressed entirely via the MPL plugin URI plus the
  host-served JSON.
- **Efficiency:** every recurring operation drops from 2 tx (naive
  dual-on-chain design) to 1 tx.

## [0.8.0] - 2026-04-18

### Added — Trustless Receipt-Based Dispute Resolution

Receipt layer for cryptographic dispute resolution: agents inscribe merkle roots
of call receipt batches on-chain; during disputes, merkle proofs automatically
determine proportional payouts — no arbiter needed.

- **`ReceiptModule`** (`client.receipt`) — receipt batch inscriptions, merkle proof submissions, and automatic dispute resolution
- **`deriveReceiptBatch()`** PDA deriver — seeds: `["sap_receipt", escrow_v2_pda, batch_index_u32_le]`
- **`ReceiptBatchData`** account type — `merkleRoot`, `callCount`, `periodStart`, `periodEnd`, `inscribedAt`
- **`DisputeType`** enum — `NonDelivery`, `PartialDelivery`, `Overcharge`, `Quality`
- **`ResolutionLayer`** enum — `Pending`, `Auto`, `Governance`
- **`DisputeOutcome.PartialRefund`** — proportional refund based on proven vs claimed calls
- **`DisputeOutcome.Split`** — 50/50 split for irresolvable quality disputes
- **`DisputeRecordData`** extended fields: `disputeType`, `resolutionLayer`, `disputeBond`, `provenCalls`, `claimedCalls`, `proofDeadline`
- **`EscrowAccountV2Data.receiptBatchCount`** — tracks inscribed receipt batches per escrow
- **`PendingSettlementData.receiptMerkleRoot`** — merkle root backing each settlement
- **`EscrowV2Module.settleCalls()`** — new `receiptMerkleRoot` parameter (defaults to zero)
- **`EscrowV2Module.openDispute()`** — new `disputeType` parameter
- `SEEDS.RECEIPT` constant (`"sap_receipt"`)
- IDL synced to latest on-chain program
- Updated skills documentation (client, merchant, skills)

### Deprecated

- **`SettlementSecurity.SelfReport`** — returns `SelfReportDeprecated` error on-chain (abuse vector removed)
- **`EscrowV2Module.resolveDispute()`** — throws; use `ReceiptModule.submitReceiptProof()` + `ReceiptModule.autoResolveDispute()` instead
- **`DisputeRecordData.arbiter`** — arbiter role replaced by automatic receipt verification

## [0.7.0] - 2025-07-17

### Added — V2.1 Protocol: Escrow V2, Staking, Subscriptions

Full SDK support for the V2.1 on-chain protocol expansion.

- **`EscrowV2Module`** (`client.escrowV2`) — V2 escrow lifecycle: `create`, `deposit`, `settleCalls`, `withdraw`, `close`, `openDispute`, `resolveDispute`, `closeDispute`, `closePendingSettlement`
- **`StakingModule`** (`client.staking`) — agent staking: `initStake`, `deposit`, `requestUnstake`, `completeUnstake`
- **`SubscriptionModule`** (`client.subscription`) — recurring payments: `create`, `fund`, `cancel`, `close`
- **V2.1 PDA derivers**: `deriveEscrowV2`, `derivePendingSettlement`, `deriveDispute`, `deriveStake`, `deriveSubscription`, `deriveShard`, `deriveIndexPage`
- **V2.1 enums**: `SettlementSecurity` (Open/CoSigned/Arbitrated), `DisputeOutcome` (CallerWins/AgentWins/Split), `BillingInterval` (Weekly/Monthly/Quarterly/Yearly)
- **V2.1 account types**: `EscrowAccountV2Data`, `PendingSettlementData`, `DisputeRecordData`, `AgentStakeData`, `SubscriptionData`, `CounterShardData`, `IndexPageData`
- **V2.1 instruction args**: `CreateEscrowV2Args`, `CreateSubscriptionArgs`
- **X402Registry V2-aware**: `getBalance()`, `settle()`, `hasEscrow()` now auto-detect V2 escrows (V2-first, V1-fallback)
- **X402Registry `resolveEscrow()`**: returns `{ pda, version }` for explicit V1/V2 detection
- IDL synced to latest on-chain program (86 instructions, 24 accounts, 91 types)

### Deprecated

- **`EscrowModule`** → use `EscrowV2Module` (`client.escrowV2`)
- **`EscrowAccountData`** → use `EscrowAccountV2Data`
- **`CreateEscrowArgs`** → use `CreateEscrowV2Args`
- **`deriveEscrow()`** → use `deriveEscrowV2()`
- **`X402Registry.preparePayment()`** → use `client.escrowV2.create()` + `.deposit()`
- **`X402Registry.addFunds()`** → use `client.escrowV2.deposit()`
- **`X402Registry.withdrawFunds()`** → use `client.escrowV2.withdraw()`
- **`X402Registry.closeEscrow()`** → use `client.escrowV2.close()`

## [0.6.4] - 2026-04-02

### Added — Escrow Validation, Merchant Middleware & x402 Direct Payments

Modular server-side validation pipeline and x402 direct payment recognition
for merchants (Syra/Invoica) and clients.

- **`validateEscrowState()`** (`src/utils/escrow-validation.ts`) — validates escrow existence, expiry, balance, max calls, and SPL ATA existence + mint match. Returns typed `EscrowValidationResult`
- **`attachSplAccounts()`** — builds typed `SplAccountMeta[]` (`escrowAta | depositorAta | tokenMint | tokenProgram`) without manual ATA derivation
- **`toAccountMetas()`** — converts `SplAccountMeta[]` → Anchor-compatible `AccountMeta[]`
- **`MissingEscrowAtaError`** — explicit error class with `side` (`depositor | escrow`) and `ataAddress` instead of generic program crash
- **`SapMerchantValidator`** class (`src/utils/merchant-validator.ts`) — reads `X-Payment-*` headers, calls `validateEscrowState()`, auto-generates `AccountMeta[]`, throws `MissingEscrowAtaError` when SPL ATAs are missing
- **`parseX402Headers()`** — parses + validates all 8 required x402 HTTP headers into typed `ParsedX402Headers`
- **`getX402DirectPayments()`** (`src/utils/x402-direct.ts`) — scans agent ATA for x402 direct SPL transfers, filters by memo prefix (`x402:`, `SAP-x402:`), base64 JSON payload, deterministic settlement hash, or payer filter
- **Types**: `SplAccountMeta`, `EscrowValidationResult`, `ParsedX402Headers`, `MerchantValidationResult`, `X402DirectPayment`, `SettlementPayload`, `GetX402DirectOptions`
- All new exports added to barrel `src/index.ts`

## [0.6.3] - 2026-04-01

### Added — Yellowstone gRPC (Geyser) Event Streaming

Drop-in alternative to the WebSocket `connection.onLogs()` pipeline for
real-time SAP event streaming. Uses Triton / Helius / OOBE Protocol
Yellowstone-compatible gRPC endpoints with sub-second latency, automatic
reconnection, and zero missed events.

- **`GeyserEventStream` class** (`src/events/geyser.ts`) — typed EventEmitter with `logs`, `connected`, `disconnected`, `error`, `reconnecting` events
- **`GeyserConfig` interface** — `endpoint`, `token`, `commitment`, `autoReconnect`, `reconnectDelayMs`, `maxReconnectAttempts`, `includeFailedTxs`
- **`SapSyncEngine.startGeyserStream(config)`** — Yellowstone gRPC alternative to `startEventStream()` for PostgreSQL sync
- **OOBE Protocol gRPC endpoint**: `https://us-1-mainnet.oobeprotocol.ai` with API key as `x-token`
- **Optional peer dependency**: `@triton-one/yellowstone-grpc >= 1.0.0`
- Dynamic import — developers not using gRPC pay zero dependency cost
- Ping keepalive to prevent idle disconnections
- All exports added to barrel: `GeyserEventStream`, `GeyserConfig`, `GeyserStreamEvents`

## [0.6.2] - 2026-03-29

### Added — Priority Fee Support for x402 Settlement

Solves the 30-second confirmation timeout observed with Kamiyo's synchronous
x402 settlement flow.  Priority fees push settle transactions through Solana's
scheduler in ~5-10 s instead of 35-40 s at base fee.

- **`PriorityFeeConfig` interface** — `priorityFeeMicroLamports`, `computeUnits`
- **`SettleOptions` interface** — extends `PriorityFeeConfig` with `skipPreflight`, `commitment`, `maxRetries`
- **`buildPriorityFeeIxs(config)`** — returns `ComputeBudgetProgram` instructions
- **`buildRpcOptions(opts)`** — returns `{ skipPreflight, commitment, maxRetries }` for `sendTransaction`
- **Presets**: `FAST_SETTLE_OPTIONS` (5 000 µL, 100 k CU), `FAST_BATCH_SETTLE_OPTIONS` (5 000 µL, 300 k CU)
- **Constants**: `DEFAULT_SETTLE_PRIORITY_FEE`, `DEFAULT_SETTLE_COMPUTE_UNITS`, `DEFAULT_BATCH_SETTLE_COMPUTE_UNITS`
- `X402Registry.settle()` / `settleBatch()` accept optional `SettleOptions` param
- `EscrowModule.settle()` / `settleBatch()` accept optional `SettleOptions` param
- Plugin schemas (`settleEscrow`, `batchSettle`) expose `priorityFeeMicroLamports`, `computeUnits`, `skipPreflight` fields for LLM tool calls
- Plugin executor wires priority fee options through to underlying SDK methods
- All new exports added to barrel files (`src/index.ts`, `src/utils/index.ts`, `src/registries/index.ts`)

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
