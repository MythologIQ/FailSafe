import * as vscode from 'vscode';
import { SentinelVerdict } from '../../shared/types';

function verdictIcon(decision: SentinelVerdict['decision']): string {
  if (decision === 'PASS') { return 'OK'; }
  if (decision === 'WARN') { return '!'; }
  if (decision === 'BLOCK') { return 'X'; }
  if (decision === 'ESCALATE') { return '...'; }
  return 'NO';
}

export function showVerdictNotification(
  verdict: SentinelVerdict,
  onViewDetails: () => void,
  onReviewEscalation: () => void
): void {
  const message = `${verdictIcon(verdict.decision)} ${verdict.decision}: ${verdict.summary}`;

  if (verdict.decision === 'PASS') {
    vscode.window.showInformationMessage(message);
    return;
  }

  if (verdict.decision === 'WARN') {
    vscode.window.showWarningMessage(message, 'View Details').then((action) => {
      if (action === 'View Details') { onViewDetails(); }
    });
    return;
  }

  if (verdict.decision === 'BLOCK' || verdict.decision === 'QUARANTINE') {
    vscode.window.showErrorMessage(message, 'View Details').then((action) => {
      if (action === 'View Details') { onViewDetails(); }
    });
    return;
  }

  vscode.window.showWarningMessage(message, 'Review Now').then((action) => {
    if (action === 'Review Now') { onReviewEscalation(); }
  });
}

export function showVerdictDetails(verdict: SentinelVerdict): void {
  const content = `
# Sentinel Verdict

**Decision:** ${verdict.decision}
**Risk Grade:** ${verdict.riskGrade}
**Confidence:** ${(verdict.confidence * 100).toFixed(1)}%
**Timestamp:** ${verdict.timestamp}

## Summary
${verdict.summary}

## Details
${verdict.details}

## Matched Patterns
${verdict.matchedPatterns.map((p) => `- ${p}`).join('\n')}

## Actions Taken
${verdict.actions.map((a) => `- ${a.type}: ${a.details} (${a.status})`).join('\n')}
`;

  vscode.workspace.openTextDocument({ content, language: 'markdown' }).then((doc) => {
    vscode.window.showTextDocument(doc, { preview: true });
  });
}

export function showGenesisHelp(): void {
  vscode.window.showInformationMessage(
    'Cortex Commands: audit, show graph, show ledger, find risks, trust status, explain, approve, help'
  );
}
