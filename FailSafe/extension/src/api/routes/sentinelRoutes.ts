/**
 * Sentinel route handlers - daemon status, verdicts, and file auditing.
 */

import type express from 'express';
import type { Request, Response } from 'express';
import type { RouteDeps } from './types';
import { reqQuery } from './types';

export function registerSentinelRoutes(app: express.Application, deps: RouteDeps): void {
    app.get('/api/v1/sentinel/status', (_req: Request, res: Response) => {
        if (!deps.sentinelDaemon) {
            res.status(503).json({ error: 'SentinelDaemon not available' });
            return;
        }
        res.json(deps.sentinelDaemon.getStatus());
    });

    app.get('/api/v1/sentinel/verdicts', (req: Request, res: Response) => {
        const limit = Math.min(
            parseInt(reqQuery(req, 'limit') || '50', 10),
            200,
        );
        const verdicts = deps.eventBus.getHistory('sentinel.verdict', limit);
        res.json({
            verdicts: verdicts.map(v => v.payload),
            count: verdicts.length,
        });
    });

    app.post('/api/v1/sentinel/audit', async (req: Request, res: Response) => {
        if (!deps.sentinelDaemon) {
            res.status(503).json({ error: 'SentinelDaemon not available' });
            return;
        }
        const { filePath } = req.body;
        if (!filePath || typeof filePath !== 'string') {
            res.status(400).json({ error: 'filePath is required' });
            return;
        }
        try {
            const verdict = await deps.sentinelDaemon.auditFile(filePath);
            res.json(verdict);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Audit failed';
            res.status(500).json({ error: message });
        }
    });
}
