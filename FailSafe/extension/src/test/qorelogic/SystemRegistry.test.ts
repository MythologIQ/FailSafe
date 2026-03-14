import * as assert from "assert";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { SystemRegistry } from "../../qorelogic/SystemRegistry";

suite("SystemRegistry Test Suite", () => {
  let tempDir: string;

  suiteSetup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "failsafe-registry-test-"));
  });

  suiteTeardown(function () {
    this.timeout(10000);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Windows may hold brief locks on temp dirs; swallow cleanup errors
    }
  });

  test("should return all 6 built-in agent systems", async () => {
    const registry = new SystemRegistry(tempDir);
    const systems = await registry.getSystems();
    assert.strictEqual(systems.length, 6, "Should return exactly 6 built-in agents");

    const agentIds = systems.map((s) => s.getManifest().id);
    assert.ok(agentIds.includes("claude"));
    assert.ok(agentIds.includes("copilot"));
    assert.ok(agentIds.includes("cursor"));
    assert.ok(agentIds.includes("codex"));
    assert.ok(agentIds.includes("windsurf"));
    assert.ok(agentIds.includes("gemini"));
  });

  test("detect() returns true when folder detection marker exists", async () => {
    const claudeDir = path.join(tempDir, ".claude");
    fs.mkdirSync(claudeDir, { recursive: true });

    const registry = new SystemRegistry(tempDir);
    const claude = await registry.findById("claude");
    assert.ok(claude, "claude system should exist");

    const result = await registry.detect(claude);
    assert.strictEqual(result.detected, true);

    fs.rmSync(claudeDir, { recursive: true, force: true });
  });

  test("hasGovernance() returns true when governance paths exist", async () => {
    const skillsDir = path.join(tempDir, ".claude", "skills");
    fs.mkdirSync(skillsDir, { recursive: true });

    const registry = new SystemRegistry(tempDir);
    const claude = await registry.findById("claude");
    assert.ok(claude);

    const result = registry.hasGovernance(claude);
    assert.strictEqual(result, true);

    fs.rmSync(path.join(tempDir, ".claude"), { recursive: true, force: true });
  });

  test("findById() returns correct system", async () => {
    const registry = new SystemRegistry(tempDir);
    const gemini = await registry.findById("gemini");
    assert.ok(gemini);
    assert.strictEqual(gemini.getManifest().name, "Gemini CLI");
  });

  test("findById() returns undefined for unknown IDs", async () => {
    const registry = new SystemRegistry(tempDir);
    const result = await registry.findById("nonexistent");
    assert.strictEqual(result, undefined);
  });

  test("resolvePath() returns correct absolute path", () => {
    const registry = new SystemRegistry(tempDir);
    const resolved = registry.resolvePath("test/path");
    assert.strictEqual(resolved, path.join(tempDir, "test/path"));
  });

  test("renderTemplate() replaces template variables", async () => {
    const registry = new SystemRegistry(tempDir);
    const claude = await registry.findById("claude");
    assert.ok(claude);

    const result = registry.renderTemplate("{{SYSTEM_NAME}} ({{SYSTEM_ID}})", claude);
    assert.strictEqual(result, "Claude Code (claude)");
  });
});
