/**
 * Integration tests for release-gate.cjs preflight checks.
 *
 * Covers:
 *   B108 — COMPONENT_HELP.md / PROCESS_GUIDE.md version marker validation
 *   B137 — Branch policy enforcement (verified via validate-branch-policy.ps1 assertion)
 *   B138 — Release pipeline gate ordering (verified via release.yml assertion)
 *   B139 — BACKLOG.md duplicate detection and version summary validation
 *
 * Runs standalone: node --test src/test/scripts/releaseGate.test.cjs
 */

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const releaseGate = require(path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "scripts",
  "release-gate.cjs",
));

const TEST_VERSION = "4.9.2";
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");

/** Build a minimal fixture tree that passes all preflight checks. */
function createPassingFixture(tmpBase) {
  const extDir = path.join(tmpBase, "ext");
  const rootDir = path.join(tmpBase, "root");
  fs.mkdirSync(path.join(extDir, "docs"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "docs"), { recursive: true });

  fs.writeFileSync(
    path.join(extDir, "CHANGELOG.md"),
    `## [${TEST_VERSION}] - 2026-03-13\n- Added thing`,
  );
  fs.writeFileSync(
    path.join(extDir, "README.md"),
    `**Current Release**: v${TEST_VERSION} (2026-03-13)`,
  );
  fs.writeFileSync(
    path.join(extDir, "docs", "COMPONENT_HELP.md"),
    `Audience: operators using the packaged VS Code extension (v${TEST_VERSION}).`,
  );
  fs.writeFileSync(
    path.join(extDir, "docs", "PROCESS_GUIDE.md"),
    `Audience: operators who need fast workflows for the shipped v${TEST_VERSION} UI.`,
  );
  fs.writeFileSync(
    path.join(rootDir, "CHANGELOG.md"),
    `## [${TEST_VERSION}] - 2026-03-13\n- Infrastructure hardening`,
  );
  fs.writeFileSync(
    path.join(rootDir, "docs", "BACKLOG.md"),
    [
      "# Backlog",
      "",
      "[B1] First item",
      "[B2] Second item",
      "[B3] Third item",
      "",
      "## Version Summary",
      "",
      "| Version | Status |",
      "| --- | --- |",
      `| ${TEST_VERSION} | Released |`,
      "",
      "---",
    ].join("\n"),
  );

  return { extDir, rootDir };
}

/** Helper: find a named check in the preflight result. */
function findCheck(result, name) {
  return result.checks.find((c) => c.name === name);
}

// ── B108: COMPONENT_HELP.md version marker ────────────────────────

describe("B108: component-help-version", () => {
  let tmpDir;
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-b108-ch-"));
  });
  after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it("passes when COMPONENT_HELP.md contains the target version", () => {
    const { extDir, rootDir } = createPassingFixture(tmpDir);
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "component-help-version");
    assert.equal(check.pass, true);
  });

  it("fails when COMPONENT_HELP.md does NOT contain the version", () => {
    const sub = path.join(tmpDir, "missing-ch");
    const { extDir, rootDir } = createPassingFixture(sub);
    fs.writeFileSync(
      path.join(extDir, "docs", "COMPONENT_HELP.md"),
      "Audience: operators using the packaged VS Code extension.",
    );
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "component-help-version");
    assert.equal(check.pass, false);
    assert.equal(result.pass, false);
  });
});

// ── B108: PROCESS_GUIDE.md version marker ─────────────────────────

describe("B108: process-guide-version", () => {
  let tmpDir;
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-b108-pg-"));
  });
  after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it("passes when PROCESS_GUIDE.md contains the target version", () => {
    const { extDir, rootDir } = createPassingFixture(tmpDir);
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "process-guide-version");
    assert.equal(check.pass, true);
  });

  it("fails when PROCESS_GUIDE.md does NOT contain the version", () => {
    const sub = path.join(tmpDir, "missing-pg");
    const { extDir, rootDir } = createPassingFixture(sub);
    fs.writeFileSync(
      path.join(extDir, "docs", "PROCESS_GUIDE.md"),
      "Audience: operators who need fast workflows for the shipped UI.",
    );
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "process-guide-version");
    assert.equal(check.pass, false);
    assert.equal(result.pass, false);
  });
});

