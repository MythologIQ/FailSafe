import { strict as assert } from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, it } from "mocha";
import { SentinelRagStore } from "../../sentinel/SentinelRagStore";
import { SentinelEvent, SentinelVerdict } from "../../shared/types";
import { Logger } from "../../shared/Logger";

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
});
