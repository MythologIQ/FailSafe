/**
 * INotificationService - Abstracts vscode.window.showXxxMessage
 *
 * Provides a platform-agnostic interface for user notifications
 * and progress reporting, decoupling services from the VS Code
 * window messaging API.
 */

export interface INotificationService {
    showInfo(message: string, ...actions: string[]): Promise<string | undefined>;
    showWarning(message: string, ...actions: string[]): Promise<string | undefined>;
    showError(message: string, ...actions: string[]): Promise<string | undefined>;
    showProgress<T>(title: string, task: (report: (message: string) => void) => Promise<T>): Promise<T>;
}
