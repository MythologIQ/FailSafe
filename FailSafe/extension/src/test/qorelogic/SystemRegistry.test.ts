import * as assert from "assert";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { SystemRegistry } from "../../qorelogic/SystemRegistry";

suite("SystemRegistry Test Suite", () => {
  let tempDir: string;

  suiteSetup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "failsafe-registry-test-"));
    const stagingDir = path.join(tempDir, "FailSafe", "_STAGING_OLD");
    fs.mkdirSync(stagingDir, { recursive: true });

    // Mock an Antigravity manifest
    const agentDir = path.join(stagingDir, "Antigravity");
    fs.mkdirSync(agentDir);
    fs.writeFileSync(
      path.join(agentDir, "manifest.json"),
      JSON.stringify({
        id: "antigravity",
        name: "Antigravity / Gemini",
        description: "Antigravity Orbit-based architecture",
        sourceDir: "qorelogic/Antigravity/.qorelogic",
        targetDir: ".qorelogic",
        detection: { alwaysInstalled: true },
      }),
    );
  });

  suiteTeardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("should load manifests from FailSafe/_STAGING_OLD", async () => {
    const registry = new SystemRegistry(tempDir);
    const systems = await registry.getSystems();

    assert.strictEqual(
      systems.length,
      1,
      "Should load exactly 1 system manifest",
    );
    const manifest = systems[0].getManifest();
    assert.strictEqual(manifest.id, "antigravity");
    assert.strictEqual(manifest.name, "Antigravity / Gemini");
  });

  test("should resolve path relative to workspace root", () => {
    const registry = new SystemRegistry(tempDir);
    const resolved = registry.resolvePath("test/path");
    assert.strictEqual(resolved, path.join(tempDir, "test/path"));
  });

  test("should handle missing base directory gracefully", async () => {
    const registry = new SystemRegistry(
      path.join(tempDir, "non-existent-root"),
    );
    const systems = await registry.getSystems();
    assert.strictEqual(systems.length, 0);
  });

  test("detect() returns correct detection for known system", async () => {
    const registry = new SystemRegistry(tempDir);
    const systems = await registry.getSystems();
    assert.strictEqual(systems.length, 1);
    const result = await registry.detect(systems[0]);
    assert.strictEqual(result.detected, true);
  });

  test("getSystems() returns all registered systems with manifest fields", async () => {
    const registry = new SystemRegistry(tempDir);
    const systems = await registry.getSystems();
    assert.strictEqual(systems.length, 1);
    const manifest = systems[0].getManifest();
    assert.strictEqual(manifest.id, "antigravity");
    assert.strictEqual(manifest.name, "Antigravity / Gemini");
    assert.strictEqual(manifest.description, "Antigravity Orbit-based architecture");
    assert.strictEqual(manifest.sourceDir, "qorelogic/Antigravity/.qorelogic");
    assert.strictEqual(manifest.targetDir, ".qorelogic");
  });

  test("findById() returns undefined for unknown IDs", async () => {
    const registry = new SystemRegistry(tempDir);
    const result = await registry.findById("nonexistent");
    assert.strictEqual(result, undefined);
  });

  test("hasGovernance() returns true when governance path exists", async () => {
    const govDir = path.join(tempDir, ".qorelogic");
    fs.mkdirSync(govDir, { recursive: true });

    const registry = new SystemRegistry(tempDir);
    const systems = await registry.getSystems();
    const manifest = systems[0].getManifest();
    // Patch manifest to include governancePaths for this test
    (manifest as { governancePaths?: string[] }).governancePaths = [".qorelogic"];

    const result = registry.hasGovernance(systems[0]);
    assert.strictEqual(result, true);

    fs.rmSync(govDir, { recursive: true, force: true });
  });

  test("renderTemplate() replaces template variables", async () => {
    const registry = new SystemRegistry(tempDir);
    const systems = await registry.getSystems();
    const result = registry.renderTemplate("{{SYSTEM_NAME}} rules", systems[0]);
    assert.strictEqual(result, "Antigravity / Gemini rules");
  });
});
