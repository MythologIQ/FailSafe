import { strict as assert } from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, it } from "mocha";
import { SentinelRagStore } from "../../sentinel/SentinelRagStore";
import { SentinelEvent, SentinelVerdict } from "../../shared/types";
import { Logger } from "../../shared/Logger";
import {
  ensureJsonlFile,
  appendJsonlRecord,
  purgeJsonlAfterTimestamp,
} from "../../sentinel/SentinelJsonlFallback";

const tempDirs: string[] = [];

function makeTempWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "failsafe-rag-test-"));
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

describe("SentinelRagStore", () => {
  it("persists monitored event verdict records to local store", async () => {
    const workspace = makeTempWorkspace();
    const filePath = path.join(workspace, "sample.ts");
    fs.writeFileSync(filePath, "export const sample = 1;\n", "utf8");

    const logger = {
      warn: () => {},
      child: () => logger,
    } as unknown as Logger;

    const store = new SentinelRagStore(workspace, logger);
    store.initialize();

    const event: SentinelEvent = {
      id: "evt-1",
      timestamp: new Date().toISOString(),
      priority: "normal",
      source: "file_watcher",
      type: "FILE_MODIFIED",
      payload: { path: filePath },
    };
    const verdict: SentinelVerdict = {
      id: "verdict-1",
      eventId: event.id,
      timestamp: new Date().toISOString(),
      decision: "PASS",
      riskGrade: "L1",
      confidence: 0.95,
      heuristicResults: [],
      agentDid: "did:myth:system:watcher",
      agentTrustAtVerdict: 0.5,
      artifactPath: filePath,
      summary: "File passed verification (L1)",
      details: "No issues detected",
      matchedPatterns: [],
      actions: [],
    };

    await store.recordEvent(event, verdict);
    store.dispose();

    const jsonlPath = path.join(
      workspace,
      ".failsafe",
      "rag",
      "sentinel-observations.jsonl",
    );
    const dbPath = path.join(workspace, ".failsafe", "rag", "sentinel-rag.db");
    const hasJsonl = fs.existsSync(jsonlPath);
    const hasDb = fs.existsSync(dbPath);
    assert.equal(hasJsonl || hasDb, true);

    if (hasJsonl) {
      const lines = fs
        .readFileSync(jsonlPath, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean);
      assert.equal(lines.length > 0, true);
      const last = JSON.parse(lines[lines.length - 1] as string) as {
        decision: string;
        eventType: string;
      };
      assert.equal(last.decision, "PASS");
      assert.equal(last.eventType, "FILE_MODIFIED");
    }
  });

  it("purgeAfterTimestamp removes records after given timestamp (JSONL)", async () => {
    const workspace = makeTempWorkspace();
    const logger = { warn: () => {}, child: () => logger } as unknown as Logger;
    const store = new SentinelRagStore(workspace, logger);
    store.initialize();

    const jsonlPath = path.join(workspace, ".failsafe", "rag", "sentinel-observations.jsonl");
    fs.writeFileSync(jsonlPath, [
      JSON.stringify({ timestamp: "2026-02-27T08:00:00Z", id: "1" }),
      JSON.stringify({ timestamp: "2026-02-27T09:00:00Z", id: "2" }),
      JSON.stringify({ timestamp: "2026-02-27T10:00:00Z", id: "3" }),
    ].join("\n") + "\n", "utf8");

    const purged = store.purgeAfterTimestamp("2026-02-27T08:30:00Z");
    store.dispose();

    assert.equal(purged, 2);
    const remaining = fs.readFileSync(jsonlPath, "utf8").trim().split("\n").filter(Boolean);
    assert.equal(remaining.length, 1);
    assert.ok(remaining[0]!.includes('"id":"1"'));
  });

  it("purgeAfterTimestamp returns 0 when no records match", () => {
    const workspace = makeTempWorkspace();
    const logger = { warn: () => {}, child: () => logger } as unknown as Logger;
    const store = new SentinelRagStore(workspace, logger);
    store.initialize();

    const jsonlPath = path.join(workspace, ".failsafe", "rag", "sentinel-observations.jsonl");
    fs.writeFileSync(jsonlPath,
      JSON.stringify({ timestamp: "2026-02-27T01:00:00Z", id: "1" }) + "\n",
      "utf8",
    );

    const purged = store.purgeAfterTimestamp("2026-02-27T23:59:59Z");
    store.dispose();
    assert.equal(purged, 0);
  });
});

describe("SentinelJsonlFallback", () => {
  it("ensureJsonlFile creates file if missing", () => {
    const workspace = makeTempWorkspace();
    const jsonlPath = path.join(workspace, "test.jsonl");
    assert.equal(fs.existsSync(jsonlPath), false);
    ensureJsonlFile(jsonlPath);
    assert.equal(fs.existsSync(jsonlPath), true);
    assert.equal(fs.readFileSync(jsonlPath, "utf8"), "");
  });

  it("appendJsonlRecord appends JSON line", () => {
    const workspace = makeTempWorkspace();
    const jsonlPath = path.join(workspace, "test.jsonl");
    fs.writeFileSync(jsonlPath, "", "utf8");
    appendJsonlRecord(jsonlPath, { a: 1 });
    appendJsonlRecord(jsonlPath, { b: 2 });
    const lines = fs.readFileSync(jsonlPath, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]!), { a: 1 });
  });

  it("purgeJsonlAfterTimestamp uses atomic write (V4)", () => {
    const workspace = makeTempWorkspace();
    const jsonlPath = path.join(workspace, "test.jsonl");
    fs.writeFileSync(jsonlPath, [
      JSON.stringify({ timestamp: "2026-01-01T00:00:00Z" }),
      JSON.stringify({ timestamp: "2026-12-31T00:00:00Z" }),
    ].join("\n") + "\n", "utf8");

    const purged = purgeJsonlAfterTimestamp(jsonlPath, "2026-06-01T00:00:00Z");
    assert.equal(purged, 1);

    const tmpFiles = fs.readdirSync(workspace).filter((f) => f.includes(".tmp."));
    assert.equal(tmpFiles.length, 0);
  });

  it("purgeJsonlAfterTimestamp returns 0 for missing file", () => {
    const workspace = makeTempWorkspace();
    const purged = purgeJsonlAfterTimestamp(
      path.join(workspace, "nonexistent.jsonl"),
      "2026-01-01T00:00:00Z",
    );
    assert.equal(purged, 0);
  });
});
