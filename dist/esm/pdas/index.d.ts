import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
/** Derive Agent PDA from wallet pubkey */
export declare function getAgentPDA(wallet: PublicKey): [PublicKey, number];
/** Derive AgentStats PDA from wallet pubkey */
export declare function getAgentStatsPDA(wallet: PublicKey): [PublicKey, number];
/** Derive AgentStake PDA from wallet pubkey */
export declare function getAgentStakePDA(wallet: PublicKey): [PublicKey, number];
/** Derive EscrowV2 PDA from agent wallet + nonce */
export declare function getEscrowV2PDA(agent: PublicKey, escrowNonce: number): [PublicKey, number];
/** Derive PendingSettlement PDA from escrow + settlement_index */
export declare function getPendingSettlementPDA(escrow: PublicKey, settlementIndex: BN | number): [PublicKey, number];
/** Derive Dispute PDA from escrow + settlement_index */
export declare function getDisputePDA(escrow: PublicKey, settlementIndex: BN | number): [PublicKey, number];
/** Derive Subscription PDA from agent + subscriber + nonce */
export declare function getSubscriptionPDA(agent: PublicKey, subscriber: PublicKey, nonce: number): [PublicKey, number];
/** Derive Vault PDA from agent pubkey */
export declare function getVaultPDA(agent: PublicKey): [PublicKey, number];
/** Derive SessionLedger PDA from vault + session number */
export declare function getSessionLedgerPDA(vault: PublicKey, session: BN | number): [PublicKey, number];
/** Derive EpochPage PDA from vault + epoch */
export declare function getEpochPagePDA(vault: PublicKey, epoch: BN | number): [PublicKey, number];
/** Derive VaultDelegate PDA from vault + delegate */
export declare function getVaultDelegatePDA(vault: PublicKey, delegate: PublicKey): [PublicKey, number];
/** Derive Tool PDA from agent + tool_name */
export declare function getToolPDA(agent: PublicKey, toolName: string): [PublicKey, number];
/** Derive ToolCategoryIndex PDA from category u8 */
export declare function getToolCategoryIndexPDA(category: number): [PublicKey, number];
/** Derive CapabilityIndex PDA from capability_hash (32 bytes) */
export declare function getCapabilityIndexPDA(capabilityHash: Uint8Array): [PublicKey, number];
/** Derive ProtocolIndex PDA from protocol_hash (32 bytes) */
export declare function getProtocolIndexPDA(protocolHash: Uint8Array): [PublicKey, number];
/** Derive GlobalConfig PDA (singleton) */
export declare function getGlobalPDA(): [PublicKey, number];
/** Convert a string to a 32-byte hash for capability/protocol indices */
export declare function hashString(s: string): Uint8Array;
//# sourceMappingURL=index.d.ts.map