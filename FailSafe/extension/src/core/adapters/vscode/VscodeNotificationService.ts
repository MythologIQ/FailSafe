/**
 * VscodeNotificationService - VS Code adapter for INotificationService
 *
 * Wraps vscode.window notification and progress APIs to provide
 * user-facing messaging through the platform-agnostic INotificationService interface.
 */

import * as vscode from 'vscode';
import { INotificationService } from '../../interfaces';

export class VscodeNotificationService implements INotificationService {
    async showInfo(message: string, ...actions: string[]): Promise<string | undefined> {
        return vscode.window.showInformationMessage(message, ...actions);
    }

    async showWarning(message: string, ...actions: string[]): Promise<string | undefined> {
        return vscode.window.showWarningMessage(message, ...actions);
    }

    async showError(message: string, ...actions: string[]): Promise<string | undefined> {
        return vscode.window.showErrorMessage(message, ...actions);
    }

    async showProgress<T>(
        title: string,
        task: (report: (message: string) => void) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false,
            },
            async (progress) => {
                const report = (message: string): void => {
                    progress.report({ message });
                };
                return task(report);
            }
        );
    }
}
