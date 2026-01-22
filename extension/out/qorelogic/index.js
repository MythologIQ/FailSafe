"use strict";
/**
 * QoreLogic - Governance Content & Framework
 *
 * Exports all QoreLogic components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowGenomeManager = exports.PolicyEngine = exports.TrustEngine = exports.LedgerManager = exports.QoreLogicManager = void 0;
// Main manager
var QoreLogicManager_1 = require("./QoreLogicManager");
Object.defineProperty(exports, "QoreLogicManager", { enumerable: true, get: function () { return QoreLogicManager_1.QoreLogicManager; } });
// Ledger
var LedgerManager_1 = require("./ledger/LedgerManager");
Object.defineProperty(exports, "LedgerManager", { enumerable: true, get: function () { return LedgerManager_1.LedgerManager; } });
// Trust
var TrustEngine_1 = require("./trust/TrustEngine");
Object.defineProperty(exports, "TrustEngine", { enumerable: true, get: function () { return TrustEngine_1.TrustEngine; } });
// Policies
var PolicyEngine_1 = require("./policies/PolicyEngine");
Object.defineProperty(exports, "PolicyEngine", { enumerable: true, get: function () { return PolicyEngine_1.PolicyEngine; } });
// Shadow Genome (Failure Archival)
var ShadowGenomeManager_1 = require("./shadow/ShadowGenomeManager");
Object.defineProperty(exports, "ShadowGenomeManager", { enumerable: true, get: function () { return ShadowGenomeManager_1.ShadowGenomeManager; } });
//# sourceMappingURL=index.js.map