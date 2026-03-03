/**
 * Governance route handlers - mode management and intent lifecycle.
 */

import type express from 'express';
import type { Request, Response } from 'express';
import type { GovernanceMode } from '../../governance/EnforcementEngine';
import type { LedgerEventType } from '../../shared/types';
import type { RouteDeps } from './types';

const VALID_MODES: GovernanceMode[] = ['observe', 'assist', 'enforce'];

/** Pure decision function for commit-check endpoint. */
function resolveCommitDecision(
    mode: GovernanceMode,
    intent: { status: string } | null | undefined,
): { allow: boolean; reason: string } {
    if (mode === 'observe') {
        const reason = (intent?.status === 'VETO' || intent?.status === 'PULSE')
            ? `Intent is ${intent.status} (observe mode — commit allowed)` : 'ok';
        return { allow: true, reason };
    }
    if (mode === 'assist') {
        const reason = (intent?.status === 'VETO' || intent?.status === 'PULSE')
            ? `Intent is ${intent.status} — consider resolving before pushing` : 'ok';
        return { allow: true, reason };
    }
    // enforce mode
    if (!intent) return { allow: false, reason: 'No active intent (enforce mode)' };
    if (intent.status === 'PULSE') return { allow: false, reason: 'Intent is under review (PULSE)' };
    if (intent.status === 'VETO') return { allow: false, reason: 'Intent was rejected (VETO)' };
    return { allow: true, reason: 'ok' };
}

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

    app.get('/api/v1/governance/commit-check', async (req: Request, res: Response) => {
        const token = req.headers['x-failsafe-token'];
        if (!deps.commitGuard?.validateToken(token as string)) {
            res.status(401).json({ allow: false, reason: 'Invalid hook token' });
            return;
        }
        if (!deps.enforcementEngine) {
            res.json({ allow: true, reason: 'EnforcementEngine not available' });
            return;
        }
        const mode = deps.enforcementEngine.getGovernanceMode();
        const intent = await deps.intentService?.getActiveIntent();
        res.json(resolveCommitDecision(mode, intent));
    });

    app.get('/api/v1/governance/provenance/:artifactPath', async (req: Request, res: Response) => {
        if (!deps.ledgerManager) {
            res.status(503).json({ error: 'LedgerManager not available' });
            return;
        }
        try {
            const artifactPath = decodeURIComponent(req.params.artifactPath as string);
            const allProvenance = await deps.ledgerManager.getEntriesByType('PROVENANCE_RECORDED' as LedgerEventType, 200);
            const entries = allProvenance.filter(e => e.artifactPath === artifactPath);
            res.json({ artifactPath, entries });
        } catch {
            res.status(500).json({ error: 'Failed to query provenance' });
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
