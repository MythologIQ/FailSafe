import { IntentService } from './IntentService';
import { LedgerManager } from '../qorelogic/ledger/LedgerManager';

export interface ReleaseGateCheck {
  name: string;
  passed: boolean;
  reason: string;
}

export interface ReleaseGateResult {
  allowed: boolean;
  failures: ReleaseGateCheck[];
}

export class ReleasePipelineGate {
  constructor(
    private readonly intentService: IntentService,
    private readonly ledger: LedgerManager,
  ) {}

  async evaluate(version: string): Promise<ReleaseGateResult> {
    const checks = await Promise.all([
      this.checkUnsealedIntents(),
      this.checkLedgerChainIntegrity(),
      this.checkVersionCoherence(version),
    ]);
    return {
      allowed: checks.every(c => c.passed),
      failures: checks.filter(c => !c.passed),
    };
  }

  private async checkUnsealedIntents(): Promise<ReleaseGateCheck> {
    const active = await this.intentService.getActiveIntent();
    if (active && active.status !== 'SEALED') {
      return {
        name: 'unsealed-intents',
        passed: false,
        reason: `Active Intent "${active.id}" is in ${active.status} status. Seal before release.`,
      };
    }
    return { name: 'unsealed-intents', passed: true, reason: 'No unsealed intents.' };
  }

  private async checkLedgerChainIntegrity(): Promise<ReleaseGateCheck> {
    const valid = this.ledger.verifyChain();
    return {
      name: 'ledger-chain',
      passed: valid,
      reason: valid ? 'Ledger chain intact.' : 'Ledger chain integrity broken.',
    };
  }

  private async checkVersionCoherence(version: string): Promise<ReleaseGateCheck> {
    const semverRe = /^v?\d+\.\d+\.\d+$/;
    if (!semverRe.test(version)) {
      return {
        name: 'version-coherence',
        passed: false,
        reason: `Version "${version}" does not match semver pattern.`,
      };
    }
    return { name: 'version-coherence', passed: true, reason: 'Version format valid.' };
  }
}
