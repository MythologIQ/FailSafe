import { Request, Response } from 'express';
import { RouteDeps } from './index';

export const SettingsRoute = {
  render(req: Request, res: Response, deps: RouteDeps): void {
    const settings = deps.configProfile.getAll();
    const mode = deps.enforcementEngine.getGovernanceMode();

    const rows = settings.map(s =>
      `<tr><td>${s.key}</td><td>${s.value}</td><td>${s.source}</td></tr>`
    ).join('');

    res.send(`<!DOCTYPE html><html><head><title>Settings</title></head><body>
      <h1>Configuration</h1>
      <p>Governance Mode: <strong>${mode}</strong></p>
      <table><thead><tr><th>Key</th><th>Value</th><th>Source</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <a href="/console/home">Back</a>
    </body></html>`);
  },
};
