/**
 * Ledger route handlers - immutable audit log entries and chain verification.
 */

import type express from 'express';
import type { Request, Response } from 'express';
import type { RouteDeps } from './types';
import { reqQuery } from './types';

export function registerLedgerRoutes(app: express.Application, deps: RouteDeps): void {
    app.get('/api/v1/ledger/entries', async (req: Request, res: Response) => {
        if (!deps.ledgerManager) {
            res.status(503).json({ error: 'LedgerManager not available' });
            return;
        }
        try {
            const limit = Math.min(
                parseInt(reqQuery(req, 'limit') || '50', 10),
                500,
            );
            const entries = await deps.ledgerManager.getRecentEntries(limit);
            res.json({ entries, count: entries.length });
        } catch {
            res.status(500).json({ error: 'Failed to retrieve ledger entries' });
        }
    });

    app.get('/api/v1/ledger/verify', (_req: Request, res: Response) => {
        if (!deps.ledgerManager) {
            res.status(503).json({ error: 'LedgerManager not available' });
            return;
        }
        try {
            const valid = deps.ledgerManager.verifyChain();
            res.json({ valid, verifiedAt: new Date().toISOString() });
        } catch {
            res.status(500).json({ error: 'Chain verification failed' });
        }
    });
}
