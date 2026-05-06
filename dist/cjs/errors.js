"use strict";
// ================================================================
//  synapse-sap-sdk / src/errors.ts
//  On-chain error codes ↔ human-readable messages + recovery actions
// ================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SapErrorCode = void 0;
exports.decodeSapError = decodeSapError;
exports.isRetryableError = isRetryableError;
exports.isClientValidationFailure = isClientValidationFailure;
/** All v0.13 SapError variants with recovery hints */
var SapErrorCode;
(function (SapErrorCode) {
    // ── Agent ──
    SapErrorCode[SapErrorCode["NameTooLong"] = 6000] = "NameTooLong";
    SapErrorCode[SapErrorCode["NameTooShort"] = 6001] = "NameTooShort";
    SapErrorCode[SapErrorCode["InvalidEndpoint"] = 6002] = "InvalidEndpoint";
    SapErrorCode[SapErrorCode["EndpointTooLong"] = 6003] = "EndpointTooLong";
    SapErrorCode[SapErrorCode["InvalidDIDHash"] = 6004] = "InvalidDIDHash";
    SapErrorCode[SapErrorCode["AgentNotInitialized"] = 6005] = "AgentNotInitialized";
    SapErrorCode[SapErrorCode["AgentAlreadyInitialized"] = 6006] = "AgentAlreadyInitialized";
    SapErrorCode[SapErrorCode["AgentClosed"] = 6007] = "AgentClosed";
    // ── Tool / Registry ──
    SapErrorCode[SapErrorCode["NameEmpty"] = 6010] = "NameEmpty";
    SapErrorCode[SapErrorCode["NameWhitespace"] = 6011] = "NameWhitespace";
    SapErrorCode[SapErrorCode["DescriptionTooLong"] = 6012] = "DescriptionTooLong";
    SapErrorCode[SapErrorCode["CategoryOutOfRange"] = 6013] = "CategoryOutOfRange";
    SapErrorCode[SapErrorCode["ToolNameExists"] = 6014] = "ToolNameExists";
    SapErrorCode[SapErrorCode["ToolNotFound"] = 6015] = "ToolNotFound";
    SapErrorCode[SapErrorCode["CallerNotAgentOwner"] = 6016] = "CallerNotAgentOwner";
    SapErrorCode[SapErrorCode["CallerNotToolOwner"] = 6017] = "CallerNotToolOwner";
    SapErrorCode[SapErrorCode["ToolCategoryMismatch"] = 6018] = "ToolCategoryMismatch";
    // ── Stake ──
    SapErrorCode[SapErrorCode["StakeBelowMinimum"] = 6020] = "StakeBelowMinimum";
    SapErrorCode[SapErrorCode["NotStaked"] = 6021] = "NotStaked";
    SapErrorCode[SapErrorCode["UnstakeTooSoon"] = 6022] = "UnstakeTooSoon";
    SapErrorCode[SapErrorCode["UnstakeExceedsStake"] = 6023] = "UnstakeExceedsStake";
    SapErrorCode[SapErrorCode["AlreadyStaked"] = 6024] = "AlreadyStaked";
    SapErrorCode[SapErrorCode["UnstakeWindowNotOpen"] = 6025] = "UnstakeWindowNotOpen";
    SapErrorCode[SapErrorCode["UnstakeAlreadyPending"] = 6026] = "UnstakeAlreadyPending";
    SapErrorCode[SapErrorCode["CannotCloseAgentWithActiveEscrows"] = 6027] = "CannotCloseAgentWithActiveEscrows";
    SapErrorCode[SapErrorCode["StakeNotFound"] = 6028] = "StakeNotFound";
    SapErrorCode[SapErrorCode["AgentStatsNotFound"] = 6029] = "AgentStatsNotFound";
    SapErrorCode[SapErrorCode["InsufficientStake"] = 6030] = "InsufficientStake";
    // ── Escrow ──
    SapErrorCode[SapErrorCode["InsufficientEscrowBalance"] = 6032] = "InsufficientEscrowBalance";
    SapErrorCode[SapErrorCode["EscrowNotFound"] = 6033] = "EscrowNotFound";
    SapErrorCode[SapErrorCode["EscrowNotForAgent"] = 6034] = "EscrowNotForAgent";
    SapErrorCode[SapErrorCode["EscrowNotForDepositor"] = 6035] = "EscrowNotForDepositor";
    SapErrorCode[SapErrorCode["AmountMustBePositive"] = 6036] = "AmountMustBePositive";
    SapErrorCode[SapErrorCode["PricePerCallMustBePositive"] = 6037] = "PricePerCallMustBePositive";
    SapErrorCode[SapErrorCode["InvalidEscrowNonce"] = 6038] = "InvalidEscrowNonce";
    SapErrorCode[SapErrorCode["InvalidVolumeCurve"] = 6039] = "InvalidVolumeCurve";
    SapErrorCode[SapErrorCode["VolumeCurveNotDescending"] = 6040] = "VolumeCurveNotDescending";
    SapErrorCode[SapErrorCode["TooManyVolumeCurvePoints"] = 6041] = "TooManyVolumeCurvePoints";
    SapErrorCode[SapErrorCode["SettlementNotPending"] = 6042] = "SettlementNotPending";
    SapErrorCode[SapErrorCode["SettlementAlreadyFinalized"] = 6043] = "SettlementAlreadyFinalized";
    SapErrorCode[SapErrorCode["DisputeWindowNotExpired"] = 6044] = "DisputeWindowNotExpired";
    SapErrorCode[SapErrorCode["DisputeWindowExpired"] = 6045] = "DisputeWindowExpired";
    SapErrorCode[SapErrorCode["NotDepositor"] = 6046] = "NotDepositor";
    SapErrorCode[SapErrorCode["DisputeAlreadyFiled"] = 6047] = "DisputeAlreadyFiled";
    SapErrorCode[SapErrorCode["DisputeStillOpen"] = 6048] = "DisputeStillOpen";
    SapErrorCode[SapErrorCode["NotArbiter"] = 6049] = "NotArbiter";
    SapErrorCode[SapErrorCode["InvalidArbiter"] = 6050] = "InvalidArbiter";
    SapErrorCode[SapErrorCode["ArbiterRequired"] = 6051] = "ArbiterRequired";
    SapErrorCode[SapErrorCode["CoSignerRequired"] = 6052] = "CoSignerRequired";
    SapErrorCode[SapErrorCode["InvalidCoSigner"] = 6053] = "InvalidCoSigner";
    SapErrorCode[SapErrorCode["InvalidDisputeOutcome"] = 6054] = "InvalidDisputeOutcome";
    SapErrorCode[SapErrorCode["EscrowEmpty"] = 6055] = "EscrowEmpty";
    SapErrorCode[SapErrorCode["EscrowAlreadyExpired"] = 6056] = "EscrowAlreadyExpired";
    SapErrorCode[SapErrorCode["EscrowExpired"] = 6057] = "EscrowExpired";
    SapErrorCode[SapErrorCode["EscrowNonceReused"] = 6058] = "EscrowNonceReused";
    // ── Receipt ──
    SapErrorCode[SapErrorCode["ReceiptBatchNotFound"] = 6060] = "ReceiptBatchNotFound";
    SapErrorCode[SapErrorCode["ReceiptTreeEmpty"] = 6061] = "ReceiptTreeEmpty";
    SapErrorCode[SapErrorCode["ReceiptNotFound"] = 6062] = "ReceiptNotFound";
    SapErrorCode[SapErrorCode["ReceiptAlreadyDisputed"] = 6063] = "ReceiptAlreadyDisputed";
    SapErrorCode[SapErrorCode["ReceiptNotInWindow"] = 6064] = "ReceiptNotInWindow";
    SapErrorCode[SapErrorCode["InvalidReceiptProof"] = 6065] = "InvalidReceiptProof";
    SapErrorCode[SapErrorCode["InvalidMerkleProof"] = 6066] = "InvalidMerkleProof";
    SapErrorCode[SapErrorCode["NotAgentOwner"] = 6067] = "NotAgentOwner";
    // ── Subscription ──
    SapErrorCode[SapErrorCode["SubscriptionNotFound"] = 6070] = "SubscriptionNotFound";
    SapErrorCode[SapErrorCode["NotSubscriber"] = 6071] = "NotSubscriber";
    SapErrorCode[SapErrorCode["SubscriptionInsufficientBalance"] = 6072] = "SubscriptionInsufficientBalance";
    SapErrorCode[SapErrorCode["SubscriptionIntervalOverflow"] = 6073] = "SubscriptionIntervalOverflow";
    SapErrorCode[SapErrorCode["SubscriptionDurationTooLong"] = 6074] = "SubscriptionDurationTooLong";
    // ── Dispute / Security (v0.13) ──
    SapErrorCode[SapErrorCode["PendingAmountMismatch"] = 6080] = "PendingAmountMismatch";
    SapErrorCode[SapErrorCode["MaxCallsPerSettlementExceeded"] = 6081] = "MaxCallsPerSettlementExceeded";
    SapErrorCode[SapErrorCode["InvalidVolumeCurvePrice"] = 6082] = "InvalidVolumeCurvePrice";
    SapErrorCode[SapErrorCode["EscrowCoverageExceeded"] = 6083] = "EscrowCoverageExceeded";
    SapErrorCode[SapErrorCode["CoSignerIsAgentWallet"] = 6084] = "CoSignerIsAgentWallet";
    SapErrorCode[SapErrorCode["PendingSettlementExists"] = 6085] = "PendingSettlementExists";
    SapErrorCode[SapErrorCode["TokenAccountOwnerMismatch"] = 6086] = "TokenAccountOwnerMismatch";
    SapErrorCode[SapErrorCode["MaxReceiptProofExceeded"] = 6087] = "MaxReceiptProofExceeded";
    SapErrorCode[SapErrorCode["MaxMerkleDepthExceeded"] = 6088] = "MaxMerkleDepthExceeded";
    SapErrorCode[SapErrorCode["StakeSlashLocksUnstake"] = 6089] = "StakeSlashLocksUnstake";
    // ── Math ──
    SapErrorCode[SapErrorCode["ArithmeticOverflow"] = 6300] = "ArithmeticOverflow";
    // ── Vault ──
    SapErrorCode[SapErrorCode["VaultNotFound"] = 6350] = "VaultNotFound";
    SapErrorCode[SapErrorCode["VaultAlreadyInitialized"] = 6351] = "VaultAlreadyInitialized";
    SapErrorCode[SapErrorCode["VaultNotInitialized"] = 6352] = "VaultNotInitialized";
    SapErrorCode[SapErrorCode["NotVaultOwner"] = 6353] = "NotVaultOwner";
    SapErrorCode[SapErrorCode["NotDelegate"] = 6354] = "NotDelegate";
    SapErrorCode[SapErrorCode["DelegateExpired"] = 6355] = "DelegateExpired";
    SapErrorCode[SapErrorCode["InvalidPermissions"] = 6356] = "InvalidPermissions";
    SapErrorCode[SapErrorCode["SessionNotFound"] = 6357] = "SessionNotFound";
    SapErrorCode[SapErrorCode["EpochNotFound"] = 6358] = "EpochNotFound";
    SapErrorCode[SapErrorCode["VaultAlreadyOpen"] = 6359] = "VaultAlreadyOpen";
    SapErrorCode[SapErrorCode["InvalidSequence"] = 6360] = "InvalidSequence";
    SapErrorCode[SapErrorCode["FragmentTooLarge"] = 6361] = "FragmentTooLarge";
    SapErrorCode[SapErrorCode["VaultClosed"] = 6362] = "VaultClosed";
    SapErrorCode[SapErrorCode["InsufficientVaultBalance"] = 6363] = "InsufficientVaultBalance";
})(SapErrorCode || (exports.SapErrorCode = SapErrorCode = {}));
const ERROR_MAP = {
    [SapErrorCode.NameTooLong]: { code: SapErrorCode.NameTooLong, name: "NameTooLong", message: "Agent name exceeds 64 characters.", recovery: "Shorten the agent name to ≤64 chars." },
    [SapErrorCode.NameTooShort]: { code: SapErrorCode.NameTooShort, name: "NameTooShort", message: "Agent name is too short.", recovery: "Use at least 3 characters for the agent name." },
    [SapErrorCode.InvalidEndpoint]: { code: SapErrorCode.InvalidEndpoint, name: "InvalidEndpoint", message: "Endpoint URI must start with http:// or https://.", recovery: "Provide a valid HTTP or HTTPS URL." },
    [SapErrorCode.EndpointTooLong]: { code: SapErrorCode.EndpointTooLong, name: "EndpointTooLong", message: "Endpoint URI exceeds 256 characters.", recovery: "Shorten the endpoint URL." },
    [SapErrorCode.AgentClosed]: { code: SapErrorCode.AgentClosed, name: "AgentClosed", message: "Agent has been closed.", recovery: "Re-register the agent or use a different wallet." },
    [SapErrorCode.CallerNotAgentOwner]: { code: SapErrorCode.CallerNotAgentOwner, name: "CallerNotAgentOwner", message: "Signer is not the agent owner.", recovery: "Sign with the wallet that owns the agent." },
    [SapErrorCode.StakeBelowMinimum]: { code: SapErrorCode.StakeBelowMinimum, name: "StakeBelowMinimum", message: `Stake is below minimum (${1} SOL).`, recovery: "Increase the stake amount to at least 1 SOL." },
    [SapErrorCode.NotStaked]: { code: SapErrorCode.NotStaked, name: "NotStaked", message: "Wallet has no stake account.", recovery: "Call stake() first to create a stake account." },
    [SapErrorCode.UnstakeTooSoon]: { code: SapErrorCode.UnstakeTooSoon, name: "UnstakeTooSoon", message: "Cannot unstake yet — wait for the cooldown period.", recovery: "Wait 14 days after requesting unstake before completing." },
    [SapErrorCode.UnstakeExceedsStake]: { code: SapErrorCode.UnstakeExceedsStake, name: "UnstakeExceedsStake", message: "Unstake amount exceeds staked amount.", recovery: "Reduce unstake amount to ≤ staked amount." },
    [SapErrorCode.CannotCloseAgentWithActiveEscrows]: { code: SapErrorCode.CannotCloseAgentWithActiveEscrows, name: "CannotCloseAgentWithActiveEscrows", message: "Agent has active escrows.", recovery: "Close all escrows or wait for expiry before closing agent." },
    [SapErrorCode.InsufficientEscrowBalance]: { code: SapErrorCode.InsufficientEscrowBalance, name: "InsufficientEscrowBalance", message: "Escrow has insufficient balance for the operation.", recovery: "Deposit more funds or reduce the settlement/withdraw amount." },
    [SapErrorCode.EscrowNotFound]: { code: SapErrorCode.EscrowNotFound, name: "EscrowNotFound", message: "Escrow account does not exist.", recovery: "Verify the PDA seeds or create the escrow first." },
    [SapErrorCode.AmountMustBePositive]: { code: SapErrorCode.AmountMustBePositive, name: "AmountMustBePositive", message: "Amount must be > 0.", recovery: "Provide a positive amount." },
    [SapErrorCode.PricePerCallMustBePositive]: { code: SapErrorCode.PricePerCallMustBePositive, name: "PricePerCallMustBePositive", message: "price_per_call must be > 0.", recovery: "Set price_per_call to a positive value." },
    [SapErrorCode.InvalidVolumeCurve]: { code: SapErrorCode.InvalidVolumeCurve, name: "InvalidVolumeCurve", message: "Volume curve breakpoints are not strictly increasing.", recovery: "Ensure each breakpoint's after_calls > the previous." },
    [SapErrorCode.VolumeCurveNotDescending]: { code: SapErrorCode.VolumeCurveNotDescending, name: "VolumeCurveNotDescending", message: "Volume curve prices are not non-increasing.", recovery: "Ensure each breakpoint's price ≤ previous." },
    [SapErrorCode.TooManyVolumeCurvePoints]: { code: SapErrorCode.TooManyVolumeCurvePoints, name: "TooManyVolumeCurvePoints", message: "Volume curve exceeds max 10 points.", recovery: "Reduce volume curve to ≤10 breakpoints." },
    [SapErrorCode.SettlementNotPending]: { code: SapErrorCode.SettlementNotPending, name: "SettlementNotPending", message: "Settlement is not in pending state.", recovery: "Verify the settlement index or file a dispute." },
    [SapErrorCode.SettlementAlreadyFinalized]: { code: SapErrorCode.SettlementAlreadyFinalized, name: "SettlementAlreadyFinalized", message: "Settlement already finalized.", recovery: "Nothing to do — settlement is complete." },
    [SapErrorCode.DisputeWindowNotExpired]: { code: SapErrorCode.DisputeWindowNotExpired, name: "DisputeWindowNotExpired", message: "Dispute window has not expired yet.", recovery: "Wait for the dispute window to close." },
    [SapErrorCode.DisputeWindowExpired]: { code: SapErrorCode.DisputeWindowExpired, name: "DisputeWindowExpired", message: "Dispute window has expired.", recovery: "The deadline for filing a dispute has passed." },
    [SapErrorCode.NotDepositor]: { code: SapErrorCode.NotDepositor, name: "NotDepositor", message: "Signer is not the depositor.", recovery: "Sign with the wallet that deposited into the escrow." },
    [SapErrorCode.DisputeAlreadyFiled]: { code: SapErrorCode.DisputeAlreadyFiled, name: "DisputeAlreadyFiled", message: "A dispute has already been filed for this settlement.", recovery: "Wait for the dispute to resolve or file on a different settlement." },
    [SapErrorCode.DisputeStillOpen]: { code: SapErrorCode.DisputeStillOpen, name: "DisputeStillOpen", message: "Dispute is still open.", recovery: "Wait for the dispute to reach a final outcome." },
    [SapErrorCode.NotArbiter]: { code: SapErrorCode.NotArbiter, name: "NotArbiter", message: "Signer is not the designated arbiter.", recovery: "Sign with the arbiter wallet or wait for auto-resolution." },
    [SapErrorCode.ArbiterRequired]: { code: SapErrorCode.ArbiterRequired, name: "ArbiterRequired", message: "Arbiter must be set for DisputeWindow mode.", recovery: "Provide a valid arbiter public key when creating the escrow." },
    [SapErrorCode.CoSignerRequired]: { code: SapErrorCode.CoSignerRequired, name: "CoSignerRequired", message: "CoSigner must be set for CoSigned mode.", recovery: "Provide a valid co-signer public key when creating the escrow." },
    [SapErrorCode.InvalidCoSigner]: { code: SapErrorCode.InvalidCoSigner, name: "InvalidCoSigner", message: "Invalid co-signer public key.", recovery: "Provide a valid public key for the co-signer." },
    [SapErrorCode.InvalidDisputeOutcome]: { code: SapErrorCode.InvalidDisputeOutcome, name: "InvalidDisputeOutcome", message: "Invalid dispute outcome.", recovery: "Outcome must be DepositorWins (1), AgentWins (2), or Refunded (3)." },
    [SapErrorCode.EscrowEmpty]: { code: SapErrorCode.EscrowEmpty, name: "EscrowEmpty", message: "Escrow balance is zero.", recovery: "Deposit funds before withdrawing or settling." },
    [SapErrorCode.EscrowAlreadyExpired]: { code: SapErrorCode.EscrowAlreadyExpired, name: "EscrowAlreadyExpired", message: "Escrow has already expired at the time of creation.", recovery: "Set expires_at to a future timestamp or 0 (never)." },
    [SapErrorCode.EscrowExpired]: { code: SapErrorCode.EscrowExpired, name: "EscrowExpired", message: "Escrow has expired.", recovery: "Create a new escrow or withdraw remaining balance." },
    [SapErrorCode.ReceiptBatchNotFound]: { code: SapErrorCode.ReceiptBatchNotFound, name: "ReceiptBatchNotFound", message: "Receipt batch not found.", recovery: "Create a receipt batch first." },
    [SapErrorCode.InvalidReceiptProof]: { code: SapErrorCode.InvalidReceiptProof, name: "InvalidReceiptProof", message: "Receipt proof does not verify.", recovery: "Verify the receipt hash and merkle proof are correct." },
    [SapErrorCode.InvalidMerkleProof]: { code: SapErrorCode.InvalidMerkleProof, name: "InvalidMerkleProof", message: "Merkle proof structure is invalid.", recovery: "Check merkle proof depth (≤16) and sibling hashes." },
    [SapErrorCode.SubscriptionNotFound]: { code: SapErrorCode.SubscriptionNotFound, name: "SubscriptionNotFound", message: "Subscription account does not exist.", recovery: "Create a subscription first." },
    [SapErrorCode.NotSubscriber]: { code: SapErrorCode.NotSubscriber, name: "NotSubscriber", message: "Signer is not the subscriber.", recovery: "Sign with the wallet that created the subscription." },
    [SapErrorCode.SubscriptionInsufficientBalance]: { code: SapErrorCode.SubscriptionInsufficientBalance, name: "SubscriptionInsufficientBalance", message: "Subscription has insufficient balance.", recovery: "Fund the subscription before claiming." },
    [SapErrorCode.SubscriptionIntervalOverflow]: { code: SapErrorCode.SubscriptionIntervalOverflow, name: "SubscriptionIntervalOverflow", message: "Claimable intervals exceed u32 range.", recovery: "Claim in smaller batches." },
    [SapErrorCode.SubscriptionDurationTooLong]: { code: SapErrorCode.SubscriptionDurationTooLong, name: "SubscriptionDurationTooLong", message: "Subscription duration exceeds 10 years.", recovery: "Reduce the subscription duration." },
    [SapErrorCode.ArithmeticOverflow]: { code: SapErrorCode.ArithmeticOverflow, name: "ArithmeticOverflow", message: "Arithmetic operation overflow.", recovery: "Reduce amounts to stay within u64 range." },
    [SapErrorCode.VaultNotFound]: { code: SapErrorCode.VaultNotFound, name: "VaultNotFound", message: "Vault account does not exist.", recovery: "Create a vault first." },
    [SapErrorCode.VaultAlreadyInitialized]: { code: SapErrorCode.VaultAlreadyInitialized, name: "VaultAlreadyInitialized", message: "Vault is already initialized.", recovery: "Use the existing vault or close it first." },
    [SapErrorCode.NotVaultOwner]: { code: SapErrorCode.NotVaultOwner, name: "NotVaultOwner", message: "Signer is not the vault owner.", recovery: "Sign with the agent wallet that owns the vault." },
    [SapErrorCode.NotDelegate]: { code: SapErrorCode.NotDelegate, name: "NotDelegate", message: "Signer is not a vault delegate.", recovery: "Add the signer as a vault delegate first." },
    [SapErrorCode.DelegateExpired]: { code: SapErrorCode.DelegateExpired, name: "DelegateExpired", message: "Vault delegate has expired.", recovery: "Renew the delegate or use the owner wallet." },
    [SapErrorCode.InvalidPermissions]: { code: SapErrorCode.InvalidPermissions, name: "InvalidPermissions", message: "Invalid vault delegate permissions.", recovery: "Use a valid permission bitmask (1=inscribe, 2=close, 4=open)." },
    [SapErrorCode.SessionNotFound]: { code: SapErrorCode.SessionNotFound, name: "SessionNotFound", message: "Session ledger does not exist.", recovery: "Create a session first." },
    [SapErrorCode.EpochNotFound]: { code: SapErrorCode.EpochNotFound, name: "EpochNotFound", message: "Epoch page does not exist.", recovery: "Create an epoch first." },
    [SapErrorCode.VaultAlreadyOpen]: { code: SapErrorCode.VaultAlreadyOpen, name: "VaultAlreadyOpen", message: "Vault is already open.", recovery: "Vault is already initialized — proceed with inscription." },
    [SapErrorCode.InvalidSequence]: { code: SapErrorCode.InvalidSequence, name: "InvalidSequence", message: "Inscription sequence is invalid.", recovery: "Use the next expected sequence number." },
    [SapErrorCode.FragmentTooLarge]: { code: SapErrorCode.FragmentTooLarge, name: "FragmentTooLarge", message: "Inscription fragment exceeds max size.", recovery: "Split the inscription into smaller fragments." },
    [SapErrorCode.VaultClosed]: { code: SapErrorCode.VaultClosed, name: "VaultClosed", message: "Vault has been closed.", recovery: "Re-open the vault or create a new one." },
    [SapErrorCode.InsufficientVaultBalance]: { code: SapErrorCode.InsufficientVaultBalance, name: "InsufficientVaultBalance", message: "Vault has insufficient balance.", recovery: "Deposit more funds into the vault." },
    // ── v0.13 Hardening Errors ──
    [SapErrorCode.PendingAmountMismatch]: { code: SapErrorCode.PendingAmountMismatch, name: "PendingAmountMismatch", message: "Pending settlement amount does not match escrow.", recovery: "This is a protocol bug — escalate immediately." },
    [SapErrorCode.MaxCallsPerSettlementExceeded]: { code: SapErrorCode.MaxCallsPerSettlementExceeded, name: "MaxCallsPerSettlementExceeded", message: "Calls per settlement exceeds 10,000.", recovery: "Split settlement into multiple batches of ≤10,000 calls." },
    [SapErrorCode.InvalidVolumeCurvePrice]: { code: SapErrorCode.InvalidVolumeCurvePrice, name: "InvalidVolumeCurvePrice", message: "Volume curve breakpoint price must be > 0.", recovery: "Set price_per_call > 0 for all breakpoints." },
    [SapErrorCode.EscrowCoverageExceeded]: { code: SapErrorCode.EscrowCoverageExceeded, name: "EscrowCoverageExceeded", message: "Escrow deposit would exceed agent staked coverage.", recovery: "Increase agent stake or reduce deposit amount." },
    [SapErrorCode.CoSignerIsAgentWallet]: { code: SapErrorCode.CoSignerIsAgentWallet, name: "CoSignerIsAgentWallet", message: "Co-signer cannot be the agent's own wallet.", recovery: "Use a different wallet for the co-signer." },
    [SapErrorCode.PendingSettlementExists]: { code: SapErrorCode.PendingSettlementExists, name: "PendingSettlementExists", message: "Escrow has an unresolved pending settlement.", recovery: "Finalize or dispute the pending settlement before closing." },
    [SapErrorCode.TokenAccountOwnerMismatch]: { code: SapErrorCode.TokenAccountOwnerMismatch, name: "TokenAccountOwnerMismatch", message: "SPL token account owner mismatch.", recovery: "Verify the destination token account belongs to the depositor." },
    [SapErrorCode.MaxReceiptProofExceeded]: { code: SapErrorCode.MaxReceiptProofExceeded, name: "MaxReceiptProofExceeded", message: "Receipt proof exceeds 128 receipts.", recovery: "Submit proof in chunks of ≤128 receipts." },
    [SapErrorCode.MaxMerkleDepthExceeded]: { code: SapErrorCode.MaxMerkleDepthExceeded, name: "MaxMerkleDepthExceeded", message: "Merkle proof depth exceeds 16.", recovery: "Verify merkle tree depth (≤16)." },
    [SapErrorCode.StakeSlashLocksUnstake]: { code: SapErrorCode.StakeSlashLocksUnstake, name: "StakeSlashLocksUnstake", message: "Stake slash would lock unstake request.", recovery: "The unstake was reduced proportionally — retry." },
};
/** Decode an Anchor transaction error into structured info */
function decodeSapError(err) {
    // Anchor custom error format: { error: { errorCode: { code: number, number: number, ... }, ... } }
    const anyErr = err;
    let code;
    // Anchor 0.30 format
    if (anyErr.error?.errorCode?.code != null) {
        code = anyErr.error.errorCode.code;
    }
    else if (anyErr.error?.errorCode?.number != null) {
        code = anyErr.error.errorCode.number;
    }
    else if (anyErr.error?.instructionError?.[1]?.Custom != null) {
        code = anyErr.error.instructionError[1].Custom;
    }
    if (code != null && ERROR_MAP[code]) {
        return ERROR_MAP[code];
    }
    // Attempt log-based detection
    if (anyErr.logs) {
        for (const log of anyErr.logs) {
            const match = log.match(/Error Code:\s*(\d+)/);
            if (match) {
                const logCode = parseInt(match[1], 10);
                if (ERROR_MAP[logCode])
                    return ERROR_MAP[logCode];
            }
        }
    }
    return {
        code: (code ?? -9999),
        name: "UnknownError",
        message: err?.message ?? "Unknown transaction error",
        recovery: "Check transaction logs or retry with a different configuration.",
    };
}
/** Is this error retryable? */
function isRetryableError(err) {
    const retryable = [
        SapErrorCode.DisputeWindowNotExpired,
        SapErrorCode.UnstakeTooSoon,
        SapErrorCode.EscrowExpired, // can retry with new escrow
    ];
    return retryable.includes(err.code);
}
/** Is this a client-side validation error that should have been caught before sending?
 *  If true, the SDK's validate functions have a bug.
 */
function isClientValidationFailure(err) {
    const client = [
        SapErrorCode.AmountMustBePositive,
        SapErrorCode.PricePerCallMustBePositive,
        SapErrorCode.InvalidVolumeCurve,
        SapErrorCode.VolumeCurveNotDescending,
        SapErrorCode.TooManyVolumeCurvePoints,
        SapErrorCode.MaxCallsPerSettlementExceeded,
        SapErrorCode.InvalidVolumeCurvePrice,
        SapErrorCode.EscrowAlreadyExpired,
        SapErrorCode.CoSignerIsAgentWallet,
        SapErrorCode.MaxReceiptProofExceeded,
        SapErrorCode.MaxMerkleDepthExceeded,
        SapErrorCode.SubscriptionDurationTooLong,
    ];
    return client.includes(err.code);
}
//# sourceMappingURL=errors.js.map