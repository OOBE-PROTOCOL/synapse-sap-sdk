/**
 * @module modules
 * @description Barrel export for all domain modules of the `@synapse-sap/sdk`.
 *
 * Re-exports every module class so consumers can import from a single entry point:
 * ```ts
 * import { AgentModule, VaultModule } from "@synapse-sap/sdk/modules";
 * ```
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
 */

export { AgentModule } from "./agent";
export { FeedbackModule } from "./feedback";
export { IndexingModule } from "./indexing";
export { ToolsModule } from "./tools";
export { VaultModule } from "./vault";
export { EscrowModule } from "./escrow";
export { EscrowV2Module } from "./escrow-v2";
export { StakingModule } from "./staking";
export { SubscriptionModule } from "./subscription";
export { AttestationModule } from "./attestation";
export { LedgerModule } from "./ledger";
export { BaseModule } from "./base";
export type { SapProgram, SapTransactionResult } from "./base";
