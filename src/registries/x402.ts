/**
 * @module registries/x402
 * @description x402 payment flow registry — high-level helpers for
 * the complete x402 HTTP micropayment lifecycle.
 *
 * Implements the x402 payment standard on SAP:
 *
 *   ┌──────────┐    HTTP 402    ┌──────────┐
 *   │  Client  │ ──────────────→│  Agent   │
 *   └────┬─────┘                └────┬─────┘
 *        │  1. Discover pricing      │
 *        │  2. Create/fund escrow    │
 *        │  3. Call via x402 header  │
 *        │                           │
 *        │  4. Agent serves request  │
 *        │  5. Agent settles onchain │
 *        │  ← PaymentSettledEvent ←  │
 *        │  6. Client verifies       │
 *        └───────────────────────────┘
 *
 * This registry provides:
 *   - Pricing estimation with volume curve support
 *   - x402 HTTP header generation
 *   - Escrow lifecycle management
 *   - Settlement verification
 *   - Balance/expiry monitoring
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const x402 = client.x402;
 *
 * // === CLIENT SIDE ===
 *
 * // 1. Estimate cost before committing
 * const estimate = x402.estimateCost(agentWallet, 100);
 *
 * // 2. Prepare payment (creates escrow + deposits)
 * const ctx = await x402.preparePayment(agentWallet, {
 *   pricePerCall: 1000,
 *   maxCalls: 100,
 *   deposit: 100_000,
 * });
 *
 * // 3. Build x402 HTTP headers for API calls
 * const headers = x402.buildPaymentHeaders(ctx);
 *
 * // 4. Check balance
 * const balance = await x402.getBalance(agentWallet);
 *
 * // === AGENT SIDE ===
 *
 * // 5. Settle after serving calls
 * const receipt = await x402.settle(depositorWallet, 5, serviceData);
 *
 * // 6. Batch settle for efficiency
 * const batchReceipt = await x402.settleBatch(depositorWallet, settlements);
 *
 * // 7. Verify a settlement TX
 * const verified = await x402.verifySettlement(txSignature);
 * ```
 */

import {
  SystemProgram,
  type PublicKey,
  type TransactionSignature,
} from "@solana/web3.js";
import { type AnchorProvider, BN } from "@coral-xyz/anchor";
import type { SapProgram } from "../modules/base";
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrow,
  deriveEscrowV2,
} from "../pda";
import { sha256, hashToArray } from "../utils";
import { SapNetwork } from "../constants/network";
import type { SapNetworkId } from "../constants/network";
import type {
  EscrowAccountData,
  EscrowAccountV2Data,
  AgentAccountData,
  VolumeCurveBreakpoint,
  Settlement,
} from "../types";
import {
  buildPriorityFeeIxs,
  buildRpcOptions,
} from "../utils/priority-fee";
import type { SettleOptions } from "../utils/priority-fee";

export type { SettleOptions } from "../utils/priority-fee";

// ═══════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface CostEstimate
 * @name CostEstimate
 * @description Cost estimation result from {@link X402Registry.estimateCost} or
 * {@link X402Registry.calculateCost}. Includes total cost, effective price per call,
 * and per-tier breakdown when volume curves apply.
 * @category Registries
 * @since v0.1.0
 */
export interface CostEstimate {
  /** Total cost in smallest token unit. */
  readonly totalCost: BN;
  /** Number of calls estimated. */
  readonly calls: number;
  /** Effective price per call (weighted average). */
  readonly effectivePricePerCall: BN;
  /** Whether volume curve applies. */
  readonly hasVolumeCurve: boolean;
  /** Breakdown by tier (if volume curve). */
  readonly tiers: Array<{
    readonly calls: number;
    readonly pricePerCall: BN;
    readonly subtotal: BN;
  }>;
}

/**
 * @interface PaymentContext
 * @name PaymentContext
 * @description x402 payment context after escrow creation via {@link X402Registry.preparePayment}.
 * Contains all information needed to build x402 HTTP headers and track the payment flow.
 * @category Registries
 * @since v0.1.0
 */
