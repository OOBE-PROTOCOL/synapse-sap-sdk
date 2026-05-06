"use strict";
// ================================================================
//  synapse-sap-sdk / src/utils/validate.ts
//  Client-side validation — mirrors every on-chain check (v0.13)
// ================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAgentInput = validateAgentInput;
exports.computeEscrowMaxObligation = computeEscrowMaxObligation;
exports.validateEscrowCreate = validateEscrowCreate;
exports.validateEscrowDeposit = validateEscrowDeposit;
exports.validateEscrowSettle = validateEscrowSettle;
exports.calculateSettleAmount = calculateSettleAmount;
exports.validateReceiptProof = validateReceiptProof;
exports.validateSubscriptionCreate = validateSubscriptionCreate;
exports.validateEscrowClose = validateEscrowClose;
exports.validateAgentClose = validateAgentClose;
const bn_js_1 = __importDefault(require("bn.js"));
const types_1 = require("../types");
const constants_1 = require("../constants");
function fail(msg) {
    return { ok: false, errors: [msg] };
}
function ok() {
    return { ok: true, errors: [] };
}
/** Validate agent creation parameters */
function validateAgentInput(params) {
    if (params.name.length < 3)
        return fail("Agent name must be ≥3 characters");
    if (params.name.length > 64)
        return fail("Agent name must be ≤64 characters");
    if (params.endpointUri.length > 256)
        return fail("Endpoint URI must be ≤256 characters");
    if (!/^https?:\/\//.test(params.endpointUri))
        return fail("Endpoint URI must start with http:// or https://");
    return ok();
}
/** Compute max_obligation for an escrow (must match on-chain logic) */
function computeEscrowMaxObligation(pricePerCall, maxCalls, initialDeposit) {
    // If maxCalls == 0 → unlimited calls: cap at initialDeposit (v0.13 logic)
    if (maxCalls.isZero())
        return initialDeposit;
    const maxPotential = pricePerCall.mul(maxCalls);
    // On-chain: required = maxPotential * 50% (5000 bps)
    const coverage = maxPotential.mul(new bn_js_1.default(constants_1.STAKE_COVERAGE_BPS)).div(new bn_js_1.default(10000));
    const min = new bn_js_1.default(constants_1.MIN_STAKE_LAMPORTS);
    return bn_js_1.default.max(coverage, min);
}
/** Validate escrow V2 creation parameters (mirrors create_escrow_v2 on-chain checks) */
function validateEscrowCreate(params) {
    const errors = [];
    // C1: price_per_call > 0
    if (params.pricePerCall.isZero()) {
        errors.push("[C1] price_per_call must be > 0");
    }
    // H6: escrow cannot be already expired
    const nowSec = Math.floor(Date.now() / 1000);
    if (!params.expiresAt.isZero() && params.expiresAt.lt(new bn_js_1.default(nowSec))) {
        errors.push(`[H6] expires_at (${params.expiresAt}) is in the past (${nowSec})`);
    }
    // Volume curve validation
    if (params.volumeCurve.length > constants_1.MAX_VOLUME_CURVE_POINTS) {
        errors.push(`[C1] Volume curve exceeds ${constants_1.MAX_VOLUME_CURVE_POINTS} points`);
    }
    for (let i = 0; i < params.volumeCurve.length; i++) {
        const bp = params.volumeCurve[i];
        // C1: price_per_call > 0 for every breakpoint
        if (bp.pricePerCall.isZero()) {
            errors.push(`[C1] Volume curve[${i}] price_per_call must be > 0`);
        }
        // Strictly increasing after_calls
        if (i > 0 && bp.afterCalls <= params.volumeCurve[i - 1].afterCalls) {
            errors.push(`[C1] Volume curve[${i}] after_calls must be > previous`);
        }
        // Non-increasing prices
        if (i > 0 && bp.pricePerCall.gt(params.volumeCurve[i - 1].pricePerCall)) {
            errors.push(`[C1] Volume curve[${i}] price must be ≤ previous`);
        }
    }
    // Settlement security specific
    if (params.settlementSecurity === types_1.SettlementSecurity.CoSigned) {
        if (!params.coSigner) {
            errors.push("[H9] CoSigned mode requires a co_signer");
        }
        else if (params.coSigner.equals(params.agentWallet)) {
            errors.push("[H9] co_signer cannot be the agent wallet itself");
        }
    }
    if (params.settlementSecurity === types_1.SettlementSecurity.DisputeWindow) {
        if (params.disputeWindowSlots === 0) {
            errors.push("[H6] DisputeWindow mode requires dispute_window_slots > 0");
        }
        if (!params.arbiter) {
            errors.push("[H6] DisputeWindow mode requires an arbiter");
        }
    }
    return errors.length > 0 ? { ok: false, errors } : ok();
}
/** Validate deposit parameters */
function validateEscrowDeposit(params) {
    const errors = [];
    if (params.amount.isZero())
        errors.push("[C2] Deposit amount must be > 0");
    // H-2: projection must not exceed max_obligation (if set)
    if (!params.escrowMaxObligation.isZero()) {
        const projected = params.escrowBalance.add(params.amount);
        if (projected.gt(params.escrowMaxObligation)) {
            errors.push(`[H2] Deposit would exceed max_obligation (${projected.toString()} > ${params.escrowMaxObligation.toString()})`);
        }
    }
    return errors.length > 0 ? { ok: false, errors } : ok();
}
/** Validate settle_calls_v2 parameters (pre-computation) */
function validateEscrowSettle(params) {
    const errors = [];
    if (params.callsToSettle <= 0)
        errors.push("callsToSettle must be > 0");
    // C1: max calls per settlement ≤ 10,000
    if (params.callsToSettle > constants_1.MAX_CALLS_PER_SETTLEMENT) {
        errors.push(`[C1] callsToSettle (${params.callsToSettle}) exceeds MAX_CALLS_PER_SETTLEMENT (${constants_1.MAX_CALLS_PER_SETTLEMENT})`);
    }
    const callsBN = new bn_js_1.default(params.callsToSettle);
    // Max calls check
    if (!params.escrowMaxCalls.isZero()) {
        const projected = params.escrowTotalCallsSettled
            .add(params.escrowPendingCalls)
            .add(callsBN);
        if (projected.gt(params.escrowMaxCalls)) {
            errors.push(`Max calls would be exceeded (${projected.toString()} > ${params.escrowMaxCalls.toString()})`);
        }
    }
    // Compute amount (client-side mirror of calculate_settle_amount)
    const amount = calculateSettleAmount(params.pricePerCall, params.basePrice ?? params.pricePerCall, params.volumeCurve ?? [], params.callsToSettle);
    // Available balance check
    const available = params.escrowBalance.sub(params.escrowPendingAmount);
    if (available.lt(amount)) {
        errors.push(`Insufficient balance: available ${available.toString()} < required ${amount.toString()}`);
    }
    return errors.length > 0 ? { ok: false, errors, amount: new bn_js_1.default(0) } : { ok: true, errors: [], amount };
}
/** Client-side mirror of on-chain calculate_settle_amount (v0.13) */
function calculateSettleAmount(pricePerCall, basePrice, volumeCurve, calls) {
    if (calls <= 0)
        return new bn_js_1.default(0);
    if (volumeCurve.length === 0) {
        return pricePerCall.mul(new bn_js_1.default(calls));
    }
    let amount = new bn_js_1.default(0);
    let remaining = calls;
    let cursor = 0;
    let currentPrice = basePrice;
    while (remaining > 0) {
        // Find applicable breakpoint
        let threshold = 0;
        for (const bp of volumeCurve) {
            if (cursor >= bp.afterCalls) {
                currentPrice = bp.pricePerCall;
            }
            else {
                threshold = bp.afterCalls;
                break;
            }
        }
        const range = threshold === 0
            ? remaining
            : Math.min(threshold - cursor, remaining);
        amount = amount.add(new bn_js_1.default(range).mul(currentPrice));
        remaining -= range;
        cursor += range;
        // Safety: break if stuck
        if (range === 0)
            break;
    }
    return amount;
}
/** Validate receipt proof submission (C4 bounds check) */
function validateReceiptProof(receiptHashes, merkleProofs) {
    const errors = [];
    if (receiptHashes.length > constants_1.MAX_RECEIPTS_PER_PROOF) {
        errors.push(`[C4] receipt_hashes (${receiptHashes.length}) > MAX_RECEIPTS_PER_PROOF (${constants_1.MAX_RECEIPTS_PER_PROOF})`);
    }
    if (receiptHashes.length !== merkleProofs.length) {
        errors.push(`receipt_hashes.length (${receiptHashes.length}) !== merkleProofs.length (${merkleProofs.length})`);
    }
    for (let i = 0; i < merkleProofs.length; i++) {
        if (merkleProofs[i].length > constants_1.MAX_MERKLE_DEPTH) {
            errors.push(`[C4] merkleProofs[${i}] depth (${merkleProofs[i].length}) > MAX_MERKLE_DEPTH (${constants_1.MAX_MERKLE_DEPTH})`);
        }
    }
    return errors.length > 0 ? { ok: false, errors } : ok();
}
/** Validate subscription parameters */
function validateSubscriptionCreate(params) {
    const errors = [];
    // M13: cap duration at 10 years
    const maxIntervals = constants_1.MAX_SUBSCRIPTION_DURATION_YEARS * 365 * 24; // hourly max
    if (params.durationIntervals > maxIntervals && params.durationIntervals <= 0) {
        errors.push(`[M13] Duration exceeds ${constants_1.MAX_SUBSCRIPTION_DURATION_YEARS} years`);
    }
    if (params.pricePerInterval.isZero()) {
        errors.push("price_per_interval must be > 0");
    }
    return errors.length > 0 ? { ok: false, errors } : ok();
}
/** Validate close_escrow_v2 can proceed (H8 check) */
function validateEscrowClose(pendingSettlementCount, balance, pendingAmount) {
    const errors = [];
    if (pendingSettlementCount > 0) {
        errors.push(`[H8] Escrow has ${pendingSettlementCount} pending settlement(s). Finalize or dispute before closing.`);
    }
    if (balance.gt(new bn_js_1.default(0)) && !balance.eq(pendingAmount)) {
        errors.push("Escrow has non-pending balance remaining — withdraw first.");
    }
    return errors.length > 0 ? { ok: false, errors } : ok();
}
/** Validate agent close (stake + active_escrows) */
function validateAgentClose(stakedAmount, activeEscrows, unstakeAvailableAt) {
    const errors = [];
    if (!stakedAmount.isZero()) {
        errors.push("Agent has staked amount — unstake first.");
    }
    if (activeEscrows > 0) {
        errors.push(`[H1] Agent has ${activeEscrows} active escrow(s) — close all escrows first.`);
    }
    if (!unstakeAvailableAt.isZero() && stakedAmount.gt(new bn_js_1.default(0))) {
        const now = Math.floor(Date.now() / 1000);
        if (unstakeAvailableAt.gt(new bn_js_1.default(now))) {
            errors.push("Unstake cooldown has not expired yet.");
        }
    }
    return errors.length > 0 ? { ok: false, errors } : ok();
}
//# sourceMappingURL=validate.js.map