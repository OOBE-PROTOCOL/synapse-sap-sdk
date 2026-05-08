/**
 * @module registries/fairscale
 * @description FairScale reputation aggregation registry.
 *
 * Wraps both FairScale REST APIs:
 *   - **Agent & Credit API** (`agent-api.fairscale.xyz`) — agent trust score,
 *     trust gate, batch scoring, composable score, agent profile, score
 *     history, directory, leaderboard, credit assessment.
 *   - **Human Score API** (`api.fairscale.xyz`) — human wallet fingerprint,
 *     FairScore, on-chain features, badges.
 *
 * The killer feature is {@link FairScaleRegistry.aggregate}: it merges
 * SAP's **on-chain** reputation (`AgentAccount.reputationScore` +
 * feedback count + activity signals) with FairScale's **off-chain**
 * trust score into a single normalised, weight-tunable signal. Apps
 * therefore get a multi-source reputation rather than relying on either
 * registry alone.
 *
 * Zero runtime dependencies — uses native `fetch` (Node ≥18, browsers,
 * Edge runtimes). Auth via `fairkey` (or `X-Api-Key` for credit).
 *
 * @category Registries
 * @since v0.11.0
 *
 * @example Standalone usage (just the FairScale wrapper)
 * ```ts
 * const fs = client.fairscale;
 * const score    = await fs.score(agentWallet);
 * const allowed  = await fs.trustGate(agentWallet, { minScore: 60 });
 * const profile  = await fs.agentProfile(agentWallet);
 * const human    = await fs.human.score(userWallet);
 * ```
 *
 * @example Aggregated reputation (SAP + FairScale)
 * ```ts
 * const merged = await client.fairscale.aggregate(agentWallet, {
 *   weights: { sap: 0.4, fairscale: 0.6 },
 *   require: { sapMinFeedbacks: 1 },
 * });
 * console.log(merged.combined.score, merged.combined.tier);
 * ```
 */

import type { PublicKey } from "@solana/web3.js";
import { SapError } from "../errors";
import type { SapProgram } from "../modules/base";
import { DiscoveryRegistry, type AgentProfile } from "./discovery";

// ═══════════════════════════════════════════════════════════════════
//  Errors
// ═══════════════════════════════════════════════════════════════════

/**
 * @name FairScaleError
 * @description Thrown for any non-2xx response from a FairScale endpoint
 *   or for client-side validation failures (missing API key, invalid
 *   weights, etc.).
 * @category Errors
 * @since v0.11.0
 * @extends SapError
 */
export class FairScaleError extends SapError {
  /** HTTP status from FairScale (0 for client-side errors). */
  readonly status: number;
  /** FairScale error code from the response body, if any. */
  readonly upstreamCode?: string;