export interface PaymentContext {
  /** Escrow PDA address. */
  readonly escrowPda: PublicKey;
  /** Agent PDA address. */
  readonly agentPda: PublicKey;
  /** Agent wallet. */
  readonly agentWallet: PublicKey;
  /** Depositor (client) wallet. */
  readonly depositorWallet: PublicKey;
  /** Price per call in smallest token unit. */
  readonly pricePerCall: BN;
  /** Max calls allowed. */
  readonly maxCalls: BN;
  /** Escrow creation TX signature. */
  readonly txSignature: TransactionSignature;
  /**
   * Network identifier for the `X-Payment-Network` header.
   * Persisted at escrow creation so every subsequent
   * `buildPaymentHeaders(ctx)` call uses the correct value.
   *
   * @default SapNetwork.SOLANA_MAINNET
   * @since v0.4.3
   */
  readonly networkIdentifier: string;
}

/**
 * @interface PreparePaymentOptions
 * @name PreparePaymentOptions
 * @description Options for preparing an x402 payment via {@link X402Registry.preparePayment}.
 * Defines pricing, deposit, expiry, volume curve, and token configuration.
 * @category Registries
 * @since v0.1.0
 */
export interface PreparePaymentOptions {
  /** Base price per call (smallest token unit). */
  readonly pricePerCall: number | string | BN;
  /** Max calls allowed (0 = unlimited). */
  readonly maxCalls?: number | string | BN;
  /** Initial deposit amount (smallest token unit). */
  readonly deposit: number | string | BN;
  /** Expiry timestamp in unix seconds (0 = never). */
  readonly expiresAt?: number | string | BN;
  /** Volume curve breakpoints. */
  readonly volumeCurve?: Array<{
    afterCalls: number;
    pricePerCall: number | string | BN;
  }>;
  /** SPL token mint (null = native SOL). */
  readonly tokenMint?: PublicKey | null;
  /** Token decimals (default: 9 for SOL). */
  readonly tokenDecimals?: number;
  /**
   * Network identifier written into the `X-Payment-Network` header.
   *
   * Accepts any {@link SapNetworkId} constant or a custom string.
   * Defaults to `SapNetwork.SOLANA_MAINNET` (`"solana:mainnet-beta"`).
   *
   * @example
   * ```ts
   * import { SapNetwork } from "@synapse-sap/sdk";
   *
   * // Use genesis-hash form for Kamiyo / Helius x402
   * const ctx = await x402.preparePayment(agentWallet, {
   *   pricePerCall: 1000,
   *   deposit: 100_000,
   *   networkIdentifier: SapNetwork.SOLANA_MAINNET_GENESIS,
   * });
   * ```
   *
   * @default SapNetwork.SOLANA_MAINNET
   * @since v0.4.3
   */
  readonly networkIdentifier?: SapNetworkId | string;
}

/**
 * @interface X402Headers
 * @name X402Headers
 * @description x402 HTTP headers for API requests.
 * Include these headers when calling an agent’s x402 endpoint.
 * Built by {@link X402Registry.buildPaymentHeaders} or
 * {@link X402Registry.buildPaymentHeadersFromEscrow}.
 * @category Registries
 * @since v0.1.0
 */
export interface X402Headers {
  /** x402 protocol header. */
  readonly "X-Payment-Protocol": "SAP-x402";
  /** Escrow PDA address (base58). */
  readonly "X-Payment-Escrow": string;
  /** Agent PDA address (base58). */
  readonly "X-Payment-Agent": string;
  /** Client wallet address (base58). */
  readonly "X-Payment-Depositor": string;
  /** Max calls remaining. */
  readonly "X-Payment-MaxCalls": string;
  /** Price per call. */
  readonly "X-Payment-PricePerCall": string;
  /** SAP program ID. */
  readonly "X-Payment-Program": string;
  /** Solana cluster. */
  readonly "X-Payment-Network": string;
}

/**
 * @interface EscrowBalance
 * @name EscrowBalance
 * @description Escrow balance and status returned by {@link X402Registry.getBalance}.
 * Includes current balance, deposit/settlement totals, remaining calls,
 * expiry status, and affordable call estimate.
 * @category Registries
 * @since v0.1.0
 */
export interface EscrowBalance {
  /** Current balance. */
  readonly balance: BN;
  /** Total deposited. */
  readonly totalDeposited: BN;
  /** Total settled. */
  readonly totalSettled: BN;
  /** Total calls settled. */
  readonly totalCallsSettled: BN;
  /** Calls remaining (maxCalls - settled, or Infinity if unlimited). */
  readonly callsRemaining: number;
  /** Is the escrow expired? */
  readonly isExpired: boolean;
  /** Estimated calls affordable with current balance. */
  readonly affordableCalls: number;
}

