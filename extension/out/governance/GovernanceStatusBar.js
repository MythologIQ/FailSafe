"use strict";
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
exports.GovernanceStatusBar = void 0;
const vscode = __importStar(require("vscode"));
class GovernanceStatusBar {
    item;
    constructor() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.item.command = 'failsafe.showMenu';
    }
    update(intent) {
        if (!intent) {
            this.item.text = '$(circle-outline) FailSafe: Idle';
            this.item.color = new vscode.ThemeColor('descriptionForeground');
            this.item.tooltip = 'No active intent. Writes will be BLOCKED.';
        }
        else {
            // Status Colors
            const colorMap = {
                'PULSE': 'charts.yellow',
                'PASS': 'charts.green',
                'VETO': 'charts.red',
                'SEALED': 'charts.blue'
            };
            this.item.text = `$(shield) FailSafe: ${intent.status}`;
            this.item.color = new vscode.ThemeColor(colorMap[intent.status] || 'descriptionForeground');
            this.item.tooltip = `Active Intent: ${intent.purpose}\nScope: ${intent.scope.files.length} files`;
        }
        this.item.show();
    }
    dispose() { this.item.dispose(); }
}
exports.GovernanceStatusBar = GovernanceStatusBar;
//# sourceMappingURL=GovernanceStatusBar.js.map