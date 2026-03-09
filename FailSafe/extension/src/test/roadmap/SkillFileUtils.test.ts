import { describe, it, beforeEach, afterEach } from "mocha";
import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  matchesGlob,
  collectMarkdownFiles,
  calculateFileHash,
} from "../../roadmap/services/SkillFileUtils";

let tmpDir: string;

describe("SkillFileUtils", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-utils-"));
  });

  afterEach(function () {
    this.timeout(10000);
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Windows may hold brief locks
    }
  });

  describe("matchesGlob", () => {
    it("matches wildcard patterns", () => {
      assert.ok(matchesGlob("ql-audit.md", "ql-*.md"));
      assert.ok(matchesGlob("ql-implement.md", "ql-*.md"));
      assert.ok(!matchesGlob("README.md", "ql-*.md"));
    });

    it("matches exact filenames", () => {
      assert.ok(matchesGlob("SKILL.md", "SKILL.md"));
      assert.ok(!matchesGlob("skill.md", "SKILL.md"));
    });

    it("escapes dots in pattern", () => {
      assert.ok(!matchesGlob("ql-auditXmd", "ql-*.md"));
    });
  });

  describe("collectMarkdownFiles", () => {
    it("collects .md files recursively", async () => {
      fs.writeFileSync(path.join(tmpDir, "a.md"), "# A");
      const sub = path.join(tmpDir, "sub");
      fs.mkdirSync(sub);
      fs.writeFileSync(path.join(sub, "b.md"), "# B");
      fs.writeFileSync(path.join(sub, "c.txt"), "not md");

      const files = await collectMarkdownFiles(tmpDir);
      const names = files.map((f) => path.basename(f)).sort();
      assert.deepStrictEqual(names, ["a.md", "b.md"]);
    });

    it("returns empty array for non-existent directory", async () => {
      const files = await collectMarkdownFiles(path.join(tmpDir, "missing"));
      assert.deepStrictEqual(files, []);
    });
  });

  describe("calculateFileHash", () => {
    it("returns consistent hash for same content", () => {
      const file = path.join(tmpDir, "test.md");
      fs.writeFileSync(file, "hello world");
      const h1 = calculateFileHash(file);
      const h2 = calculateFileHash(file);
      assert.strictEqual(h1, h2);
      assert.strictEqual(h1.length, 64);
    });

    it("returns different hash for different content", () => {
      const f1 = path.join(tmpDir, "a.md");
      const f2 = path.join(tmpDir, "b.md");
      fs.writeFileSync(f1, "content A");
      fs.writeFileSync(f2, "content B");
      assert.notStrictEqual(calculateFileHash(f1), calculateFileHash(f2));
    });
  });
});
