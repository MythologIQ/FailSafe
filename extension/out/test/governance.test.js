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
const mocha_1 = require("mocha");
const expect_1 = require("expect");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const EnforcementEngine_1 = require("../governance/EnforcementEngine");
const IntentHistoryLog_1 = require("../governance/IntentHistoryLog");
// Mock Provider
const mockProvider = {
    getActiveIntent: async () => null
};
(0, mocha_1.describe)('Governance Security Tests', () => {
    const workspaceRoot = path.resolve(__dirname, 'test-workspace');
    const engine = new EnforcementEngine_1.EnforcementEngine(mockProvider, workspaceRoot);
    (0, mocha_1.describe)('D2: Path Traversal Protection', () => {
        const scope = ['src/components'];
        (0, mocha_1.it)('should allow valid paths within scope', () => {
            // Create engine with mocked isPathInScope visibility for testing if needed, 
            // or just test the public method isPathInScope exposed in EnforcementEngine 
            // (assuming we made it public or use evaluateAction effectively)
            (0, expect_1.expect)(engine.isPathInScope('src/components/Button.tsx', scope)).toBe(true);
            (0, expect_1.expect)(engine.isPathInScope('src/components/sub/Card.tsx', scope)).toBe(true);
        });
        (0, mocha_1.it)('should block basic directory traversal', () => {
            (0, expect_1.expect)(engine.isPathInScope('src/components/../secrets.txt', scope)).toBe(false);
        });
        (0, mocha_1.it)('should block deep traversal attacks', () => {
            (0, expect_1.expect)(engine.isPathInScope('src/components/../../etc/passwd', scope)).toBe(false);
            (0, expect_1.expect)(engine.isPathInScope('..\\..\\windows\\system32', scope)).toBe(false);
        });
        (0, mocha_1.it)('should block workspace escape attempts', () => {
            (0, expect_1.expect)(engine.isPathInScope('../outside.txt', scope)).toBe(false);
        });
    });
    (0, mocha_1.describe)('D3: Hash Chain Integrity', () => {
        const safeDir = path.join(workspaceRoot, '.failsafe');
        if (!fs.existsSync(safeDir))
            fs.mkdirSync(safeDir, { recursive: true });
        const log = new IntentHistoryLog_1.IntentHistoryLog(safeDir);
        // Note: We'd need to mock fs for full unit testing without disk I/O,
        // but here we just verify the hash computation logic is deterministic.
        (0, mocha_1.it)('should compute consistent hashes', () => {
            const entry = {
                intentId: 'test-id', timestamp: '2023-01-01T00:00:00Z', event: 'CREATED',
                actor: 'User', previousHash: '0'.repeat(64)
            };
            const hash1 = log.computeEntryHash(entry);
            const hash2 = log.computeEntryHash(entry);
            (0, expect_1.expect)(hash1).toBe(hash2);
            (0, expect_1.expect)(hash1).toHaveLength(64); // SHA-256 hex
        });
    });
});
//# sourceMappingURL=governance.test.js.map