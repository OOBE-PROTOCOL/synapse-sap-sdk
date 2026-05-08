// ================================================================
//  synapse-sap-sdk / src/constants.ts
//  Protocol Constants — compatibility barrel
// ================================================================

import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ";
export const SAP_PROGRAM_ID: PublicKey = new PublicKey(PROGRAM_ID);
export const MAINNET_SAP_PROGRAM_ID: PublicKey = new PublicKey(PROGRAM_ID);
export const DEVNET_SAP_PROGRAM_ID:  PublicKey = new PublicKey(PROGRAM_ID);
export const LOCALNET_SAP_PROGRAM_ID: PublicKey = new PublicKey(PROGRAM_ID);

export {
  SAP_PROGRAM_ADDRESS,
} from "./constants/programs";
export { SEEDS } from "./constants/seeds";
export type { SeedKey } from "./constants/seeds";
export {
  LIMITS,
  AGENT_VERSION,
  VAULT_PROTOCOL_VERSION,
  TOOL_CATEGORY_VALUES,
  HTTP_METHOD_VALUES,
} from "./constants/limits";
export { SapNetwork } from "./constants/network";
export type { SapNetworkId } from "./constants/network";
export {
  SAP_PROGRAM,
  SAP_UPGRADE_AUTHORITY,
  GLOBAL_REGISTRY_ADDRESS,
  GLOBAL_REGISTRY_BUMP,
  IDL_ACCOUNT_ADDRESS,
  PROGRAM_METADATA_PROGRAM,
  TOOL_CATEGORY_ADDRESSES,
  TOOL_CATEGORY_ADDRESS_LIST,
} from "./constants/addresses";
export {
  USDC_MINT_MAINNET,
  USDC_MINT_DEVNET,
  MIN_AGENT_STAKE_LAMPORTS,
  MAX_DELEGATE_DURATION_SECS,
  isAcceptedUsdcMint,
  isAcceptedPaymentToken,
} from "./constants/payments";

export const DISCRIMINATOR_SIZE = 8;
export const PUBKEY_SIZE       = 32;
export const U8_SIZE           = 1;
export const U16_SIZE          = 2;
export const U32_SIZE          = 4;
export const U64_SIZE          = 8;
export const U128_SIZE         = 16;
export const I64_SIZE          = 8;
export const BOOL_SIZE         = 1;
export const OPTION_SIZE       = 1 + 32;

export const MAX_CALLS_PER_SETTLEMENT = 10_000;
export const MAX_VOLUME_CURVE_POINTS  = 10;
export const MAX_RECEIPTS_PER_PROOF   = 128;
export const MAX_MERKLE_DEPTH         = 16;
export const MAX_SUBSCRIPTION_DURATION_YEARS = 10;
export const STAKE_COVERAGE_BPS = 5_000;
export const MIN_STAKE_LAMPORTS = 1_000_000_000;
export const COMPLETE_UNSTAKE_DELAY_DAYS = 14;

export const DEFAULT_COMMITMENT = "confirmed" as const;
export const ENDPOINTS = {
  MAINNET: "https://api.mainnet-beta.solana.com",
  DEVNET:  "https://api.devnet.solana.com",
  TESTNET: "https://api.testnet.solana.com",
} as const;
