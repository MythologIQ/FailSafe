/**
 * Core Service Interfaces
 * These abstractions decouple the core logic from VS Code APIs,
 * enabling testability and portability.
 */

// --- Notification Service ---
export interface INotificationService {
    showInfo(message: string): Promise<string | undefined>;
    showWarning(message: string, ...actions: string[]): Promise<string | undefined>;
    showError(message: string): void;
}

// --- Workspace Service ---
export interface IWorkspaceService {
    getRootPath(): string | undefined;
    pathJoin(...segments: string[]): string;
    fileExists(filePath: string): boolean;
    readFile(filePath: string): string;
    writeFile(filePath: string, content: string): void;
    ensureDirectory(dirPath: string): void;
}

// --- Input Service ---
export interface IInputService {
    showInputBox(options: InputBoxOptions): Promise<string | undefined>;
    showQuickPick(items: string[], options?: QuickPickOptions): Promise<string | undefined>;
}

export interface InputBoxOptions {
    prompt?: string;
    placeHolder?: string;
    value?: string;
    validateInput?: (value: string) => string | null;
}

export interface QuickPickOptions {
    placeHolder?: string;
    canPickMany?: boolean;
}

// --- Document Service ---
export interface IDocumentService {
    openTextDocument(content: string, language?: string): Promise<void>;
}
