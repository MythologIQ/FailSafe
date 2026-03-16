import type { Application, Request, Response } from "express";
import type { ApiRouteDeps } from "./types";
import { fetchAgtSnapshot } from "./templates/SreTemplate";

export function setupSreApiRoutes(
  app: Application,
  deps: Pick<ApiRouteDeps, "rejectIfRemote">,
): void {
  app.get("/api/v1/sre", async (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) { return; }
    res.json(await fetchAgtSnapshot("http://127.0.0.1:9377"));
  });
}
