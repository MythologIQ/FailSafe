import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../server/logger';
import { TaskEngine } from '../server/taskEngine';

export class DashboardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'failsafe.dashboardView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _taskEngine: TaskEngine,
        private readonly _logger: Logger
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'getStatus':
                    const status = this._taskEngine.getProjectStatus();
                    webviewView.webview.postMessage({
                        type: 'statusUpdate',
                        data: {
                            currentTask: status.currentTask,
                            nextTask: status.nextTask,
                            progress: status.progress
                        }
                    });
                    break;
                case 'completeTask':
                    if (data.taskId) {
                        const result = await this._taskEngine.completeTask(data.taskId);
                        webviewView.webview.postMessage({
                            type: 'taskCompleted',
                            data: { success: result.success, taskId: data.taskId }
                        });
                    }
                    break;
            }
        });

        this.reload();
    }

    public reload() {
        if (!this._view) { return; }
        
        const dashboardPath = path.join(this._extensionUri.fsPath, 'src', 'dashboard');
        const htmlPath = path.join(dashboardPath, 'index.html');
        
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        const styleUri = this._view.webview.asWebviewUri(vscode.Uri.file(path.join(dashboardPath, 'styles.css')));
        const scriptUri = this._view.webview.asWebviewUri(vscode.Uri.file(path.join(dashboardPath, 'app.js')));

        const cspNonce = getNonce();

        htmlContent = htmlContent.replace('styles.css', styleUri.toString());
        htmlContent = htmlContent.replace('app.js', scriptUri.toString());
        htmlContent = htmlContent.replace(
            '<head>', 
            `<head>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._view.webview.cspSource}; script-src 'nonce-${cspNonce}'; img-src ${this._view.webview.cspSource};">
            <meta property="csp-nonce" content="${cspNonce}">`
        );

        this._view.webview.html = htmlContent;
    }
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
