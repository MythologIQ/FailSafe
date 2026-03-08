import { Request, Response } from "express";
import type { ApiRouteDeps } from "./types";

/** Shape passed to RevertService.revert() */
interface RevertRequest {
  targetCheckpoint: any;
  reason: string;
  actor: string;
}

/**
 * Checkpoint listing, detail, and rollback routes.
 * Extracted from ConsoleServer (lines 776-839).
 */
export function setupCheckpointRoutes(
  app: import("express").Application,
  deps: ApiRouteDeps,
): void {
  app.get("/api/checkpoints", (req: Request, res: Response) => {
    const limitRaw = Number.parseInt(String(req.query.limit || "50"), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(200, limitRaw))
      : 50;
    res.json({
      checkpoints: deps.getRecentCheckpoints(limit),
      chainValid: deps.verifyCheckpointChain(),
    });
  });

  // API: Get a single checkpoint by ID
  app.get("/api/checkpoints/:id", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ ok: false, error: "id required" });
      return;
    }
    const checkpoint = deps.getCheckpointById(id);
    res.json({ ok: true, checkpoint });
  });

  // API: Rollback to a checkpoint
  app.post(
    "/api/actions/rollback",
    async (req: Request, res: Response) => {
      if (deps.rejectIfRemote(req, res)) return;
      if (!deps.revertService) {
        res
          .status(503)
          .json({ ok: false, error: "revert service unavailable" });
        return;
      }
      const { checkpointId, reason: rawReason } = req.body as {
        checkpointId?: string;
        reason?: string;
      };
      if (!checkpointId) {
        res.status(400).json({ ok: false, error: "checkpointId required" });
        return;
      }
      const actor = "user.local";
      const reason = String(rawReason || "").slice(0, 2000);
      const checkpoint = deps.getCheckpointById(checkpointId);
      if (!checkpoint) {
        res.status(404).json({ ok: false, error: "checkpoint not found" });
        return;
      }
      try {
        const request: RevertRequest = {
          targetCheckpoint: checkpoint,
          reason,
          actor,
        };
        const result = await deps.revertService.revert(request);
        deps.broadcast({ type: "hub.refresh" });
        res.json({ ok: result.success, result });
      } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
      }
    },
  );
}
