// ================================================================
//  synapse-sap-sdk / src/constants.ts
//  v0.13 Protocol Constants — Anchored to on-chain parameters
// ================================================================

export const PROGRAM_ID = "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ" as const;

export const DISCRIMINATOR_SIZE = 8;
export const PUBKEY_SIZE       = 32;
export const U8_SIZE           = 1;
export const U16_SIZE          = 2;
export const U32_SIZE          = 4;
export const U64_SIZE          = 8;
export const U128_SIZE         = 16;
export const I64_SIZE          = 8;
export const BOOL_SIZE         = 1;
export const OPTION_SIZE       = 1 + 32; // Option<Pubkey>

/** On-chain security limits (v0.13 hardened) */
export const MAX_CALLS_PER_SETTLEMENT = 10_000;
export const MAX_VOLUME_CURVE_POINTS  = 10;
export const MAX_RECEIPTS_PER_PROOF   = 128;
export const MAX_MERKLE_DEPTH         = 16;
export const MAX_SUBSCRIPTION_DURATION_YEARS = 10;

export const STAKE_COVERAGE_BPS = 5_000;           // 50%
export const MIN_STAKE_LAMPORTS = 1_000_000_000;   // 1 SOL
export const COMPLETE_UNSTAKE_DELAY_DAYS = 14;

/** Escrow PDA seeds (must match program) */
export const SEEDS = {
  AGENT:           "sap_agent",
  AGENT_STATS:     "sap_stats",
  AGENT_STAKE:     "sap_stake",
  ESCROW_V2:       "sap_escrow_v2",
  PENDING_SETTLE:  "sap_pending",
  DISPUTE:         "sap_dispute",
  SUBSCRIPTION:    "sap_subscription",
  VAULT:           "sap_vault",
  SESSION:         "sap_session",
  EPOCH_PAGE:      "sap_epoch",
  VAULT_DELEGATE:  "sap_delegate",
  CAPABILITY_IDX:  "sap_cap_idx",
  PROTOCOL_IDX:    "sap_proto_idx",
  TOOL_CAT_IDX:    "sap_tool_cat",
  TOOL:            "sap_tool",
  RECEIPT_BATCH:   "sap_receipt",
  REFERRAL:        "sap_referral",
  AFFILIATE:       "sap_affiliate",
  RAKE_VAULT:      "sap_rake_vault",
  GLOBAL:          "sap_global",
} as const;

/** Default commitment for all RPC calls */
export const DEFAULT_COMMITMENT = "confirmed" as const;

/** Network endpoints */
export const ENDPOINTS = {
  MAINNET: "https://api.mainnet-beta.solana.com",
  DEVNET:  "https://api.devnet.solana.com",
  TESTNET: "https://api.testnet.solana.com",
} as const;
