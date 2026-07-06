/**
 * @module utils/anchor-errors
 * @description Full SAP program error table (147 entries, codes 6000-6146)
 *   plus decoder utilities. Mirrors `programs/synapse-agent-sap/src/errors.rs`.
 *
 *   Use {@link decodeAnchorError} to extract a structured error from any
 *   thrown RPC / simulation error. Use {@link SAP_ERRORS} for direct lookups.
 *
 * @category Utils
 * @since v0.13.0
 */

export interface SapErrorEntry { readonly code: number; readonly name: string; readonly msg: string; }
export const SAP_ERRORS: Readonly<Record<number, SapErrorEntry>> = Object.freeze({
  6000: { code: 6000, name: "NameTooLong", msg: "name>64" },
  6001: { code: 6001, name: "DescriptionTooLong", msg: "desc>256" },
  6002: { code: 6002, name: "UriTooLong", msg: "uri>256" },
  6003: { code: 6003, name: "TooManyCapabilities", msg: "caps>10" },
  6004: { code: 6004, name: "TooManyPricingTiers", msg: "tiers>5" },
  6005: { code: 6005, name: "TooManyProtocols", msg: "protos>5" },
  6006: { code: 6006, name: "TooManyPlugins", msg: "plugins>5" },
  6007: { code: 6007, name: "AlreadyActive", msg: "already active" },
  6008: { code: 6008, name: "AlreadyInactive", msg: "already inactive" },
  6009: { code: 6009, name: "InvalidFeedbackScore", msg: "score 0-1000" },
  6010: { code: 6010, name: "TagTooLong", msg: "tag>32" },
  6011: { code: 6011, name: "SelfReviewNotAllowed", msg: "self review" },
  6012: { code: 6012, name: "FeedbackAlreadyRevoked", msg: "already revoked" },
  6013: { code: 6013, name: "CapabilityIndexFull", msg: "cap idx full" },
  6014: { code: 6014, name: "ProtocolIndexFull", msg: "proto idx full" },
  6015: { code: 6015, name: "AgentNotInIndex", msg: "not in idx" },
  6016: { code: 6016, name: "InvalidCapabilityHash", msg: "cap hash" },
  6017: { code: 6017, name: "InvalidProtocolHash", msg: "proto hash" },
  6018: { code: 6018, name: "InvalidPluginType", msg: "bad plugin type" },
  6019: { code: 6019, name: "ChunkDataTooLarge", msg: "chunk>900" },
  6020: { code: 6020, name: "ContentTypeTooLong", msg: "ctype>max" },
  6021: { code: 6021, name: "IpfsCidTooLong", msg: "cid>max" },
  6022: { code: 6022, name: "EmptyName", msg: "empty name" },
  6023: { code: 6023, name: "ControlCharInName", msg: "ctrl char" },
  6024: { code: 6024, name: "EmptyDescription", msg: "empty desc" },
  6025: { code: 6025, name: "AgentIdTooLong", msg: "agentid>128" },
  6026: { code: 6026, name: "InvalidCapabilityFormat", msg: "cap format" },
  6027: { code: 6027, name: "DuplicateCapability", msg: "dup cap" },
  6028: { code: 6028, name: "EmptyTierId", msg: "empty tier" },
  6029: { code: 6029, name: "DuplicateTierId", msg: "dup tier" },
  6030: { code: 6030, name: "InvalidRateLimit", msg: "rate=0" },
  6031: { code: 6031, name: "SplRequiresTokenMint", msg: "spl needs mint" },
  6032: { code: 6032, name: "InvalidX402Endpoint", msg: "x402 https" },
  6033: { code: 6033, name: "InvalidVolumeCurve", msg: "curve order" },
  6034: { code: 6034, name: "TooManyVolumeCurvePoints", msg: "curve>5" },
  6035: { code: 6035, name: "MinPriceExceedsMax", msg: "min>max price" },
  6036: { code: 6036, name: "InvalidUptimePercent", msg: "uptime 0-100" },
  6037: { code: 6037, name: "SessionClosed", msg: "session closed" },
  6038: { code: 6038, name: "InvalidSequence", msg: "bad seq" },
  6039: { code: 6039, name: "InvalidFragmentIndex", msg: "frag idx" },
  6040: { code: 6040, name: "InscriptionTooLarge", msg: "data>750" },
  6041: { code: 6041, name: "EmptyInscription", msg: "empty data" },
  6042: { code: 6042, name: "InvalidTotalFragments", msg: "frags<1" },
  6043: { code: 6043, name: "EpochMismatch", msg: "epoch mismatch" },
  6044: { code: 6044, name: "VaultNotClosed", msg: "vault open" },
  6045: { code: 6045, name: "SessionNotClosed", msg: "session open" },
  6046: { code: 6046, name: "DelegateExpired", msg: "delegate expired" },
  6047: { code: 6047, name: "InvalidDelegate", msg: "bad delegate" },
  6048: { code: 6048, name: "ToolNameTooLong", msg: "tool>32" },
  6049: { code: 6049, name: "EmptyToolName", msg: "empty tool" },
  6050: { code: 6050, name: "InvalidToolNameHash", msg: "tool hash" },
  6051: { code: 6051, name: "InvalidToolHttpMethod", msg: "bad method" },
  6052: { code: 6052, name: "InvalidToolCategory", msg: "bad category" },
  6053: { code: 6053, name: "ToolAlreadyInactive", msg: "tool inactive" },
  6054: { code: 6054, name: "ToolAlreadyActive", msg: "tool active" },
  6055: { code: 6055, name: "InvalidSchemaHash", msg: "schema hash" },
  6056: { code: 6056, name: "InvalidSchemaType", msg: "schema type" },
  6057: { code: 6057, name: "InvalidCheckpointIndex", msg: "cp index" },
  6058: { code: 6058, name: "FeedbackNotRevoked", msg: "not revoked" },
  6059: { code: 6059, name: "IndexNotEmpty", msg: "idx not empty" },
  6060: { code: 6060, name: "SessionStillOpen", msg: "session open" },
  6061: { code: 6061, name: "NoFieldsToUpdate", msg: "no fields" },
  6062: { code: 6062, name: "InsufficientEscrowBalance", msg: "low balance" },
  6063: { code: 6063, name: "EscrowMaxCallsExceeded", msg: "max calls" },
  6064: { code: 6064, name: "EscrowEmpty", msg: "escrow empty" },
  6065: { code: 6065, name: "EscrowNotEmpty", msg: "escrow!=0" },
  6066: { code: 6066, name: "InvalidSettlementCalls", msg: "calls<1" },
  6067: { code: 6067, name: "AttestationTypeTooLong", msg: "atype>32" },
  6068: { code: 6068, name: "EmptyAttestationType", msg: "empty atype" },
  6069: { code: 6069, name: "SelfAttestationNotAllowed", msg: "self attest" },
  6070: { code: 6070, name: "AttestationAlreadyRevoked", msg: "already revoked" },
  6071: { code: 6071, name: "AttestationNotRevoked", msg: "not revoked" },
  6072: { code: 6072, name: "ToolCategoryIndexFull", msg: "cat idx full" },
  6073: { code: 6073, name: "ToolNotInCategoryIndex", msg: "not in cat" },
  6074: { code: 6074, name: "ToolCategoryMismatch", msg: "cat mismatch" },
  6075: { code: 6075, name: "ArithmeticOverflow", msg: "overflow" },
  6076: { code: 6076, name: "EscrowExpired", msg: "escrow expired" },
  6077: { code: 6077, name: "AgentInactive", msg: "agent inactive" },
  6078: { code: 6078, name: "AttestationExpired", msg: "attest expired" },
  6079: { code: 6079, name: "BufferFull", msg: "buf full" },
  6080: { code: 6080, name: "BufferDataTooLarge", msg: "buf>750" },
  6081: { code: 6081, name: "Unauthorized", msg: "unauthorized" },
  6082: { code: 6082, name: "InvalidSession", msg: "bad session" },
  6083: { code: 6083, name: "EmptyDigestHash", msg: "empty hash" },
  6084: { code: 6084, name: "LedgerDataTooLarge", msg: "ledger>750" },
  6085: { code: 6085, name: "LedgerRingEmpty", msg: "ring empty" },
  6086: { code: 6086, name: "BatchEmpty", msg: "batch empty" },
  6087: { code: 6087, name: "BatchTooLarge", msg: "batch>10" },
  6088: { code: 6088, name: "SplTokenRequired", msg: "spl accts" },
  6089: { code: 6089, name: "InvalidTokenAccount", msg: "bad token" },
  6090: { code: 6090, name: "InvalidTokenProgram", msg: "bad prog" },
  6091: { code: 6091, name: "InvalidSettlementSecurity", msg: "bad security" },
  6092: { code: 6092, name: "CoSignerRequired", msg: "cosigner" },
  6093: { code: 6093, name: "InvalidCoSigner", msg: "bad cosigner" },
  6094: { code: 6094, name: "InvalidArbiter", msg: "bad arbiter" },
  6095: { code: 6095, name: "ArbiterRequired", msg: "arbiter=0" },
  6096: { code: 6096, name: "EscrowNonceReused", msg: "nonce reused" },
  6097: { code: 6097, name: "SettlementNotPending", msg: "not pending" },
  6098: { code: 6098, name: "SettlementAlreadyFinalized", msg: "already final" },
  6099: { code: 6099, name: "DisputeWindowNotExpired", msg: "too early" },
  6100: { code: 6100, name: "DisputeWindowExpired", msg: "window closed" },
  6101: { code: 6101, name: "NotDepositor", msg: "not depositor" },
  6102: { code: 6102, name: "DisputeAlreadyFiled", msg: "dup dispute" },
  6103: { code: 6103, name: "DisputeStillOpen", msg: "dispute open" },
  6104: { code: 6104, name: "NotArbiter", msg: "not arbiter" },
  6105: { code: 6105, name: "InvalidDisputeOutcome", msg: "bad outcome" },
  6106: { code: 6106, name: "StakeBelowMinimum", msg: "stake<min" },
  6107: { code: 6107, name: "NoStakeAccount", msg: "no stake" },
  6108: { code: 6108, name: "UnstakeAlreadyPending", msg: "unstake pending" },
  6109: { code: 6109, name: "UnstakeCooldownNotMet", msg: "cooldown" },
  6110: { code: 6110, name: "NoUnstakePending", msg: "no unstake" },
  6111: { code: 6111, name: "SlashExceedsStake", msg: "slash>stake" },
  6112: { code: 6112, name: "SubscriptionAlreadyActive", msg: "sub active" },
  6113: { code: 6113, name: "SubscriptionCancelled", msg: "sub cancelled" },
  6114: { code: 6114, name: "NoIntervalDue", msg: "no due" },
  6115: { code: 6115, name: "SubscriptionInsufficientBalance", msg: "sub low bal" },
  6116: { code: 6116, name: "InvalidBillingInterval", msg: "bad interval" },
  6117: { code: 6117, name: "InvalidShardIndex", msg: "bad shard" },
  6118: { code: 6118, name: "IndexPageFull", msg: "page full" },
  6119: { code: 6119, name: "InvalidPageIndex", msg: "bad page" },
  6120: { code: 6120, name: "IndexPageNotEmpty", msg: "page≠empty" },
  6121: { code: 6121, name: "AlreadyMigrated", msg: "already v2" },
  6122: { code: 6122, name: "MigrationV1Only", msg: "v1 only" },
  6123: { code: 6123, name: "SettlementDisputed", msg: "disputed" },
  6124: { code: 6124, name: "InvalidAgentWallet", msg: "bad agent wallet" },
  6125: { code: 6125, name: "StakeAgentMismatch", msg: "stake agent mismatch" },
  6126: { code: 6126, name: "NotAuthority", msg: "not authority" },
  6127: { code: 6127, name: "UnstakeBelowRent", msg: "unstake below rent" },
  6128: { code: 6128, name: "InsufficientStake", msg: "insufficient stake" },
  6129: { code: 6129, name: "SelfReportDeprecated", msg: "SelfReport deprecated" },
  6130: { code: 6130, name: "ArbiterDeprecated", msg: "arbiter deprecated" },
  6131: { code: 6131, name: "InvalidBatchIndex", msg: "bad batch idx" },
  6132: { code: 6132, name: "InvalidPeriod", msg: "bad period" },
  6133: { code: 6133, name: "InvalidDisputeType", msg: "bad dispute type" },
  6134: { code: 6134, name: "ProofDeadlineExpired", msg: "proof expired" },
  6135: { code: 6135, name: "ProofDeadlineNotExpired", msg: "proof not expired" },
  6136: { code: 6136, name: "InvalidReceiptProof", msg: "bad receipt proof" },
  6137: { code: 6137, name: "SettlementReplay", msg: "settlement replay" },
  6138: { code: 6138, name: "PaymentTokenNotAllowed", msg: "token not allowed" },
  6139: { code: 6139, name: "AgentStakeRequired", msg: "agent stake required" },
  6140: { code: 6140, name: "DelegateExpiryInvalid", msg: "delegate expiry invalid" },
  6141: { code: 6141, name: "EscrowNotClosed", msg: "escrow not closed" },
  6142: { code: 6142, name: "VolumeCurveNotDescending", msg: "curve not descending" },
  6143: { code: 6143, name: "DuplicateServiceHash", msg: "dup service hash" },
  6144: { code: 6144, name: "StakeBelowCoverage", msg: "stake under coverage" },
  6145: { code: 6145, name: "StakeNotClosable", msg: "stake not closable" },
  6146: { code: 6146, name: "AgentStakeAccountMissing", msg: "agent stake account missing" },
  6170: { code: 6170, name: "ReceiptProofAlreadySubmitted", msg: "receipt proof already submitted for this dispute" },
  6171: { code: 6171, name: "DuplicateReceiptProof", msg: "duplicate receipt proof" },
  6172: { code: 6172, name: "MissingReceiptSignature", msg: "missing verified receipt signature" },
  6173: { code: 6173, name: "AgentCapabilityMismatch", msg: "agent does not declare this capability" },
  6174: { code: 6174, name: "AgentProtocolMismatch", msg: "agent does not declare this protocol" },
  6175: { code: 6175, name: "InvalidToolParameterCount", msg: "required params exceeds params count" },
  6176: { code: 6176, name: "ActiveEscrowCounterUnderflow", msg: "active escrow counter underflow" },
});
export const SAP_ERROR_BY_NAME: Readonly<Record<string, number>> = Object.freeze({
  NameTooLong: 6000,
  DescriptionTooLong: 6001,
  UriTooLong: 6002,
  TooManyCapabilities: 6003,
  TooManyPricingTiers: 6004,
  TooManyProtocols: 6005,
  TooManyPlugins: 6006,
  AlreadyActive: 6007,
  AlreadyInactive: 6008,
  InvalidFeedbackScore: 6009,
  TagTooLong: 6010,
  SelfReviewNotAllowed: 6011,
  FeedbackAlreadyRevoked: 6012,
  CapabilityIndexFull: 6013,
  ProtocolIndexFull: 6014,
  AgentNotInIndex: 6015,
  InvalidCapabilityHash: 6016,
  InvalidProtocolHash: 6017,
  InvalidPluginType: 6018,
  ChunkDataTooLarge: 6019,
  ContentTypeTooLong: 6020,
  IpfsCidTooLong: 6021,
  EmptyName: 6022,
  ControlCharInName: 6023,
  EmptyDescription: 6024,
  AgentIdTooLong: 6025,
  InvalidCapabilityFormat: 6026,
  DuplicateCapability: 6027,
  EmptyTierId: 6028,
  DuplicateTierId: 6029,
  InvalidRateLimit: 6030,
  SplRequiresTokenMint: 6031,
  InvalidX402Endpoint: 6032,
  InvalidVolumeCurve: 6033,
  TooManyVolumeCurvePoints: 6034,
  MinPriceExceedsMax: 6035,
  InvalidUptimePercent: 6036,
  SessionClosed: 6037,
  InvalidSequence: 6038,
  InvalidFragmentIndex: 6039,
  InscriptionTooLarge: 6040,
  EmptyInscription: 6041,
  InvalidTotalFragments: 6042,
  EpochMismatch: 6043,
  VaultNotClosed: 6044,
  SessionNotClosed: 6045,
  DelegateExpired: 6046,
  InvalidDelegate: 6047,
  ToolNameTooLong: 6048,
  EmptyToolName: 6049,
  InvalidToolNameHash: 6050,
  InvalidToolHttpMethod: 6051,
  InvalidToolCategory: 6052,
  ToolAlreadyInactive: 6053,
  ToolAlreadyActive: 6054,
  InvalidSchemaHash: 6055,
  InvalidSchemaType: 6056,
  InvalidCheckpointIndex: 6057,
  FeedbackNotRevoked: 6058,
  IndexNotEmpty: 6059,
  SessionStillOpen: 6060,
  NoFieldsToUpdate: 6061,
  InsufficientEscrowBalance: 6062,
  EscrowMaxCallsExceeded: 6063,
  EscrowEmpty: 6064,
  EscrowNotEmpty: 6065,
  InvalidSettlementCalls: 6066,
  AttestationTypeTooLong: 6067,
  EmptyAttestationType: 6068,
  SelfAttestationNotAllowed: 6069,
  AttestationAlreadyRevoked: 6070,
  AttestationNotRevoked: 6071,
  ToolCategoryIndexFull: 6072,
  ToolNotInCategoryIndex: 6073,
  ToolCategoryMismatch: 6074,
  ArithmeticOverflow: 6075,
  EscrowExpired: 6076,
  AgentInactive: 6077,
  AttestationExpired: 6078,
  BufferFull: 6079,
  BufferDataTooLarge: 6080,
  Unauthorized: 6081,
  InvalidSession: 6082,
  EmptyDigestHash: 6083,
  LedgerDataTooLarge: 6084,
  LedgerRingEmpty: 6085,
  BatchEmpty: 6086,
  BatchTooLarge: 6087,
  SplTokenRequired: 6088,
  InvalidTokenAccount: 6089,
  InvalidTokenProgram: 6090,
  InvalidSettlementSecurity: 6091,
  CoSignerRequired: 6092,
  InvalidCoSigner: 6093,
  InvalidArbiter: 6094,
  ArbiterRequired: 6095,
  EscrowNonceReused: 6096,
  SettlementNotPending: 6097,
  SettlementAlreadyFinalized: 6098,
  DisputeWindowNotExpired: 6099,
  DisputeWindowExpired: 6100,
  NotDepositor: 6101,
  DisputeAlreadyFiled: 6102,
  DisputeStillOpen: 6103,
  NotArbiter: 6104,
  InvalidDisputeOutcome: 6105,
  StakeBelowMinimum: 6106,
  NoStakeAccount: 6107,
  UnstakeAlreadyPending: 6108,
  UnstakeCooldownNotMet: 6109,
  NoUnstakePending: 6110,
  SlashExceedsStake: 6111,
  SubscriptionAlreadyActive: 6112,
  SubscriptionCancelled: 6113,
  NoIntervalDue: 6114,
  SubscriptionInsufficientBalance: 6115,
  InvalidBillingInterval: 6116,
  InvalidShardIndex: 6117,
  IndexPageFull: 6118,
  InvalidPageIndex: 6119,
  IndexPageNotEmpty: 6120,
  AlreadyMigrated: 6121,
  MigrationV1Only: 6122,
  SettlementDisputed: 6123,
  InvalidAgentWallet: 6124,
  StakeAgentMismatch: 6125,
  NotAuthority: 6126,
  UnstakeBelowRent: 6127,
  InsufficientStake: 6128,
  SelfReportDeprecated: 6129,
  ArbiterDeprecated: 6130,
  InvalidBatchIndex: 6131,
  InvalidPeriod: 6132,
  InvalidDisputeType: 6133,
  ProofDeadlineExpired: 6134,
  ProofDeadlineNotExpired: 6135,
  InvalidReceiptProof: 6136,
  SettlementReplay: 6137,
  PaymentTokenNotAllowed: 6138,
  AgentStakeRequired: 6139,
  DelegateExpiryInvalid: 6140,
  EscrowNotClosed: 6141,
  VolumeCurveNotDescending: 6142,
  DuplicateServiceHash: 6143,
  StakeBelowCoverage: 6144,
  StakeNotClosable: 6145,
  AgentStakeAccountMissing: 6146,
  ReceiptProofAlreadySubmitted: 6170,
  DuplicateReceiptProof: 6171,
  MissingReceiptSignature: 6172,
  AgentCapabilityMismatch: 6173,
  AgentProtocolMismatch: 6174,
  InvalidToolParameterCount: 6175,
  ActiveEscrowCounterUnderflow: 6176,
});

