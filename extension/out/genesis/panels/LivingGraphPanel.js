"use strict";
/**
 * LivingGraphPanel - Full-screen Living Graph Panel
 *
 * Extended visualization with:
 * - Full D3.js force-directed graph
 * - Filter controls
 * - Search functionality
 * - Export options
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivingGraphPanel = void 0;
const vscode = __importStar(require("vscode"));
class LivingGraphPanel {
    static currentPanel;
    panel;
    extensionUri;
    graphData;
    eventBus;
    disposables = [];
    constructor(panel, extensionUri, graphData, eventBus) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.graphData = graphData;
        this.eventBus = eventBus;
        this.update();
        // Subscribe to graph updates
        const unsubscribe = this.eventBus.on('genesis.graphUpdate', (event) => {
            this.graphData = event.payload;
            this.update();
        });
        this.disposables.push({ dispose: unsubscribe });
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }
    static createOrShow(extensionUri, graphData, eventBus) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (LivingGraphPanel.currentPanel) {
            LivingGraphPanel.currentPanel.panel.reveal(column);
            return LivingGraphPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel('failsafe.livingGraph', 'Living Graph', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri]
        });
        LivingGraphPanel.currentPanel = new LivingGraphPanel(panel, extensionUri, graphData, eventBus);
        return LivingGraphPanel.currentPanel;
    }
    reveal() {
        this.panel.reveal();
    }
    update() {
        this.panel.webview.html = this.getHtmlContent();
    }
    getHtmlContent() {
        // Simplified version - full implementation would be more elaborate
        return `<!DOCTYPE html>
<html>
<head>
    <title>Living Graph</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
        }
        h1 { font-size: 18px; margin-bottom: 20px; }
        .placeholder {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h1>Living Graph</h1>
    <div class="placeholder">
        Full Living Graph visualization will be rendered here.<br>
        Nodes: ${this.graphData?.metadata?.nodeCount || 0}<br>
        Edges: ${this.graphData?.metadata?.edgeCount || 0}
    </div>
</body>
</html>`;
    }
    dispose() {
        LivingGraphPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.LivingGraphPanel = LivingGraphPanel;
//# sourceMappingURL=LivingGraphPanel.js.map