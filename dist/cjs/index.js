"use strict";
// ================================================================
//  synapse-sap-sdk / src/index.ts
//  Barrel export — v0.25.0 aligned
// ================================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEscrowMaxObligation = exports.validateReceiptProof = exports.validateSubscriptionCreate = exports.validateAgentClose = exports.validateEscrowClose = exports.validateEscrowSettle = exports.validateEscrowDeposit = exports.validateEscrowCreate = exports.validateAgentInput = exports.Utils = exports.Instructions = exports.Events = exports.Accounts = exports.Pdas = exports.createSapClient = exports.SapClient = exports.isClientValidationFailure = exports.isRetryableError = exports.decodeSapError = exports.SapErrorCode = exports.COMPLETE_UNSTAKE_DELAY_DAYS = exports.MIN_STAKE_LAMPORTS = exports.STAKE_COVERAGE_BPS = exports.MAX_SUBSCRIPTION_DURATION_YEARS = exports.MAX_MERKLE_DEPTH = exports.MAX_RECEIPTS_PER_PROOF = exports.MAX_VOLUME_CURVE_POINTS = exports.MAX_CALLS_PER_SETTLEMENT = exports.ENDPOINTS = exports.SEEDS = exports.PROGRAM_ID = void 0;
var constants_1 = require("./constants");
Object.defineProperty(exports, "PROGRAM_ID", { enumerable: true, get: function () { return constants_1.PROGRAM_ID; } });
Object.defineProperty(exports, "SEEDS", { enumerable: true, get: function () { return constants_1.SEEDS; } });
Object.defineProperty(exports, "ENDPOINTS", { enumerable: true, get: function () { return constants_1.ENDPOINTS; } });
Object.defineProperty(exports, "MAX_CALLS_PER_SETTLEMENT", { enumerable: true, get: function () { return constants_1.MAX_CALLS_PER_SETTLEMENT; } });
Object.defineProperty(exports, "MAX_VOLUME_CURVE_POINTS", { enumerable: true, get: function () { return constants_1.MAX_VOLUME_CURVE_POINTS; } });
Object.defineProperty(exports, "MAX_RECEIPTS_PER_PROOF", { enumerable: true, get: function () { return constants_1.MAX_RECEIPTS_PER_PROOF; } });
Object.defineProperty(exports, "MAX_MERKLE_DEPTH", { enumerable: true, get: function () { return constants_1.MAX_MERKLE_DEPTH; } });
Object.defineProperty(exports, "MAX_SUBSCRIPTION_DURATION_YEARS", { enumerable: true, get: function () { return constants_1.MAX_SUBSCRIPTION_DURATION_YEARS; } });
Object.defineProperty(exports, "STAKE_COVERAGE_BPS", { enumerable: true, get: function () { return constants_1.STAKE_COVERAGE_BPS; } });
Object.defineProperty(exports, "MIN_STAKE_LAMPORTS", { enumerable: true, get: function () { return constants_1.MIN_STAKE_LAMPORTS; } });
Object.defineProperty(exports, "COMPLETE_UNSTAKE_DELAY_DAYS", { enumerable: true, get: function () { return constants_1.COMPLETE_UNSTAKE_DELAY_DAYS; } });
// Re-export IDL-generated types FIRST (single source of truth)
__exportStar(require("./idlTypes"), exports);
var errors_1 = require("./errors");
Object.defineProperty(exports, "SapErrorCode", { enumerable: true, get: function () { return errors_1.SapErrorCode; } });
Object.defineProperty(exports, "decodeSapError", { enumerable: true, get: function () { return errors_1.decodeSapError; } });
Object.defineProperty(exports, "isRetryableError", { enumerable: true, get: function () { return errors_1.isRetryableError; } });
Object.defineProperty(exports, "isClientValidationFailure", { enumerable: true, get: function () { return errors_1.isClientValidationFailure; } });
var client_1 = require("./client");
Object.defineProperty(exports, "SapClient", { enumerable: true, get: function () { return client_1.SapClient; } });
Object.defineProperty(exports, "createSapClient", { enumerable: true, get: function () { return client_1.createSapClient; } });
exports.Pdas = __importStar(require("./pdas"));
exports.Accounts = __importStar(require("./accounts"));
exports.Events = __importStar(require("./events"));
exports.Instructions = __importStar(require("./instructions"));
exports.Utils = __importStar(require("./utils"));
var validate_1 = require("./utils/validate");
Object.defineProperty(exports, "validateAgentInput", { enumerable: true, get: function () { return validate_1.validateAgentInput; } });
Object.defineProperty(exports, "validateEscrowCreate", { enumerable: true, get: function () { return validate_1.validateEscrowCreate; } });
Object.defineProperty(exports, "validateEscrowDeposit", { enumerable: true, get: function () { return validate_1.validateEscrowDeposit; } });
Object.defineProperty(exports, "validateEscrowSettle", { enumerable: true, get: function () { return validate_1.validateEscrowSettle; } });
Object.defineProperty(exports, "validateEscrowClose", { enumerable: true, get: function () { return validate_1.validateEscrowClose; } });
Object.defineProperty(exports, "validateAgentClose", { enumerable: true, get: function () { return validate_1.validateAgentClose; } });
Object.defineProperty(exports, "validateSubscriptionCreate", { enumerable: true, get: function () { return validate_1.validateSubscriptionCreate; } });
Object.defineProperty(exports, "validateReceiptProof", { enumerable: true, get: function () { return validate_1.validateReceiptProof; } });
Object.defineProperty(exports, "computeEscrowMaxObligation", { enumerable: true, get: function () { return validate_1.computeEscrowMaxObligation; } });
//# sourceMappingURL=index.js.map