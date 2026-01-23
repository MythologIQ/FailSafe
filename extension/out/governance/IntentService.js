"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentService = void 0;
// File: extension/src/governance/IntentService.ts
const uuid_1 = require("uuid");
const IntentTypes_1 = require("./types/IntentTypes");
const IntentStore_1 = require("./IntentStore");
const IntentHistoryLog_1 = require("./IntentHistoryLog");
class IntentService {
    store;
    history;
    constructor(workspaceRoot) {
        this.store = new IntentStore_1.IntentStore(workspaceRoot);
        this.history = new IntentHistoryLog_1.IntentHistoryLog(this.store.getManifestDir());
    }
    // D1: Runtime validation using Zod
    async getActiveIntent() {
        const rawIntent = await this.store.readActiveIntent();
        if (!rawIntent)
            return null;
        try {
            return IntentTypes_1.IntentSchema.parse(rawIntent);
        }
        catch (e) {
            console.error('Intent validation failed:', e);
            return null;
        } // Failsafe fallback
    }
    async createIntent(params) {
        const active = await this.getActiveIntent();
        if (active && active.status !== 'SEALED')
            throw new Error(`Active Intent "${active.id}" must be SEALED.`);
        const now = new Date().toISOString();
        const intent = {
            id: (0, uuid_1.v4)(), type: params.type, createdAt: now, purpose: params.purpose,
            scope: params.scope, status: 'PULSE', blueprint: params.blueprint,
            metadata: params.metadata, updatedAt: now,
        };
        await this.store.saveActiveIntent(intent);
        await this.history.appendEntry({ intentId: intent.id, timestamp: now, event: 'CREATED', newStatus: 'PULSE', actor: params.metadata.author });
        return intent;
    }
    async updateStatus(newStatus, actor) {
        const active = await this.getActiveIntent();
        if (!active)
            throw new Error('No active Intent.');
        if (active.status === 'SEALED')
            throw new Error(`Intent "${active.id}" is SEALED.`);
        const prevStatus = active.status;
        active.status = newStatus;
        active.updatedAt = new Date().toISOString();
        if (newStatus === 'SEALED')
            active.sealedAt = active.updatedAt;
        await this.store.saveActiveIntent(active);
        await this.history.appendEntry({ intentId: active.id, timestamp: active.updatedAt, event: 'STATUS_CHANGED', previousStatus: prevStatus, newStatus, actor });
    }
    async updateEvidence(evidence, actor) {
        const active = await this.getActiveIntent();
        if (!active || active.status === 'SEALED')
            throw new Error('Cannot update evidence.');
        active.evidence = { ...active.evidence, ...evidence };
        active.updatedAt = new Date().toISOString();
        await this.store.saveActiveIntent(active);
        await this.history.appendEntry({ intentId: active.id, timestamp: active.updatedAt, event: 'EVIDENCE_UPDATED', actor, details: evidence });
    }
    async sealIntent(actor) {
        const active = await this.getActiveIntent();
        if (!active)
            throw new Error('No active Intent.');
        if (active.status !== 'PASS')
            throw new Error(`Status must be PASS (current: ${active.status}).`);
        await this.updateStatus('SEALED', actor);
        const sealed = await this.getActiveIntent(); // Reload sealed state
        if (sealed)
            await this.store.archiveIntent(sealed);
        await this.history.appendEntry({ intentId: active.id, timestamp: new Date().toISOString(), event: 'SEALED', actor });
        await this.store.deleteActiveIntent();
    }
}
exports.IntentService = IntentService;
//# sourceMappingURL=IntentService.js.map