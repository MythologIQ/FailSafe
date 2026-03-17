import type { Application, Request, Response } from "express";
import type { ApiRouteDeps } from "./types";
import { fetchAgtSnapshot } from "./templates/SreTemplate";

const DEFAULT_ADAPTER_URL = "http://127.0.0.1:9377";

async function proxyAdapterGet(url: string): Promise<unknown> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

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

  app.get("/api/v1/sre/events", async (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) { return; }
    const data = await proxyAdapterGet(`${baseUrl}/sre/events`);
    res.json(data || { events: [] });
  });

  app.get("/api/v1/sre/fleet", async (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) { return; }
    const data = await proxyAdapterGet(`${baseUrl}/sre/fleet`);
    res.json(data || { agents: [] });
  });
}
