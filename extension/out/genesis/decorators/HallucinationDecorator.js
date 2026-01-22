"use strict";
/**
 * HallucinationDecorator - Inline Code Validation Annotations
 *
 * Displays verification status directly in the editor:
 * - Green: Verified
 * - Orange: Warning
 * - Red: Blocked
 * - Purple: L3 Pending
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
exports.HallucinationDecorator = void 0;
const vscode = __importStar(require("vscode"));
class HallucinationDecorator {
    sentinel;
    eventBus;
    disposables = [];
    // Decoration types
    verifiedDecoration;
    warningDecoration;
    blockedDecoration;
    pendingDecoration;
    // Track decorations per file
    fileDecorations = new Map();
    constructor(sentinel, eventBus) {
        this.sentinel = sentinel;
        this.eventBus = eventBus;
        // Create decoration types
        this.verifiedDecoration = vscode.window.createTextEditorDecorationType({
            borderWidth: '0 0 2px 0',
            borderStyle: 'solid',
            borderColor: '#48bb78',
            after: {
                contentText: ' ✓',
                color: '#48bb78'
            }
        });
        this.warningDecoration = vscode.window.createTextEditorDecorationType({
            borderWidth: '0 0 2px 0',
            borderStyle: 'solid',
            borderColor: '#ed8936',
            after: {
                contentText: ' ⚠',
                color: '#ed8936'
            }
        });
        this.blockedDecoration = vscode.window.createTextEditorDecorationType({
            borderWidth: '0 0 2px 0',
            borderStyle: 'solid',
            borderColor: '#f56565',
            textDecoration: 'line-through',
            after: {
                contentText: ' ✗',
                color: '#f56565'
            }
        });
        this.pendingDecoration = vscode.window.createTextEditorDecorationType({
            borderWidth: '0 0 2px 0',
            borderStyle: 'dotted',
            borderColor: '#9f7aea',
            after: {
                contentText: ' ⏳',
                color: '#9f7aea'
            }
        });
        // Subscribe to verdict events
        const unsubscribe = this.eventBus.on('sentinel.verdict', (event) => {
            this.handleVerdict(event.payload);
        });
        this.disposables.push({ dispose: unsubscribe });
        // Update decorations when editor changes
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.updateDecorations(editor);
            }
        }));
        // Initial decoration for active editor
        if (vscode.window.activeTextEditor) {
            this.updateDecorations(vscode.window.activeTextEditor);
        }
    }
    /**
     * Handle a new verdict and update decorations
     */
    handleVerdict(verdict) {
        if (!verdict.artifactPath) {
            return;
        }
        // Store decoration info
        const existing = this.fileDecorations.get(verdict.artifactPath) || [];
        existing.push({
            decision: verdict.decision,
            summary: verdict.summary,
            timestamp: verdict.timestamp
        });
        this.fileDecorations.set(verdict.artifactPath, existing);
        // Update active editor if it matches
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.fsPath === verdict.artifactPath) {
            this.updateDecorations(activeEditor);
        }
    }
    /**
     * Update decorations for an editor
     */
    updateDecorations(editor) {
        const filePath = editor.document.uri.fsPath;
        const decorations = this.fileDecorations.get(filePath);
        if (!decorations || decorations.length === 0) {
            // Clear all decorations
            editor.setDecorations(this.verifiedDecoration, []);
            editor.setDecorations(this.warningDecoration, []);
            editor.setDecorations(this.blockedDecoration, []);
            editor.setDecorations(this.pendingDecoration, []);
            return;
        }
        // Get the latest decoration for this file
        const latest = decorations[decorations.length - 1];
        // Create a decoration range for the first line (file-level indication)
        const range = new vscode.Range(0, 0, 0, editor.document.lineAt(0).text.length);
        const decorationOptions = {
            range,
            hoverMessage: new vscode.MarkdownString(`**${latest.decision}**: ${latest.summary}\n\n` +
                `_${new Date(latest.timestamp).toLocaleString()}_`)
        };
        // Clear all and apply appropriate decoration
        editor.setDecorations(this.verifiedDecoration, []);
        editor.setDecorations(this.warningDecoration, []);
        editor.setDecorations(this.blockedDecoration, []);
        editor.setDecorations(this.pendingDecoration, []);
        switch (latest.decision) {
            case 'PASS':
                editor.setDecorations(this.verifiedDecoration, [decorationOptions]);
                break;
            case 'WARN':
                editor.setDecorations(this.warningDecoration, [decorationOptions]);
                break;
            case 'BLOCK':
            case 'QUARANTINE':
                editor.setDecorations(this.blockedDecoration, [decorationOptions]);
                break;
            case 'ESCALATE':
                editor.setDecorations(this.pendingDecoration, [decorationOptions]);
                break;
        }
    }
    dispose() {
        this.verifiedDecoration.dispose();
        this.warningDecoration.dispose();
        this.blockedDecoration.dispose();
        this.pendingDecoration.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.HallucinationDecorator = HallucinationDecorator;
//# sourceMappingURL=HallucinationDecorator.js.map