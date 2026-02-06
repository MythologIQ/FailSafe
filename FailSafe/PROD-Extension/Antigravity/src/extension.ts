import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const scaffoldCommand = vscode.commands.registerCommand(
        'failsafe.antigravity.scaffold',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const extensionPath = context.extensionPath;
            const workspacePath = workspaceFolder.uri.fsPath;

            try {
                // Copy .agent directory
                const agentSrc = path.join(extensionPath, '.agent');
                const agentDest = path.join(workspacePath, '.agent');
                if (fs.existsSync(agentSrc)) {
                    await copyDirectory(agentSrc, agentDest);
                }

                // Copy .qorelogic directory
                const qorelogicSrc = path.join(extensionPath, '.qorelogic');
                const qorelogicDest = path.join(workspacePath, '.qorelogic');
                if (fs.existsSync(qorelogicSrc)) {
                    await copyDirectory(qorelogicSrc, qorelogicDest);
                }

                vscode.window.showInformationMessage(
                    'FailSafe Antigravity workflows scaffolded successfully!'
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to scaffold: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }
    );

    context.subscriptions.push(scaffoldCommand);
}

async function copyDirectory(src: string, dest: string): Promise<void> {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

export function deactivate() {}
