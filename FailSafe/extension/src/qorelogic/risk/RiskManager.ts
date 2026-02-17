/**
 * RiskManager - Risk Register persistence and operations
 *
 * Manages project-level risk tracking with JSON persistence.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  Risk,
  RiskRegister,
  RiskSeverity,
  RiskStatus,
  RiskCategory,
  calculateRiskSummary,
} from "./types";
import { Logger } from "../../shared/Logger";

const RISKS_FILE = "risks.json";

export class RiskManager {
  private readonly risksPath: string;
  private readonly logger: Logger;
  private register: RiskRegister;

  constructor(
    workspaceRoot: string,
    private projectId: string,
  ) {
    this.risksPath = path.join(workspaceRoot, ".failsafe", "risks", RISKS_FILE);
    this.logger = new Logger("RiskManager");
    this.register = this.loadOrCreate();
  }

  private loadOrCreate(): RiskRegister {
    try {
      if (fs.existsSync(this.risksPath)) {
        const content = fs.readFileSync(this.risksPath, "utf8");
        const data = JSON.parse(content) as RiskRegister;
        this.logger.info(`Loaded ${data.risks.length} risks from register`);
        return data;
      }
    } catch (error) {
      this.logger.warn("Failed to load risk register, creating new", error);
    }

    return {
      projectId: this.projectId,
      projectName: path.basename(path.dirname(this.risksPath)),
      risks: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  private save(): void {
    try {
      const dir = path.dirname(this.risksPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.register.lastUpdated = new Date().toISOString();
      fs.writeFileSync(
        this.risksPath,
        JSON.stringify(this.register, null, 2),
        "utf8",
      );
      this.logger.info("Risk register saved");
    } catch (error) {
      this.logger.error("Failed to save risk register", error);
    }
  }

  getAllRisks(): Risk[] {
    return [...this.register.risks];
  }

  getRisk(id: string): Risk | undefined {
    return this.register.risks.find((r) => r.id === id);
  }

  getSummary() {
    return calculateRiskSummary(this.register.risks);
  }

  createRisk(input: {
    title: string;
    description: string;
    category: RiskCategory;
    severity: RiskSeverity;
    impact: string;
    mitigation: string;
    owner?: string;
    relatedArtifacts?: string[];
    checkpointId?: string;
  }): Risk {
    const now = new Date().toISOString();
    const risk: Risk = {
      id: crypto.randomUUID(),
      ...input,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };

    this.register.risks.push(risk);
    this.save();
    this.logger.info(`Created risk: ${risk.id}`);
    return risk;
  }

  updateRisk(
    id: string,
    updates: Partial<Omit<Risk, "id" | "createdAt">>,
  ): Risk | undefined {
    const index = this.register.risks.findIndex((r) => r.id === id);
    if (index === -1) {
      this.logger.warn(`Risk not found: ${id}`);
      return undefined;
    }

    const risk = this.register.risks[index];
    this.register.risks[index] = {
      ...risk,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.status === "resolved" && !risk.resolvedAt) {
      this.register.risks[index].resolvedAt = new Date().toISOString();
    }

    this.save();
    this.logger.info(`Updated risk: ${id}`);
    return this.register.risks[index];
  }

  deleteRisk(id: string): boolean {
    const index = this.register.risks.findIndex((r) => r.id === id);
    if (index === -1) {
      return false;
    }

    this.register.risks.splice(index, 1);
    this.save();
    this.logger.info(`Deleted risk: ${id}`);
    return true;
  }

  getRisksByStatus(status: RiskStatus): Risk[] {
    return this.register.risks.filter((r) => r.status === status);
  }

  getRisksBySeverity(severity: RiskSeverity): Risk[] {
    return this.register.risks.filter((r) => r.severity === severity);
  }

  getRisksByCategory(category: RiskCategory): Risk[] {
    return this.register.risks.filter((r) => r.category === category);
  }

  getOpenCriticalAndHigh(): Risk[] {
    return this.register.risks.filter(
      (r) =>
        r.status === "open" &&
        (r.severity === "critical" || r.severity === "high"),
    );
  }

  dispose(): void {
    this.save();
  }
}
