import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Logger } from "../shared/Logger";
import { SentinelEvent, SentinelVerdict } from "../shared/types";

type SqliteDb = {
  prepare: (sql: string) => {
    run: (...args: unknown[]) => unknown;
  };
  exec: (sql: string) => void;
  close: () => void;
};

type ObservationRecord = {
  id: string;
  timestamp: string;
  eventId: string;
  eventType: string;
  source: string;
  filePath: string | null;
  decision: string;
  riskGrade: string;
  confidence: number;
  summary: string;
  details: string;
  text: string;
  payloadJson: string;
  metadataJson: string;
  contentHash: string;
};

export class SentinelRagStore {
  private readonly workspaceRoot: string;
  private readonly logger: Logger;
  private readonly ragDir: string;
  private readonly jsonlPath: string;
  private readonly dbPath: string;
  private db: SqliteDb | null = null;
  private initialized = false;

  constructor(workspaceRoot: string, logger: Logger) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
    this.ragDir = path.join(this.workspaceRoot, ".failsafe", "rag");
    this.jsonlPath = path.join(this.ragDir, "sentinel-observations.jsonl");
    this.dbPath = path.join(this.ragDir, "sentinel-rag.db");
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    fs.mkdirSync(this.ragDir, { recursive: true });

    const maybeDb = this.openSqlite();
    if (maybeDb) {
      this.db = maybeDb;
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sentinel_observations (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          event_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          source TEXT NOT NULL,
          file_path TEXT,
          decision TEXT NOT NULL,
          risk_grade TEXT NOT NULL,
          confidence REAL NOT NULL,
          summary TEXT NOT NULL,
          details TEXT NOT NULL,
          text TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          metadata_json TEXT NOT NULL,
          content_hash TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sentinel_obs_ts ON sentinel_observations(timestamp);
        CREATE INDEX IF NOT EXISTS idx_sentinel_obs_file ON sentinel_observations(file_path);
        CREATE INDEX IF NOT EXISTS idx_sentinel_obs_decision ON sentinel_observations(decision);
      `);
      return;
    }

    if (!fs.existsSync(this.jsonlPath)) {
      fs.writeFileSync(this.jsonlPath, "", "utf8");
    }
    this.logger.warn(
      "Sentinel RAG running in JSONL fallback mode (better-sqlite3 unavailable).",
    );
  }

  async recordEvent(
    event: SentinelEvent,
    verdict: SentinelVerdict,
  ): Promise<void> {
    if (!this.initialized) {
      this.initialize();
    }
    const record = await this.buildRecord(event, verdict);
    if (this.db) {
      this.db
        .prepare(
          `INSERT INTO sentinel_observations (
            id, timestamp, event_id, event_type, source, file_path,
            decision, risk_grade, confidence, summary, details, text,
            payload_json, metadata_json, content_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          record.id,
          record.timestamp,
          record.eventId,
          record.eventType,
          record.source,
          record.filePath,
          record.decision,
          record.riskGrade,
          record.confidence,
          record.summary,
          record.details,
          record.text,
          record.payloadJson,
          record.metadataJson,
          record.contentHash,
        );
      return;
    }

    fs.appendFileSync(this.jsonlPath, `${JSON.stringify(record)}\n`, "utf8");
  }

  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private async buildRecord(
    event: SentinelEvent,
    verdict: SentinelVerdict,
  ): Promise<ObservationRecord> {
    const timestamp = new Date().toISOString();
    const filePath = this.getEventFilePath(event);
    const fileContext = await this.getFileContext(filePath);
    const payloadJson = stableStringify(event.payload || {});
    const metadata = {
      matchedPatterns: verdict.matchedPatterns,
      actions: verdict.actions.map((action) => ({
        type: action.type,
        status: action.status,
      })),
      artifactPath: verdict.artifactPath || null,
      agentDid: verdict.agentDid,
      source: event.source,
      eventType: event.type,
      fileSnapshotIncluded: Boolean(fileContext),
    };
    const metadataJson = stableStringify(metadata);
    const text = this.composeRetrievalText(event, verdict, fileContext);
    const contentHash = hash(`${payloadJson}:${metadataJson}:${text}`);

    return {
      id: crypto.randomUUID(),
      timestamp,
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      filePath,
      decision: verdict.decision,
      riskGrade: verdict.riskGrade,
      confidence: verdict.confidence,
      summary: verdict.summary,
      details: verdict.details,
      text,
      payloadJson,
      metadataJson,
      contentHash,
    };
  }

  private composeRetrievalText(
    event: SentinelEvent,
    verdict: SentinelVerdict,
    fileContext: string | null,
  ): string {
    const lines: string[] = [];
    lines.push(`event_type: ${event.type}`);
    lines.push(`source: ${event.source}`);
    lines.push(`decision: ${verdict.decision}`);
    lines.push(`risk_grade: ${verdict.riskGrade}`);
    lines.push(`summary: ${verdict.summary}`);
    if (verdict.details) {
      lines.push(`details: ${verdict.details}`);
    }
    if (verdict.artifactPath) {
      lines.push(`artifact_path: ${verdict.artifactPath}`);
    }
    if (verdict.matchedPatterns.length > 0) {
      lines.push(`matched_patterns: ${verdict.matchedPatterns.join(", ")}`);
    }
    if (fileContext) {
      lines.push("file_excerpt:");
      lines.push(fileContext);
    }
    return lines.join("\n");
  }

  private getEventFilePath(event: SentinelEvent): string | null {
    const payloadPath = event.payload?.path;
    if (typeof payloadPath !== "string" || payloadPath.length === 0) {
      return null;
    }
    return payloadPath;
  }

  private async getFileContext(filePath: string | null): Promise<string | null> {
    if (!filePath) {
      return null;
    }
    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) {
        return null;
      }
      const maxBytes = 16 * 1024;
      const file = await fs.promises.readFile(filePath);
      return file.slice(0, maxBytes).toString("utf8");
    } catch {
      return null;
    }
  }

  private openSqlite(): SqliteDb | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BetterSqlite3 = require("better-sqlite3") as new (
        dbPath: string,
      ) => SqliteDb;
      const db = new BetterSqlite3(this.dbPath);
      return db;
    } catch {
      return null;
    }
  }
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((item) => normalize(item));
    }
    if (input && typeof input === "object") {
      const obj = input as Record<string, unknown>;
      return Object.keys(obj)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = normalize(obj[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(normalize(value));
}
