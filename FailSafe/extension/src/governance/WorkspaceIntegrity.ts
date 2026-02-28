import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface IntegrityCheck {
  name: string;
  passed: boolean;
  detail: string;
}

interface IntegrityReport {
  timestamp: string;
  checks: IntegrityCheck[];
  allPassed: boolean;
}

export class WorkspaceIntegrity {
  constructor(private readonly workspaceRoot: string) {}

  verify(): IntegrityReport {
    const checks = [
      this.checkFailsafeDir(),
      this.checkManifestDir(),
      this.checkLedgerExists(),
      this.checkGitignorePresent(),
    ];
    return {
      timestamp: new Date().toISOString(),
      checks,
      allPassed: checks.every(c => c.passed),
    };
  }

  private checkFailsafeDir(): IntegrityCheck {
    const dir = path.join(this.workspaceRoot, '.failsafe');
    const exists = fs.existsSync(dir);
    return { name: 'failsafe-dir', passed: exists, detail: exists ? '.failsafe directory present' : '.failsafe directory missing' };
  }

  private checkManifestDir(): IntegrityCheck {
    const dir = path.join(this.workspaceRoot, '.failsafe', 'manifest');
    const exists = fs.existsSync(dir);
    return { name: 'manifest-dir', passed: exists, detail: exists ? 'Manifest directory present' : 'Manifest directory missing' };
  }

  private checkLedgerExists(): IntegrityCheck {
    const ledgerPath = path.join(this.workspaceRoot, '.failsafe', 'ledger.db');
    const exists = fs.existsSync(ledgerPath);
    return { name: 'ledger-db', passed: exists, detail: exists ? 'Ledger database present' : 'Ledger database missing' };
  }

  private checkGitignorePresent(): IntegrityCheck {
    const gitignore = path.join(this.workspaceRoot, '.gitignore');
    if (!fs.existsSync(gitignore)) {
      return { name: 'gitignore', passed: false, detail: '.gitignore missing' };
    }
    const content = fs.readFileSync(gitignore, 'utf-8');
    const hasFailsafe = content.includes('.failsafe');
    return { name: 'gitignore', passed: hasFailsafe, detail: hasFailsafe ? '.failsafe in .gitignore' : '.failsafe not in .gitignore' };
  }
}