/**
 * @interface SettlementResult
 * @name SettlementResult
 * @description Settlement result with verification data from {@link X402Registry.settle}.
 * Contains the transaction signature, calls settled, amount transferred,
 * and the service hash used.
 * @category Registries
 * @since v0.1.0
 */
export interface SettlementResult {
  /** Transaction signature. */
  readonly txSignature: TransactionSignature;
  /** Calls settled. */
  readonly callsSettled: number;
  /** Amount transferred. */
  readonly amount: BN;
  /** Service hash used. */
  readonly serviceHash: number[];
}

/**
 * @interface BatchSettlementResult
 * @name BatchSettlementResult
 * @description Batch settlement result from {@link X402Registry.settleBatch}.
 * Aggregates totals across all individual settlements in the batch.
 * @category Registries
 * @since v0.1.0
 */
export interface BatchSettlementResult {
  /** Transaction signature. */
  readonly txSignature: TransactionSignature;
  /** Total calls settled. */
  readonly totalCalls: number;
  /** Total amount transferred. */
  readonly totalAmount: BN;
  /** Number of individual settlements in batch. */
  readonly settlementCount: number;
}

// ═══════════════════════════════════════════════════════════════════
//  x402 Registry
// ═══════════════════════════════════════════════════════════════════

/**
 * @name X402Registry
 * @description x402 payment flow registry for the SAP network.
 *
 * Provides the complete x402 HTTP micropayment lifecycle: pricing
 * estimation, escrow management, HTTP header generation, settlement,
 * and balance monitoring. Used by both clients (payers) and agents (payees).
 *
 * @category Registries
 * @since v0.1.0
 *
 * @example
 * ```ts
 * const x402 = client.x402;
 *
 * // Client: prepare payment and build headers
 * const ctx = await x402.preparePayment(agentWallet, {
 *   pricePerCall: 1000, maxCalls: 100, deposit: 100_000,
 * });
 * const headers = x402.buildPaymentHeaders(ctx);
 *
 * // Agent: settle calls after serving
 * const receipt = await x402.settle(depositorWallet, 5, "service-data");
 * ```
 */
export class X402Registry {
  private readonly wallet: PublicKey;

  constructor(private readonly program: SapProgram) {
    this.wallet = (program.provider as AnchorProvider).wallet.publicKey;
  }

  // ── Pricing & Estimation ─────────────────────────────

  /**
   * @name estimateCost
   * @description Estimate the cost of N calls to an agent.
   * Reads the escrow data if it exists, falls back to the agent’s pricing.
   * Supports volume curve pricing for tiered cost calculation.
   *
   * @param agentWallet - Agent wallet address.
   * @param calls - Number of calls to estimate.
   * @param opts - Optional: provide pricing directly to avoid on-chain fetch.
   * @param opts.pricePerCall - Base price per call.
   * @param opts.volumeCurve - Volume curve breakpoints.
   * @param opts.totalCallsBefore - Total calls already settled (for curve offset).
   * @returns A {@link CostEstimate} with total cost and per-tier breakdown.
   * @since v0.1.0
   */
  async estimateCost(
    agentWallet: PublicKey,
    calls: number,
    opts?: {
      pricePerCall?: BN;
      volumeCurve?: VolumeCurveBreakpoint[];
      totalCallsBefore?: number;
    },
  ): Promise<CostEstimate> {
    let pricePerCall: BN;
    let volumeCurve: VolumeCurveBreakpoint[];
    let totalBefore: number;

    if (opts?.pricePerCall) {
      pricePerCall = opts.pricePerCall;
      volumeCurve = opts.volumeCurve ?? [];
      totalBefore = opts.totalCallsBefore ?? 0;
    } else {
      // Try to read from existing escrow (V2 first, then V1)
      const [agentPda] = deriveAgent(agentWallet);
      const resolved = await this.resolveEscrow(agentPda, this.wallet);

      if (resolved) {
        pricePerCall = resolved.escrow.pricePerCall;
        volumeCurve = resolved.escrow.volumeCurve ?? [];
        totalBefore = resolved.escrow.totalCallsSettled.toNumber();
      } else {
        // Fall back to agent's first pricing tier
        const agent = await this.fetchNullable<AgentAccountData>(
          "agentAccount",
          agentPda,
        );
        if (!agent || agent.pricing.length === 0) {
          return {
            totalCost: new BN(0),
            calls,
            effectivePricePerCall: new BN(0),
            hasVolumeCurve: false,
            tiers: [],
          };
        }
        pricePerCall = agent.pricing[0]!.pricePerCall;
        volumeCurve = agent.pricing[0]!.volumeCurve ?? [];
        totalBefore = 0;
      }
    }

    return this.calculateCost(pricePerCall, volumeCurve, totalBefore, calls);
  }

