import * as fs from "fs";
import * as crypto from "crypto";

export function ensureJsonlFile(jsonlPath: string): void {
  if (!fs.existsSync(jsonlPath)) {
    fs.writeFileSync(jsonlPath, "", "utf8");
  }
}

export function appendJsonlRecord(jsonlPath: string, record: object): void {
  fs.appendFileSync(jsonlPath, `${JSON.stringify(record)}\n`, "utf8");
}

export function purgeJsonlAfterTimestamp(
  jsonlPath: string,
  timestamp: string,
): number {
  if (!fs.existsSync(jsonlPath)) {
    return 0;
  }
  const lines = fs
    .readFileSync(jsonlPath, "utf8")
    .split("\n")
    .filter(Boolean);
  const kept = lines.filter((line) => {
    try {
      return JSON.parse(line).timestamp <= timestamp;
    } catch {
      return true;
    }
  });
  const purged = lines.length - kept.length;
  const tmpPath = jsonlPath + ".tmp." + process.pid;
  fs.writeFileSync(
    tmpPath,
    kept.join("\n") + (kept.length ? "\n" : ""),
    "utf8",
  );
  fs.renameSync(tmpPath, jsonlPath);
  return purged;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function stableStringify(value: unknown): string {
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
