import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FailSafeServer } from '../server/index';
import { Logger } from '../server/logger';
import { GenesisViewProvider } from './GenesisViewProvider';
import { DashboardViewProvider } from './DashboardViewProvider';
import {
    VScodeNotificationService,
    VScodeDocumentService,
    VScodeWorkspaceService,
    VScodeInputService
} from '../core/vscode-services';

let server: FailSafeServer;
let logger: Logger;

export async function activate(context: vscode.ExtensionContext) {
    // Initialize Logger
    logger = new Logger();
    logger.info('FailSafe Extension activating...');

    // Initialize Service Implementations
    const notificationService = new VScodeNotificationService();
    const documentService = new VScodeDocumentService();
    const workspaceService = new VScodeWorkspaceService();
    const inputService = new VScodeInputService();

    // Initialize Server with Injected Services
    server = new FailSafeServer(
        logger,
        notificationService,
        documentService,
        workspaceService,
        inputService
    );
    try {
        await server.initialize();
        logger.info(`Server initialized on port ${server.getPort()}`);
    } catch (error) {
        logger.error('Failed to start server', error);
        vscode.window.showErrorMessage('FailSafe Server failed to start.');
    }

    // Register Genesis Sidebar Provider
    // Now injecting TaskEngine directly for IPC communication
    const genesisProvider = new GenesisViewProvider(context.extensionUri, server.getTaskEngine(), logger);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(GenesisViewProvider.viewType, genesisProvider)
    );

    // Register Dashboard View Provider
    const dashboardProvider = new DashboardViewProvider(context.extensionUri, server.getTaskEngine(), logger);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DashboardViewProvider.viewType, dashboardProvider)
    );

    // Register Command: Show Dashboard
    let disposable = vscode.commands.registerCommand('failsafe.showDashboard', () => {
        const panel = vscode.window.createWebviewPanel(
            'failsafeDashboard',
            'FailSafe Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'src', 'dashboard')),
                    vscode.Uri.file(path.join(context.extensionPath, 'node_modules'))
                ]
            }
        );

        // Get path to dashboard assets
        const dashboardPath = path.join(context.extensionPath, 'src', 'dashboard');
        const scriptPathOnDisk = vscode.Uri.file(path.join(dashboardPath, 'app.js'));
        const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
        const stylePathOnDisk = vscode.Uri.file(path.join(dashboardPath, 'styles.css'));
        const styleUri = panel.webview.asWebviewUri(stylePathOnDisk);
        
        // Read HTML content
        const htmlPath = path.join(dashboardPath, 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Inject URIs
        htmlContent = htmlContent.replace('styles.css', styleUri.toString());
        htmlContent = htmlContent.replace('app.js', scriptUri.toString());
        
        // Inject Port
        // We can inject the port as a global variable script
        const portScript = `<script>window.FAILSAFE_PORT = ${server.getPort()};</script>`;
        htmlContent = htmlContent.replace('</head>', `${portScript}</head>`);

        panel.webview.html = htmlContent;
    });

    // Register Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(shield) FailSafe';
    statusBarItem.tooltip = 'FailSafe: Active';
    statusBarItem.command = 'failsafe.showDashboard';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(disposable);
    logger.info('FailSafe Extension active');
}

export function deactivate() {
    if (server) {
        server.stop();
    }
}
