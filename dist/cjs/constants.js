"use strict";
// ================================================================
//  synapse-sap-sdk / src/constants.ts
//  v0.13 Protocol Constants — Anchored to on-chain parameters
// ================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENDPOINTS = exports.DEFAULT_COMMITMENT = exports.SEEDS = exports.COMPLETE_UNSTAKE_DELAY_DAYS = exports.MIN_STAKE_LAMPORTS = exports.STAKE_COVERAGE_BPS = exports.MAX_SUBSCRIPTION_DURATION_YEARS = exports.MAX_MERKLE_DEPTH = exports.MAX_RECEIPTS_PER_PROOF = exports.MAX_VOLUME_CURVE_POINTS = exports.MAX_CALLS_PER_SETTLEMENT = exports.OPTION_SIZE = exports.BOOL_SIZE = exports.I64_SIZE = exports.U128_SIZE = exports.U64_SIZE = exports.U32_SIZE = exports.U16_SIZE = exports.U8_SIZE = exports.PUBKEY_SIZE = exports.DISCRIMINATOR_SIZE = exports.PROGRAM_ID = void 0;
exports.PROGRAM_ID = "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ";
exports.DISCRIMINATOR_SIZE = 8;
exports.PUBKEY_SIZE = 32;
exports.U8_SIZE = 1;
exports.U16_SIZE = 2;
exports.U32_SIZE = 4;
exports.U64_SIZE = 8;
exports.U128_SIZE = 16;
exports.I64_SIZE = 8;
exports.BOOL_SIZE = 1;
exports.OPTION_SIZE = 1 + 32; // Option<Pubkey>
/** On-chain security limits (v0.13 hardened) */
exports.MAX_CALLS_PER_SETTLEMENT = 10000;
exports.MAX_VOLUME_CURVE_POINTS = 10;
exports.MAX_RECEIPTS_PER_PROOF = 128;
exports.MAX_MERKLE_DEPTH = 16;
exports.MAX_SUBSCRIPTION_DURATION_YEARS = 10;
exports.STAKE_COVERAGE_BPS = 5000; // 50%
exports.MIN_STAKE_LAMPORTS = 1000000000; // 1 SOL
exports.COMPLETE_UNSTAKE_DELAY_DAYS = 14;
/** Escrow PDA seeds (must match program) */
exports.SEEDS = {
    AGENT: "sap_agent",
    AGENT_STATS: "sap_stats",
    AGENT_STAKE: "sap_stake",
    ESCROW_V2: "sap_escrow_v2",
    PENDING_SETTLE: "sap_pending",
    DISPUTE: "sap_dispute",
    SUBSCRIPTION: "sap_subscription",
    VAULT: "sap_vault",
    SESSION: "sap_session",
    EPOCH_PAGE: "sap_epoch",
    VAULT_DELEGATE: "sap_delegate",
    CAPABILITY_IDX: "sap_cap_idx",
    PROTOCOL_IDX: "sap_proto_idx",
    TOOL_CAT_IDX: "sap_tool_cat",
    TOOL: "sap_tool",
    RECEIPT_BATCH: "sap_receipt",
    REFERRAL: "sap_referral",
    AFFILIATE: "sap_affiliate",
    RAKE_VAULT: "sap_rake_vault",
    GLOBAL: "sap_global",
};
/** Default commitment for all RPC calls */
exports.DEFAULT_COMMITMENT = "confirmed";
/** Network endpoints */
exports.ENDPOINTS = {
    MAINNET: "https://api.mainnet-beta.solana.com",
    DEVNET: "https://api.devnet.solana.com",
    TESTNET: "https://api.testnet.solana.com",
};
//# sourceMappingURL=constants.js.map