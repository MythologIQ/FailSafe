import { Intent } from './types/IntentTypes';
export declare class IntentStore {
    private manifestDir;
    private activeIntentPath;
    private intentsDir;
    constructor(workspaceRoot: string);
    getManifestDir(): string;
    private ensureDirectories;
    readActiveIntent(): Promise<Intent | null>;
    saveActiveIntent(intent: Intent): Promise<void>;
    deleteActiveIntent(): Promise<void>;
    archiveIntent(intent: Intent): Promise<void>;
    getArchivedIntent(intentId: string): Intent | null;
}
//# sourceMappingURL=IntentStore.d.ts.map