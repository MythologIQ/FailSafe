/**
 * VscodeStateStore - VS Code adapter for IStateStore
 *
 * Wraps vscode.Memento (workspaceState or globalState) to provide
 * key-value persistence through the platform-agnostic IStateStore interface.
 */

import * as vscode from 'vscode';
import { IStateStore } from '../../interfaces';

export class VscodeStateStore implements IStateStore {
    constructor(private readonly memento: vscode.Memento) {}

    get<T>(key: string, defaultValue: T): T {
        return this.memento.get<T>(key, defaultValue);
    }

    async update<T>(key: string, value: T): Promise<void> {
        await this.memento.update(key, value);
    }

    keys(): readonly string[] {
        return this.memento.keys();
    }
}
