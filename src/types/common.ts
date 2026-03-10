/**
 * @module types/common
 * @description Shared helper structs used across accounts and instructions.
 *
 * These types appear as nested fields in both on-chain account data
 * and instruction argument DTOs.
 *
 * @category Types
 * @since v0.1.0
 */

import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import type { PluginTypeKind, SettlementModeKind, TokenTypeKind } from "./enums";

// ═══════════════════════════════════════════════════════════════════
//  Agent Capability
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface Capability
 * @description Agent capability descriptor declaring what the agent can do.
 *
 * Capabilities use a namespaced identifier format (e.g. `"jupiter:swap"`).
 * They are indexed on-chain via the `CapabilityIndex` PDA for scalable discovery.
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const cap: Capability = {
 *   id: "jupiter:swap",
 *   description: "Token swap via Jupiter aggregator",
 *   protocolId: "jupiter",
 *   version: "1.0",
 * };
 * ```
 */
export interface Capability {
  /** Unique identifier (e.g. `"jupiter:swap"`). */
  readonly id: string;
  /** Human-readable description of the capability. */
  readonly description: string | null;
  /** Protocol namespace this capability belongs to. */
  readonly protocolId: string | null;
  /** Semantic version of the capability. */
  readonly version: string | null;
}

// ═══════════════════════════════════════════════════════════════════
//  Pricing
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface VolumeCurveBreakpoint
 * @description A single breakpoint in a volume-based pricing curve.
 *
 * After a consumer exceeds `afterCalls` total invocations, the effective
 * price drops to `pricePerCall`. Multiple breakpoints form a tiered
 * discount schedule (ERC-8004–style).
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const curve: VolumeCurveBreakpoint[] = [
 *   { afterCalls: 100, pricePerCall: new BN(90_000) },
 *   { afterCalls: 500, pricePerCall: new BN(70_000) },
 * ];
 * ```
 */
export interface VolumeCurveBreakpoint {
  /** Number of cumulative calls after which this price tier activates. */
  readonly afterCalls: number;
  /** Price per call (in token base units) once `afterCalls` is exceeded. */
  readonly pricePerCall: BN;
}

/**
 * @interface PricingTier
 * @description Full pricing tier for agent services, including rate limits,
 *   supported token, settlement mode, and optional volume discounts.
 *
 * Agents can expose multiple tiers (e.g. free, pro) each with independent
 * rate-limiting and pricing parameters.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link SettlementMode} for settlement strategies.
 * @see {@link VolumeCurveBreakpoint} for volume-based discounts.
 *
 * @example
 * ```ts
 * import { TokenType, SettlementMode } from "@synapse-sap/sdk";
 *
 * const tier: PricingTier = {
 *   tierId: "pro",
 *   pricePerCall: new BN(100_000),
 *   minPricePerCall: null,
 *   maxPricePerCall: null,
 *   rateLimit: 60,
 *   maxCallsPerSession: 1000,
 *   burstLimit: 10,
 *   tokenType: TokenType.Usdc,
 *   tokenMint: USDC_MINT,
 *   tokenDecimals: 6,
 *   settlementMode: SettlementMode.Escrow,
 *   minEscrowDeposit: new BN(1_000_000),
 *   batchIntervalSec: null,
 *   volumeCurve: null,
 * };
 * ```
 */
export interface PricingTier {
  /** Unique identifier for this tier (e.g. `"free"`, `"pro"`). */
  readonly tierId: string;
  /** Default price per call in token base units. */
  readonly pricePerCall: BN;
  /** Floor price guard (optional). */
  readonly minPricePerCall: BN | null;
  /** Ceiling price guard (optional). */
  readonly maxPricePerCall: BN | null;
  /** Maximum calls per second allowed. */
  readonly rateLimit: number;
  /** Maximum calls allowed within a single session. */
  readonly maxCallsPerSession: number;
  /** Burst capacity above steady-state rate limit. */
  readonly burstLimit: number | null;
  /** Token type accepted for payment. */
  readonly tokenType: TokenTypeKind;
  /** SPL token mint address (required when `tokenType` is `Spl`). */
  readonly tokenMint: PublicKey | null;
  /** Decimal places for the token. */
  readonly tokenDecimals: number | null;
  /** Settlement strategy for this tier. */
  readonly settlementMode: SettlementModeKind | null;
  /** Minimum escrow deposit required (for escrow settlement). */
  readonly minEscrowDeposit: BN | null;
  /** Batch settlement interval in seconds (for batched settlement). */
  readonly batchIntervalSec: number | null;
  /** Optional volume discount breakpoints. */
  readonly volumeCurve: VolumeCurveBreakpoint[] | null;
}

// ═══════════════════════════════════════════════════════════════════
//  Plugin Reference
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface PluginRef
 * @description Reference to an active plugin PDA attached to an agent.
 *
 * Stored in the agent's `activePlugins` array to track which extensions
 * are currently enabled.
 *
 * @category Types
 * @since v0.1.0
 */
export interface PluginRef {
  /** Discriminant identifying the plugin extension type. */
  readonly pluginType: PluginTypeKind;
  /** PDA address of the plugin account. */
  readonly pda: PublicKey;
}

// ═══════════════════════════════════════════════════════════════════
//  Settlement
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface Settlement
 * @description Individual settlement entry used in batch settlement instructions.
 *
 * Each entry describes how many calls to settle for a given service, identified
 * by its 32-byte hash.
 *
 * @category Types
 * @since v0.1.0
 */
export interface Settlement {
  /** Number of calls to settle in this batch entry. */
  readonly callsToSettle: BN;
  /** SHA-256 hash identifying the service being settled. */
  readonly serviceHash: number[]; // [u8; 32]
}
