// File: extension/src/governance/IntentService.ts
import { v4 as uuidv4 } from 'uuid';
import { Intent, IntentType, IntentScope, IntentMetadata, IntentStatus, IntentEvidence, IntentSchema } from './types/IntentTypes';
import { IntentStore } from './IntentStore';
import { IntentHistoryLog } from './IntentHistoryLog';
import { SessionManager } from './SessionManager';

export class IntentService {
  private store: IntentStore;
  private history: IntentHistoryLog;
  private session: SessionManager;

  constructor(workspaceRoot: string, sessionManager: SessionManager) {
    this.store = new IntentStore(workspaceRoot);
    this.history = new IntentHistoryLog(this.store.getManifestDir());
    this.session = sessionManager;
  }

  // D1: Runtime validation using Zod
  async getActiveIntent(): Promise<Intent | null> {
    const rawIntent = await this.store.readActiveIntent();
    if (!rawIntent) return null;
    try { return IntentSchema.parse(rawIntent); } 
    catch (e) { console.error('Intent validation failed:', e); return null; } // Failsafe fallback
  }

  async createIntent(params: { type: IntentType; purpose: string; scope: IntentScope; blueprint?: string; metadata: IntentMetadata }): Promise<Intent> {
    const active = await this.getActiveIntent();
    if (active && active.status !== 'SEALED') throw new Error(`Active Intent "${active.id}" must be SEALED.`);
    
    const now = new Date().toISOString();
    const intent: Intent = {
      id: uuidv4(), type: params.type, createdAt: now, purpose: params.purpose,
      scope: params.scope, status: 'PULSE', blueprint: params.blueprint,
      metadata: params.metadata, updatedAt: now,
    };

    await this.store.saveActiveIntent(intent);
    await this.history.appendEntry({ intentId: intent.id, timestamp: now, event: 'CREATED', newStatus: 'PULSE', actor: params.metadata.author });
    await this.session.setActiveIntent(intent.id);
    return intent;
  }

  async updateStatus(newStatus: IntentStatus, actor: string): Promise<void> {
    const active = await this.getActiveIntent();
    if (!active) throw new Error('No active Intent.');
    if (active.status === 'SEALED') throw new Error(`Intent "${active.id}" is SEALED.`);

    const prevStatus = active.status;
    active.status = newStatus;
    active.updatedAt = new Date().toISOString();
    if (newStatus === 'SEALED') active.sealedAt = active.updatedAt;

    await this.store.saveActiveIntent(active);
    await this.history.appendEntry({ intentId: active.id, timestamp: active.updatedAt, event: 'STATUS_CHANGED', previousStatus: prevStatus, newStatus, actor });
  }

  async updateEvidence(evidence: Partial<IntentEvidence>, actor: string): Promise<void> {
    const active = await this.getActiveIntent();
    if (!active || active.status === 'SEALED') throw new Error('Cannot update evidence.');

    active.evidence = { ...active.evidence, ...evidence } as IntentEvidence;
    active.updatedAt = new Date().toISOString();

    await this.store.saveActiveIntent(active);
    await this.history.appendEntry({ intentId: active.id, timestamp: active.updatedAt, event: 'EVIDENCE_UPDATED', actor, details: evidence });
  }

  async sealIntent(actor: string): Promise<void> {
    const active = await this.getActiveIntent();
    if (!active) throw new Error('No active Intent.');
    if (active.status !== 'PASS') throw new Error(`Status must be PASS (current: ${active.status}).`);

    await this.updateStatus('SEALED', actor); 
    const sealed = await this.getActiveIntent(); // Reload sealed state
    if (sealed) await this.store.archiveIntent(sealed);
    
    await this.history.appendEntry({ intentId: active.id, timestamp: new Date().toISOString(), event: 'SEALED', actor });
    await this.store.deleteActiveIntent();
    await this.session.setActiveIntent(null);
  }
}
