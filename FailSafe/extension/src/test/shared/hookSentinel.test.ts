import { strict as assert } from "assert";
import { describe, it, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  syncHookSentinel,
  isHookEnabled,
} from "../../shared/hookSentinel";

describe("hookSentinel", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hookSentinel-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("syncHookSentinel()", () => {
    it("creates the disabled sentinel file when enabled=false", () => {
      syncHookSentinel(tmpDir, false);

      const sentinelPath = path.join(
        tmpDir, ".claude", "hooks", "disabled",
      );
      assert.ok(fs.existsSync(sentinelPath));
      const content = fs.readFileSync(sentinelPath, "utf-8");
      assert.equal(content, "disabled by FailSafe");
    });

    it("removes the sentinel file when enabled=true", () => {
      const sentinelPath = path.join(
        tmpDir, ".claude", "hooks", "disabled",
      );
      fs.mkdirSync(path.dirname(sentinelPath), { recursive: true });
      fs.writeFileSync(sentinelPath, "disabled by FailSafe");

      syncHookSentinel(tmpDir, true);

      assert.ok(!fs.existsSync(sentinelPath));
    });

    it("is a no-op when enabled=true and sentinel does not exist", () => {
      assert.doesNotThrow(() => syncHookSentinel(tmpDir, true));

      const sentinelPath = path.join(
        tmpDir, ".claude", "hooks", "disabled",
      );
      assert.ok(!fs.existsSync(sentinelPath));
    });
  });

  describe("isHookEnabled()", () => {
    it("returns true when sentinel file does not exist", () => {
      assert.equal(isHookEnabled(tmpDir), true);
    });

    it("returns false when sentinel file exists", () => {
      const sentinelPath = path.join(
        tmpDir, ".claude", "hooks", "disabled",
      );
      fs.mkdirSync(path.dirname(sentinelPath), { recursive: true });
      fs.writeFileSync(sentinelPath, "disabled by FailSafe");

      assert.equal(isHookEnabled(tmpDir), false);
    });
  });
});
