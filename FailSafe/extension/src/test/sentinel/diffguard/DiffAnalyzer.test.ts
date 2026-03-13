import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { DiffAnalyzer } from "../../../sentinel/diffguard/DiffAnalyzer";

/**
 * Unit tests for DiffAnalyzer — diff parsing and statistics.
 * Tests parseDiff and computeStats without git/filesystem interaction.
 */

const SAMPLE_DIFF = [
  "diff --git a/src/foo.ts b/src/foo.ts",
  "index abc123..def456 100644",
  "--- a/src/foo.ts",
  "+++ b/src/foo.ts",
  "@@ -1,5 +1,6 @@",
  " import { bar } from './bar';",
  "-const old = 'value';",
  "+const updated = 'newValue';",
  "+const added = true;",
  " ",
  " export function foo() {",
  "   return bar();",
].join("\n");

const NEW_FILE_DIFF = [
  "diff --git a/src/newFile.ts b/src/newFile.ts",
  "new file mode 100644",
  "index 0000000..abcdef1",
  "--- /dev/null",
  "+++ b/src/newFile.ts",
  "@@ -0,0 +1,4 @@",
  "+import { util } from './util';",
  "+",
  "+export const value = 42;",
  "+export default value;",
].join("\n");

const MULTI_HUNK_DIFF = [
  "diff --git a/src/multi.ts b/src/multi.ts",
  "index aaa..bbb 100644",
  "--- a/src/multi.ts",
  "+++ b/src/multi.ts",
  "@@ -1,3 +1,3 @@",
  " line1",
  "-old2",
  "+new2",
  " line3",
  "@@ -10,3 +10,4 @@",
  " line10",
  " line11",
  "+inserted12",
  " line12",
].join("\n");

describe("DiffAnalyzer", () => {
  // Use a dummy workspace root — parseDiff/computeStats are synchronous and
  // never touch the filesystem.
  const analyzer = new DiffAnalyzer("/tmp/dummy-workspace");

  describe("parseDiff", () => {
    it("parses a standard unified diff with additions and deletions", () => {
      const hunks = analyzer.parseDiff(SAMPLE_DIFF, "src/foo.ts");

      assert.equal(hunks.length, 1, "expected 1 hunk");
      const hunk = hunks[0];
      assert.equal(hunk.filePath, "src/foo.ts");
      assert.equal(hunk.oldStart, 1);
      assert.equal(hunk.oldCount, 5);
      assert.equal(hunk.newStart, 1);
      assert.equal(hunk.newCount, 6);

      const adds = hunk.lines.filter((l) => l.type === "add");
      const removes = hunk.lines.filter((l) => l.type === "remove");
      const context = hunk.lines.filter((l) => l.type === "context");

      assert.equal(adds.length, 2, "expected 2 added lines");
      assert.equal(removes.length, 1, "expected 1 removed line");
      assert.ok(context.length >= 1, "expected at least 1 context line");

      // Verify content (leading +/- stripped)
      assert.ok(
        adds.some((l) => l.content.includes("updated")),
        'expected added line with "updated"',
      );
      assert.ok(
        removes.some((l) => l.content.includes("old")),
        'expected removed line with "old"',
      );
    });

    it("parses a new-file diff with all additions", () => {
      const hunks = analyzer.parseDiff(NEW_FILE_DIFF, "src/newFile.ts");

      assert.equal(hunks.length, 1, "expected 1 hunk");
      const hunk = hunks[0];

      const adds = hunk.lines.filter((l) => l.type === "add");
      const removes = hunk.lines.filter((l) => l.type === "remove");

      assert.equal(adds.length, 4, "expected 4 added lines");
      assert.equal(removes.length, 0, "expected 0 removed lines");

      // All lines should be type 'add'
      for (const line of hunk.lines) {
        assert.equal(
          line.type,
          "add",
          `expected type "add" but got "${line.type}" for "${line.content}"`,
        );
      }
    });

    it("returns empty array for an empty diff string", () => {
      const hunks = analyzer.parseDiff("", "src/empty.ts");
      assert.deepEqual(hunks, []);
    });

    it("parses multiple hunks from a single diff", () => {
      const hunks = analyzer.parseDiff(MULTI_HUNK_DIFF, "src/multi.ts");

      assert.equal(hunks.length, 2, "expected 2 hunks");
      assert.equal(hunks[0].oldStart, 1);
      assert.equal(hunks[1].oldStart, 10);

      // First hunk: 1 remove + 1 add + context
      const h0adds = hunks[0].lines.filter((l) => l.type === "add");
      const h0removes = hunks[0].lines.filter((l) => l.type === "remove");
      assert.equal(h0adds.length, 1);
      assert.equal(h0removes.length, 1);

      // Second hunk: 1 add, 0 removes + context
      const h1adds = hunks[1].lines.filter((l) => l.type === "add");
      const h1removes = hunks[1].lines.filter((l) => l.type === "remove");
      assert.equal(h1adds.length, 1);
      assert.equal(h1removes.length, 0);
    });
  });

  describe("computeStats", () => {
    it("computes accurate addition, deletion, and net change counts", () => {
      const hunks = analyzer.parseDiff(SAMPLE_DIFF, "src/foo.ts");
      const stats = analyzer.computeStats(hunks);

      assert.equal(stats.additions, 2, "expected 2 additions");
      assert.equal(stats.deletions, 1, "expected 1 deletion");
      assert.equal(stats.netChange, 1, "expected net +1");
      assert.equal(stats.filesChanged, 1, "expected 1 file changed");
    });

    it("returns zeroes for empty hunks", () => {
      const stats = analyzer.computeStats([]);

      assert.equal(stats.additions, 0);
      assert.equal(stats.deletions, 0);
      assert.equal(stats.netChange, 0);
      assert.equal(stats.filesChanged, 0);
    });

    it("counts files correctly across multiple hunks", () => {
      const hunks = analyzer.parseDiff(MULTI_HUNK_DIFF, "src/multi.ts");
      const stats = analyzer.computeStats(hunks);

      // Both hunks share the same filePath
      assert.equal(stats.filesChanged, 1);
      assert.equal(stats.additions, 2, "1 replacement + 1 insertion");
      assert.equal(stats.deletions, 1, "1 removed line");
      assert.equal(stats.netChange, 1);
    });
  });
});
