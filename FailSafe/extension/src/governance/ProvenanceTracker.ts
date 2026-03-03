// File: extension/src/governance/ProvenanceTracker.ts
// Provenance Tracking — Records AI authorship attribution as ledger entries (B93)

import { LedgerManager } from '../qorelogic/ledger/LedgerManager';
import { SystemRegistry, AgentTerminalInfo } from '../qorelogic/SystemRegistry';
import { IntentProvider, GovernanceMode } from './EnforcementEngine';
import { LedgerEventType } from '../shared/types';

const DEBOUNCE_MS = 200;

export interface ProvenanceRecord {
  artifactPath: string;
  agentDid: string;
  agentType: string;
  intentId: string | null;
  confidence: 'high' | 'low';
}

export class ProvenanceTracker {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private ledger: LedgerManager,
    private readonly registry: SystemRegistry,
    private readonly intentProvider: IntentProvider,
    private readonly mode: () => GovernanceMode,
  ) {}

  setLedgerManager(ledger: LedgerManager): void {
    this.ledger = ledger;
  }

  async onFileWrite(uri: { fsPath: string }): Promise<void> {
    const filePath = uri.fsPath;
    const existing = this.debounceTimers.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    return new Promise<void>((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(filePath);
        await this.recordProvenance(filePath);
        resolve();
      }, DEBOUNCE_MS);

      this.debounceTimers.set(filePath, timer);
    });
  }

  private async recordProvenance(filePath: string): Promise<void> {
    if (!this.ledger.isAvailable()) {
      return;
    }

    const intent = await this.intentProvider.getActiveIntent();

    if (this.mode() === 'observe' && !intent) {
      return;
    }

    const agents = this.detectAgents();
    if (agents.length === 0) {
      return;
    }

    const agent = agents[0];
    const intentId = intent?.id ?? null;

    await this.ledger.appendEntry({
      eventType: 'PROVENANCE_RECORDED' as LedgerEventType,
      agentDid: `did:myth:agent:${agent.agentType}`,
      artifactPath: filePath,
      payload: {
        agentType: agent.agentType,
        confidence: 'low',
        intentId,
      },
    });
  }

  private detectAgents(): AgentTerminalInfo[] {
    try {
      return this.registry.detectTerminalAgents();
    } catch {
      return [];
    }
  }

  dispose(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