// ── B139: backlog-no-duplicates ───────────────────────────────────

describe("B139: backlog-no-duplicates", () => {
  let tmpDir;
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-b139-dup-"));
  });
  after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it("passes when BACKLOG.md has unique B-items", () => {
    const { extDir, rootDir } = createPassingFixture(tmpDir);
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "backlog-no-duplicates");
    assert.equal(check.pass, true);
  });

  it("fails when BACKLOG.md has duplicate B-item entries", () => {
    const sub = path.join(tmpDir, "dup");
    const { extDir, rootDir } = createPassingFixture(sub);
    fs.writeFileSync(
      path.join(rootDir, "docs", "BACKLOG.md"),
      [
        "# Backlog",
        "[B1] First item",
        "[B42] Widget feature",
        "[B42] Widget feature (duplicate)",
        "[B3] Third item",
        "",
        "## Version Summary",
        `| ${TEST_VERSION} | Released |`,
        "",
        "---",
      ].join("\n"),
    );
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "backlog-no-duplicates");
    assert.equal(check.pass, false);
    assert.ok(check.message.includes("B42"));
    assert.equal(result.pass, false);
  });
});

// ── B139: backlog-version-summary ─────────────────────────────────

describe("B139: backlog-version-summary", () => {
  let tmpDir;
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-b139-vs-"));
  });
  after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it("passes when version appears in Version Summary section", () => {
    const { extDir, rootDir } = createPassingFixture(tmpDir);
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "backlog-version-summary");
    assert.equal(check.pass, true);
  });

  it("fails when version is missing from Version Summary section", () => {
    const sub = path.join(tmpDir, "no-vs");
    const { extDir, rootDir } = createPassingFixture(sub);
    fs.writeFileSync(
      path.join(rootDir, "docs", "BACKLOG.md"),
      [
        "# Backlog",
        "[B1] First item",
        "",
        "## Version Summary",
        "| Version | Status |",
        "| --- | --- |",
        "| 4.8.0 | Released |",
        "",
        "---",
      ].join("\n"),
    );
    const result = releaseGate.preflight(TEST_VERSION, extDir, rootDir);
    const check = findCheck(result, "backlog-version-summary");
    assert.equal(check.pass, false);
    assert.equal(result.pass, false);
  });
});

// ── B137: Branch policy enforcement (documentation verification) ──

describe("B137: validate-branch-policy.ps1", () => {
  const scriptPath = path.join(
    repoRoot,
    "tools",
    "reliability",
    "validate-branch-policy.ps1",
  );

  it("script exists and enforces main branch protection", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    // Verify the script blocks direct main branch usage without -AllowMain
    assert.ok(
      content.includes("-not $AllowMain"),
      "script must gate main branch behind -AllowMain switch",
    );
    assert.ok(
      content.includes("Protected branch 'main'"),
      "script must emit main branch protection message",
    );
  });

  it("enforces naming pattern for non-main branches", () => {
    const content = fs.readFileSync(scriptPath, "utf-8");
    assert.ok(
      content.includes("plan|feat|fix|release|hotfix"),
      "script must enforce branch naming convention",
    );
  });
});

// ── B138: Release pipeline gate ordering (documentation verification)

describe("B138: release.yml gate ordering", () => {
  const workflowPath = path.join(
    repoRoot,
    ".github",
    "workflows",
    "release.yml",
  );

  it("build job depends on validate", () => {
    const content = fs.readFileSync(workflowPath, "utf-8");
    assert.ok(
      content.includes("needs: validate") ||
        content.includes("needs: [validate]"),
      "build must depend on validate",
    );
  });

  it("publish jobs depend on build", () => {
    const content = fs.readFileSync(workflowPath, "utf-8");
    assert.ok(
      content.includes("needs: build") || content.includes("needs: [build]"),
      "publish jobs must depend on build",
    );
  });
});
