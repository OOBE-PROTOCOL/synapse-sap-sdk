// ================================================================
//  synapse-sap-sdk / src/types.ts
//  Shared TypeScript types — 1:1 with on-chain state (v0.13)
// ================================================================
// ── Escrow Layer ──
export var SettlementSecurity;
(function (SettlementSecurity) {
    SettlementSecurity[SettlementSecurity["SelfReport"] = 0] = "SelfReport";
    SettlementSecurity[SettlementSecurity["CoSigned"] = 1] = "CoSigned";
    SettlementSecurity[SettlementSecurity["DisputeWindow"] = 2] = "DisputeWindow";
})(SettlementSecurity || (SettlementSecurity = {}));
// ── Agent Layer ──
export var Capability;
(function (Capability) {
    Capability[Capability["None"] = 0] = "None";
    Capability[Capability["Text"] = 1] = "Text";
    Capability[Capability["Code"] = 2] = "Code";
    Capability[Capability["Image"] = 4] = "Image";
    Capability[Capability["Voice"] = 8] = "Voice";
    Capability[Capability["All"] = 15] = "All";
})(Capability || (Capability = {}));
// ── Dispute Layer ──
export var DisputeOutcome;
(function (DisputeOutcome) {
    DisputeOutcome[DisputeOutcome["Pending"] = 0] = "Pending";
    DisputeOutcome[DisputeOutcome["DepositorWins"] = 1] = "DepositorWins";
    DisputeOutcome[DisputeOutcome["AgentWins"] = 2] = "AgentWins";
    DisputeOutcome[DisputeOutcome["Refunded"] = 3] = "Refunded";
})(DisputeOutcome || (DisputeOutcome = {}));
// ── Subscription Layer ──
export var BillingInterval;
(function (BillingInterval) {
    BillingInterval[BillingInterval["Hourly"] = 0] = "Hourly";
    BillingInterval[BillingInterval["Daily"] = 1] = "Daily";
    BillingInterval[BillingInterval["Weekly"] = 2] = "Weekly";
    BillingInterval[BillingInterval["Monthly"] = 3] = "Monthly";
    BillingInterval[BillingInterval["Yearly"] = 4] = "Yearly";
})(BillingInterval || (BillingInterval = {}));
//# sourceMappingURL=types.js.map