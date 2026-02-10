import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const PROPRIETARY_SEGMENTS = new Set([
    'proprietary',
    '.proprietary',
    'internal',
    '.internal',
    'private',
    '.private'
]);

export function activate(context: vscode.ExtensionContext) {
    const scaffoldCommand = vscode.commands.registerCommand(
        'failsafe.copilot.scaffold',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const extensionPath = context.extensionPath;
            const workspacePath = workspaceFolder.uri.fsPath;

            try {
                // Copy .github directory
                const githubSrc = path.join(extensionPath, '.github');
                const githubDest = path.join(workspacePath, '.github');
                if (fs.existsSync(githubSrc)) {
                    await copyDirectory(githubSrc, githubDest);
                }

                // Copy .failsafe directory
                const failsafeSrc = path.join(extensionPath, '.failsafe');
                const failsafeDest = path.join(workspacePath, '.failsafe');
                if (fs.existsSync(failsafeSrc)) {
                    await copyDirectory(failsafeSrc, failsafeDest);
                }

                vscode.window.showInformationMessage(
                    'FailSafe Copilot prompts scaffolded successfully!'
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

function isProprietaryRelativePath(relativePath: string): boolean {
    const normalized = relativePath.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    return segments.some(segment => PROPRIETARY_SEGMENTS.has(segment.toLowerCase()));
}

async function copyDirectory(src: string, dest: string, rootSrc: string = src): Promise<void> {
    const relative = path.relative(rootSrc, src);
    if (relative && isProprietaryRelativePath(relative)) {
        return;
    }

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath, rootSrc);
        } else {
            const fileRelative = path.relative(rootSrc, srcPath);
            if (!isProprietaryRelativePath(fileRelative)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

export function deactivate() {}
