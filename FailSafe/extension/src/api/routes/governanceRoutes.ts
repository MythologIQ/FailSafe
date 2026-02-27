/**
 * Governance route handlers - mode management and intent lifecycle.
 */

import type express from 'express';
import type { Request, Response } from 'express';
import type { GovernanceMode } from '../../governance/EnforcementEngine';
import type { RouteDeps } from './types';

const VALID_MODES: GovernanceMode[] = ['observe', 'assist', 'enforce'];

export function registerGovernanceRoutes(app: express.Application, deps: RouteDeps): void {
    app.get('/api/v1/governance/mode', (_req: Request, res: Response) => {
        if (!deps.enforcementEngine) {
            res.status(503).json({ error: 'EnforcementEngine not available' });
            return;
        }
        res.json({ mode: deps.enforcementEngine.getGovernanceMode() });
    });

    app.put('/api/v1/governance/mode', async (req: Request, res: Response) => {
        const { mode } = req.body;
        if (!mode || !VALID_MODES.includes(mode)) {
            res.status(400).json({
                error: 'Invalid mode',
                message: `mode must be one of: ${VALID_MODES.join(', ')}`,
            });
            return;
        }

        const previousMode = deps.enforcementEngine?.getGovernanceMode() ?? 'observe';

        if (deps.onModeChangeRequest) {
            try {
                await deps.onModeChangeRequest(mode);
            } catch {
                res.status(500).json({ error: 'Failed to persist governance mode' });
                return;
            }
        }

        deps.eventBus.emit('sentinel.modeChange', {
            previousMode,
            newMode: mode,
            source: 'api',
            timestamp: new Date().toISOString(),
        });

        res.json({ mode, applied: true });
    });

    app.get('/api/v1/governance/intent', async (_req: Request, res: Response) => {
        if (!deps.intentService) {
            res.status(503).json({ error: 'IntentService not available' });
            return;
        }
        try {
            const intent = await deps.intentService.getActiveIntent();
            if (!intent) {
                res.json({ active: false, intent: null });
                return;
            }
            res.json({ active: true, intent });
        } catch {
            res.status(500).json({ error: 'Failed to retrieve active intent' });
        }
    });

    app.post('/api/v1/governance/intent/seal', async (req: Request, res: Response) => {
        if (!deps.intentService) {
            res.status(503).json({ error: 'IntentService not available' });
            return;
        }
        try {
            const actor = req.body?.actor || 'api';
            await deps.intentService.sealIntent(actor);
            res.json({ sealed: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to seal intent';
            res.status(400).json({ error: message });
        }
    });
}
