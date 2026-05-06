// ================================================================
//  synapse-sap-sdk / src/index.ts
//  Barrel export — tree-shakeable by submodule
// ================================================================
export { SapErrorCode, decodeSapError, isRetryableError, isClientValidationFailure } from "./errors";
export * as Pdas from "./pdas";
export * as Accounts from "./accounts";
export * as Events from "./events";
export * as Utils from "./utils";
export { validateAgentInput, validateEscrowCreate, validateEscrowDeposit, validateEscrowSettle, validateEscrowClose, validateAgentClose, validateSubscriptionCreate, validateReceiptProof, computeEscrowMaxObligation, calculateSettleAmount } from "./utils/validate";
//# sourceMappingURL=index.js.map