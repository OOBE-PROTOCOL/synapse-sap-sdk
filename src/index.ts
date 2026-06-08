// ================================================================
//  synapse-sap-sdk / src/index.ts
//  Public barrel export
// ================================================================

export { SapClient, createSapClient } from "./core/client";
export type { SapClientOpts } from "./core/client";
export { SapConnection, KeypairWallet } from "./core/connection";
export type { SapCluster, SapConnectionConfig, SapWallet } from "./core/connection";

export * from "./constants";
export * from "./idlTypes";
export * from "./errors";

export * as Pdas from "./pdas";
export * as Pda from "./pda";
export * as Accounts from "./accounts";
export * as Events from "./events";
export * as Instructions from "./instructions";
export * as Modules from "./modules";
export * as Registries from "./registries";
export * as Parser from "./parser";
export * as Plugin from "./plugin";
export * as Postgres from "./postgres";
export * as Utils from "./utils";

export {
  validateAgentInput,
  validateEscrowCreate,
  validateEscrowDeposit,
  validateEscrowSettle,
  validateEscrowClose,
  validateAgentClose,
  validateSubscriptionCreate,
  validateReceiptProof,
  computeEscrowMaxObligation,
} from "./utils/validate";
