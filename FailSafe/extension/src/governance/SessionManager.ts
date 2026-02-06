import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { IntentId } from './types/IntentTypes';

export interface SessionState {
    activeIntentId: IntentId | null;
    isLocked: boolean;
    lockReason?: string;
    lastActiveAt: string;
}

const DEFAULT_SESSION: SessionState = {
    activeIntentId: null,
    isLocked: false,
    lastActiveAt: new Date().toISOString()
};

/**
 * M-Core Phase 3: Session Manager
 * Responsible for persistence, recovery, and emergency locking (Axiom 4 & 5).
 */
export class SessionManager {
    private sessionPath: string;
    private state: SessionState;

    constructor(workspaceRoot: string) {
        const sessionDir = path.join(workspaceRoot, '.failsafe', 'session');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        this.sessionPath = path.join(sessionDir, 'current_session.json');
        this.state = this.loadState();
    }

    private loadState(): SessionState {
        try {
            if (fs.existsSync(this.sessionPath)) {
                const raw = fs.readFileSync(this.sessionPath, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (error) {
            console.error('Failed to load session state:', error);
            // If load fails, we default to safe state but might want to lock if corruption suspected?
            // For now, default to clean slate to avoid infinite loops, but logged error.
        }
        return { ...DEFAULT_SESSION };
    }

    async saveState(updates: Partial<SessionState>): Promise<void> {
        this.state = { ...this.state, ...updates, lastActiveAt: new Date().toISOString() };
        try {
            await fs.promises.writeFile(this.sessionPath, JSON.stringify(this.state, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save session state:', error);
            vscode.window.showErrorMessage('FailSafe: Failed to persist session state!');
        }
    }

    getState(): SessionState {
        return { ...this.state };
    }

    async lockSession(reason: string): Promise<void> {
        await this.saveState({ isLocked: true, lockReason: reason });
        vscode.commands.executeCommand('setContext', 'failsafe:isLocked', true);
    }

    async unlockSession(): Promise<void> {
        await this.saveState({ isLocked: false, lockReason: undefined });
        vscode.commands.executeCommand('setContext', 'failsafe:isLocked', false);
    }

    async setActiveIntent(intentId: IntentId | null): Promise<void> {
        await this.saveState({ activeIntentId: intentId });
    }
}