/**
 * @name DecodedAnchorError
 * @description Structured error extracted from a thrown RPC/simulation error.
 * @since v0.13.0
 */
export interface DecodedAnchorError {
  readonly code: number;
  readonly name: string;
  readonly msg: string;
  readonly friendly: string;
  readonly logs?: readonly string[];
}

const FRIENDLY_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  Unauthorized: "Unauthorized — wallet does not match the on-chain authority for this PDA.",
  AgentInactive: "Agent is inactive (deactivated). Reactivate before publishing tools or accepting escrows.",
  AgentStakeRequired: "Agent stake account missing or below MIN_STAKE (0.1 SOL). Initialize stake first.",
  StakeBelowMinimum: "Stake below minimum (0.1 SOL). Top up before requesting unstake or accepting escrows.",
  StakeBelowCoverage: "Stake below coverage requirement for outstanding escrow. Increase stake or wait for escrows to settle.",
  PaymentTokenNotAllowed: "Token mint not in allowlist. Use SOL (null) or USDC (mainnet/devnet).",
  DelegateExpiryInvalid: "Delegate expiry exceeds MAX_DELEGATE_DURATION_SECS (365 days) from now.",
  EscrowNotEmpty: "Escrow balance != 0. Withdraw or settle remaining funds before closing.",
  EscrowEmpty: "Escrow balance is zero — cannot settle.",
  InsufficientEscrowBalance: "Insufficient escrow balance for the requested settlement amount.",
  ArithmeticOverflow: "Arithmetic overflow — likely an orphan PendingSettlement, mismatched amount, or unsigned subtraction. Run `escrowV2.diagnoseOrphanPending()` to inspect.",
  EscrowNonceReused: "Escrow nonce already used by this depositor. Pick a fresh nonce.",
  SettlementNotPending: "PendingSettlement is not in pending state (already finalized or never created).",
  SettlementAlreadyFinalized: "PendingSettlement already finalized — cannot finalize twice.",
  DisputeWindowNotExpired: "Dispute window still open. Wait until escrow.dispute_window_slots elapse before finalizing.",
  DisputeWindowExpired: "Dispute window already closed. Cannot file dispute.",
  CoSignerRequired: "Settlement security mode requires a co-signer. Pass the co-signer keypair.",
  InvalidCoSigner: "Co-signer pubkey does not match the on-chain `escrow.co_signer`.",
  InvalidSettlementSecurity: "Settlement security mode mismatch with on-chain escrow config.",
  SettlementReplay: "Settlement receipt PDA already exists for this serviceHash/batchRoot. Replay blocked.",
  ReceiptProofAlreadySubmitted: "Receipt proof submission is one-shot per dispute. Resolve the current dispute instead of replaying proofs.",
  DuplicateReceiptProof: "Receipt proof contains duplicate receipt hashes. Submit each receipt once.",
  MissingReceiptSignature: "Receipt proof must include verified Ed25519 pre-instructions from both depositor and agent wallet.",
  AgentCapabilityMismatch: "Agent does not declare this capability. Update the agent profile before indexing.",
  AgentProtocolMismatch: "Agent does not declare this protocol. Update the agent profile before indexing.",
  InvalidToolParameterCount: "Tool descriptor is invalid: required_params must be <= params_count.",
  ActiveEscrowCounterUnderflow: "AgentStats.active_escrows is inconsistent. Reconcile counters before closing this escrow.",
  DuplicateServiceHash: "Two settlements in the same batch share the same serviceHash. Make each call unique.",
  BatchTooLarge: "Batch settle exceeds 10 entries. Split across multiple transactions.",
  BatchEmpty: "Batch settle requires at least 1 settlement.",
  InscriptionTooLarge: "Inscription chunk exceeds 750 bytes. Split into more fragments.",
  InvalidSchemaHash: "Tool schema hash is empty / invalid. v0.2.0+ requires every tool to publish a JSON schema (or schema_hash).",
  EmptyToolName: "Tool name cannot be empty.",
  ToolNameTooLong: "Tool name exceeds 32 bytes.",
  EscrowExpired: "Escrow expired (expiresAt passed). Create a new escrow.",
  UnstakeCooldownNotMet: "Unstake cooldown not elapsed. Wait for the cooldown window before completing unstake.",
  UnstakeBelowRent: "Resulting stake balance would fall below the rent-exempt minimum. Reduce unstake amount.",
});

