import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../server/logger';
import { TaskEngine } from '../server/taskEngine';

export class GenesisViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'genesis.dojoView';
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
                case 'affirm':
                    if (data.value === 'I trust the process') {
                        webviewView.webview.postMessage({ type: 'access_granted' });
                        this._logger.info('Genesis Protocol: User affirmed trust.');
                    } else {
                        webviewView.webview.postMessage({ type: 'access_denied' });
                    }
                    break;
                case 'getTask':
                    const status = this._taskEngine.getProjectStatus();
                    const packet = {
                        type: 'taskUpdate',
                        data: {
                            taskId: status.currentTask?.id || null,
                            taskName: status.currentTask?.name || 'No Active Task',
                            taskStatus: status.currentTask?.status || 'idle',
                            cortexLog: 'Cortex Uplink Active.'
                        }
                    };
                    webviewView.webview.postMessage(packet);
                    break;
            }
        });

        this.reload();
    }

    public reload() {
        if (!this._view) { return; }
        
        const uiPath = path.join(this._extensionUri.fsPath, 'src', 'ui');
        const htmlPath = path.join(uiPath, 'index.html');
        
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Assets
        const styleUri = this._view.webview.asWebviewUri(vscode.Uri.file(path.join(uiPath, 'styles.css')));
        const scriptUri = this._view.webview.asWebviewUri(vscode.Uri.file(path.join(uiPath, 'app.js')));
        const genesisIconUri = this._view.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media', 'genesis-icon.svg')));

        // Inject Config
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
