/**
 * AgentApiRoute — Extracted route module for agent timeline, health,
 * genome, and run replay API endpoints.
 *
 * Follows established `setupXxxRoutes(app, deps)` pattern.
 */
import type { Application, Request, Response } from "express";
import type { ApiRouteDeps } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function setupAgentApiRoutes(
  app: Application,
  deps: ApiRouteDeps,
): void {
  app.get("/api/v1/timeline", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const entries = deps.getTimelineEntries(req.query);
    res.json({ entries });
  });

  app.get("/api/v1/health", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const metrics = deps.getHealthMetrics();
    res.json({ metrics });
  });

  app.get("/api/v1/genome", async (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const patterns = await deps.getGenomePatterns();
    const unresolved = await deps.getGenomeUnresolved(50);
    res.json({ patterns, unresolved });
  });

  app.get("/api/v1/runs", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const active = deps.getActiveRuns();
    const completed = deps.getCompletedRuns();
    res.json({ active, completed });
  });

  app.get("/api/v1/runs/:runId", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const runId = String(req.params.runId || "");
    if (!UUID_PATTERN.test(runId)) {
      res.status(400).json({ error: "Invalid run ID format" });
      return;
    }
    const run = deps.getRun(runId) ?? deps.loadRun(runId);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.json({ run });
  });

  app.get("/api/v1/runs/:runId/steps", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const runId = String(req.params.runId || "");
    if (!UUID_PATTERN.test(runId)) {
      res.status(400).json({ error: "Invalid run ID format" });
      return;
    }
    const steps = deps.getRunSteps(runId);
    res.json({ steps });
  });
}
