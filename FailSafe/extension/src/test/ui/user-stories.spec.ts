import fs from 'fs';
import http from 'http';
import path from 'path';
import { test, expect } from '@playwright/test';

type HubPayload = {
  activePlan: {
    id: string;
    currentPhaseId: string;
    phases: Array<{ id: string; title: string; status: string; progress: number; artifacts?: Array<{ touched?: boolean }> }>;
    blockers: Array<{ title: string; severity?: string; resolvedAt?: string | null; reason?: string }>;
    milestones: Array<{ title: string; completedAt?: string | null; targetDate?: string | null }>;
    risks: Array<{ level?: string }>;
  };
  sentinelStatus: { running: boolean; mode: string; filesWatched: number; queueDepth: number };
  l3Queue: unknown[];
  recentVerdicts: Array<{ decision?: string; riskGrade?: string; summary?: string }>;
  trustSummary: { totalAgents: number; avgTrust: number; quarantined: number; stageCounts: { CBT: number; KBT: number; IBT: number } };
  currentSprint: { name: string; status: string; startedAt: string } | null;
  checkpointSummary: { total: number; chainValid: boolean; latestType: string; latestAt: string; latestVerdict: string };
  recentCheckpoints: Array<{ checkpointType: string; policyVerdict: string; timestamp: string }>;
  generatedAt: string;
  sprints: unknown[];
};

function contentType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function baseHub(overrides?: Partial<HubPayload>): HubPayload {
  return {
    sprints: [],
    currentSprint: { name: 'S-001', status: 'active', startedAt: '2026-02-11T08:00:00.000Z' },
    activePlan: {
      id: 'plan-001',
      currentPhaseId: 'phase-plan',
      phases: [
        { id: 'phase-plan', title: 'Plan', status: 'active', progress: 35, artifacts: [{ touched: true }, { touched: false }] },
        { id: 'phase-audit', title: 'Audit', status: 'pending', progress: 0, artifacts: [] },
        { id: 'phase-implement', title: 'Implement', status: 'pending', progress: 0, artifacts: [] },
      ],
      blockers: [],
      milestones: [{ title: 'Intent ratified', completedAt: '2026-02-11T09:00:00.000Z' }, { title: 'Policy pack loaded' }],
      risks: [],
    },
    sentinelStatus: { running: true, mode: 'heuristic', filesWatched: 12, queueDepth: 0 },
    l3Queue: [],
    recentVerdicts: [],
    trustSummary: { totalAgents: 3, avgTrust: 0.92, quarantined: 0, stageCounts: { CBT: 1, KBT: 1, IBT: 1 } },
    checkpointSummary: {
      total: 4,
      chainValid: true,
      latestType: 'policy.checked',
      latestAt: '2026-02-11T10:00:00.000Z',
      latestVerdict: 'PASS',
    },
    recentCheckpoints: [
      { checkpointType: 'policy.checked', policyVerdict: 'PASS', timestamp: '2026-02-11T10:00:00.000Z' },
    ],
    generatedAt: '2026-02-11T10:01:00.000Z',
    ...overrides,
  };
}

function defaultSkills() {
  return [
    {
      id: 'elevenlabs-audio-generate-music',
      displayName: 'Generate Music',
      desc: 'Generate music via ElevenLabs.',
      creator: 'ElevenLabs',
      sourceRepo: 'elevenlabs/skills',
      sourcePath: 'FailSafe/VSCode/skills/music/SKILL.md',
      versionPin: 'local-main',
      trustTier: 'verified',
      sourceType: 'project-canonical',
      sourcePriority: 1,
      admissionState: 'admitted',
      requiredPermissions: ['network'],
    },
    {
      id: 'qore-governance-enforce-compliance',
      displayName: 'Governance Compliance',
      desc: 'Enforce governance constraints.',
      creator: 'MythologIQ',
      sourceRepo: 'MythologIQ/FailSafe',
      sourcePath: 'FailSafe/VSCode/skills/qore-governance-compliance/SKILL.md',
      versionPin: 'local-main',
      trustTier: 'verified',
      sourceType: 'project-canonical',
      sourcePriority: 1,
      admissionState: 'admitted',
      requiredPermissions: [],
    },
  ];
}

