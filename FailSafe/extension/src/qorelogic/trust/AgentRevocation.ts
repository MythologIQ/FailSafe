import { TrustEngine } from './TrustEngine';
import { LedgerManager } from '../ledger/LedgerManager';

const REASON_MAX_LENGTH = 2000;
const SANITIZE_RE = /[^\w\s.,;:!?()-]/g;

export class AgentRevocation {
  constructor(
    private readonly trustEngine: TrustEngine,
    private readonly ledgerManager: LedgerManager,
  ) {}

  async revoke(agentDid: string, reason: string): Promise<void> {
    const sanitizedReason = reason
      .slice(0, REASON_MAX_LENGTH)
      .replace(SANITIZE_RE, '');
    await this.trustEngine.updateTrust(agentDid, 'violation');
    await this.trustEngine.quarantineAgent(agentDid, sanitizedReason);
    await this.ledgerManager.appendEntry({
      eventType: 'QUARANTINE_START',
      agentDid,
      payload: { reason: sanitizedReason, revokedByGovernor: true },
    });
  }
}
