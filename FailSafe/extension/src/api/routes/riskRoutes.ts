/**
 * Risk route handlers - CRUD operations for the risk register.
 */

import type express from 'express';
import type { Request, Response } from 'express';
import type { RouteDeps } from './types';

const REQUIRED_RISK_FIELDS = [
    'title', 'description', 'category', 'severity', 'impact', 'mitigation',
] as const;

export function registerRiskRoutes(app: express.Application, deps: RouteDeps): void {
    app.get('/api/v1/risks', (_req: Request, res: Response) => {
        if (!deps.riskManager) {
            res.status(503).json({ error: 'RiskManager not available' });
            return;
        }
        res.json({
            risks: deps.riskManager.getAllRisks(),
            summary: deps.riskManager.getSummary(),
        });
    });

    app.post('/api/v1/risks', (req: Request, res: Response) => {
        if (!deps.riskManager) {
            res.status(503).json({ error: 'RiskManager not available' });
            return;
        }
        const { title, description, category, severity, impact, mitigation, owner, relatedArtifacts, checkpointId } = req.body;
        if (!title || !description || !category || !severity || !impact || !mitigation) {
            res.status(400).json({
                error: 'Missing required fields',
                required: [...REQUIRED_RISK_FIELDS],
            });
            return;
        }
        const risk = deps.riskManager.createRisk({
            title, description, category, severity, impact, mitigation, owner, relatedArtifacts, checkpointId,
        });
        res.status(201).json(risk);
    });

    app.put('/api/v1/risks/:id', (req: Request, res: Response) => {
        if (!deps.riskManager) {
            res.status(503).json({ error: 'RiskManager not available' });
            return;
        }
        const updated = deps.riskManager.updateRisk(String(req.params.id), req.body);
        if (!updated) {
            res.status(404).json({ error: 'Risk not found' });
            return;
        }
        res.json(updated);
    });

    app.delete('/api/v1/risks/:id', (req: Request, res: Response) => {
        if (!deps.riskManager) {
            res.status(503).json({ error: 'RiskManager not available' });
            return;
        }
        const deleted = deps.riskManager.deleteRisk(String(req.params.id));
        if (!deleted) {
            res.status(404).json({ error: 'Risk not found' });
            return;
        }
        res.status(204).send();
    });
}
