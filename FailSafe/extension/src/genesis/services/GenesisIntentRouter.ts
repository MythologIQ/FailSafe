import { CortexIntent } from '../../shared/types';

export interface GenesisIntentActions {
  auditFile: (file?: string) => Promise<void>;
  runArchitectureScan: () => Promise<void>;
  showLivingGraph: () => void;
  showLedgerViewer: () => void;
  filterGraphByRisk: (riskGrade?: string) => Promise<void>;
  showTrustSummary: () => Promise<void>;
  explainLastFailure: () => Promise<void>;
  showL3ApprovalQueue: () => void;
  showHelp: () => void;
  showUnknownIntent: (intent: string, confidence: number) => void;
}

export async function executeCortexIntent(
  intent: CortexIntent,
  actions: GenesisIntentActions
): Promise<void> {
  switch (intent.intent) {
    case 'audit_file':
      await actions.auditFile(intent.entities.file);
      return;
    case 'audit_architecture':
      await actions.runArchitectureScan();
      return;
    case 'show_graph':
      actions.showLivingGraph();
      return;
    case 'show_ledger':
      actions.showLedgerViewer();
      return;
    case 'find_risks':
      await actions.filterGraphByRisk(intent.entities.riskGrade);
      return;
    case 'trust_status':
      await actions.showTrustSummary();
      return;
    case 'explain':
      await actions.explainLastFailure();
      return;
    case 'approve':
      actions.showL3ApprovalQueue();
      return;
    case 'help':
      actions.showHelp();
      return;
    default:
      actions.showUnknownIntent(intent.intent, intent.confidence);
  }
}
