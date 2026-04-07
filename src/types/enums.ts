/**
 * @module types/enums
 * @description Anchor-compatible enum variant objects for SAP v2.
 *
 * Each enum mirrors the Rust discriminant format used by Anchor:
 * `{ variant: {} }` — e.g. `{ sol: {} }` for `TokenType::Sol`.
 *
 * Use the `*Kind` types for function signatures.
 *
 * @category Types
 * @since v0.1.0
 * @see {@link https://solana.com/docs | Solana Docs}
 */

// ═══════════════════════════════════════════════════════════════════
//  Token Type
// ═══════════════════════════════════════════════════════════════════

/**
 * @name TokenType
 * @description Anchor-compatible enum variants for token types accepted by agent pricing and escrow.
 *
 * - `Sol` — Native SOL.
 * - `Usdc` — USDC stablecoin.
 * - `Spl` — Arbitrary SPL token (requires `tokenMint`).
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { TokenType } from "@synapse-sap/sdk";
 *
 * const tier = { tokenType: TokenType.Sol };
 * ```
 */
export const TokenType = {
  Sol: { sol: {} },
  Usdc: { usdc: {} },
  Spl: { spl: {} },
} as const;

/**
 * @name TokenTypeKind
 * @description Union of all {@link TokenType} variant shapes.
 *   Use this as the type for any parameter that accepts a token type discriminant.
 */
export type TokenTypeKind = (typeof TokenType)[keyof typeof TokenType];

// ═══════════════════════════════════════════════════════════════════
//  Plugin Type
// ═══════════════════════════════════════════════════════════════════

/**
 * @name PluginType
 * @description Anchor-compatible enum variants for plugin extension types.
 *
 * Plugins extend agent functionality and are feature-gated on-chain.
 *
 * - `Memory` — Encrypted memory / vault storage.
 * - `Validation` — Custom validation logic.
 * - `Delegation` — Hot-wallet delegation.
 * - `Analytics` — Metrics & analytics.
 * - `Governance` — DAO / governance participation.
 * - `Custom` — User-defined plugin type.
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { PluginType } from "@synapse-sap/sdk";
 *
 * const ref = { pluginType: PluginType.Memory, pda: vaultPda };
 * ```
 */
export const PluginType = {
  Memory: { memory: {} },
  Validation: { validation: {} },
  Delegation: { delegation: {} },
  Analytics: { analytics: {} },
  Governance: { governance: {} },
  Custom: { custom: {} },
} as const;

/**
 * @name PluginTypeKind
 * @description Union of all {@link PluginType} variant shapes.
 */
export type PluginTypeKind = (typeof PluginType)[keyof typeof PluginType];

// ═══════════════════════════════════════════════════════════════════
//  Settlement Mode
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SettlementMode
 * @description Anchor-compatible enum variants for payment settlement strategies.
 *
 * - `Instant` — Pay-per-call, settled immediately on invocation.
 * - `Escrow` — Pre-funded escrow account with per-call drawdown.
 * - `Batched` — Aggregated settlement at fixed intervals.
 * - `X402` — HTTP 402-based micropayment protocol settlement.
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { SettlementMode } from "@synapse-sap/sdk";
 *
 * const tier = { settlementMode: SettlementMode.Escrow };
 * ```
 */
export const SettlementMode = {
  Instant: { instant: {} },
  Escrow: { escrow: {} },
  Batched: { batched: {} },
  X402: { x402: {} },
} as const;

/**
 * @name SettlementModeKind
 * @description Union of all {@link SettlementMode} variant shapes.
 */
export type SettlementModeKind =
  (typeof SettlementMode)[keyof typeof SettlementMode];

// ═══════════════════════════════════════════════════════════════════
//  Tool HTTP Method
// ═══════════════════════════════════════════════════════════════════

/**
 * @name ToolHttpMethod
 * @description Anchor-compatible enum variants for the HTTP method exposed by a tool.
 *
 * - `Get` / `Post` / `Put` / `Delete` — Standard REST verbs.
 * - `Compound` — Multi-step tool (calls several sub-operations).
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { ToolHttpMethod } from "@synapse-sap/sdk";
 *
 * const args = { httpMethod: ToolHttpMethod.Post };
 * ```
 */
