import { strict as assert } from "assert";
import { describe, it } from "mocha";
import {
  GitResetService,
  CommandRunner,
} from "../../../governance/revert/GitResetService";

function mockRunner(
  responses: Record<string, { code: number; stdout: string; stderr: string }>,
): CommandRunner {
  return async (_cmd, args) => {
    const key = args.join(" ");
    for (const [pattern, response] of Object.entries(responses)) {
      if (key.includes(pattern)) {
        return response;
      }
    }
    return { code: 0, stdout: "", stderr: "" };
  };
}

describe("GitResetService", () => {
  describe("getStatus", () => {
    it("detects clean workspace", async () => {
      const runner = mockRunner({
        "status --porcelain": { code: 0, stdout: "", stderr: "" },
        "rev-parse HEAD": { code: 0, stdout: "abc123def456\n", stderr: "" },
        "branch --show-current": { code: 0, stdout: "main\n", stderr: "" },
      });
      const service = new GitResetService(runner);
      const status = await service.getStatus("/tmp");
      assert.equal(status.clean, true);
      assert.equal(status.currentHash, "abc123def456");
      assert.equal(status.currentBranch, "main");
      assert.equal(status.uncommittedFiles.length, 0);
    });

    it("detects dirty workspace with uncommitted files", async () => {
      const runner = mockRunner({
        "status --porcelain": {
          code: 0,
          stdout: " M src/file1.ts\n?? src/file2.ts\n",
          stderr: "",
        },
        "rev-parse HEAD": { code: 0, stdout: "abc123\n", stderr: "" },
        "branch --show-current": { code: 0, stdout: "main\n", stderr: "" },
      });
      const service = new GitResetService(runner);
      const status = await service.getStatus("/tmp");
      assert.equal(status.clean, false);
      assert.equal(status.uncommittedFiles.length, 2);
      assert.equal(status.uncommittedFiles[0], "src/file1.ts");
    });
  });

  describe("getLog", () => {
    it("parses log entries from pipe-delimited format", async () => {
      const hash40 = "a".repeat(40);
      const runner = mockRunner({
        "log": {
          code: 0,
          stdout: `${"b".repeat(40)}|feat: add feature|2026-02-27T10:00:00+00:00\n`,
          stderr: "",
        },
      });
      const service = new GitResetService(runner);
      const entries = await service.getLog("/tmp", hash40);
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.subject, "feat: add feature");
      assert.equal(entries[0]!.hash, "b".repeat(40));
    });

    it("rejects invalid sinceHash", async () => {
      const service = new GitResetService(mockRunner({}));
      await assert.rejects(
        () => service.getLog("/tmp", "--malicious-flag"),
        /Invalid git hash format/,
      );
    });
  });

  describe("resetHard", () => {
    it("rejects malicious flag as hash (V1)", async () => {
      const service = new GitResetService(mockRunner({}));
      await assert.rejects(
        () => service.resetHard("/tmp", "--upload-pack=/usr/bin/evil"),
        /Invalid git hash format/,
      );
    });

    it("rejects non-hex string", async () => {
      const service = new GitResetService(mockRunner({}));
      await assert.rejects(
        () => service.resetHard("/tmp", "not-a-valid-hash"),
        /Invalid git hash format/,
      );
    });

    it("accepts valid 40-char SHA-1 hash", async () => {
      const hash40 = "a".repeat(40);
      const runner = mockRunner({
        "reset --hard": { code: 0, stdout: `HEAD is now at ${hash40.slice(0, 7)}\n`, stderr: "" },
      });
      const service = new GitResetService(runner);
      const result = await service.resetHard("/tmp", hash40);
      assert.equal(result.success, true);
    });

    it("accepts valid 64-char SHA-256 hash", async () => {
      const hash64 = "b".repeat(64);
      const runner = mockRunner({
        "reset --hard": { code: 0, stdout: "HEAD is now at bbbbbbb\n", stderr: "" },
      });
      const service = new GitResetService(runner);
      const result = await service.resetHard("/tmp", hash64);
      assert.equal(result.success, true);
    });

    it("reports failure when git returns non-zero", async () => {
      const hash40 = "c".repeat(40);
      const runner = mockRunner({
        "reset --hard": { code: 128, stdout: "", stderr: "fatal: not a git repo\n" },
      });
      const service = new GitResetService(runner);
      const result = await service.resetHard("/tmp", hash40);
      assert.equal(result.success, false);
      assert.ok(result.stderr.includes("fatal"));
    });
  });
});
