import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { SettlementSecurity, VolumeCurvePoint, BillingInterval } from "../types";
export interface ValidationResult {
    ok: boolean;
    errors: string[];
}
/** Validate agent creation parameters */
export declare function validateAgentInput(params: {
    name: string;
    endpointUri: string;
}): ValidationResult;
/** Compute max_obligation for an escrow (must match on-chain logic) */
export declare function computeEscrowMaxObligation(pricePerCall: BN, maxCalls: BN, initialDeposit: BN): BN;
/** Validate escrow V2 creation parameters (mirrors create_escrow_v2 on-chain checks) */
export declare function validateEscrowCreate(params: {
    pricePerCall: BN;
    basePrice: BN;
    maxCalls: BN;
    initialDeposit: BN;
    expiresAt: BN;
    settlementSecurity: SettlementSecurity;
    coSigner: PublicKey | null;
    arbiter: PublicKey | null;
    disputeWindowSlots: number;
    volumeCurve: VolumeCurvePoint[];
    agentWallet: PublicKey;
}): ValidationResult;
/** Validate deposit parameters */
export declare function validateEscrowDeposit(params: {
    amount: BN;
    escrowMaxObligation: BN;
    escrowBalance: BN;
    escrowPendingAmount: BN;
}): ValidationResult;
/** Validate settle_calls_v2 parameters (pre-computation) */
export declare function validateEscrowSettle(params: {
    callsToSettle: number;
    escrowBalance: BN;
    escrowPendingAmount: BN;
    escrowTotalCallsSettled: BN;
    escrowPendingCalls: BN;
    escrowMaxCalls: BN;
    pricePerCall: BN;
    basePrice?: BN;
    volumeCurve?: VolumeCurvePoint[];
}): {
    ok: boolean;
    errors: string[];
    amount: BN;
};
/** Client-side mirror of on-chain calculate_settle_amount (v0.13) */
export declare function calculateSettleAmount(pricePerCall: BN, basePrice: BN, volumeCurve: VolumeCurvePoint[], calls: number): BN;
/** Validate receipt proof submission (C4 bounds check) */
export declare function validateReceiptProof(receiptHashes: Uint8Array[], merkleProofs: Uint8Array[][]): ValidationResult;
/** Validate subscription parameters */
export declare function validateSubscriptionCreate(params: {
    billingInterval: BillingInterval;
    pricePerInterval: BN;
    durationIntervals: number;
}): ValidationResult;
/** Validate close_escrow_v2 can proceed (H8 check) */
export declare function validateEscrowClose(pendingSettlementCount: number, balance: BN, pendingAmount: BN): ValidationResult;
/** Validate agent close (stake + active_escrows) */
export declare function validateAgentClose(stakedAmount: BN, activeEscrows: number, unstakeAvailableAt: BN): ValidationResult;
//# sourceMappingURL=validate.d.ts.map