  constructor(message: string, status: number, upstreamCode?: string) {
    super(message);
    this.name = "FairScaleError";
    this.status = status;
    this.upstreamCode = upstreamCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Constants — verified against docs.fairscale.xyz
// ═══════════════════════════════════════════════════════════════════

/**
 * @name FAIRSCALE
 * @description Public, documented constants for the FairScale platform.
 *   Verified against the docs at https://docs.fairscale.xyz on 2026-04-17.
 *   Use these instead of hard-coding strings — guarantees consistency across
 *   the SDK and any consumer code.
 * @category Registries
 * @since v0.11.0
 */
export const FAIRSCALE = Object.freeze({
  /** Agent & Credit API host. */
  AGENT_API: "https://agent-api.fairscale.xyz",
  /** Human Score API host. */
  HUMAN_API: "https://api.fairscale.xyz",
  /** Default request timeout matching the official SDK (10s). */
  DEFAULT_TIMEOUT_MS: 10_000,
  /** Server-side cache TTL on every endpoint (15 min). */
  CACHE_TTL_SECONDS: 15 * 60,
  /** Max wallets per `POST /v1/score/batch` request. */
  BATCH_MAX_WALLETS: 25,
  /** API key prefix. */
  API_KEY_PREFIX: "zpka_",
  /** Default `min_score` for `/v1/trust-gate`. */
  DEFAULT_TRUST_GATE_MIN_SCORE: 40,

  /** x402 micropayment metadata (Solana mainnet). */
  X402: Object.freeze({
    /** USDC mint on Solana mainnet. */
    USDC_MINT: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    /** Wallet receiving x402 payments. */
    PAY_TO: "fairAUEuR1SCcHL254Vb3F3XpUWLruJ2a11f6QfANEN",
    /** Solana mainnet x402 network slug. */
    NETWORK: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    /** Facilitator host. */
    FACILITATOR: "https://x402.dexter.cash",
    /** Price in USDC base units (micro-USDC) per agent / trust call. */
    PRICE_AGENT_USDC_BASE: 5_000,
    /** Price in USDC base units (micro-USDC) per credit assessment. */
    PRICE_CREDIT_USDC_BASE: 500_000,
    /** Default x402 settlement timeout (seconds). */
    MAX_TIMEOUT_SECONDS: 60,
  }),

  /** Documented agent-tier ranges (inclusive). */
  AGENT_TIER_RANGES: Object.freeze({
    bronze: [0, 39],
    silver: [40, 54],
    gold: [55, 69],
    platinum: [70, 84],
    diamond: [85, 100],
  } as const),

  /** Documented credit `risk_band` ranges (inclusive). */
  RISK_BAND_RANGES: Object.freeze({
    decline: [0, 24],
    deep_subprime: [25, 44],
    subprime: [45, 59],
    near_prime: [60, 74],
    prime: [75, 100],
  } as const),

  /** Plan tiers — daily request quota / per-minute rate limit. */
  PLAN_QUOTAS: Object.freeze({
    free: { dailyRequests: 1_000, rpm: 10 },
    builder: { dailyRequests: 20_000, rpm: 100 },
    scale: { dailyRequests: 50_000, rpm: 300 },
    pro: { dailyRequests: 100_000, rpm: 600 },
  } as const),

  /** Pillar weights for `/v1/score/ai` presets, exactly as documented. */
  PRESET_WEIGHTS: Object.freeze({
    default: { verification: 0.30, wallet_history: 0.25, work_history: 0.10, network_quality: 0.25, peer_reputation: 0.10 },
    trust_focused: { verification: 0.50, wallet_history: 0.20, work_history: 0.10, network_quality: 0.10, peer_reputation: 0.10 },
    work_focused: { verification: 0.20, wallet_history: 0.15, work_history: 0.40, network_quality: 0.15, peer_reputation: 0.10 },
    defi: { verification: 0.25, wallet_history: 0.30, work_history: 0.10, network_quality: 0.25, peer_reputation: 0.10 },
    hiring: { verification: 0.35, wallet_history: 0.15, work_history: 0.25, network_quality: 0.15, peer_reputation: 0.10 },
  } as const),

  /** Allowed sort fields for `/v1/directory` and `/v1/leaderboard`. */
  DIRECTORY_SORT_FIELDS: [
    "agent_fairscore",
    "verification",
    "wallet_history",
    "work_history",
    "network_quality",
    "peer_reputation",
    "reliability",
    "track_record",
    "economic_stake",
    "ecosystem",
  ] as const,

  /** Documented machine-readable error codes. */
  ERROR_CODES: [
    "missing_wallet",
    "invalid_wallet",
    "invalid_preset",
    "weights_must_sum_to_1",
    "missing_weights",
    "too_many_wallets",
    "daily_limit_exceeded",
    "upstream_error",
  ] as const,
} as const);

// ═══════════════════════════════════════════════════════════════════
//  Types — FairScale public API
// ═══════════════════════════════════════════════════════════════════

/**
 * Agent / Human tier — documented ranges:
 * `bronze 0–39 · silver 40–54 · gold 55–69 · platinum 70–84 · diamond 85–100`.
 */
export type FairScaleTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

/** Built-in weight presets for `GET /v1/score/ai`. */
export type FairScalePreset = keyof typeof FAIRSCALE.PRESET_WEIGHTS;

/** Task profiles accepted by `/v1/score` and `/v1/trust-gate`. */
export type FairScaleTask =
  | "defi_execution"
  | "trust_focused"
  | "work_focused"
  | "hiring";

/**
 * `recommendation` block returned by `/v1/score` — qualitative tier
 * with a label and color hint for UI rendering.
 */
export type FairScaleRecommendationTier =
  | "trusted"
  | "caution"
  | "high_risk"
  | "unverified";

/** Sort fields accepted by `/v1/directory` and `/v1/leaderboard`. */
export type FairScaleDirectorySort =
  (typeof FAIRSCALE.DIRECTORY_SORT_FIELDS)[number];

/** Five agent-scoring pillars (0–100 each). */
export interface FairScalePillars {
  readonly verification: number;
  readonly wallet_history: number;
  readonly work_history: number;
  readonly network_quality: number;
  readonly peer_reputation: number;
}

/** Behavioural badge emitted by both agent and human endpoints. */
export interface FairScaleBadge {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly tier?: "bronze" | "silver" | "gold" | "platinum";
}

/** Recommended action returned by the human `/score` endpoint. */
export interface FairScaleAction {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly priority: "high" | "medium" | "low";
  readonly cta: string;
}

/** Verification flags returned in `score.signals`. */
export interface FairScaleSignals {
  readonly fairscore_base?: number;
  readonly said_score?: number;
  readonly said_trust_tier?: FairScaleTier;
  readonly attestations?: number;
  readonly is_registered?: boolean;
  readonly is_verified?: boolean;
  readonly is_said_agent?: boolean;
  readonly is_erc8004?: boolean;
  readonly [k: string]: unknown;
}

/** Description-alignment block in `/v1/score` response. */
export interface FairScaleDescriptionAlignment {
  readonly bonus: number;
  readonly label: "verified" | "partial" | "unverified" | string;
  readonly matched: ReadonlyArray<string>;
  readonly claimed: ReadonlyArray<string>;
}

/** Red flag returned in `/v1/score` response. */
export interface FairScaleRedFlag {
  readonly type: string;
  readonly reason: string;
  readonly severity?: "critical" | "warning" | "info";
}

/** Verifications block in `/v1/score` response. */
export interface FairScaleVerifications {
  readonly said_onchain?: boolean;
  readonly erc8004?: boolean;
  readonly sati?: boolean;
  readonly liveness?: boolean;
  readonly x402?: boolean;
  readonly [k: string]: boolean | undefined;
}

/** Standard response meta envelope. */
export interface FairScaleMeta {
  readonly scored_at?: string;
  readonly from_cache?: boolean;
  readonly cached?: boolean;
  readonly provider: string;
  readonly version?: string;
  readonly layer?: string;
  readonly latency_ms?: number;
  readonly amount_assessed?: number;
}

/** Response of `GET /v1/score`. */
export interface AgentScoreResult {
  readonly wallet: string;
  readonly score: number;
  readonly tier: FairScaleTier;
  readonly recommendation?: {
    readonly tier: FairScaleRecommendationTier;
    readonly label: string;
    readonly color: "green" | "yellow" | "red" | "gray" | string;
  };
  readonly pillars: FairScalePillars;
  readonly signals?: FairScaleSignals;
  readonly red_flags?: ReadonlyArray<FairScaleRedFlag>;
  readonly badges?: ReadonlyArray<FairScaleBadge>;
  readonly description_alignment?: FairScaleDescriptionAlignment;
  readonly work_history_sources?: ReadonlyArray<string>;
  readonly verifications?: FairScaleVerifications;
  readonly meta?: FairScaleMeta;
  /** Present only on per-wallet entries inside a batch response. */
  readonly error?: string;
}

/** Response of `GET /v1/trust-gate`. */
export interface TrustGateResult {
  readonly wallet: string;
  readonly allowed: boolean;
  readonly score: number;
  readonly reason:
    | "score_above_threshold"
    | "score_below_threshold"
    | "missing_verification"
    | string;
  readonly meta?: FairScaleMeta;
}

/** Response of `POST /v1/score/batch`. */
export interface BatchScoreResult {
  readonly total: number;
  readonly scored: number;
  readonly results: ReadonlyArray<AgentScoreResult>;
  readonly meta?: FairScaleMeta;
}

export interface ScoreOptions {
  /** Apply a built-in scoring profile. */
  readonly task?: FairScaleTask;
  /** Override the API key for this call. */
  readonly apiKey?: string;
  /** Per-call timeout (ms). Defaults to client default. */
  readonly timeoutMs?: number;
  /** AbortSignal for cancellation. */
  readonly signal?: AbortSignal;
}

export interface TrustGateOptions extends ScoreOptions {
  /** Minimum score to pass (0–100). Default 40. */
  readonly minScore?: number;
  /** Require at least one registry verification. */
  readonly requireVerification?: boolean;
}

export interface ScoreAiOptions extends ScoreOptions {
  /** Use a built-in preset. Mutually exclusive with `weights`. */
  readonly preset?: FairScalePreset;
  /** Custom pillar weights — must sum to 1.0 ± 0.02. */
  readonly weights?: FairScalePillars;
}

export interface DirectoryOptions extends ScoreOptions {
  readonly page?: number;
  /** Default 25, max 100. */
  readonly limit?: number;
  readonly sort?: FairScaleDirectorySort;
  readonly minScore?: number;
  readonly verifiedOnly?: boolean;
  readonly recommendation?: FairScaleRecommendationTier;
  readonly source?: "said" | "erc8004" | "sati";
  readonly search?: string;
  readonly hasAttestations?: boolean;
}

/** Single entry returned by `/v1/directory.results[]`. */
export interface DirectoryEntry {
  readonly wallet: string;
  readonly name?: string;
  readonly description?: string;
  readonly score: number;
  readonly tier: FairScaleTier;
  readonly pillars?: FairScalePillars;
  readonly recommendation?: AgentScoreResult["recommendation"];
  readonly verifications?: FairScaleVerifications;
  readonly source?: "said" | "erc8004" | "sati";
  readonly [k: string]: unknown;
}

/** Response of `GET /v1/directory`. */
export interface DirectoryResult {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly results: ReadonlyArray<DirectoryEntry>;
  readonly meta?: FairScaleMeta;
}

/** Response of `GET /v1/leaderboard`. */
export interface LeaderboardResult {
  readonly metric: string;
  readonly limit: number;
  readonly results: ReadonlyArray<DirectoryEntry>;
  readonly meta?: FairScaleMeta;
}

/** Response of `GET /v1/score-history`. */
export interface ScoreHistoryResult {
  readonly wallet: string;
  readonly history: ReadonlyArray<{
    readonly scored_at: string;
    readonly score: number;
    readonly tier?: FairScaleTier;
  }>;
  readonly meta?: FairScaleMeta;
}

export interface CreditOptions extends ScoreOptions {
  /** Loan amount in USD. Default 1000. */
  readonly amount?: number;
  /** Bypass 15-min cache. SDK accepts boolean — wire-format is `0|1`. */
  readonly nocache?: boolean;
  /** Optional social-proof header forwarded as `x-social-identity`. */
  readonly socialIdentity?: string;
}

/** Lending terms inside the credit underwriting block. */
export interface CreditLendingTerms {
  readonly recommendation: string;
  readonly suggested_apr_range: { readonly low: number; readonly high: number };
  readonly collateral_ratio: number;
  readonly collateral_note: string;
  readonly max_credit_line: number;
  readonly max_term_days: number;
  readonly identity_level:
    | "kyc"
    | "strong"
    | "said"
    | "matrica"
    | "partial"
    | "none";
  readonly identity_enhanced: boolean;
}

/** Risk flag inside credit underwriting. */
export interface CreditRiskFlag {
  readonly type: "critical" | "warning" | "positive";
  readonly signal: string;
  readonly detail: string;
}

/** Underwriting block. */
export interface CreditUnderwriting {
  readonly opinion: string;
  readonly lending_terms: CreditLendingTerms;
  readonly risk_flags: ReadonlyArray<CreditRiskFlag>;
  readonly data_confidence?: Record<string, unknown>;
}

/** Confidence block. */
export interface CreditConfidence {
  readonly score: number;
  readonly level: "high" | "medium" | "low";
  readonly summary: string;
  readonly limitations: ReadonlyArray<string>;
}

/** Five credit pillars. */
export interface CreditPillars {
  readonly financial_position: { readonly score: number };
  readonly credit_history: { readonly score: number };
  readonly income_capacity: { readonly score: number };
  readonly behavioural: { readonly score: number };
  readonly identity_trust: { readonly score: number };
}

/** Attestation envelope (HMAC-SHA256 signed proof). */
export interface CreditAttestation {
  readonly type: "signed_response" | string;
  readonly payload_hash: string;
  readonly payload_fields: string;
  readonly note?: string;
}

/** Response of `GET /v1/credit`. */
export interface CreditResult {
  readonly wallet: string;
  readonly fairscore: number;
  readonly fairscore_tier: FairScaleTier | "unverified";
  readonly credit_score: number;
  readonly risk_band:
    | "prime"
    | "near_prime"
    | "subprime"
    | "deep_subprime"
    | "decline";
  readonly confidence: CreditConfidence;
  readonly underwriting: CreditUnderwriting;
  readonly credit_pillars: CreditPillars;
  readonly affordability?: Record<string, unknown>;
  readonly trust_pillars?: Record<string, unknown>;
  readonly credit_data?: Record<string, unknown>;
  readonly flags?: Record<string, unknown>;
  readonly attestation: CreditAttestation;
  readonly meta?: FairScaleMeta;
}

// ── Human Score API ──────────────────────────────────────────────────

/**
 * 15 on-chain features returned by `/score`. Field names and units match
 * https://docs.fairscale.xyz/docs/api-score#features exactly.
 */
export interface HumanScoreFeatures {
  // Portfolio Composition
  readonly native_sol_percentile: number;
  readonly major_percentile_score: number;
  readonly stable_percentile_score: number;
  readonly lst_percentile_score: number;
  // Capital Flow
  readonly net_sol_flow_30d: number;
  // Holding Conviction
  readonly median_hold_days: number;
  readonly conviction_ratio: number;
  readonly no_instant_dumps: 0 | 1;
  // Activity Tempo
  readonly tx_count: number;
  readonly active_days: number;
  readonly median_gap_hours: number;
  // Trading Behaviour
  readonly tempo_cv: number;
  readonly burst_ratio: number;
  // Breadth
  readonly platform_diversity: number;
  readonly wallet_age_score: number;
}

/** Response of `GET /score` (Human Score API). */
export interface HumanScoreResult {
  readonly wallet: string;
  /** Final blended score (0–100) — `0.50·base + 0.20·social + 0.30·peer`. */
  readonly fairscore: number;
  /** Raw on-chain neural-network score (features only). */
  readonly fairscore_base: number;
  /** Social reputation (0 if no X handle linked). */
  readonly social_score: number;
  /** Peer-vouch score (0 if no vouches received). */
  readonly peer_score: number;
  readonly verified_human: boolean;
  readonly tier: FairScaleTier;
  readonly badges: ReadonlyArray<FairScaleBadge>;
  readonly actions: ReadonlyArray<FairScaleAction>;
  readonly features: HumanScoreFeatures;
  /** Present only on cache-hit responses. */
  readonly cached?: boolean;
  readonly timestamp: string;
}


// ═══════════════════════════════════════════════════════════════════
//  Types — Aggregation (SAP + FairScale)
// ═══════════════════════════════════════════════════════════════════

export interface AggregatedReputation {
  /** Agent wallet. */
  readonly wallet: string;
  /** SAP on-chain reputation snapshot (null if agent not registered). */
  readonly sap: {
    readonly registered: boolean;
    /** 0–100 SAP `reputationScore` (null if no feedback yet). */
    readonly score: number | null;
    readonly totalFeedbacks: number;
    readonly totalCallsServed: string;
    readonly isActive: boolean;
  };
  /** FairScale snapshot (null if FairScale lookup failed). */
  readonly fairscale: AgentScoreResult | null;
  /** Final blended signal. */
  readonly combined: {
    /** 0–100 weighted score. */
    readonly score: number;
    /** Bucket derived from `score`: low <40, medium <60, high <80, elite ≥80. */
    readonly tier: "low" | "medium" | "high" | "elite";
    /**
     * Confidence in the blended signal (0–1). Penalises:
     *   - Missing source (only one of the two responded)
     *   - Low SAP feedback count
     *   - FairScale `from_cache: true`
     */
    readonly confidence: number;
    /** Effective weights actually applied (after missing-source rebalance). */
    readonly weights: { sap: number; fairscale: number };
    /** Reasons that affected the score (red flags, gates, etc.). */
    readonly notes: ReadonlyArray<string>;
  };
  readonly meta: {
    readonly provider: "SAP+FairScale";
    readonly computedAt: string;
  };
}

export interface AggregateOptions extends ScoreOptions {
  /**
   * Weights applied to each source. Defaults to `{ sap: 0.5, fairscale: 0.5 }`.
   * Must sum to 1.0 ± 0.01. If one source is missing, the present source's
   * weight is renormalised to 1.0 (and `confidence` is reduced).
   */
  readonly weights?: { sap: number; fairscale: number };
  /** Minimum SAP feedbacks required for SAP to count (else SAP weight → 0). */
  readonly require?: { sapMinFeedbacks?: number };
  /**
   * If true, throws when both sources are unavailable. Default `false`
   * (returns `combined.score = 0`, `confidence = 0`).
   */
  readonly strict?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Configuration
// ═══════════════════════════════════════════════════════════════════

export interface FairScaleConfig {
  /** API key (or read from env `FAIRSCALE_API_KEY`). */
  readonly apiKey?: string;
  /** Override agent-api base URL. */
  readonly baseUrl?: string;
  /** Override human-api base URL. */
  readonly humanBaseUrl?: string;
  /** Default request timeout (ms). Default 10_000. */
  readonly timeoutMs?: number;
  /** Custom fetch implementation (for tests / Edge proxies). */
  readonly fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://agent-api.fairscale.xyz";
const DEFAULT_HUMAN_BASE_URL = "https://api.fairscale.xyz";
const DEFAULT_TIMEOUT_MS = 10_000;

// ═══════════════════════════════════════════════════════════════════
//  Registry
// ═══════════════════════════════════════════════════════════════════

/**
 * @name FairScaleRegistry
 * @description High-level FairScale client + SAP reputation aggregator.
 *   Exposed lazily as `client.fairscale`.
 * @category Registries
 * @since v0.11.0
 */
export class FairScaleRegistry {
  readonly #program: SapProgram;
  readonly #apiKey: string | undefined;
  readonly #baseUrl: string;
  readonly #humanBaseUrl: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  #discovery?: DiscoveryRegistry;
  #human?: HumanScoreNamespace;

  constructor(program: SapProgram, config: FairScaleConfig = {}) {
    this.#program = program;
    this.#apiKey =
      config.apiKey ??
      (typeof process !== "undefined"
        ? process.env?.FAIRSCALE_API_KEY
        : undefined);
    this.#baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.#humanBaseUrl = (config.humanBaseUrl ?? DEFAULT_HUMAN_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.#timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (config.fetch) {
      this.#fetch = config.fetch;
    } else if (typeof fetch !== "undefined") {
      this.#fetch = fetch.bind(globalThis);
    } else {
      throw new FairScaleError(
        "global `fetch` not available — pass `config.fetch`",
        0,
        "no_fetch",
      );
    }
  }

  /** Lazy DiscoveryRegistry, used by `aggregate()` to read on-chain SAP state. */
  get #disc(): DiscoveryRegistry {
    return (this.#discovery ??= new DiscoveryRegistry(this.#program));
  }

  /** Human Score API namespace (`client.fairscale.human.*`). */
  get human(): HumanScoreNamespace {
    return (this.#human ??= new HumanScoreNamespace(
      this.#humanBaseUrl,
      this.#apiKey,
      this.#timeoutMs,
      this.#fetch,
    ));
  }

  // ── Agent & Credit API ────────────────────────────────────────────

  /**
   * @description `GET /v1/score` — composite trust score.
   */
  score(agent: PublicKey | string, opts: ScoreOptions = {}): Promise<AgentScoreResult> {
    const wallet = toWallet(agent);
    const url = this.#url("/v1/score", { wallet, task: opts.task });
    return this.#getJson<AgentScoreResult>(url, opts);
  }

  /**
   * @description `GET /v1/trust-gate` — binary allow/deny.
   */
  trustGate(
    agent: PublicKey | string,
    opts: TrustGateOptions = {},
  ): Promise<TrustGateResult> {
    const wallet = toWallet(agent);
    const url = this.#url("/v1/trust-gate", {
      wallet,
      task: opts.task,
      min_score: opts.minScore,
      require_verification: opts.requireVerification,
    });
    return this.#getJson<TrustGateResult>(url, opts);
  }

