import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { AgentTeamsDetector } from '../../qorelogic/AgentTeamsDetector';

suite('AgentTeamsDetector Test Suite', () => {
  let tempDir: string;

  suiteSetup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'failsafe-teams-test-'));
  });

  suiteTeardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns disabled when settings file is missing', () => {
    const missingPath = path.join(tempDir, 'nonexistent', 'settings.json');
    const detector = new AgentTeamsDetector(missingPath);

    assert.strictEqual(detector.isAgentTeamsEnabled(), false);

    const config = detector.getTeamConfig();
    assert.strictEqual(config.enabled, false);
    assert.strictEqual(config.configPath, missingPath);
  });

  test('returns disabled when env var is not set', () => {
    const settingsPath = path.join(tempDir, 'settings-no-env.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ env: {} }), 'utf-8');

    const detector = new AgentTeamsDetector(settingsPath);
    assert.strictEqual(detector.isAgentTeamsEnabled(), false);
  });

  test('returns enabled when CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS is 1', () => {
    const settingsPath = path.join(tempDir, 'settings-enabled.json');
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
      }),
      'utf-8',
    );

    const detector = new AgentTeamsDetector(settingsPath);
    assert.strictEqual(detector.isAgentTeamsEnabled(), true);

    const config = detector.getTeamConfig();
    assert.strictEqual(config.enabled, true);
  });

  test('readClaudeSettings() returns null for missing file', () => {
    const missingPath = path.join(tempDir, 'missing.json');
    const detector = new AgentTeamsDetector(missingPath);
    assert.strictEqual(detector.readClaudeSettings(), null);
  });

  test('readClaudeSettings() returns null for invalid JSON', () => {
    const badPath = path.join(tempDir, 'bad.json');
    fs.writeFileSync(badPath, 'not valid json{{{', 'utf-8');

    const detector = new AgentTeamsDetector(badPath);
    assert.strictEqual(detector.readClaudeSettings(), null);
  });

  test('readClaudeSettings() parses valid settings', () => {
    const goodPath = path.join(tempDir, 'good.json');
    fs.writeFileSync(goodPath, JSON.stringify({ env: { FOO: 'bar' } }), 'utf-8');

    const detector = new AgentTeamsDetector(goodPath);
    const settings = detector.readClaudeSettings();
    assert.ok(settings !== null);
    assert.deepStrictEqual((settings as Record<string, unknown>).env, { FOO: 'bar' });
  });
});
