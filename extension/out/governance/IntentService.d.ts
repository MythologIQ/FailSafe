import { Intent, IntentType, IntentScope, IntentMetadata, IntentStatus, IntentEvidence } from './types/IntentTypes';
export declare class IntentService {
    private store;
    private history;
    constructor(workspaceRoot: string);
    getActiveIntent(): Promise<Intent | null>;
    createIntent(params: {
        type: IntentType;
        purpose: string;
        scope: IntentScope;
        blueprint?: string;
        metadata: IntentMetadata;
    }): Promise<Intent>;
    updateStatus(newStatus: IntentStatus, actor: string): Promise<void>;
    updateEvidence(evidence: Partial<IntentEvidence>, actor: string): Promise<void>;
    sealIntent(actor: string): Promise<void>;
}
//# sourceMappingURL=IntentService.d.ts.map