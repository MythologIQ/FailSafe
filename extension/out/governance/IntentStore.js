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
exports.IntentStore = void 0;
// File: extension/src/governance/IntentStore.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lockfile = __importStar(require("proper-lockfile"));
const LOCK_OPTS = { retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 } };
class IntentStore {
    manifestDir;
    activeIntentPath;
    intentsDir;
    constructor(workspaceRoot) {
        this.manifestDir = path.join(workspaceRoot, '.failsafe', 'manifest');
        this.activeIntentPath = path.join(this.manifestDir, 'active_intent.json');
        this.intentsDir = path.join(this.manifestDir, 'intents');
        this.ensureDirectories();
    }
    getManifestDir() { return this.manifestDir; }
    ensureDirectories() {
        [this.manifestDir, this.intentsDir].forEach(dir => {
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
        });
    }
    // D4/D5: Async read with file locking fallback if needed
    async readActiveIntent() {
        if (!fs.existsSync(this.activeIntentPath))
            return null;
        try {
            const data = await fs.promises.readFile(this.activeIntentPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return null;
        }
    }
    // D5: Atomic write with file locking
    async saveActiveIntent(intent) {
        let release;
        try {
            if (fs.existsSync(this.activeIntentPath))
                release = await lockfile.lock(this.activeIntentPath, LOCK_OPTS);
            else
                release = await lockfile.lock(this.manifestDir, LOCK_OPTS); // Lock directory if file doesn't exist
            await fs.promises.writeFile(this.activeIntentPath, JSON.stringify(intent, null, 2), 'utf-8');
        }
        finally {
            if (release)
                await release();
        }
    }
    // D5: Atomic delete with file locking
    async deleteActiveIntent() {
        if (!fs.existsSync(this.activeIntentPath))
            return;
        const release = await lockfile.lock(this.activeIntentPath, LOCK_OPTS);
        try {
            await fs.promises.unlink(this.activeIntentPath);
        }
        finally {
            await release();
        }
    }
    async archiveIntent(intent) {
        const archivePath = path.join(this.intentsDir, `${intent.id}.json`);
        await fs.promises.writeFile(archivePath, JSON.stringify(intent, null, 2), 'utf-8');
    }
    getArchivedIntent(intentId) {
        const archivePath = path.join(this.intentsDir, `${intentId}.json`);
        if (!fs.existsSync(archivePath))
            return null;
        return JSON.parse(fs.readFileSync(archivePath, 'utf-8'));
    }
}
exports.IntentStore = IntentStore;
//# sourceMappingURL=IntentStore.js.map