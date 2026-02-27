/**
 * Feature route handlers - feature flag status and tier inspection.
 */

import type express from 'express';
import type { Request, Response } from 'express';
import { FEATURE_TIER_MAP } from '../../core/FeatureGateService';
import type { FeatureFlag } from '../../core/interfaces/IFeatureGate';
import type { RouteDeps } from './types';

export function registerFeatureRoutes(app: express.Application, deps: RouteDeps): void {
    app.get('/api/v1/features', (_req: Request, res: Response) => {
        const flags = Object.keys(FEATURE_TIER_MAP) as FeatureFlag[];
        const features = flags.map(flag => ({
            flag,
            requiredTier: FEATURE_TIER_MAP[flag],
            enabled: deps.featureGate.isEnabled(flag),
        }));
        res.json({
            tier: deps.featureGate.getTier(),
            features,
        });
    });

    app.get('/api/v1/features/:flag', (req: Request, res: Response) => {
        const flag = req.params.flag as FeatureFlag;
        if (!(flag in FEATURE_TIER_MAP)) {
            res.status(404).json({ error: 'Feature flag not found' });
            return;
        }
        res.json({
            flag,
            requiredTier: FEATURE_TIER_MAP[flag],
            enabled: deps.featureGate.isEnabled(flag),
        });
    });
}
