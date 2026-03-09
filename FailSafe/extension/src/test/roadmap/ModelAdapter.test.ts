import { describe, it, beforeEach, afterEach } from "mocha";
import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { adaptSkillContent, adaptSkillsForModel } from "../../roadmap/services/ModelAdapter";
import { BUILTIN_ADAPTER_CONFIGS } from "../../roadmap/services/ModelAdapterConfigs";
import type { InstalledSkill } from "../../roadmap/services/SkillParser";

let tmpDir: string;

function makeSkill(overrides: Partial<InstalledSkill> = {}): InstalledSkill {
  const sourcePath = path.join(tmpDir, "test-skill.md");
  fs.writeFileSync(sourcePath, "---\nname: test\n---\n\n# Test Skill\n\nBody content here.");
  return {
    id: "ql-test", displayName: "Test Skill", localName: "ql-test",
    key: "ql-test", label: "Test Skill", desc: "A test skill",
    creator: "MythologIQ", sourceRepo: "local", sourcePath,
    versionPin: "4.6.4", trustTier: "admitted", sourceType: "project-canonical",
    sourcePriority: 1, admissionState: "admitted", requiredPermissions: [],
    category: "governance", tags: ["test"], name: "ql-test",
    description: "A test skill", installed: true, origin: ".claude/commands",
    sourceCredit: "MythologIQ", ...overrides,
  } as InstalledSkill;
}

describe("ModelAdapter", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "model-adapter-"));
  });

  afterEach(function () {
    this.timeout(10000);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  describe("adaptSkillContent", () => {
    it("produces YAML frontmatter for claude config", () => {
      const skill = makeSkill();
      const result = adaptSkillContent(skill, BUILTIN_ADAPTER_CONFIGS.claude);
      assert.ok(result.startsWith("---\n"));
      assert.ok(result.includes('model: "claude"'));
      assert.ok(result.includes("# Test Skill"));
    });

    it("produces XML inline for gemini config", () => {
      const skill = makeSkill();
      const result = adaptSkillContent(skill, BUILTIN_ADAPTER_CONFIGS.gemini);
      assert.ok(result.includes("<model>gemini</model>"));
      assert.ok(result.includes("# Test Skill"));
    });

    it("reads actual file content from sourcePath", () => {
      const skill = makeSkill();
      const result = adaptSkillContent(skill, BUILTIN_ADAPTER_CONFIGS.claude);
      assert.ok(result.includes("Body content here."));
    });

    it("falls back gracefully when sourcePath is missing", () => {
      const skill = makeSkill({ sourcePath: path.join(tmpDir, "missing.md") });
      const result = adaptSkillContent(skill, BUILTIN_ADAPTER_CONFIGS.claude);
      assert.ok(result.includes("Test Skill"));
    });
  });

  describe("adaptSkillsForModel", () => {
    it("writes adapted files and skips identical content", () => {
      const skill = makeSkill();
      const outDir = path.join(tmpDir, "out");
      const config = { ...BUILTIN_ADAPTER_CONFIGS.claude, outputDir: "adapted/" };

      const r1 = adaptSkillsForModel([skill], config, outDir);
      assert.strictEqual(r1.written.length, 1);
      assert.strictEqual(r1.skipped.length, 0);

      const r2 = adaptSkillsForModel([skill], config, outDir);
      assert.strictEqual(r2.written.length, 0);
      assert.strictEqual(r2.skipped.length, 1);
    });
  });
});