async function withUiServer(
  handler: (baseUrl: string) => Promise<void>,
  options?: { hub?: HubPayload; skills?: unknown[]; relevance?: Record<string, unknown> },
): Promise<void> {
  const root = path.resolve(__dirname, '../../roadmap/ui');
  const hubPayload = options?.hub || baseHub();
  const skills = options?.skills || defaultSkills();
  const relevance = options?.relevance || {};

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/api/hub' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(hubPayload));
      return;
    }
    if (url.pathname === '/api/skills' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ skills }));
      return;
    }
    if (url.pathname === '/api/skills/relevance' && req.method === 'GET') {
      const phase = String(url.searchParams.get('phase') || 'plan');
      const phasePayload = (relevance[phase] as Record<string, unknown> | undefined) || {};
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        phase,
        recommended: phasePayload.recommended || skills,
        allRelevant: phasePayload.allRelevant || skills,
        otherAvailable: phasePayload.otherAvailable || [],
      }));
      return;
    }
    if (url.pathname === '/api/actions/resume-monitoring' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true, status: { running: true } }));
      return;
    }
    if (url.pathname === '/api/actions/panic-stop' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true, status: { running: false } }));
      return;
    }
    if (url.pathname === '/api/skills/ingest/auto' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true, admitted: 1, skipped: 0, failed: 0, skills }));
      return;
    }
    if (url.pathname === '/api/skills/ingest/manual' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true, admitted: 1, failed: 0, skills }));
      return;
    }

    const requestPath = decodeURIComponent(url.pathname);
    const relative = requestPath === '/' ? 'legacy-index.html' : requestPath.replace(/^\/+/, '');
    const filePath = path.join(root, relative);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', contentType(filePath));
    res.end(fs.readFileSync(filePath));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind test server');
  }

  try {
    await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    if (typeof (server as { closeAllConnections?: () => void }).closeAllConnections === 'function') {
      (server as { closeAllConnections: () => void }).closeAllConnections();
    }
    if (typeof (server as { closeIdleConnections?: () => void }).closeIdleConnections === 'function') {
      (server as { closeIdleConnections: () => void }).closeIdleConnections();
    }
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test('US: Command Center branding and skills tabs default behavior', async ({ page }) => {
  await withUiServer(async (baseUrl) => {
    await page.goto(`${baseUrl}/legacy-index.html`);
    await expect(page).toHaveTitle(/FailSafe Command Center/);
    await expect(page.getByRole('heading', { name: 'FailSafe Command Center' })).toBeVisible();

    await page.getByRole('button', { name: 'Skills' }).click();
    await expect(page.locator('[data-skill-tab="recommended"]')).toHaveClass(/active/);
    await expect(page.locator('[data-skill-panel="recommended"]')).toHaveClass(/active/);

    await page.locator('[data-skill-tab="allInstalled"]').click();
    await expect(page.locator('[data-skill-tab="allInstalled"]')).toHaveClass(/active/);
    await expect(page.locator('[data-skill-panel="allInstalled"]')).toHaveClass(/active/);
  });
});

test('US: mission state precedence when Sentinel is paused', async ({ page }) => {
  await withUiServer(async (baseUrl) => {
    await page.goto(`${baseUrl}/legacy-index.html`);
    await expect(page.locator('#mission-state')).toHaveText(/Risk Elevated/);
    await expect(page.locator('#mission-detail')).toContainText('Sentinel paused');
  }, {
    hub: baseHub({
      sentinelStatus: { running: false, mode: 'heuristic', filesWatched: 10, queueDepth: 0 },
    }),
  });
});

test('US: mission state precedence for critical risk signals', async ({ page }) => {
  await withUiServer(async (baseUrl) => {
    await page.goto(`${baseUrl}/legacy-index.html`);
    await expect(page.locator('#mission-state')).toHaveText(/Risk Elevated/);
    await expect(page.locator('#mission-detail')).toContainText('risk');
  }, {
    hub: baseHub({
      sentinelStatus: { running: true, mode: 'heuristic', filesWatched: 10, queueDepth: 2 },
      recentVerdicts: [{ decision: 'BLOCK', summary: 'Critical policy violation' }],
      activePlan: {
        ...baseHub().activePlan,
        blockers: [{ title: 'Danger blocker', severity: 'hard' }, { title: 'Second blocker', severity: 'hard' }],
      },
    }),
  });
});

test('US: mission state for audit in progress', async ({ page }) => {
  const hub = baseHub();
  hub.activePlan.currentPhaseId = 'phase-audit';
  hub.activePlan.phases = hub.activePlan.phases.map((phase) => ({
    ...phase,
    status: phase.id === 'phase-audit' ? 'active' : 'pending',
  }));
  hub.sentinelStatus.queueDepth = 3;

  await withUiServer(async (baseUrl) => {
    await page.goto(`${baseUrl}/legacy-index.html`);
    await expect(page.locator('#mission-state')).toHaveText(/Audit In Progress/);
    await expect(page.locator('#mission-detail')).toContainText(/queue/i);
  }, { hub });
});

test('US: mission state for build running and governance active', async ({ page }) => {
  const buildHub = baseHub();
  buildHub.activePlan.currentPhaseId = 'phase-implement';
  buildHub.activePlan.phases = buildHub.activePlan.phases.map((phase) => ({
    ...phase,
    status: phase.id === 'phase-implement' ? 'active' : 'pending',
  }));

  await withUiServer(async (baseUrl) => {
    await page.goto(`${baseUrl}/legacy-index.html`);
    await expect(page.locator('#mission-state')).toHaveText(/Build Running/);
  }, { hub: buildHub });

  await withUiServer(async (baseUrl) => {
    await page.goto(`${baseUrl}/legacy-index.html`);
    await expect(page.locator('#mission-state')).toHaveText(/Governance Active/);
  }, { hub: baseHub() });
});

test('US: action feedback confirms cause and effect', async ({ page }) => {
  await withUiServer(async (baseUrl) => {
    await page.goto(`${baseUrl}/legacy-index.html`);
    await page.getByRole('button', { name: 'Run' }).click();

    await page.locator('[data-action="resume"]').click();
    await expect(page.locator('#action-feedback')).toContainText('Run started');

    await page.locator('[data-action="panic"]').click();
    await expect(page.locator('#action-feedback')).toContainText('Monitoring stopped');
  });
});

test('US: Monitor compact layout keeps 4 workspace tiles in 2x2 at sidebar width', async ({ page }) => {
  const root = path.resolve(__dirname, '../../roadmap/ui');
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const filePath = path.join(root, relative);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.setHeader('Content-Type', contentType(filePath));
    res.end(fs.readFileSync(filePath));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind test server');
  }

  try {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`http://127.0.0.1:${address.port}/index.html?theme=dark`);
    const tiles = page.locator('.health-grid .health-item');
    await expect(tiles).toHaveCount(4);

    const boxes = await tiles.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = (node as { getBoundingClientRect: () => { left: number; top: number } }).getBoundingClientRect();
        return { x: rect.left, y: rect.top };
      }),
    );
    const rowKeys = Array.from(new Set(boxes.map((box) => Math.round(box.y / 10) * 10)));
    expect(rowKeys.length).toBe(2);
  } finally {
    if (typeof (server as { closeAllConnections?: () => void }).closeAllConnections === 'function') {
      (server as { closeAllConnections: () => void }).closeAllConnections();
    }
    if (typeof (server as { closeIdleConnections?: () => void }).closeIdleConnections === 'function') {
      (server as { closeIdleConnections: () => void }).closeIdleConnections();
    }
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
