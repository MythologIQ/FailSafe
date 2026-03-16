import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { buildSreHtml, fetchAgtSnapshot, type AgtSreSnapshot, type SreViewModel } from '../../roadmap/routes/templates/SreTemplate';

function mockSnapshot(overrides: Partial<AgtSreSnapshot> = {}): AgtSreSnapshot {
  return {
    policies: [],
    trustScores: [],
    sli: { name: "compliance", target: 0.95, currentValue: null, meetingTarget: null, totalDecisions: 0 },
    asiCoverage: {
      "ASI-03": { label: "Audit Trail", covered: true, feature: "FailSafeAuditSink" },
      "ASI-06": { label: "Delegation Chain Visibility", covered: true, feature: "FailSafeTrustMapper (partial)" },
    },
    ...overrides,
  };
}

describe('SreTemplate', () => {
  describe('buildSreHtml — disconnected', () => {
    it('contains AGT Adapter not connected message', () => {
      const html = buildSreHtml({ connected: false, snapshot: null });
      assert.ok(html.includes('AGT Adapter not connected'), 'missing disconnect message');
    });

    it('contains install command', () => {
      const html = buildSreHtml({ connected: false, snapshot: null });
      assert.ok(html.includes('agent-failsafe[server]'), 'missing install command');
    });
  });

  describe('buildSreHtml — connected', () => {
    it('contains Active Policies heading', () => {
      const html = buildSreHtml({ connected: true, snapshot: mockSnapshot() });
      assert.ok(html.includes('Active Policies'), 'missing Active Policies heading');
    });

    it('contains OWASP ASI Coverage heading', () => {
      const html = buildSreHtml({ connected: true, snapshot: mockSnapshot() });
      assert.ok(html.includes('OWASP ASI Coverage'), 'missing OWASP ASI Coverage heading');
    });

    it('HTML-escapes policy name to prevent XSS', () => {
      const snap = mockSnapshot({
        policies: [{ name: '<script>alert(1)</script>', type: 'allow', enforced: true }],
      });
      const html = buildSreHtml({ connected: true, snapshot: snap });
      assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script tag present — XSS risk');
      assert.ok(html.includes('&lt;script&gt;'), 'escaped content not found');
    });

    it('enforced policy row has class "on"', () => {
      const snap = mockSnapshot({
        policies: [{ name: 'p1', type: 'allow', enforced: true }],
      });
      const html = buildSreHtml({ connected: true, snapshot: snap });
      assert.ok(html.includes('class="on"'), 'missing on class for enforced policy');
    });

    it('inactive policy row has class "off"', () => {
      const snap = mockSnapshot({
        policies: [{ name: 'p1', type: 'deny', enforced: false }],
      });
      const html = buildSreHtml({ connected: true, snapshot: snap });
      assert.ok(html.includes('class="off"'), 'missing off class for inactive policy');
    });

    it('ASI-03 row contains covered checkmark', () => {
      const html = buildSreHtml({ connected: true, snapshot: mockSnapshot() });
      assert.ok(html.includes('ASI-03'), 'ASI-03 row missing');
      assert.ok(html.includes('&#10003;'), 'checkmark entity missing');
    });

    it('ASI-06 row is present', () => {
      const html = buildSreHtml({ connected: true, snapshot: mockSnapshot() });
      assert.ok(html.includes('ASI-06'), 'ASI-06 row missing');
    });

    it('meetingTarget true produces meeting target text', () => {
      const snap = mockSnapshot({ sli: { name: 's', target: 0.95, currentValue: 0.97, meetingTarget: true, totalDecisions: 10 } });
      const html = buildSreHtml({ connected: true, snapshot: snap });
      assert.ok(html.includes('Meeting target'), 'meeting target text missing');
    });

    it('meetingTarget false produces below target text', () => {
      const snap = mockSnapshot({ sli: { name: 's', target: 0.95, currentValue: 0.80, meetingTarget: false, totalDecisions: 10 } });
      const html = buildSreHtml({ connected: true, snapshot: snap });
      assert.ok(html.includes('Below target'), 'below target text missing');
    });

    it('meetingTarget null produces No data text', () => {
      const snap = mockSnapshot({ sli: { name: 's', target: 0.95, currentValue: null, meetingTarget: null, totalDecisions: 0 } });
      const html = buildSreHtml({ connected: true, snapshot: snap });
      assert.ok(html.includes('No data'), 'no data text missing');
    });
  });

  describe('fetchAgtSnapshot', () => {
    it('returns connected: false when fetch throws', async () => {
      // Override global fetch to simulate network failure
      const originalFetch = global.fetch;
      global.fetch = async () => { throw new Error('ECONNREFUSED'); };
      try {
        const result = await fetchAgtSnapshot('http://127.0.0.1:9377');
        assert.strictEqual(result.connected, false);
        assert.strictEqual(result.snapshot, null);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
