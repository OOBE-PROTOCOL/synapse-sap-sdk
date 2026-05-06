"use strict";
// ================================================================
//  synapse-sap-sdk / src/index.ts
//  Barrel export — tree-shakeable by submodule
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
exports.calculateSettleAmount = exports.computeEscrowMaxObligation = exports.validateReceiptProof = exports.validateSubscriptionCreate = exports.validateAgentClose = exports.validateEscrowClose = exports.validateEscrowSettle = exports.validateEscrowDeposit = exports.validateEscrowCreate = exports.validateAgentInput = exports.Utils = exports.Events = exports.Accounts = exports.Pdas = exports.isClientValidationFailure = exports.isRetryableError = exports.decodeSapError = exports.SapErrorCode = void 0;
var errors_1 = require("./errors");
Object.defineProperty(exports, "SapErrorCode", { enumerable: true, get: function () { return errors_1.SapErrorCode; } });
Object.defineProperty(exports, "decodeSapError", { enumerable: true, get: function () { return errors_1.decodeSapError; } });
Object.defineProperty(exports, "isRetryableError", { enumerable: true, get: function () { return errors_1.isRetryableError; } });
Object.defineProperty(exports, "isClientValidationFailure", { enumerable: true, get: function () { return errors_1.isClientValidationFailure; } });
exports.Pdas = __importStar(require("./pdas"));
exports.Accounts = __importStar(require("./accounts"));
exports.Events = __importStar(require("./events"));
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
Object.defineProperty(exports, "calculateSettleAmount", { enumerable: true, get: function () { return validate_1.calculateSettleAmount; } });
//# sourceMappingURL=index.js.map