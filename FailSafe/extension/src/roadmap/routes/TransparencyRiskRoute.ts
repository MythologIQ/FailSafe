import { Request, Response } from "express";
import type { ApiRouteDeps } from "./types";

/**
 * Transparency audit stream and risk-register CRUD routes.
 * Extracted from ConsoleServer (lines 494-561).
 */
export function setupTransparencyRiskRoutes(
  app: import("express").Application,
  deps: ApiRouteDeps,
): void {
  // API: Get transparency events (prompt lifecycle audit stream)
  app.get("/api/transparency", (_req: Request, res: Response) => {
    const events = deps.getTransparencyEvents(50);
    res.json({ events });
  });

  // API: Get risk register
  app.get("/api/risks", (_req: Request, res: Response) => {
    const risks = deps.getRiskRegister();
    res.json({ risks });
  });

  // API: Create risk
  app.post("/api/v1/risks", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const { title, severity, status, description } = req.body;
    if (!title || !severity) {
      res
        .status(400)
        .json({ ok: false, error: "title and severity required" });
      return;
    }
    const risk = {
      id: `risk-${Date.now()}`,
      title: String(title).slice(0, 200),
      severity: String(severity),
      status: String(status || "open"),
      description: String(description || "").slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    const risks = deps.getRiskRegister();
    risks.push(risk);
    deps.writeRiskRegister(risks);
    deps.broadcast({ type: "risk.created", payload: risk });
    res.json({ ok: true, risk });
  });

  // API: Update risk
  app.put("/api/v1/risks/:id", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const id = req.params.id;
    const risks = deps.getRiskRegister();
    const idx = risks.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: "risk not found" });
      return;
    }
    const updated = { ...risks[idx], ...req.body, id };
    risks[idx] = updated;
    deps.writeRiskRegister(risks);
    deps.broadcast({ type: "risk.updated", payload: updated });
    res.json({ ok: true, risk: updated });
  });

  // API: Delete risk
  app.delete("/api/v1/risks/:id", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const id = req.params.id;
    const risks = deps.getRiskRegister();
    const filtered = risks.filter((r: any) => r.id !== id);
    if (filtered.length === risks.length) {
      res.status(404).json({ ok: false, error: "risk not found" });
      return;
    }
    deps.writeRiskRegister(filtered);
    deps.broadcast({ type: "risk.deleted", payload: { id } });
    res.json({ ok: true });
  });
}
