/**
 * Trust route handlers - agent trust scores and DID lookups.
 */

import type express from 'express';
import type { Request, Response } from 'express';
import type { RouteDeps } from './types';

export function registerTrustRoutes(app: express.Application, deps: RouteDeps): void {
    app.get('/api/v1/trust', async (_req: Request, res: Response) => {
        if (!deps.qorelogicManager) {
            res.status(503).json({ error: 'QoreLogicManager not available' });
            return;
        }
        try {
            const trustEngine = deps.qorelogicManager.getTrustEngine();
            const agents = await trustEngine.getAllAgents();
            res.json(agents.map(a => ({
                did: a.did,
                score: a.trustScore,
                stage: a.trustStage,
                persona: a.persona,
                isQuarantined: a.isQuarantined,
                verificationsCompleted: a.verificationsCompleted,
            })));
        } catch {
            res.status(500).json({ error: 'Failed to retrieve trust data' });
        }
    });

    app.get('/api/v1/trust/:did', (req: Request, res: Response) => {
        if (!deps.qorelogicManager) {
            res.status(503).json({ error: 'QoreLogicManager not available' });
            return;
        }
        const trustEngine = deps.qorelogicManager.getTrustEngine();
        const score = trustEngine.getTrustScore(String(req.params.did));
        if (!score) {
            res.status(404).json({ error: 'Agent DID not found' });
            return;
        }
        res.json(score);
    });
}
