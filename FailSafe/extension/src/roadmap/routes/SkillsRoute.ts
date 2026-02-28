import { Request, Response } from 'express';
import { RouteDeps } from './index';
import { renderEmptyState } from '../../genesis/EmptyStates';

export const SkillsRoute = {
  render(req: Request, res: Response, deps: RouteDeps): void {
    const skills = deps.getInstalledSkills();
    if (skills.length === 0) {
      res.send(renderEmptyState('no-skills'));
      return;
    }

    const rows = (skills as Array<{ name: string; version?: string }>).map(s =>
      `<tr><td>${s.name}</td><td>${s.version ?? '-'}</td></tr>`
    ).join('');

    res.send(`<!DOCTYPE html><html><head><title>Skills</title></head><body>
      <h1>Installed Skills</h1>
      <table><thead><tr><th>Name</th><th>Version</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <a href="/console/home">Back</a>
    </body></html>`);
  },
};
