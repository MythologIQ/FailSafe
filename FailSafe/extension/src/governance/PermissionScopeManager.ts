import { LedgerManager } from '../qorelogic/ledger/LedgerManager';

interface PermissionGrant {
  active: boolean;
  grantedAt: string;
}

interface ScopeEntry {
  id: string;
  active: boolean;
  grantedAt: string;
}

export class PermissionScopeManager {
  private grants: Map<string, PermissionGrant> = new Map();
  private ledgerManager: LedgerManager | null;

  constructor(ledgerManager: LedgerManager | null) {
    this.ledgerManager = ledgerManager;
  }

  setLedgerManager(ledger: LedgerManager): void {
    this.ledgerManager = ledger;
  }

  check(skill: string, scope: string): boolean {
    const grant = this.grants.get(`${skill}:${scope}`);
    if (!grant) return false;
    return grant.active;
  }

  grant(scopeId: string): void {
    this.grants.set(scopeId, { active: true, grantedAt: new Date().toISOString() });
    this.audit('GRANT', scopeId, true);
  }

  deny(scopeId: string): void {
    this.grants.set(scopeId, { active: false, grantedAt: new Date().toISOString() });
    this.audit('DENY', scopeId, false);
  }

  revoke(scopeId: string): void {
    this.grants.delete(scopeId);
    this.audit('REVOKE', scopeId, false);
  }

  isKnownScope(scopeId: string): boolean {
    return this.grants.has(scopeId);
  }

  getAllRequestedScopes(): ScopeEntry[] {
    return Array.from(this.grants.entries()).map(([id, g]) => ({ id, ...g }));
  }

  private audit(action: string, scopeId: string, result: boolean): void {
    this.ledgerManager?.appendEntry({
      eventType: 'SYSTEM_EVENT',
      agentDid: 'system:permission-manager',
      payload: { action, scopeId, result },
    });
  }
}
