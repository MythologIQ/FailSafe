import { describe, it } from 'mocha';
import { strict as assert } from 'assert';

// Access private getHtml() via cast for structural verification
import { FailSafeSidebarProvider } from '../../roadmap/FailSafeSidebarProvider';

function getSidebarHtml(): string {
  const provider = new FailSafeSidebarProvider(9376);
  // Inject a minimal view stub so getHtml() can interpolate cspSource
  (provider as any).view = { webview: { cspSource: 'vscode-webview:' } };
  return (provider as any).getHtml();
}

describe('FailSafeSidebarProvider — SRE toggle', () => {
  it('contains #btn-monitor with aria-selected="true"', () => {
    const html = getSidebarHtml();
    assert.ok(html.includes('id="btn-monitor"'), '#btn-monitor missing');
    assert.ok(html.includes('aria-selected="true"'), 'btn-monitor aria-selected="true" missing');
  });

  it('contains #btn-sre with aria-selected="false"', () => {
    const html = getSidebarHtml();
    assert.ok(html.includes('id="btn-sre"'), '#btn-sre missing');
    assert.ok(html.includes('aria-selected="false"'), 'btn-sre aria-selected="false" missing');
  });

  it('contains #main-frame iframe', () => {
    const html = getSidebarHtml();
    assert.ok(html.includes('id="main-frame"'), '#main-frame iframe missing');
  });

  it('toggle JS is in existing script block (no second acquireVsCodeApi call)', () => {
    const html = getSidebarHtml();
    const count = (html.match(/acquireVsCodeApi/g) || []).length;
    assert.strictEqual(count, 1, `Expected 1 acquireVsCodeApi call, got ${count}`);
  });

  it('switchView function is present in script block', () => {
    const html = getSidebarHtml();
    assert.ok(html.includes('function switchView'), 'switchView function missing');
  });

  it('initBtn state write spreads existing state', () => {
    const html = getSidebarHtml();
    assert.ok(
      html.includes('...vscode.getState(), initDone: true'),
      'initBtn state write does not spread — sreMode will be clobbered',
    );
  });
});
