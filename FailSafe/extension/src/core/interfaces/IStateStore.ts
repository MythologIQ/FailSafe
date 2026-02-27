/**
 * IStateStore - Abstracts vscode.ExtensionContext.workspaceState/globalState
 *
 * Provides a platform-agnostic interface for key-value state persistence,
 * decoupling services from VS Code Memento API.
 */

export interface IStateStore {
    get<T>(key: string, defaultValue: T): T;
    update<T>(key: string, value: T): Promise<void>;
    keys(): readonly string[];
}