  /**
   * @name calculateCost
   * @description Pure cost calculation (no network calls).
   * Implements the same tiered pricing logic as the on-chain program.
   *
   * @param basePrice - Base price per call in smallest token unit.
   * @param volumeCurve - Volume curve breakpoints.
   * @param totalCallsBefore - Total calls already settled (cursor offset).
   * @param calls - Number of calls to calculate cost for.
   * @returns A {@link CostEstimate} with total cost and per-tier breakdown.
   * @since v0.1.0
   */
  calculateCost(
    basePrice: BN,
    volumeCurve: VolumeCurveBreakpoint[],
    totalCallsBefore: number,
    calls: number,
  ): CostEstimate {
    const tiers: CostEstimate["tiers"] = [];

    if (volumeCurve.length === 0) {
      const totalCost = basePrice.mul(new BN(calls));
      return {
        totalCost,
        calls,
        effectivePricePerCall: basePrice,
        hasVolumeCurve: false,
        tiers: [{ calls, pricePerCall: basePrice, subtotal: totalCost }],
      };
    }

    let remaining = calls;
    let cursor = totalCallsBefore;
    let totalCost = new BN(0);

    while (remaining > 0) {
      let currentPrice = basePrice;
      let nextThreshold: number | null = null;

      for (const bp of volumeCurve) {
        const threshold = bp.afterCalls;
        if (cursor >= threshold) {
          currentPrice = bp.pricePerCall;
        } else {
          nextThreshold = threshold;
          break;
        }
      }

      const callsAtPrice = nextThreshold !== null
        ? Math.min(remaining, nextThreshold - cursor)
        : remaining;

      const subtotal = currentPrice.mul(new BN(callsAtPrice));
      totalCost = totalCost.add(subtotal);
      tiers.push({ calls: callsAtPrice, pricePerCall: currentPrice, subtotal });

      remaining -= callsAtPrice;
      cursor += callsAtPrice;
    }

    const effectivePricePerCall = calls > 0
      ? totalCost.div(new BN(calls))
      : new BN(0);

    return {
      totalCost,
      calls,
      effectivePricePerCall,
      hasVolumeCurve: true,
      tiers,
    };
  }

  // ── Escrow Lifecycle (Client Side) ───────────────────

  /**
   * @name preparePayment
   * @description Prepare an x402 payment flow — creates and funds an escrow.
   * Derives the escrow PDA, sends the `createEscrow` instruction, and returns
   * a {@link PaymentContext} for building x402 headers.
   *
   * @param agentWallet - The agent’s wallet public key.
   * @param opts - Payment options (price, max calls, deposit, etc.).
   * @returns A {@link PaymentContext} with escrow details and transaction signature.
   * @since v0.1.0
   * @deprecated Since v0.7.0 — Creates a V1 escrow. Use `client.escrowV2.create()` for
   * V2 escrows with dispute windows, co-signing, and settlement security.
   *
   * @example
   * ```ts
   * const ctx = await x402.preparePayment(agentWallet, {
   *   pricePerCall: 1000,
   *   maxCalls: 100,
   *   deposit: 100_000,
   * });
   * ```
   */
  async preparePayment(
    agentWallet: PublicKey,
    opts: PreparePaymentOptions,
  ): Promise<PaymentContext> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = deriveEscrow(agentPda, this.wallet);

    const pricePerCall = new BN(opts.pricePerCall.toString());
    const maxCalls = new BN((opts.maxCalls ?? 0).toString());
    const initialDeposit = new BN(opts.deposit.toString());
    const expiresAt = new BN((opts.expiresAt ?? 0).toString());

