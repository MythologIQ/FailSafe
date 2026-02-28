import * as crypto from 'crypto';
import { LedgerManager } from '../qorelogic/ledger/LedgerManager';

export type DiscoveryStatus = 'DRAFT' | 'CONCEIVED';

export interface DiscoveryItem {
  id: string;
  title: string;
  description: string;
  status: DiscoveryStatus;
  createdAt: string;
  promotedAt?: string;
}

export class DiscoveryGovernor {
  private discoveries: Map<string, DiscoveryItem> = new Map();

  constructor(private readonly ledgerManager: LedgerManager) {}

  async recordDiscovery(title: string, description: string): Promise<string> {
    const id = crypto.randomUUID();
    const item: DiscoveryItem = {
      id,
      title,
      description,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };
    this.discoveries.set(id, item);

    await this.ledgerManager.appendEntry({
      eventType: 'DISCOVERY_RECORDED',
      agentDid: 'failsafe:discovery-governor',
      payload: { discoveryId: id, title },
    });

    return id;
  }

  async promoteToConceived(discoveryId: string): Promise<void> {
    const item = this.discoveries.get(discoveryId);
    if (!item) {
      throw new Error(`Discovery not found: ${discoveryId}`);
    }
    if (item.status !== 'DRAFT') {
      throw new Error(`Discovery ${discoveryId} is already ${item.status}`);
    }

    item.status = 'CONCEIVED';
    item.promotedAt = new Date().toISOString();

    await this.ledgerManager.appendEntry({
      eventType: 'DISCOVERY_PROMOTED',
      agentDid: 'failsafe:discovery-governor',
      payload: { discoveryId, title: item.title },
    });
  }

  listDrafts(): DiscoveryItem[] {
    return [...this.discoveries.values()].filter(d => d.status === 'DRAFT');
  }

  getDiscovery(id: string): DiscoveryItem | undefined {
    return this.discoveries.get(id);
  }
}
