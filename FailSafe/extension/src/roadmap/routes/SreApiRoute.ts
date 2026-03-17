import type { Application, Request, Response } from "express";
import type { ApiRouteDeps } from "./types";
import { fetchAgtSnapshot } from "./templates/SreTemplate";

const DEFAULT_ADAPTER_URL = "http://127.0.0.1:9377";

export function setupSreApiRoutes(
  app: Application,
  deps: Pick<ApiRouteDeps, "rejectIfRemote">,
  adapterBaseUrl?: string,
): void {
  const baseUrl = adapterBaseUrl || DEFAULT_ADAPTER_URL;
  app.get("/api/v1/sre", async (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) { return; }
    res.json(await fetchAgtSnapshot(baseUrl));
  });
}
