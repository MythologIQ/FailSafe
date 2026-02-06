import * as vscode from 'vscode';
import { Intent } from './types/IntentTypes';

export class GovernanceStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'failsafe.showMenu'; 
  }

  update(intent: Intent | null) {
    if (!intent) {
      this.item.text = '$(circle-outline) FailSafe: Idle';
      this.item.color = new vscode.ThemeColor('descriptionForeground');
      this.item.tooltip = 'No active intent. Writes will be BLOCKED.';
    } else {
        // Status Colors
        const colorMap: Record<string, string> = {
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
