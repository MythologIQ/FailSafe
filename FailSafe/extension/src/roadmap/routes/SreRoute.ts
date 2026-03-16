import { Request, Response } from "express";
import { buildSreHtml, type SreViewModel } from "./templates/SreTemplate";

export interface SreRouteDeps {
  getSnapshot: () => Promise<SreViewModel>;
}

export const SreRoute = {
  async render(_req: Request, res: Response, deps: SreRouteDeps): Promise<void> {
    res.send(buildSreHtml(await deps.getSnapshot()));
  },
};
