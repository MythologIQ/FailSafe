"use strict";
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
exports.IntentHistoryLog = void 0;
// File: extension/src/governance/IntentHistoryLog.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const lockfile = __importStar(require("proper-lockfile"));
const GENESIS_HASH = '0'.repeat(64);
const LOCK_OPTS = { retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 } };
class IntentHistoryLog {
    historyPath;
    constructor(manifestDir) {
        this.historyPath = path.join(manifestDir, 'intent_history.jsonl');
        if (!fs.existsSync(this.historyPath))
            fs.writeFileSync(this.historyPath, '', 'utf-8');
    }
    // D3: Compute SHA-256 integrity hash
    computeEntryHash(entry) {
        // Deterministic payload ordering is crucial for hash consistency
        const payload = JSON.stringify({
            intentId: entry.intentId, timestamp: entry.timestamp, event: entry.event,
            previousStatus: entry.previousStatus, newStatus: entry.newStatus,
            actor: entry.actor, details: entry.details, previousHash: entry.previousHash,
        });
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    // D3: Verify chain integrity (tamper detection)
    async verifyChainIntegrity() {
        const entries = await this.loadAllEntries();
        if (entries.length === 0)
            return { valid: true };
        let expectedPrevHash = GENESIS_HASH;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.previousHash !== expectedPrevHash)
                return { valid: false, brokenAt: i, error: `Chain broken at entry ${i}` };
            const computed = this.computeEntryHash(entry);
            if (entry.entryHash !== computed)
                return { valid: false, brokenAt: i, error: `Tamper detected at entry ${i}` };
            expectedPrevHash = entry.entryHash;
        }
        return { valid: true };
    }
    async getLastEntryHash() {
        const entries = await this.loadAllEntries();
        return entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS_HASH;
    }
    // D3/D5: Append entry with hash chain and file locking
    async appendEntry(entry) {
        const release = await lockfile.lock(this.historyPath, LOCK_OPTS);
        try {
            const previousHash = await this.getLastEntryHash();
            const entryWithPrev = { ...entry, previousHash };
            const entryHash = this.computeEntryHash(entryWithPrev);
            const fullEntry = { ...entryWithPrev, entryHash };
            await fs.promises.appendFile(this.historyPath, JSON.stringify(fullEntry) + '\n', 'utf-8');
        }
        finally {
            await release();
        }
    }
    async loadAllEntries() {
        if (!fs.existsSync(this.historyPath))
            return [];
        const content = await fs.promises.readFile(this.historyPath, 'utf-8');
        return content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    }
}
exports.IntentHistoryLog = IntentHistoryLog;
//# sourceMappingURL=IntentHistoryLog.js.map