/**
 * @name decodeAnchorError
 * @description Pull an Anchor / SAP error out of any caught value.
 *   Handles: AnchorError, raw RPC SimulateError, `0x...` hex codes,
 *   nested `error.errorCode.number`, and direct `code` numbers.
 * @returns Structured {@link DecodedAnchorError} or `null` if not a SAP error.
 * @since v0.13.0
 */
export function decodeAnchorError(err: unknown): DecodedAnchorError | null {
  if (err == null || typeof err !== "object") return null;

  const code = extractCode(err);
  if (code == null) return null;

  const entry = SAP_ERRORS[code];
  if (!entry) {
    return {
      code,
      name: "Unknown",
      msg: `custom program error 0x${code.toString(16)}`,
      friendly: `Unknown SAP error (code ${code}). Check IDL.`,
      logs: extractLogs(err),
    };
  }

  return {
    code: entry.code,
    name: entry.name,
    msg: entry.msg,
    friendly: FRIENDLY_OVERRIDES[entry.name] ?? `${entry.name}: ${entry.msg}`,
    logs: extractLogs(err),
  };
}

function extractCode(err: unknown): number | null {
  if (typeof err !== "object" || err == null) return null;
  const e = err as Record<string, unknown>;
  if (typeof e.code === "number") return e.code;

  const nested = e.error;
  if (nested && typeof nested === "object") {
    const errorCode = (nested as Record<string, unknown>).errorCode;
    if (errorCode && typeof errorCode === "object") {
      const num = (errorCode as Record<string, unknown>).number;
      if (typeof num === "number") return num;
    }
  }

  const msg = (err as Error).message;
  if (typeof msg === "string") {
    const hex = msg.match(/custom program error:\s*0x([0-9a-fA-F]+)/);
    if (hex?.[1]) return parseInt(hex[1], 16);
    const dec = msg.match(/Error Number:\s*(\d+)/);
    if (dec?.[1]) return parseInt(dec[1], 10);
  }
  return null;
}

