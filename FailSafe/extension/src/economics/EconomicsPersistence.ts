/**
 * EconomicsPersistence — reads/writes economics.json to disk.
 *
 * Uses JSON (not YAML) per handoff requirement.
 * Zero vscode dependencies — pure Node fs/path.
 */

import * as fs from "fs";
import * as path from "path";
import { EconomicsSnapshot } from "./types";

export class EconomicsPersistence {
  private readonly filePath: string;

  constructor(workspaceRoot: string) {
    this.filePath = path.join(
      workspaceRoot,
      ".failsafe",
      "telemetry",
      "economics.json",
    );
  }

  getFilePath(): string {
    return this.filePath;
  }

  load(): EconomicsSnapshot | null {
    if (!fs.existsSync(this.filePath)) return null;
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(raw) as EconomicsSnapshot;
    } catch {
      return null;
    }
  }

  save(snapshot: EconomicsSnapshot): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = this.filePath + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}
