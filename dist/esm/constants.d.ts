export declare const PROGRAM_ID: "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ";
export declare const DISCRIMINATOR_SIZE = 8;
export declare const PUBKEY_SIZE = 32;
export declare const U8_SIZE = 1;
export declare const U16_SIZE = 2;
export declare const U32_SIZE = 4;
export declare const U64_SIZE = 8;
export declare const U128_SIZE = 16;
export declare const I64_SIZE = 8;
export declare const BOOL_SIZE = 1;
export declare const OPTION_SIZE: number;
/** On-chain security limits (v0.13 hardened) */
export declare const MAX_CALLS_PER_SETTLEMENT = 10000;
export declare const MAX_VOLUME_CURVE_POINTS = 10;
export declare const MAX_RECEIPTS_PER_PROOF = 128;
export declare const MAX_MERKLE_DEPTH = 16;
export declare const MAX_SUBSCRIPTION_DURATION_YEARS = 10;
export declare const STAKE_COVERAGE_BPS = 5000;
export declare const MIN_STAKE_LAMPORTS = 1000000000;
export declare const COMPLETE_UNSTAKE_DELAY_DAYS = 14;
/** Escrow PDA seeds (must match program) */
export declare const SEEDS: {
    readonly AGENT: "sap_agent";
    readonly AGENT_STATS: "sap_stats";
    readonly AGENT_STAKE: "sap_stake";
    readonly ESCROW_V2: "sap_escrow_v2";
    readonly PENDING_SETTLE: "sap_pending";
    readonly DISPUTE: "sap_dispute";
    readonly SUBSCRIPTION: "sap_subscription";
    readonly VAULT: "sap_vault";
    readonly SESSION: "sap_session";
    readonly EPOCH_PAGE: "sap_epoch";
    readonly VAULT_DELEGATE: "sap_delegate";
    readonly CAPABILITY_IDX: "sap_cap_idx";
    readonly PROTOCOL_IDX: "sap_proto_idx";
    readonly TOOL_CAT_IDX: "sap_tool_cat";
    readonly TOOL: "sap_tool";
    readonly RECEIPT_BATCH: "sap_receipt";
    readonly REFERRAL: "sap_referral";
    readonly AFFILIATE: "sap_affiliate";
    readonly RAKE_VAULT: "sap_rake_vault";
    readonly GLOBAL: "sap_global";
};
/** Default commitment for all RPC calls */
export declare const DEFAULT_COMMITMENT: "confirmed";
/** Network endpoints */
export declare const ENDPOINTS: {
    readonly MAINNET: "https://api.mainnet-beta.solana.com";
    readonly DEVNET: "https://api.devnet.solana.com";
    readonly TESTNET: "https://api.testnet.solana.com";
};
//# sourceMappingURL=constants.d.ts.map