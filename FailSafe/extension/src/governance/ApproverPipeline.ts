import { LedgerManager } from '../qorelogic/ledger/LedgerManager';

interface ApprovalStage {
  name: string;
  check: () => Promise<boolean>;
}

interface ApprovalResult {
  approved: boolean;
  failedStage?: string;
  chain: string[];
}

export class ApproverPipeline {
  private stages: ApprovalStage[] = [];
  private ledgerManager: LedgerManager | null;

  constructor(ledgerManager: LedgerManager | null) {
    this.ledgerManager = ledgerManager;
  }

  setLedgerManager(ledger: LedgerManager): void {
    this.ledgerManager = ledger;
  }

  addStage(stage: ApprovalStage): void {
    this.stages.push(stage);
  }

  async evaluate(): Promise<ApprovalResult> {
    const chain: string[] = [];
    for (const stage of this.stages) {
      const passed = await stage.check();
      chain.push(`${stage.name}:${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) {
        return { approved: false, failedStage: stage.name, chain };
      }
    }
    return { approved: true, chain };
  }
}
