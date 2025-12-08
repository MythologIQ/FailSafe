/**
 * VS Code Implementations of Core Service Interfaces
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    INotificationService,
    IWorkspaceService,
    IInputService,
    IDocumentService,
    InputBoxOptions,
    QuickPickOptions
} from './interfaces';

// --- Notification Service ---
export class VScodeNotificationService implements INotificationService {
    async showInfo(message: string): Promise<string | undefined> {
        return vscode.window.showInformationMessage(message);
    }

    async showWarning(message: string, ...actions: string[]): Promise<string | undefined> {
        return vscode.window.showWarningMessage(message, ...actions);
    }

    showError(message: string): void {
        vscode.window.showErrorMessage(message);
    }
}

// --- Workspace Service ---
export class VScodeWorkspaceService implements IWorkspaceService {
    getRootPath(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    pathJoin(...segments: string[]): string {
        return path.join(...segments);
    }

    fileExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    readFile(filePath: string): string {
        return fs.readFileSync(filePath, 'utf8');
    }

    writeFile(filePath: string, content: string): void {
        fs.writeFileSync(filePath, content, 'utf8');
    }

    ensureDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
}

// --- Input Service ---
export class VScodeInputService implements IInputService {
    async showInputBox(options: InputBoxOptions): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: options.prompt,
            placeHolder: options.placeHolder,
            value: options.value,
            validateInput: options.validateInput ? (v) => options.validateInput!(v) : undefined
        });
    }

    async showQuickPick(items: string[], options?: QuickPickOptions): Promise<string | undefined> {
        return vscode.window.showQuickPick(items, {
            placeHolder: options?.placeHolder,
            canPickMany: options?.canPickMany
        });
    }
}

// --- Document Service ---
export class VScodeDocumentService implements IDocumentService {
    async openTextDocument(content: string, language: string = 'markdown'): Promise<void> {
        const document = await vscode.workspace.openTextDocument({ content, language });
        await vscode.window.showTextDocument(document);
    }
}