function extractLogs(err: unknown): string[] | undefined {
  if (typeof err !== "object" || err == null) return undefined;
  const logs = (err as Record<string, unknown>).logs;
  if (Array.isArray(logs)) return logs as string[];
  const nested = (err as Record<string, unknown>).simulationResponse;
  if (nested && typeof nested === "object") {
    const inner = (nested as Record<string, unknown>).logs;
    if (Array.isArray(inner)) return inner as string[];
  }
  return undefined;
}

/**
 * @name SapPreflightError
 * @description Thrown by SDK preflights when an on-chain check is guaranteed
 *   to fail. Carries the predicted error code/name so callers can branch
 *   without parsing strings.
 * @since v0.13.0
 */
export class SapPreflightError extends Error {
  readonly preflight = true as const;
  constructor(
    message: string,
    readonly predictedCode: number,
    readonly predictedName: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "SapPreflightError";
  }
}

/**
 * @name throwPredicted
 * @description Helper for SDK preflights. Throws a {@link SapPreflightError}
 *   carrying the on-chain error name + friendly message.
 * @since v0.13.0
 */
export function throwPredicted(name: keyof typeof SAP_ERROR_BY_NAME, hint?: string): never {
  const code = SAP_ERROR_BY_NAME[name as string] ?? -1;
  const entry = code >= 0 ? SAP_ERRORS[code] : undefined;
  const friendly = FRIENDLY_OVERRIDES[name as string] ?? `${String(name)}: ${entry?.msg ?? ""}`;
  const full = hint ? `${friendly} (${hint})` : friendly;
  throw new SapPreflightError(full, code, name as string, hint);
}
