// ================================================================
//  synapse-sap-sdk / src/index.ts
//  Barrel export — v0.25.0 aligned
// ================================================================
export { PROGRAM_ID, SEEDS, ENDPOINTS, MAX_CALLS_PER_SETTLEMENT, MAX_VOLUME_CURVE_POINTS, MAX_RECEIPTS_PER_PROOF, MAX_MERKLE_DEPTH, MAX_SUBSCRIPTION_DURATION_YEARS, STAKE_COVERAGE_BPS, MIN_STAKE_LAMPORTS, COMPLETE_UNSTAKE_DELAY_DAYS } from './constants';
// Re-export IDL-generated types FIRST (single source of truth)
export * from './idlTypes';
export { SapErrorCode, decodeSapError, isRetryableError, isClientValidationFailure } from './errors';
export { SapClient, createSapClient } from './client';
export * as Pdas from './pdas';
export * as Accounts from './accounts';
export * as Events from './events';
export * as Instructions from './instructions';
export * as Utils from './utils';
export { validateAgentInput, validateEscrowCreate, validateEscrowDeposit, validateEscrowSettle, validateEscrowClose, validateAgentClose, validateSubscriptionCreate, validateReceiptProof, computeEscrowMaxObligation } from './utils/validate';
//# sourceMappingURL=index.js.map