export const ToolHttpMethod = {
  Get: { get: {} },
  Post: { post: {} },
  Put: { put: {} },
  Delete: { delete: {} },
  Compound: { compound: {} },
} as const;

/**
 * @name ToolHttpMethodKind
 * @description Union of all {@link ToolHttpMethod} variant shapes.
 */
export type ToolHttpMethodKind =
  (typeof ToolHttpMethod)[keyof typeof ToolHttpMethod];

// ═══════════════════════════════════════════════════════════════════
//  Tool Category
// ═══════════════════════════════════════════════════════════════════

/**
 * @name ToolCategory
 * @description Anchor-compatible enum variants for classifying tools in the on-chain registry.
 *
 * Categories power cross-agent tool discovery via the `ToolCategoryIndex` PDA.
 *
 * - `Swap` — Token swap / DEX tools.
 * - `Lend` — Lending protocol tools.
 * - `Stake` — Staking / validator tools.
 * - `Nft` — NFT minting / marketplace tools.
 * - `Payment` — Payment & invoicing tools.
 * - `Data` — Data feeds / oracles.
 * - `Governance` — DAO & governance tools.
 * - `Bridge` — Cross-chain bridge tools.
 * - `Analytics` — On-chain analytics.
 * - `Custom` — User-defined category.
 *
 * @category Types
 * @since v0.1.0
 *
 * @example
 * ```ts
 * import { ToolCategory } from "@synapse-sap/sdk";
 *
 * const args = { category: ToolCategory.Swap };
 * ```
 */
export const ToolCategory = {
  Swap: { swap: {} },
  Lend: { lend: {} },
  Stake: { stake: {} },
  Nft: { nft: {} },
  Payment: { payment: {} },
  Data: { data: {} },
  Governance: { governance: {} },
  Bridge: { bridge: {} },
  Analytics: { analytics: {} },
  Custom: { custom: {} },
} as const;

/**
 * @name ToolCategoryKind
 * @description Union of all {@link ToolCategory} variant shapes.
 */
export type ToolCategoryKind =
  (typeof ToolCategory)[keyof typeof ToolCategory];

// ═══════════════════════════════════════════════════════════════════
//  Settlement Security (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @name SettlementSecurity
 * @description Anchor-compatible enum variants for V2 escrow settlement security levels.
 *
 * - `SelfReport` — Agent settles unilaterally (v1 compatible).
 * - `CoSigned` — Agent + client must co-sign every settlement.
 * - `DisputeWindow` — Settlement enters pending state, depositor can dispute.
 *
 * @category Types
 * @since v0.5.0
 */
export const SettlementSecurity = {
  SelfReport: { selfReport: {} },
  CoSigned: { coSigned: {} },
  DisputeWindow: { disputeWindow: {} },
} as const;

export type SettlementSecurityKind =
  (typeof SettlementSecurity)[keyof typeof SettlementSecurity];

// ═══════════════════════════════════════════════════════════════════
//  Dispute Outcome (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @name DisputeOutcome
 * @description Anchor-compatible enum variants for dispute resolution outcomes.
 *
 * @category Types
 * @since v0.5.0
 */
export const DisputeOutcome = {
  Pending: { pending: {} },
  AutoReleased: { autoReleased: {} },
  DepositorWins: { depositorWins: {} },
  AgentWins: { agentWins: {} },
} as const;

export type DisputeOutcomeKind =
  (typeof DisputeOutcome)[keyof typeof DisputeOutcome];

// ═══════════════════════════════════════════════════════════════════
//  Billing Interval (V2.1)
// ═══════════════════════════════════════════════════════════════════

/**
 * @name BillingInterval
 * @description Anchor-compatible enum variants for subscription billing intervals.
 *
 * @category Types
 * @since v0.5.0
 */
export const BillingInterval = {
  Daily: { daily: {} },
  Weekly: { weekly: {} },
  Monthly: { monthly: {} },
} as const;

export type BillingIntervalKind =
  (typeof BillingInterval)[keyof typeof BillingInterval];
