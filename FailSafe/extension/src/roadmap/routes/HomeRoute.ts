import { Request, Response } from 'express';
import { RouteDeps } from './index';
import { renderEmptyState } from '../../genesis/EmptyStates';

export const HomeRoute = {
  async render(req: Request, res: Response, deps: RouteDeps): Promise<void> {
    const sprint = deps.planManager.getCurrentSprint();
    const mode = deps.enforcementEngine.getGovernanceMode();
    const entries = await deps.ledgerManager.getRecentEntries(5);

    if (!sprint) {
      res.send(renderEmptyState('no-runs'));
      return;
    }

    const entryRows = entries.map(e =>
      `<tr><td>${e.timestamp}</td><td>${e.eventType}</td><td>${e.agentDid}</td></tr>`
    ).join('');

    res.send(`<!DOCTYPE html><html><head><title>FailSafe Console</title></head><body>
      <h1>Dashboard</h1>
      <p>Governance Mode: <strong>${mode}</strong></p>
      <h2>Current Sprint: ${sprint.name ?? sprint.id}</h2>
      <h3>Recent Ledger Entries</h3>
      <table><thead><tr><th>Time</th><th>Event</th><th>Agent</th></tr></thead>
      <tbody>${entryRows}</tbody></table>
      <nav>
        <a href="/console/workflows">Workflows</a> |
        <a href="/console/genome">Genome</a> |
        <a href="/console/reports">Reports</a> |
        <a href="/console/settings">Settings</a>
      </nav>
    </body></html>`);
  },
};
