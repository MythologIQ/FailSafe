/**
 * LedgerManager - SOA Ledger (Merkle-Chained Audit Trail)
 *
 * Manages the append-only, cryptographically-signed audit log
 * backed by SQLite.
 */
import * as vscode from 'vscode';
import { ConfigManager } from '../../shared/ConfigManager';
export declare class LedgerManager {
    private context;
    private configManager;
    private ledgerPath;
    private db;
    private lastHash;
    constructor(context: vscode.ExtensionContext, configManager: ConfigManager);
    initialize(): Promise<void>;
}
//# sourceMappingURL=LedgerManager.d.ts.map