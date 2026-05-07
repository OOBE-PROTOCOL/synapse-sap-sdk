# Changelog

All notable changes to `@oobe-protocol-labs/synapse-sap-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.14.0] — 2026-05-05 — Defensive Pipelines: Full SAP error table + module-wide preflights + auto-bundled DisputeWindow

> **Goal**: stop the "burn fees on a guaranteed-failing tx" pattern across the
> entire SDK. Every fund-touching IX now fetches the relevant on-chain state
> and throws a typed `SapPreflightError` carrying the predicted Anchor error
> name *before* the transaction is signed.
>
> **Plus**: the historical foot-gun where DisputeWindow callers would skip
> `settleCallsV2` and call `createPendingSettlement` directly — leaving
> `escrow.pending_amount = 0` and trapping `finalizeSettlement` in a
> permanent `ArithmeticOverflow` loop — is now structurally impossible.
> `escrowV2.settle()` bundles both IXs in the same transaction.

### Added — Atomic DisputeWindow pipeline (`escrowV2.settle`)

- **`escrowV2.settle()` now auto-bundles `settleCallsV2 + createPendingSettlement`**
  in the SAME transaction whenever the escrow's `settlementSecurity` is
  `DisputeWindow`. The SDK fetches the escrow once, picks the PRE-increment
  `settlement_index`, mirrors the on-chain volume-curve math via the new
  `calculateSettleAmount` helper, and posts both IXs atomically. After this
  tx confirms, the caller only needs to wait `disputeWindowSlots` slots and
  call `finalizeSettlement(idx)`.
- **Why**: prior to v0.13.0 the 2-tx flow forced every caller to (a) call
  `settleCallsV2` first, (b) capture the emitted `settlement_index`,
  (c) call `createPendingSettlement(idx, calls, amount)` with a manually
  computed `amount` matching the on-chain volume-curve math. Skipping (a),
  reusing a stale `idx`, or miscomputing `amount` all produced orphan
  PendingSettlement PDAs that finalize would reject forever with
  `ArithmeticOverflow` (6075). Auto-bundling collapses (a)→(c) into one
  signed transaction so the foot-gun is gone.
- **Opt-out**: `settle(..., { skipAutoPending: true })` keeps the legacy
  single-IX behaviour for advanced flows that batch receipt-merkle roots
  across multiple settles.
- **Opt-in receipt root**: `settle(..., { receiptMerkleRoot })` inscribes
  a receipt-batch merkle root into the auto-bundled `createPendingSettlement`.
- **`utils/calculateSettleAmount`** — public helper: client-side mirror of
  the on-chain `calculate_settle_amount` (volume-curve walker). Handy for
  fee previews and for callers that drive `createPendingSettlement` standalone.

### Added — Shared infrastructure (`utils/anchor-errors.ts`)

- **`SAP_ERRORS`** — full table of all 147 SAP program errors (codes
  6000-6146), generated 1:1 from `programs/synapse-agent-sap/src/errors.rs`.
  Each entry: `{ code, name, msg }`.
- **`SAP_ERROR_BY_NAME`** — reverse lookup `errorName → code`.
- **`decodeAnchorError(err)`** — handles every shape of Anchor / RPC /
  simulation error in the wild: direct `code`, nested `error.errorCode.number`,
  `Error Number: 6075` strings, and raw `custom program error: 0x...` hex.
  Returns `{ code, name, msg, friendly, logs? }` or `null`.
- **`FRIENDLY_OVERRIDES`** — actionable English messages for the 30+ errors
  that callers actually hit in production (orphan settlements, stake floor,
  payment-token allowlist, dispute window, schema requirement, etc.).
- **`SapPreflightError`** — typed exception class with
  `predictedCode` / `predictedName` / `hint` fields. Always check
  `err instanceof SapPreflightError` before parsing strings.
- **`throwPredicted(name, hint?)`** — internal helper used by every module
  preflight to throw with the correct error code/friendly text.

### Added — `BaseModule` helpers

- **`requireAccountExists<T>(name, pda, { predicted, hint })`** — fetches the
  PDA, throws `SapPreflightError` with the predicted on-chain rejection if
  missing.
- **`requireAccountAbsent(name, pda, hint)`** — used before every `init`
  instruction to catch SystemProgram `Allocate: account already in use`
  (custom 0x0) before signing. Eliminates the entire class of
  "PDA collision because I reused an index/nonce" bugs across the SDK.
- **`simulateOrThrow(builder, label)`** — wraps `builder.simulate()` and
  decodes any SAP error into `SapPreflightError`. Available for callers
  who want pre-signing simulation on custom builders.

### Added — Module preflights

- **`escrow.deposit`** — verifies escrow exists, SOL/SPL token shape matches
  `splAccounts.length`, amount > 0.
- **`escrow.withdraw`** — verifies amount ≤ `escrow.balance`, token shape
  matches.
- **`escrow.close`** — verifies `escrow.balance == 0` (predicts `EscrowNotEmpty`).
- **`escrowV2.deposit`** — escrow exists, SOL/SPL token shape matches,
  amount > 0.
- **`escrowV2.withdraw`** — amount ≤ `(balance − pendingAmount)`. Catches the
  silent failure when callers try to withdraw funds locked in PendingSettlement
  PDAs.
- **`escrowV2.close`** — verifies `balance == 0` AND `pendingAmount == 0`.
  Predicts `EscrowNotClosed` and points at `diagnoseOrphanPending` for
  recovery.
- **`staking.initStake`** — `initialDeposit ≥ MIN_AGENT_STAKE_LAMPORTS`
  (0.1 SOL) AND stake PDA must not already exist.
- **`staking.deposit`** — stake exists, amount > 0.
- **`staking.requestUnstake`** — stake exists, amount > 0, amount ≤
  `(stakedAmount − MIN_AGENT_STAKE_LAMPORTS)` (enforces protocol floor),
  no double-pending unstake.
- **`staking.completeUnstake`** — stake exists, an unstake is pending, and
  the cooldown has elapsed (`now ≥ unstakeAvailableAt`).
- **`vault.addDelegate`** — `expiresAt > now`, `expiresAt ≤
  now + MAX_DELEGATE_DURATION_SECS` (365 days), `permissions != 0`,
  delegate PDA must not exist. Predicts `DelegateExpiryInvalid` /
  `DelegateExpired` / `InvalidDelegate`.
- **`tools.publish`** — non-empty / ≤32-byte tool name, both
  `inputSchemaHash` AND `outputSchemaHash` are 32 non-zero bytes (enforces
  SAP v0.2.0 schema-required hardening), tool PDA must not exist. Predicts
  `EmptyToolName` / `ToolNameTooLong` / `InvalidSchemaHash`.
- **`tools.publishByName`** — rejects empty `inputSchema` / `outputSchema`
  strings *before* hashing them (otherwise `sha256("")` would slip past
  the publish() schema-hash check).

### Why this matters

Before v0.13.0 a typo or stale value silently became:

- a wasted ~5 000 lamport base fee per failed simulation, then
- a confusing on-chain error code requiring a manual lookup in
  `errors.rs`, then
- in the worst cases (orphan PendingSettlement, dispute window) a PDA
  permanently stuck on-chain.

After v0.13.0:

- typed `SapPreflightError` with the exact predicted error name, friendly
  message, and an actionable hint pointing at the recovery path,
- zero RPC call wasted (preflights only do `getAccountInfo` reads),
- consistent shape across all modules — `try { … } catch (e) {
  if (e.preflight) handle(e.predictedName); }`.

### Migration notes

- All existing call sites continue to work; preflights only ADD pre-signing
  validation, no API surface change.
- **DisputeWindow callers**: you can (and should) DELETE your manual
  `createPendingSettlement` step. `escrowV2.settle()` now does both IXs
  in one tx. Old code keeps working but now performs the `createPending`
  step twice (once auto-bundled by `settle()`, once manually) — the manual
  one will throw `pending PDA already exists` from the v0.13.0 collision
  preflight, which is the SDK telling you to remove it.
- To keep the legacy 2-tx flow (e.g. for batched receipt-merkle aggregation),
  pass `settle(..., { skipAutoPending: true })` and continue calling
  `createPendingSettlement` manually.
- If you were swallowing errors with `try { … } catch {}`, you'll now see
  `SapPreflightError` thrown earlier with a clear message — this is intended.
- Full error table is exported: `import { SAP_ERRORS, decodeAnchorError } from
  "@oobe-protocol-labs/synapse-sap-sdk/utils"`.

## [0.12.9] — 2026-05-05 — orphan PendingSettlement preflight + diagnose helper

### Added

- **`EscrowV2Module.diagnoseOrphanPending(agent, depositor, nonce, idx)`** —
  scans a single `settlement_index` and returns `null` if the PDA is
  finalizable, or an object describing why finalize would fail (`missing`,
  `amount_exceeds_pending`, `amount_exceeds_balance`, `already_finalized`,
  `disputed`). Designed to feed a recovery / quarantine script that walks
  `0..nextSettlementIndex` and logs every orphan to skip permanently.

### Fixed

- **`EscrowV2Module.finalizeSettlement` orphan preflight** — the on-chain
  handler at `escrow_v2.rs:633` does
  `escrow.pending_amount.checked_sub(pending_settlement.amount)` and
  `escrow.balance.checked_sub(pending_settlement.amount)`. PendingSettlement
  PDAs created by callers that **skipped `settle_calls_v2`** (legacy probe
  loops) carry an `amount` that was never added to `escrow.pending_amount`,
  so finalize aborts with **ArithmeticOverflow (error 6075)** and burns the
  base fee on every retry. Such PDAs cannot be closed either
  (`close_pending_settlement` requires `is_finalized=true`).

  The SDK now fetches both the escrow and the pending PDA before signing
  finalize. If `pending.amount > escrow.pending_amount` OR
  `pending.amount > escrow.balance`, it throws a clear, actionable error
  instructing the caller to permanently skip that index. This stops the
  retry-loop fee burn observed in production sentinel logs (12+ orphan
  indices retrying every 30s).

### Notes — root cause is on-chain

The underlying program-level bug (`create_pending_settlement` accepts
arbitrary `amount`/`calls_to_settle` with no link to the preceding
`settle_calls_v2`) requires a program upgrade to fully fix. Suggested
on-chain remediations for a future release:

1. **Merge `create_pending_settlement` into `settle_calls_v2`** — the
   handler already has all required state; splitting it across two
   instructions is the source of every orphan.
2. **Add `force_close_orphan_pending_settlement`** — admin / depositor IX
   that closes a PDA where `pending.amount > escrow.pending_amount`,
   reclaiming the rent that is currently locked forever.
3. **Constrain `create_pending_settlement` amount** — require
   `pending.amount <= escrow.pending_amount` and decrement
   `escrow.pending_amount` on creation instead of on finalize.

Until one of those ships, this preflight is the only way to stop the
bleeding without a program upgrade.

## [0.12.8] — 2026-05-05 — pending-settlement collision preflight + index helper

### Added

- **`EscrowV2Module.nextSettlementIndex(agent, depositor, nonce)`** —
  reads `escrow.settlement_index` from chain. Use this (or the
  `SettlementPendingEvent.settlement_index` log from the preceding
  `settleCallsV2` tx) as the source of truth for which index to pass
  to `createPendingSettlement`. Eliminates the "always 0" /
  stale-retry-index footgun.

### Fixed

- **`EscrowV2Module.createPendingSettlement` collision preflight** —
  the pending PDA is seeded on `["sap_pending", escrow, settlement_index]`,
  so reusing the same `settlementIndex` (e.g. an orchestrator that
  always sends `0`, or retries with a stale index) causes the
  SystemProgram `Allocate: account already in use` error
  (custom 0x0) inside `CreatePendingSettlement`. The SDK now does a
  `getAccountInfo` preflight on the pending PDA and throws an
  actionable error pointing the caller to `nextSettlementIndex()`,
  saving a failed simulation/tx fee on every retry attempt of a
  duplicate index.

## [0.12.7] — 2026-05-05 — createEscrowV2 settlement-security preflight

### Added

- **`EscrowV2Module.create` settlement-security preflight** — mirrors
  the on-chain guards at `escrow_v2.rs:106-115` so callers fail fast
  with an actionable message instead of paying for a tx that aborts:
  - `settlementSecurity = 0` (SelfReport) → rejected client-side
    (deprecated since v0.7).
  - `settlementSecurity = 1` (CoSigned) requires `coSigner` to be set.
  - `settlementSecurity = 2` (DisputeWindow) requires
    **`disputeWindowSlots >= 1`** to close the **zero-window abuse
    vector**: a window of 0 slots would let the agent settle and drain
    `pending_amount` before any depositor could file a dispute,
    defeating the entire DisputeWindow security model. Recommended
    minimum: 2_160 slots (~15 min).
  - Any other `settlementSecurity` value is rejected.

## [0.12.6] — 2026-05-05 — v2 settle co-signer support

### Fixed

- **`EscrowV2Module.settle` `InvalidCoSigner` (error 6093)** —
  CoSigned escrows require the co-signer key to appear in
  `remaining_accounts` with `is_signer = true` AND to actually sign
  the transaction. The previous SDK signature only accepted
  `splAccounts` and never wired the co-signer keypair into
  `.signers([...])`, so on-chain validation at
  `escrow_v2.rs:371` always failed for CoSigned settlements.

### Changed

- `EscrowV2Module.settle` now accepts an optional
  `coSigner?: Signer` 7th argument. When provided, the SDK
  automatically (a) appends the co-signer to `remaining_accounts`
  with `isSigner: true`, and (b) registers the keypair via
  `.signers([coSigner])`. Existing callers (no `coSigner`)
  behave unchanged.
- Switched `.accounts(...)` → `.accountsPartial(...)` to bypass
  the Anchor TS resolver (same fix as v0.12.5 `settleBatch`).

## [0.12.5] — 2026-05-05 — settleBatch resolver fix + auto CU

### Fixed

- **`settleBatch` "Reached maximum depth for account resolution"** —
  Anchor TS `AccountsResolver` recursed on the v0.10 `settle_batch` IDL
  (escrow PDA seeded on `escrow.depositor`, `settlement_receipt`
  seeded on `escrow + arg(batch_root)`) and exhausted its depth budget
  before reaching a fixed point. Both `EscrowModule.settleBatch` and
  `X402Registry.settleBatch` now use `.accountsPartial(...)`, bypassing
  the resolver entirely. All PDAs are still derived deterministically
  client-side via `deriveAgent` / `deriveEscrow` / `deriveAgentStats`
  / `deriveSettlementReceipt`, so the on-chain semantics are unchanged.

### Added

- **`computeBatchSettleCu(n)`** in `utils/priority-fee` — derives a
  safe `setComputeUnitLimit` for `settle_batch` from the entry count
  (`60_000 + n * 25_000`, capped at 1.2M CU). Both `settleBatch`
  call sites auto-inject this when the caller doesn't pin
  `opts.computeUnits`. Setting the CU limit is free — it caps the
  maximum charge, it does not add lamports — so the default cost
  profile is unchanged while batches past ~8 entries no longer hit
  the 200k default ceiling.

## [0.11.0] — 2026-05-01 — FairScale Reputation Bridge

> Additive, non-breaking. Pin to SAP program **`>= 0.2.0`**.

### Summary

Introduce a first-class `FairScaleRegistry` on `SapClient` plus a public
`FAIRSCALE` constants bundle, exposing every documented endpoint of the
FairScale reputation network ([docs.fairscale.xyz](https://docs.fairscale.xyz))
and a single `aggregate(wallet, …)` method that blends SAP on-chain
reputation with FairScale's off-chain trust score into one weighted
0–100 signal.

### Motivation

- SAP's `AgentAccountData.reputationScore` is a closed-loop, on-chain
  signal: it only moves when an SAP escrow settles. It says nothing about
  an agent's behaviour outside SAP (wallet history, peer reputation,
  registry verifications, work history).
- FairScale already aggregates that off-chain context into a stable
  0–100 score with documented pillars, recommendation tiers, and
  attestations.
- Merchants, routers and dApps consuming SAP need **one number** to
  gate calls. Doing the blend inside the SDK keeps semantics consistent
  across the explorer, plugins, and third-party clients.

### Specification

#### Added

- **`registries/fairscale`** module exporting:
  - `FairScaleRegistry` — high-level client, lazy-mounted as
    `client.fairscale`.
  - `HumanScoreNamespace` — exposed as `client.fairscale.human` for the
    Human Score API (`api.fairscale.xyz`).
  - `FairScaleError extends SapError` — carries `status` (HTTP) and
    `upstreamCode` (FairScale machine code).
  - `FAIRSCALE` — frozen constants object: `AGENT_API`, `HUMAN_API`,
    `CACHE_TTL_SECONDS = 900`, `BATCH_MAX_WALLETS = 25`,
    `API_KEY_PREFIX = "zpka_"`, `X402` (USDC mint, payTo, network slug,
    `PRICE_AGENT_USDC_BASE = 5_000`, `PRICE_CREDIT_USDC_BASE = 500_000`,
    facilitator), `AGENT_TIER_RANGES`, `RISK_BAND_RANGES`,
    `PLAN_QUOTAS`, `PRESET_WEIGHTS`, `DIRECTORY_SORT_FIELDS`,
    `ERROR_CODES`. All values verified against the live docs.
- **Endpoints surfaced on `FairScaleRegistry`:**
  - `score(wallet, opts)` — `GET /v1/score`
  - `trustGate(wallet, opts)` — `GET /v1/trust-gate`
  - `scoreBatch(wallets, opts)` — `POST /v1/score/batch` with
    automatic 25-wallet chunking
  - `scoreAI(wallet, { preset | weights })` — `GET /v1/score/ai` with
    client-side validation that custom weights sum to `1.0 ± 0.02`
  - `agentProfile(wallet, opts)` — `GET /v1/agent`
  - `scoreHistory(wallet, opts)` — `GET /v1/score-history`
  - `directory(opts)` — `GET /v1/directory`
  - `leaderboard(opts)` — `GET /v1/leaderboard`
  - `credit(wallet, opts)` — `GET /v1/credit` (uses `X-Api-Key` header,
    forwards optional `x-social-identity`, serialises `nocache: boolean`
    to wire-format `0|1`)
  - `human.score(wallet, opts)` / `human.fairScore` / `human.walletScore`
    / `human.socialScore` / `human.computeScore` (force-recompute via
    `/newScore`) / `human.fairScoreOnly`
- **`aggregate(wallet, { weights, require, strict })`** — blends SAP
  `AgentAccountData.reputationScore` with FairScale `score`. Weights
  default to `{ sap: 0.5, fairscale: 0.5 }`; if one source is missing
  the other is renormalised to 1.0 and `confidence` is reduced.
  Returns `AggregatedReputation` with `combined: { score, tier
  ("low"|"medium"|"high"|"elite"), confidence (0..1), weights, notes[]
  }`.
- **`SapClient.configureFairScale(config)`** — chainable setter for
  `apiKey`, base URLs, timeout, custom `fetch` (Edge / test injection).
- **Strict types** mirroring docs 1:1: `FairScaleTier`, `FairScalePreset`,
  `FairScaleTask`, `FairScalePillars`, `FairScaleBadge` (with
  `description`+`tier`), `FairScaleAction` (`priority`, `cta`),
  `FairScaleRecommendationTier`, `FairScaleRedFlag`,
  `FairScaleVerifications`, `FairScaleMeta`, `AgentScoreResult`,
  `TrustGateResult`, `BatchScoreResult`, `DirectoryEntry`,
  `DirectoryResult`, `LeaderboardResult`, `ScoreHistoryResult`,
  full `CreditResult` (`credit_pillars`, `confidence`, `underwriting
  .lending_terms` with `identity_level: kyc|strong|said|matrica|partial
  |none`, `risk_flags`, `attestation`), `HumanScoreFeatures` (exactly
  the 15 documented features), `HumanScoreResult`,
  `AggregatedReputation`, `AggregateOptions`.

#### Changed

- `package.json` exposes the new entrypoint at
  `./registries/fairscale` for tree-shaken consumption.

### Impact

- **Bundle size:** zero impact for consumers that don't import
  `client.fairscale` (lazy singleton).
- **Network:** FairScale calls require `FAIRSCALE_API_KEY`; without
  one, `aggregate()` degrades gracefully to SAP-only and reduces
  `confidence`.
- **On-chain:** none. This release is SDK-only.

### Security Considerations

- `FAIRSCALE.X402.PAY_TO`, `USDC_MINT`, `NETWORK` and price constants
  are pinned to the documented production values; treat them as the
  source of truth and do not override unless mocking in tests.
- `aggregate()` never sends private data to FairScale beyond the
  wallet pubkey already on chain.
- The optional custom `fetch` injection is the only surface that can
  exfiltrate the API key — keep it server-side.

### Backwards Compatibility

Fully additive. Existing `0.10.x` callers compile unchanged. No
behavioural change to `escrow.*`, `staking.*`, `discovery.*`,
`metaplex.*`, or `session.*`.

### Companion Surfaces

- Explorer endpoint `GET /api/sap/agents/[wallet]/aggregate-reputation`
  consumes `client.fairscale.aggregate(...)` and powers the new
  "FairScale × SAP Aggregated Reputation" chip on every agent page.
- Partnership proposal documenting the next two collaboration tracks
  (on-chain attestation oracle + bidirectional directory feed):
  `docs/partnerships/FAIRSCALE_PARTNERSHIP_PROPOSAL.md` in the parent
  workspace.


## [0.10.1] — 2026-04-30 — Top-level export fix

### Fixed
- Top-level `index.ts` now re-exports the v0.10 hardening symbols that were
  reachable only via deep paths in `0.10.0`:
  - `deriveSettlementReceipt` (from `./pda`)
  - `computeBatchRoot` (from `./utils`)
  - `MIN_AGENT_STAKE_LAMPORTS`, `MAX_DELEGATE_DURATION_SECS`,
    `USDC_MINT_MAINNET`, `USDC_MINT_DEVNET`,
    `isAcceptedPaymentToken`, `isAcceptedUsdcMint` (from `./constants`)
- Skills documentation (`skills/merchant.md`, `skills/client.md`) updated
  with v0.10 hardening section and merchant readiness checklist.

## [0.10.0] — 2026-04-29 — Hardening Release (paired with program v0.2.0)

> **Breaking client-side changes** to `escrow.create`, `escrow.settle`,
> `escrow.settleBatch`, `escrowV2.create`, `escrowV2.settle`. Pin to
> SAP program **`>= 0.2.0`** when upgrading.

### Added

- `constants/payments`:
  - `USDC_MINT_MAINNET`, `USDC_MINT_DEVNET`
  - `MIN_AGENT_STAKE_LAMPORTS = 100_000_000n` (0.1 SOL)
  - `MAX_DELEGATE_DURATION_SECS = 365 * 86_400`
  - `isAcceptedPaymentToken(mint)` / `isAcceptedUsdcMint(mint)`
- `pda.deriveSettlementReceipt(escrow, key)` — derives the new
  `["sap_recv", escrow, key]` PDA (key = service hash for single-call
  settle, batch root for `settleBatch`).
- `utils/hash.computeBatchRoot(serviceHashes)` — sha256 over the
  concatenated 32-byte service hashes.
- `SEEDS.SETTLEMENT_RECEIPT = "sap_recv"`.

### Changed (Breaking)

- `escrow.create()` and `escrowV2.create()` now derive and pass the
  agent's `AgentStake` PDA. Throws client-side if `tokenMint` is not in
  the SOL/USDC allowlist (mirrors `PaymentTokenNotAllowed` on-chain).
- `escrow.settle()` and `escrowV2.settle()` derive and pass
  `settlementReceipt` PDA + `systemProgram`.
- `escrow.settleBatch(depositorWallet, settlements, batchRoot?, splAccounts?, opts?)`
  — new positional `batchRoot?` arg (auto-computed if omitted via
  `computeBatchRoot()`). Existing call sites passing
  `(wallet, settlements, splAccounts, opts)` MUST be updated.

### Deprecated

- `SEEDS.RECEIPT = "sap_receipt"` — superseded by `SEEDS.SETTLEMENT_RECEIPT`.

### Fixed

- `EscrowModule.create()` no longer passes a stray `agentStats` account
  that was not in the on-chain V1 `CreateEscrowAccountConstraints`.

## [0.9.3] - 2026-04-24

> **Canonical Metaplex Core Bridge release.**
> `0.9.3` supersedes and replaces `0.9.0` — same intent, complete and production-hardened.
> Versions `0.9.1` and `0.9.2` were intermediate iterations and remain on npm for history only; do not depend on them. The original `0.9.0` was unpublished and could not be re-uploaded under the same number due to npm's permanent name@version block, so the canonical release ships under `0.9.3`.

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
- **`getUnifiedProfile({ wallet?, asset?, rpcUrl, rpcHeaders? })`** — merged read (SAP `AgentAccount` + MPL Core asset + EIP-8004 JSON)
- **`verifyLink({ asset, sapAgentPda, rpcUrl, rpcHeaders? })`** — bidirectional cryptographic link check
- **`resolveAgentIdentifier({ identifier, rpcUrl, rpcHeaders? })`** — accepts SAP PDA, MPL Core asset address, or owner wallet and returns the canonical resolution
- New types: `Eip8004Registration`, `Eip8004Service`, `AttachAgentIdentityOpts`, `UpdateAgentIdentityUriOpts`, `MplAgentSnapshot`, `UnifiedProfile`, `AgentIdentifierResolution`
- Optional peer deps: `@metaplex-foundation/mpl-core` `>=1.9.0`, `@metaplex-foundation/umi-bundle-defaults` `>=0.9.0` (lazy-loaded; consumers that don't use the bridge incur zero overhead)
- Skill guide: `skills/metaplex-bridge.md`
- Doc: `docs/11-metaplex-bridge.md`
- `skills/skills.md` and `skills/merchant.md` reference the bridge

### Added — Triple-check audit & atomic register flows (post-mainnet hardening)

Production hardening after a live verification pass on mainnet (XONA agent, 2026-04-23) that revealed (1) a silent `401` on gated RPCs because umi was created without `httpHeaders` and (2) the need for atomic compose flows when callers don't already have one side of the link.

- **`tripleCheckLink({ asset, expectedOwner?, rpcUrl, rpcHeaders? })`** — three-layer link audit returning `{ mplOnChain, eip8004Json, sapOnChain, linked, ... }`. UIs can drive next-step actions from partial-pass states.
- **`buildMintAndAttachIxs(opts)`** — mint a fresh MPL Core asset and attach `AgentIdentity` in a single transaction (2 ixs). Returns `assetSecretKey: Uint8Array` for server-side partial-signing.
- **`buildRegisterSapForMplOwnerIx(opts)`** — idempotent SAP `registerAgent` for the owner of an existing MPL Core asset. Returns `{ instruction: null, alreadyRegistered: true }` when the SAP agent already exists.
- **`buildRegisterBothIxs(opts)`** — atomic 3-ix bundle (`SAP registerAgent` + `MPL create` + `AgentIdentity attach`) for callers who have neither side.
- **`rpcHeaders?: Record<string, string>`** — new optional parameter on every read method (`getUnifiedProfile`, `resolveAgentIdentifier`, `verifyLink`, `tripleCheckLink`). Internal `buildUmi(rpcUrl, rpcHeaders)` injects headers into umi's HTTP client. Required on Synapse RPC and any RPC that gates `getAsset`.
- New types: `RegisterAgentInput`, `MintAttachOpts`, `MintAttachResult`, `SapForMplOpts`, `SapForMplResult`, `RegisterBothOpts`, `RegisterBothResult`, `TripleCheckResult`.
- `skills/metaplex-bridge.md` extended with section 13 (triple-check + atomic flows + verified-live pitfall table).

### Fixed

- `MetaplexBridge.fetchMplSnapshot` no longer creates a header-less umi instance — gated RPCs (Synapse `x-api-key`) now read assets correctly. Previously, `tripleCheckLink.layers.mplOnChain` would falsely report `false` for valid assets behind authenticated RPCs.
- `getUnifiedProfile` and `resolveAgentIdentifier` propagate `rpcHeaders` through every internal fetch.

### Notes

- **Zero on-chain SAP changes.** The 8 mainnet agents continue to work unmodified; linking is expressed entirely via the MPL plugin URI plus the host-served JSON.
- **Efficiency:** every recurring operation drops from 2 tx (naive dual-on-chain design) to 1 tx.
- **Backward-compatible.** All new parameters are optional; existing callers continue to work unchanged.

## [0.9.2] - 2026-04-23 [SUPERSEDED — use 0.9.3]
## [0.9.1] - 2026-04-22 [SUPERSEDED — use 0.9.3]
## [0.9.0] - 2026-04-22 [UNPUBLISHED — replaced by 0.9.3]

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
