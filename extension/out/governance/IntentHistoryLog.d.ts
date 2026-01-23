import { IntentHistoryEntry } from './types/IntentTypes';
export declare class IntentHistoryLog {
    private historyPath;
    constructor(manifestDir: string);
    computeEntryHash(entry: Omit<IntentHistoryEntry, 'entryHash'>): string;
    verifyChainIntegrity(): Promise<{
        valid: boolean;
        brokenAt?: number;
        error?: string;
    }>;
    private getLastEntryHash;
    appendEntry(entry: Omit<IntentHistoryEntry, 'previousHash' | 'entryHash'>): Promise<void>;
    loadAllEntries(): Promise<IntentHistoryEntry[]>;
}
//# sourceMappingURL=IntentHistoryLog.d.ts.map