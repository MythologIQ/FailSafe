import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { setupSreApiRoutes } from '../../roadmap/routes/SreApiRoute';

function makeApp() {
  const routes: Array<{ path: string; handler: ((...args: unknown[]) => unknown) }> = [];
  return {
    get(path: string, handler: ((...args: unknown[]) => unknown)) { routes.push({ path, handler }); },
    routes,
  };
}

function makeReq(ip = '127.0.0.1') {
  return { ip, socket: { remoteAddress: ip } } as any;
}

function makeRes() {
  let status = 200;
  let body: unknown;
  return {
    status(s: number) { status = s; return this; },
    json(b: unknown) { body = b; },
    send(b: unknown) { body = b; },
    get status_() { return status; },
    get body_() { return body; },
  };
}

describe('SreApiRoute', () => {
  it('registers GET /api/v1/sre', () => {
    const app = makeApp();
    setupSreApiRoutes(app as any, { rejectIfRemote: () => false });
    assert.ok(app.routes.some(r => r.path === '/api/v1/sre'), 'route not registered');
  });

  it('returns 403 for non-local requests via rejectIfRemote', async () => {
    const app = makeApp();
    let rejected = false;
    setupSreApiRoutes(app as any, {
      rejectIfRemote: (_req: any, res: any) => {
        res.status(403).json({ error: 'forbidden' });
        rejected = true;
        return true;
      },
    });
    const route = app.routes.find(r => r.path === '/api/v1/sre');
    const req = makeReq('192.168.1.1');
    const res = makeRes();
    await route!.handler(req, res);
    assert.ok(rejected, 'rejectIfRemote was not called');
  });

  it('returns connected:false when adapter unreachable', async () => {
    const app = makeApp();
    setupSreApiRoutes(app as any, { rejectIfRemote: () => false });
    const route = app.routes.find(r => r.path === '/api/v1/sre');

    const originalFetch = global.fetch;
    global.fetch = async () => { throw new Error('ECONNREFUSED'); };
    try {
      const req = makeReq();
      const res = makeRes();
      await route!.handler(req, res);
      assert.deepStrictEqual(res.body_, { connected: false, snapshot: null });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('returns connected:true when adapter responds', async () => {
    const app = makeApp();
    setupSreApiRoutes(app as any, { rejectIfRemote: () => false });
    const route = app.routes.find(r => r.path === '/api/v1/sre');

    const mockData = { policies: [], trustScores: [], sli: {}, asiCoverage: {} };
    global.fetch = async () => ({
      ok: true,
      json: async () => mockData,
    }) as any;
    try {
      const req = makeReq();
      const res = makeRes();
      await route!.handler(req, res);
      assert.deepStrictEqual(res.body_, { connected: true, snapshot: mockData });
    } finally {
      delete (global as any).fetch;
    }
  });
});