  /**
   * @description `POST /v1/score/batch` — up to 25 wallets per call.
   *   Splits larger inputs into chunks of 25 and merges results.
   */
  async scoreBatch(
    agents: ReadonlyArray<PublicKey | string>,
    opts: ScoreOptions = {},
  ): Promise<BatchScoreResult> {
    const wallets = agents.map(toWallet);
    if (wallets.length === 0) {
      return { total: 0, scored: 0, results: [] };
    }
    const chunks: string[][] = [];
    for (let i = 0; i < wallets.length; i += 25) {
      chunks.push(wallets.slice(i, i + 25));
    }
    const responses = await Promise.all(
      chunks.map((chunk) =>
        this.#postJson<BatchScoreResult>(this.#url("/v1/score/batch"), opts, {
          wallets: chunk,
          task: opts.task,
        }),
      ),
    );
    const merged: BatchScoreResult = {
      total: wallets.length,
      scored: responses.reduce((acc, r) => acc + r.scored, 0),
      results: responses.flatMap((r) => r.results),
      meta: responses[0]?.meta,
    };
    return merged;
  }

  /**
   * @description `GET /v1/score/ai` — composable score with preset or custom weights.
   */
  scoreAI(
    agent: PublicKey | string,
    opts: ScoreAiOptions,
  ): Promise<AgentScoreResult> {
    if (!opts.preset && !opts.weights) {
      throw new FairScaleError(
        "scoreAI requires either `preset` or `weights`",
        0,
        "missing_preset_or_weights",
      );
    }
    if (opts.weights) {
      const sum = (Object.values(opts.weights) as number[]).reduce(
        (a, b) => a + (b ?? 0),
        0,
      );
      if (Math.abs(sum - 1) > 0.02) {
        throw new FairScaleError(
          `custom weights must sum to 1.0 (±0.02), got ${sum}`,
          0,
          "weights_must_sum_to_1",
        );
      }
    }
    const url = this.#url("/v1/score/ai", {
      wallet: toWallet(agent),
      preset: opts.preset,
      ...(opts.weights ?? {}),
    });
    return this.#getJson<AgentScoreResult>(url, opts);
  }

  /**
   * @description `GET /v1/agent` — full agent profile (registry details + scoring data).
   */
  agentProfile(
    agent: PublicKey | string,
    opts: ScoreOptions = {},
  ): Promise<AgentScoreResult & { profile?: Record<string, unknown> }> {
    const url = this.#url("/v1/agent", { wallet: toWallet(agent) });
    return this.#getJson<
      AgentScoreResult & { profile?: Record<string, unknown> }
    >(url, opts);
  }

  /**
   * @description `GET /v1/score-history` — score trend over time.
   */
  scoreHistory(
    agent: PublicKey | string,
    opts: ScoreOptions = {},
  ): Promise<ScoreHistoryResult> {
    const url = this.#url("/v1/score-history", { wallet: toWallet(agent) });
    return this.#getJson<ScoreHistoryResult>(url, opts);
  }

  /**
   * @description `GET /v1/directory` — query the indexed agent directory.
   */
  directory(opts: DirectoryOptions = {}): Promise<DirectoryResult> {
    const url = this.#url("/v1/directory", {
      page: opts.page,
      limit: opts.limit,
      sort: opts.sort,
      min_score: opts.minScore,
      verified_only: opts.verifiedOnly,
      recommendation: opts.recommendation,
      source: opts.source,
      search: opts.search,
      has_attestations: opts.hasAttestations,
    });
    return this.#getJson<DirectoryResult>(url, opts);
  }

  /**
   * @description `GET /v1/leaderboard` — top-scoring agents by metric.
   */
  leaderboard(opts: {
    metric?: FairScaleDirectorySort;
    limit?: number;
    apiKey?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {}): Promise<LeaderboardResult> {
    const url = this.#url("/v1/leaderboard", {
      metric: opts.metric,
      limit: opts.limit,
    });
    return this.#getJson<LeaderboardResult>(url, opts);
  }

  /**
   * @description `GET /v1/credit` — full credit assessment ($0.50 USDC per call).
   *   Uses `X-Api-Key` header instead of `fairkey`. Wire-format for `nocache`
   *   is `0|1` per the docs; the SDK accepts a boolean and converts it.
   */
  credit(
    agent: PublicKey | string,
    opts: CreditOptions = {},
  ): Promise<CreditResult> {
    const url = this.#url("/v1/credit", {
      wallet: toWallet(agent),
      amount: opts.amount,
      nocache: opts.nocache === undefined ? undefined : opts.nocache ? 1 : 0,
    });
    return this.#getJson<CreditResult>(url, opts, {
      authHeader: "X-Api-Key",
      extraHeaders: opts.socialIdentity
        ? { "x-social-identity": opts.socialIdentity }
        : undefined,
    });
  }

  // ── Aggregation (SAP + FairScale) ─────────────────────────────────

  /**
   * @description Merge SAP on-chain reputation with FairScale into a single
   *   weighted signal. Falls back gracefully if either source is unavailable.
   *
   * @param agentWallet - The agent's owner wallet (NOT the agent PDA).
   * @param opts - Weights, gating rules, and per-call overrides.
   * @returns {Promise<AggregatedReputation>}
   *
   * @example
   * ```ts
   * const r = await client.fairscale.aggregate(agentWallet, {
   *   weights: { sap: 0.4, fairscale: 0.6 },
   *   require: { sapMinFeedbacks: 2 },
   * });
   * if (r.combined.tier === "high" || r.combined.tier === "elite") accept();
   * ```
   */
  async aggregate(
    agentWallet: PublicKey,
    opts: AggregateOptions = {},
  ): Promise<AggregatedReputation> {
    const w = opts.weights ?? { sap: 0.5, fairscale: 0.5 };
    if (Math.abs(w.sap + w.fairscale - 1) > 0.01) {
      throw new FairScaleError(
        `aggregate weights must sum to 1.0 (±0.01), got ${w.sap + w.fairscale}`,
        0,
        "weights_must_sum_to_1",
      );
    }
    const minFeedbacks = opts.require?.sapMinFeedbacks ?? 0;

    const [sapProfile, fsScore] = await Promise.allSettled([
      this.#disc.getAgentProfile(agentWallet),
      this.score(agentWallet, opts),
    ]);

    const notes: string[] = [];

    // ── SAP slice ───────────────────────────────────────────────
    const sapResult = sapProfile.status === "fulfilled" ? sapProfile.value : null;
    const sapScore = extractSapScore(sapResult, minFeedbacks, notes);

    // ── FairScale slice ─────────────────────────────────────────
    const fairscale =
      fsScore.status === "fulfilled" ? fsScore.value : null;
    if (fsScore.status === "rejected") {
      notes.push(
        `fairscale_unavailable:${(fsScore.reason as Error)?.message ?? "unknown"}`,
      );
    }
    if (fairscale?.red_flags?.length) {
      notes.push(`red_flags:${fairscale.red_flags.length}`);
    }
    if (fairscale?.meta?.from_cache) notes.push("fairscale_cache_hit");

    // ── Blend ───────────────────────────────────────────────────
    const sapAvail = sapScore !== null ? w.sap : 0;
    const fsAvail = fairscale ? w.fairscale : 0;
    const totalW = sapAvail + fsAvail;

    let combinedScore = 0;
    let weights = { sap: 0, fairscale: 0 };
    if (totalW === 0) {
      if (opts.strict) {
        throw new FairScaleError(
          "no reputation source available (strict mode)",
          0,
          "no_source",
        );
      }
      notes.push("no_source");
    } else {
      const sapNorm = sapAvail / totalW;
      const fsNorm = fsAvail / totalW;
      combinedScore =
        (sapScore ?? 0) * sapNorm + (fairscale?.score ?? 0) * fsNorm;
      weights = { sap: round2(sapNorm), fairscale: round2(fsNorm) };
    }

    // ── Confidence ──────────────────────────────────────────────
    let confidence = 1;
    if (sapScore === null) confidence -= 0.35;
    if (!fairscale) confidence -= 0.35;
    if (sapResult && sapResult.identity.totalFeedbacks < 3) confidence -= 0.1;
    if (fairscale?.meta?.from_cache) confidence -= 0.05;
    if (fairscale?.red_flags?.length) {
      confidence -= Math.min(0.2, fairscale.red_flags.length * 0.05);
    }
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      wallet: agentWallet.toBase58(),
      sap: {
        registered: sapResult !== null,
        score: sapScore,
        totalFeedbacks: sapResult?.identity.totalFeedbacks ?? 0,
        totalCallsServed:
          sapResult?.identity.totalCallsServed.toString() ?? "0",
        isActive: sapResult?.identity.isActive ?? false,
      },
      fairscale,
      combined: {
        score: round2(Math.max(0, Math.min(100, combinedScore))),
        tier: bucketTier(combinedScore),
        confidence: round2(confidence),
        weights,
        notes,
      },
      meta: {
        provider: "SAP+FairScale",
        computedAt: new Date().toISOString(),
      },
    };
  }

  // ── HTTP plumbing ─────────────────────────────────────────────────

  #url(path: string, params?: Record<string, unknown>): string {
    const u = new URL(this.#baseUrl + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  async #getJson<T>(
    url: string,
    opts: ScoreOptions,
    extra: {
      authHeader?: "fairkey" | "X-Api-Key";
      extraHeaders?: Record<string, string>;
    } = {},
  ): Promise<T> {
    return this.#request<T>(
      url,
      "GET",
      undefined,
      opts,
      extra.authHeader,
      extra.extraHeaders,
    );
  }

  async #postJson<T>(
    url: string,
    opts: ScoreOptions,
    body: unknown,
  ): Promise<T> {
    return this.#request<T>(url, "POST", body, opts);
  }

  async #request<T>(
    url: string,
    method: "GET" | "POST",
    body: unknown,
    opts: ScoreOptions,
    authHeader: "fairkey" | "X-Api-Key" = "fairkey",
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const apiKey = opts.apiKey ?? this.#apiKey;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers[authHeader] = apiKey;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (extraHeaders) Object.assign(headers, extraHeaders);

    const ctrl = new AbortController();
    const timeoutMs = opts.timeoutMs ?? this.#timeoutMs;
    const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
    if (opts.signal) {
      if (opts.signal.aborted) ctrl.abort();
      else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }

    let res: Response;
    try {
      res = await this.#fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch (err) {
      throw new FairScaleError(
        `network error: ${(err as Error).message}`,
        0,
        "network_error",
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new FairScaleError(
        `invalid JSON from FairScale (${res.status})`,
        res.status,
        "invalid_json",
      );
    }

    if (!res.ok) {
      const errCode =
        (json as { code?: string; error?: string })?.code ??
        (json as { error?: string })?.error ??
        `http_${res.status}`;
      throw new FairScaleError(
        `FairScale ${method} ${url} → ${res.status}: ${errCode}`,
        res.status,
        errCode,
      );
    }

    return json as T;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Human Score namespace
// ═══════════════════════════════════════════════════════════════════

/**
 * @name HumanScoreNamespace
 * @description Wraps `api.fairscale.xyz` (Human Score API). Accessed via
 *   `client.fairscale.human`.
 * @category Registries
 * @since v0.11.0
 */
export class HumanScoreNamespace {
  readonly #baseUrl: string;
  readonly #apiKey: string | undefined;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor(
    baseUrl: string,
    apiKey: string | undefined,
    timeoutMs: number,
    fetchImpl: typeof fetch,
  ) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
    this.#timeoutMs = timeoutMs;
    this.#fetch = fetchImpl;
  }

  /**
   * @description `GET /score` — full human wallet analysis.
   */
  score(
    wallet: PublicKey | string,
    opts: { twitter?: string; nocache?: boolean } & ScoreOptions = {},
  ): Promise<HumanScoreResult> {
    return this.#get<HumanScoreResult>(
      "/score",
      { wallet: toWallet(wallet), twitter: opts.twitter, nocache: opts.nocache },
      opts,
    );
  }

  /** `GET /fairScore` — blended 0–1000 integer. */
  fairScoreOnly(
    wallet: PublicKey | string,
    opts: ScoreOptions = {},
  ): Promise<{ fair_score: number }> {
    return this.#get("/fairScore", { wallet: toWallet(wallet) }, opts);
  }

  /** `GET /walletScore` — on-chain only 0–1000 integer. */
  walletScoreOnly(
    wallet: PublicKey | string,
    opts: ScoreOptions = {},
  ): Promise<{ wallet_score: number }> {
    return this.#get("/walletScore", { wallet: toWallet(wallet) }, opts);
  }

  /** `GET /socialScore` — social only 0–1000 integer. */
  socialScoreOnly(
    wallet: PublicKey | string,
    opts: { twitter?: string } & ScoreOptions = {},
  ): Promise<{ social_score: number }> {
    return this.#get(
      "/socialScore",
      { wallet: toWallet(wallet), twitter: opts.twitter },
      opts,
    );
  }

  async #get<T>(
    path: string,
    params: Record<string, unknown>,
    opts: ScoreOptions,
  ): Promise<T> {
    const url = new URL(this.#baseUrl + path);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
    const apiKey = opts.apiKey ?? this.#apiKey;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["fairkey"] = apiKey;

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? this.#timeoutMs);
    if (opts.signal) {
      if (opts.signal.aborted) ctrl.abort();
      else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }

    let res: Response;
    try {
      res = await this.#fetch(url.toString(), { method: "GET", headers, signal: ctrl.signal });
    } catch (err) {
      throw new FairScaleError(
        `network error: ${(err as Error).message}`,
        0,
        "network_error",
      );
    } finally {
      clearTimeout(timeout);
    }
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new FairScaleError(
        `invalid JSON from FairScale Human API (${res.status})`,
        res.status,
        "invalid_json",
      );
    }
    if (!res.ok) {
      const code =
        (json as { code?: string; error?: string })?.code ??
        (json as { error?: string })?.error ??
        `http_${res.status}`;
      throw new FairScaleError(
        `FairScale Human GET ${path} → ${res.status}: ${code}`,
        res.status,
        code,
      );
    }
    return json as T;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

function toWallet(input: PublicKey | string): string {
  return typeof input === "string" ? input : input.toBase58();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bucketTier(score: number): "low" | "medium" | "high" | "elite" {
  if (score >= 80) return "elite";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function extractSapScore(
  profile: AgentProfile | null,
  minFeedbacks: number,
  notes: string[],
): number | null {
  if (!profile) {
    notes.push("sap_unregistered");
    return null;
  }
  const fb = profile.identity.totalFeedbacks;
  if (fb < minFeedbacks) {
    notes.push(`sap_below_min_feedbacks(${fb}/${minFeedbacks})`);
    return null;
  }
  if (fb === 0) {
    notes.push("sap_no_feedback_yet");
    return null;
  }
  if (!profile.identity.isActive) notes.push("sap_inactive");
  return profile.identity.reputationScore;
}
