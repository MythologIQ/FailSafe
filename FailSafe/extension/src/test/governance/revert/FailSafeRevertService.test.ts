import { strict as assert } from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, it } from "mocha";
import { FailSafeRevertService, RevertDeps } from "../../../governance/revert/FailSafeRevertService";
import { GitResetService, CommandRunner } from "../../../governance/revert/GitResetService";
import { CheckpointRef, RevertRequest } from "../../../governance/revert/types";

const tempDirs: string[] = [];

function makeTempWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "failsafe-revert-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

const checkpoint: CheckpointRef = {
  checkpointId: "ckpt-1",
  gitHash: "a".repeat(40),
  timestamp: "2026-02-27T09:00:00.000Z",
  phase: "implement",
  status: "validated",
};

const request: RevertRequest = {
  targetCheckpoint: checkpoint,
  reason: "Rolling back to stable state",
  actor: "user.local",
};

function cleanRunner(): CommandRunner {
  return async (_cmd, args) => {
    if (args.includes("--porcelain")) {
      return { code: 0, stdout: "", stderr: "" };
    }
    if (args.includes("HEAD")) {
      return { code: 0, stdout: "a".repeat(40) + "\n", stderr: "" };
    }
    if (args.includes("--show-current")) {
      return { code: 0, stdout: "main\n", stderr: "" };
    }
    if (args.includes("--hard")) {
      return { code: 0, stdout: "HEAD is now at aaaaaaa\n", stderr: "" };
    }
    return { code: 0, stdout: "", stderr: "" };
  };
}

function makeDeps(
  workspaceRoot: string,
  overrides: Partial<RevertDeps> = {},
): RevertDeps {
  return {
    getCheckpoint: () => checkpoint,
    gitService: new GitResetService(cleanRunner()),
    purgeRagAfter: () => 5,
    recordRevertCheckpoint: () => "ckpt-revert-1",
    workspaceRoot,
    ...overrides,
  };
}

describe("FailSafeRevertService", () => {
  it("completes 3-step revert successfully", async () => {
    const ws = makeTempWorkspace();
    const svc = new FailSafeRevertService(makeDeps(ws));
    const result = await svc.revert(request);
    assert.equal(result.success, true);
    assert.equal(result.steps.length, 3);
    assert.equal(result.steps[0]!.name, "git_reset");
    assert.equal(result.steps[0]!.status, "success");
    assert.equal(result.steps[1]!.name, "rag_purge");
    assert.equal(result.steps[1]!.status, "success");
    assert.equal(result.steps[2]!.name, "ledger_seal");
    assert.equal(result.steps[2]!.status, "success");
    assert.equal(result.revertCheckpointId, "ckpt-revert-1");
  });

  it("aborts on dirty workspace", async () => {
    const ws = makeTempWorkspace();
    const dirtyRunner: CommandRunner = async (_cmd, args) => {
      if (args.includes("--porcelain")) {
        return { code: 0, stdout: " M dirty.ts\n", stderr: "" };
      }
      return { code: 0, stdout: "main\n", stderr: "" };
    };
    const deps = makeDeps(ws, {
      gitService: new GitResetService(dirtyRunner),
    });
    const svc = new FailSafeRevertService(deps);
    const result = await svc.revert(request);
    assert.equal(result.success, false);
    assert.ok(result.error?.includes("uncommitted"));
    assert.equal(result.steps.length, 0);
  });

  it("aborts on TOCTOU race (V3)", async () => {
    let callCount = 0;
    const toctouRunner: CommandRunner = async (_cmd, args) => {
      if (args.includes("--porcelain")) {
        callCount++;
        if (callCount === 1) {
          return { code: 0, stdout: "", stderr: "" };
        }
        return { code: 0, stdout: " M race.ts\n", stderr: "" };
      }
      if (args.includes("HEAD")) {
        return { code: 0, stdout: "a".repeat(40) + "\n", stderr: "" };
      }
      if (args.includes("--show-current")) {
        return { code: 0, stdout: "main\n", stderr: "" };
      }
      return { code: 0, stdout: "", stderr: "" };
    };
    const ws = makeTempWorkspace();
    const deps = makeDeps(ws, {
      gitService: new GitResetService(toctouRunner),
    });
    const svc = new FailSafeRevertService(deps);
    const result = await svc.revert(request);
    assert.equal(result.success, false);
    assert.ok(result.error?.includes("workspace_changed_during_revert"));
  });

  it("skips RAG purge when git reset fails", async () => {
    const failRunner: CommandRunner = async (_cmd, args) => {
      if (args.includes("--porcelain")) {
        return { code: 0, stdout: "", stderr: "" };
      }
      if (args.includes("--hard")) {
        return { code: 128, stdout: "", stderr: "fatal: bad revision\n" };
      }
      return { code: 0, stdout: "a".repeat(40) + "\nmain\n", stderr: "" };
    };
    const ws = makeTempWorkspace();
    let purgeCalled = false;
    const deps = makeDeps(ws, {
      gitService: new GitResetService(failRunner),
      purgeRagAfter: () => { purgeCalled = true; return 0; },
    });
    const svc = new FailSafeRevertService(deps);
    const result = await svc.revert(request);
    assert.equal(result.success, false);
    assert.equal(result.steps[1]!.status, "skipped");
    assert.equal(purgeCalled, false);
  });

  it("writes emergency log when ledger seal fails (V2)", async () => {
    const ws = makeTempWorkspace();
    const deps = makeDeps(ws, {
      recordRevertCheckpoint: () => {
        throw new Error("DB locked");
      },
    });
    const svc = new FailSafeRevertService(deps);
    const result = await svc.revert(request);
    assert.equal(result.steps[2]!.status, "failed");
    assert.equal(result.steps[2]!.detail, "ledger_seal_failed_emergency_logged");

    const logPath = path.join(ws, ".failsafe", "revert-emergency.log");
    assert.equal(fs.existsSync(logPath), true);
    const content = fs.readFileSync(logPath, "utf8");
    const record = JSON.parse(content.trim());
    assert.equal(record.error, "DB locked");
    assert.equal(record.request.actor, "user.local");
  });

  it("records step status for partial failures", async () => {
    const ws = makeTempWorkspace();
    const deps = makeDeps(ws, {
      purgeRagAfter: () => {
        throw new Error("RAG store error");
      },
    });
    const svc = new FailSafeRevertService(deps);
    const result = await svc.revert(request);
    assert.equal(result.success, false);
    assert.equal(result.steps[0]!.status, "success");
    assert.equal(result.steps[1]!.status, "failed");
    assert.equal(result.steps[2]!.status, "success");
  });
});