    const volumeCurve: VolumeCurveBreakpoint[] = (opts.volumeCurve ?? []).map(
      (v) => ({
        afterCalls: v.afterCalls,
        pricePerCall: new BN(v.pricePerCall.toString()),
      }),
    );

    const txSignature = await this.methods
      .createEscrow(
        pricePerCall,
        maxCalls,
        initialDeposit,
        expiresAt,
        volumeCurve,
        opts.tokenMint ?? null,
        opts.tokenDecimals ?? 9,
      )
      .accounts({
        depositor: this.wallet,
        agent: agentPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      escrowPda,
      agentPda,
      agentWallet,
      depositorWallet: this.wallet,
      pricePerCall,
      maxCalls,
      txSignature,
      networkIdentifier: opts.networkIdentifier ?? SapNetwork.SOLANA_MAINNET,
    };
  }

  /**
   * @name addFunds
   * @description Add more funds to an existing escrow.
   *
   * @param agentWallet - Agent wallet of the escrow.
   * @param amount - Amount to deposit in smallest token unit.
   * @returns The transaction signature.
   * @since v0.1.0
   * @deprecated Since v0.7.0 — Operates on V1 escrows only. Use `client.escrowV2.deposit()` instead.
   */
  async addFunds(
    agentWallet: PublicKey,
    amount: number | string | BN,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = deriveEscrow(agentPda, this.wallet);

    return this.methods
      .depositEscrow(new BN(amount.toString()))
      .accounts({
        depositor: this.wallet,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name withdrawFunds
   * @description Withdraw remaining funds from an escrow.
   *
   * @param agentWallet - Agent wallet of the escrow.
   * @param amount - Amount to withdraw in smallest token unit.
   * @returns The transaction signature.
   * @since v0.1.0
   * @deprecated Since v0.7.0 — Operates on V1 escrows only. Use `client.escrowV2.withdraw()` instead.
   */
  async withdrawFunds(
    agentWallet: PublicKey,
    amount: number | string | BN,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = deriveEscrow(agentPda, this.wallet);

    return this.methods
      .withdrawEscrow(new BN(amount.toString()))
      .accounts({
        depositor: this.wallet,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name closeEscrow
   * @description Close an empty escrow (balance must be 0).
   * Reclaims the rent-exempt lamports.
   *
   * @param agentWallet - Agent wallet of the escrow.
   * @returns The transaction signature.
   * @since v0.1.0
   * @deprecated Since v0.7.0 — Operates on V1 escrows only. Use `client.escrowV2.close()` instead.
   */
  async closeEscrow(agentWallet: PublicKey): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = deriveEscrow(agentPda, this.wallet);

    return this.methods
      .closeEscrow()
      .accounts({
        depositor: this.wallet,
        escrow: escrowPda,
      })
      .rpc();
  }

  // ── x402 HTTP Headers ────────────────────────────────

  /**
   * @name buildPaymentHeaders
   * @description Build x402 HTTP headers for API requests.
   * Include these headers when calling an agent’s x402 endpoint.
   *
   * @param ctx - Payment context from {@link X402Registry.preparePayment}.
   * @param opts - Optional settings.
   * @param opts.network - Solana cluster name (defaults to `"mainnet-beta"`).
   * @returns An {@link X402Headers} object ready to merge into HTTP requests.
   * @since v0.1.0
   */
  buildPaymentHeaders(
    ctx: PaymentContext,
    opts?: { network?: string },
  ): X402Headers {
    // Prefer: explicit override → ctx.networkIdentifier → default
    const rawNetwork =
      opts?.network ?? ctx.networkIdentifier ?? SapNetwork.SOLANA_MAINNET;

    return {
      "X-Payment-Protocol": "SAP-x402",
      "X-Payment-Escrow": ctx.escrowPda.toBase58(),
      "X-Payment-Agent": ctx.agentPda.toBase58(),
      "X-Payment-Depositor": ctx.depositorWallet.toBase58(),
      "X-Payment-MaxCalls": ctx.maxCalls.toString(),
      "X-Payment-PricePerCall": ctx.pricePerCall.toString(),
      "X-Payment-Program": this.program.programId.toBase58(),
      "X-Payment-Network": rawNetwork,
    };
  }

  /**
   * @name buildPaymentHeadersFromEscrow
   * @description Build x402 headers directly from an agent wallet (fetches escrow data).
   * Convenience method that fetches the escrow account on-chain.
   *
   * @param agentWallet - Agent wallet to look up the escrow for.
   * @param opts - Optional settings.
   * @param opts.network - Network identifier for the `X-Payment-Network` header.
   *   Defaults to `SapNetwork.SOLANA_MAINNET`.
   * @returns An {@link X402Headers} object, or `null` if no escrow exists.
   * @since v0.1.0
   */
  async buildPaymentHeadersFromEscrow(
    agentWallet: PublicKey,
    opts?: { network?: SapNetworkId | string },
  ): Promise<X402Headers | null> {
    const [agentPda] = deriveAgent(agentWallet);
    const resolved = await this.resolveEscrow(agentPda, this.wallet);
    if (!resolved) return null;

    const escrow = resolved.escrow;

    return {
      "X-Payment-Protocol": "SAP-x402",
      "X-Payment-Escrow": resolved.escrowPda.toBase58(),
      "X-Payment-Agent": agentPda.toBase58(),
      "X-Payment-Depositor": this.wallet.toBase58(),
      "X-Payment-MaxCalls": escrow.maxCalls.toString(),
      "X-Payment-PricePerCall": escrow.pricePerCall.toString(),
      "X-Payment-Program": this.program.programId.toBase58(),
      "X-Payment-Network": opts?.network ?? SapNetwork.SOLANA_MAINNET,
    };
  }

  // ── Settlement (Agent Side) ──────────────────────────

  /**
   * @name settle
   * @description Settle calls — agent claims payment for calls served.
   * Must be called by the agent owner wallet. Calculates the settlement
   * amount using the escrow’s pricing and volume curve.
   *
   * @param depositorWallet - The client wallet that funded the escrow.
   * @param callsToSettle - Number of calls to settle.
   * @param serviceData - Raw service data (auto-hashed to `service_hash`).
   * @param opts - Optional {@link SettleOptions} for priority fees and RPC tuning.
   * @returns A {@link SettlementResult} with transaction details and amount.
   * @since v0.1.0
   * @updated v0.6.2 — Added optional `opts` parameter for priority fees.
   *
   * @example
   * ```ts
   * // Default (no priority fee)
   * const receipt = await x402.settle(depositor, 1, "data");
   *
   * // Fast settlement with priority fee
   * import { FAST_SETTLE_OPTIONS } from "@synapse-sap/sdk";
   * const receipt = await x402.settle(depositor, 1, "data", FAST_SETTLE_OPTIONS);
   *
   * // Custom priority fee
   * const receipt = await x402.settle(depositor, 1, "data", {
   *   priorityFeeMicroLamports: 10_000,
   *   computeUnits: 100_000,
   *   skipPreflight: true,
   * });
   * ```
   */
  async settle(
    depositorWallet: PublicKey,
    callsToSettle: number,
    serviceData: string | Buffer | Uint8Array,
    opts?: SettleOptions,
  ): Promise<SettlementResult> {
    const serviceHash = hashToArray(
      sha256(typeof serviceData === "string" ? serviceData : Buffer.from(serviceData)),
    );

    const [agentPda] = deriveAgent(this.wallet);
    const [statsPda] = deriveAgentStats(agentPda);

    // Auto-detect escrow version
    const resolved = await this.resolveEscrow(agentPda, depositorWallet);
    if (!resolved) {
      throw new Error("No escrow found for this agent + depositor pair");
    }

    const escrow = resolved.escrow;
    const escrowPda = resolved.escrowPda;
    const estimate = this.calculateCost(
      escrow.pricePerCall,
      escrow.volumeCurve,
      escrow.totalCallsSettled.toNumber(),
      callsToSettle,
    );

    // Build priority fee instructions (empty array if no opts)
    const preIxs = buildPriorityFeeIxs(opts);
    const rpcOpts = buildRpcOptions(opts);

    let builder;
    if (resolved.version === 2) {
      // V2: settleCallsV2 requires escrow_nonce (default 0)
      builder = this.methods
        .settleCallsV2(new BN(0), new BN(callsToSettle), serviceHash)
        .accounts({
          wallet: this.wallet,
          agent: agentPda,
          agentStats: statsPda,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        });
    } else {
      builder = this.methods
        .settleCalls(new BN(callsToSettle), serviceHash)
        .accounts({
          wallet: this.wallet,
          agent: agentPda,
          agentStats: statsPda,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        });
    }

    if (preIxs.length > 0) {
      builder = builder.preInstructions(preIxs);
    }

    const txSignature = await builder.rpc(rpcOpts);

    return {
      txSignature,
      callsSettled: callsToSettle,
      amount: estimate.totalCost,
      serviceHash,
    };
  }

  /**
   * @name settleBatch
   * @description Batch settle — process up to 10 settlements in one TX.
   * Must be called by the agent owner wallet. More gas-efficient than
   * individual settlements.
   *
   * Optionally accepts {@link SettleOptions} to configure priority fees,
   * compute budget, and RPC behavior for faster confirmation.
   *
   * @param depositorWallet - The client wallet that funded the escrow.
   * @param entries - Array of `{ calls, serviceData }` settlement entries.
   * @param opts - Optional {@link SettleOptions} for priority fees and RPC tuning.
   * @returns A {@link BatchSettlementResult} with aggregated totals.
   * @since v0.1.0
   * @updated v0.6.2 — Added optional `opts` parameter for priority fees.
   *
   * @example
   * ```ts
   * import { FAST_BATCH_SETTLE_OPTIONS } from "@synapse-sap/sdk";
   * const receipt = await x402.settleBatch(depositor, entries, FAST_BATCH_SETTLE_OPTIONS);
   * ```
   */
  async settleBatch(
    depositorWallet: PublicKey,
    entries: Array<{
      calls: number;
      serviceData: string | Buffer | Uint8Array;
    }>,
    opts?: SettleOptions,
  ): Promise<BatchSettlementResult> {
    const settlements: Settlement[] = entries.map((e) => ({
      callsToSettle: new BN(e.calls),
      serviceHash: hashToArray(
        sha256(typeof e.serviceData === "string" ? e.serviceData : Buffer.from(e.serviceData)),
      ),
    }));

    const totalCalls = entries.reduce((sum, e) => sum + e.calls, 0);

    const [agentPda] = deriveAgent(this.wallet);
    const [statsPda] = deriveAgentStats(agentPda);

    // Auto-detect escrow version
    const resolved = await this.resolveEscrow(agentPda, depositorWallet);
    if (!resolved) {
      throw new Error("No escrow found for this agent + depositor pair");
    }

    const escrow = resolved.escrow;
    const escrowPda = resolved.escrowPda;
    const estimate = this.calculateCost(
      escrow.pricePerCall,
      escrow.volumeCurve,
      escrow.totalCallsSettled.toNumber(),
      totalCalls,
    );

    // Build priority fee instructions (empty array if no opts)
    const preIxs = buildPriorityFeeIxs(opts);
    const rpcOpts = buildRpcOptions(opts);

    let builder = this.methods
      .settleBatch(settlements)
      .accounts({
        wallet: this.wallet,
        agent: agentPda,
        agentStats: statsPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      });

    if (preIxs.length > 0) {
      builder = builder.preInstructions(preIxs);
    }

    const txSignature = await builder.rpc(rpcOpts);

    return {
      txSignature,
      totalCalls,
      totalAmount: estimate.totalCost,
      settlementCount: entries.length,
    };
  }

  // ── Balance & Status ─────────────────────────────────

  /**
   * @name getBalance
   * @description Get the current escrow balance and status.
   * Returns balance, deposit/settlement totals, remaining calls,
   * expiry status, and affordable call estimate.
   *
   * @param agentWallet - Agent wallet of the escrow.
   * @param depositor - Depositor wallet (defaults to caller).
   * @returns An {@link EscrowBalance}, or `null` if no escrow exists.
   * @since v0.1.0
   */
  async getBalance(
    agentWallet: PublicKey,
    depositor?: PublicKey,
  ): Promise<EscrowBalance | null> {
    const [agentPda] = deriveAgent(agentWallet);
    const dep = depositor ?? this.wallet;

    const resolved = await this.resolveEscrow(agentPda, dep);
    if (!resolved) return null;

    const escrow = resolved.escrow;
    const now = Math.floor(Date.now() / 1000);
    const isExpired = escrow.expiresAt.toNumber() > 0 && now >= escrow.expiresAt.toNumber();
    const maxCalls = escrow.maxCalls.toNumber();
    const settled = escrow.totalCallsSettled.toNumber();
    const callsRemaining = maxCalls > 0 ? maxCalls - settled : Infinity;

    const pricePerCall = escrow.pricePerCall.toNumber();
    const balance = escrow.balance.toNumber();
    const affordableCalls = pricePerCall > 0
      ? Math.floor(balance / pricePerCall)
      : Infinity;

    return {
      balance: escrow.balance,
      totalDeposited: escrow.totalDeposited,
      totalSettled: escrow.totalSettled,
      totalCallsSettled: escrow.totalCallsSettled,
      callsRemaining: Math.min(callsRemaining, affordableCalls),
      isExpired,
      affordableCalls,
    };
  }

  /**
   * @name hasEscrow
   * @description Check if an escrow exists for a given agent + depositor pair.
   *
   * @param agentWallet - Agent wallet to check.
   * @param depositor - Depositor wallet (defaults to caller).
   * @returns `true` if the escrow account exists on-chain.
   * @since v0.1.0
   */
  async hasEscrow(
    agentWallet: PublicKey,
    depositor?: PublicKey,
  ): Promise<boolean> {
    const [agentPda] = deriveAgent(agentWallet);
    const dep = depositor ?? this.wallet;
    const conn = this.program.provider.connection;

    // Check V2 first (nonce=0)
    const [v2Pda] = deriveEscrowV2(agentPda, dep, 0);
    const v2Info = await conn.getAccountInfo(v2Pda);
    if (v2Info !== null) return true;

    // Fall back to V1
    const [v1Pda] = deriveEscrow(agentPda, dep);
    const v1Info = await conn.getAccountInfo(v1Pda);
    return v1Info !== null;
  }

  /**
   * @name fetchEscrow
   * @description Fetch the raw escrow account data.
   *
   * @param agentWallet - Agent wallet of the escrow.
   * @param depositor - Depositor wallet (defaults to caller).
   * @returns The raw {@link EscrowAccountData}, or `null` if not found.
   * @since v0.1.0
   */
  async fetchEscrow(
    agentWallet: PublicKey,
    depositor?: PublicKey,
  ): Promise<EscrowAccountData | EscrowAccountV2Data | null> {
    const [agentPda] = deriveAgent(agentWallet);
    const dep = depositor ?? this.wallet;
    const resolved = await this.resolveEscrow(agentPda, dep);
    return resolved?.escrow ?? null;
  }

  // ── Internals ────────────────────────────────────────

  /**
   * @name methods
   * @description Accessor for the Anchor program methods namespace.
   * @returns The program methods object for building RPC calls.
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get methods(): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.program.methods;
  }

  /**
   * @name fetchNullable
   * @description Fetch an on-chain account by name and PDA. Returns `null` if not found.
   * @param name - Anchor account discriminator name.
   * @param pda - Account public key to fetch.
   * @returns The deserialized account data, or `null` if the account does not exist.
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchNullable<T>(name: string, pda: PublicKey): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[name].fetchNullable(pda) as Promise<T | null>;
  }

  /**
   * @name resolveEscrow
   * @description Try to find an escrow: V2 (nonce=0) first, then V1 fallback.
   * Returns the escrow data, PDA, and version indicator.
   * @private
   */
  private async resolveEscrow(
    agentPda: PublicKey,
    depositor: PublicKey,
  ): Promise<{
    escrow: EscrowAccountData | EscrowAccountV2Data;
    escrowPda: PublicKey;
    version: 1 | 2;
  } | null> {
    // Try V2 first (nonce=0 is the default)
    const [v2Pda] = deriveEscrowV2(agentPda, depositor, 0);
    const v2 = await this.fetchNullable<EscrowAccountV2Data>(
      "escrowAccountV2",
      v2Pda,
    );
    if (v2) return { escrow: v2, escrowPda: v2Pda, version: 2 };

    // Fall back to V1
    const [v1Pda] = deriveEscrow(agentPda, depositor);
    const v1 = await this.fetchNullable<EscrowAccountData>(
      "escrowAccount",
      v1Pda,
    );
    if (v1) return { escrow: v1, escrowPda: v1Pda, version: 1 };

    return null;
  }
}
