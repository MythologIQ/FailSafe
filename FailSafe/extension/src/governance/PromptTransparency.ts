/**
 * PromptTransparency - Emits transparency events for AI prompt lifecycle
 *
 * Emits events:
 * - prompt.build_started: When a prompt begins construction
 * - prompt.build_completed: When a prompt is ready for dispatch
 * - prompt.dispatched: When a prompt is sent to the AI
 * - prompt.dispatch_blocked: When a prompt is blocked by governance
 *
 * These events enable real-time visibility into AI interactions.
 */

import { EventBus } from "../shared/EventBus";
import { Logger } from "../shared/Logger";
import * as vscode from "vscode";

export type PromptEventType =
  | "prompt.build_started"
  | "prompt.build_completed"
  | "prompt.dispatched"
  | "prompt.dispatch_blocked";

export interface PromptEvent {
  id: string;
  type: PromptEventType;
  timestamp: string;
  sessionId?: string;
  intentId?: string;
  agentDid?: string;
  promptPreview?: string;
  promptHash?: string;
  tokenCount?: number;
  targetModel?: string;
  blockedReason?: string;
  riskGrade?: string;
  duration?: number;
}

export interface PromptBuildStartPayload {
  sessionId?: string;
  intentId?: string;
  agentDid?: string;
  context?: string;
}

export interface PromptBuildCompletePayload {
  promptPreview: string;
  tokenCount?: number;
  targetModel?: string;
  duration?: number;
}

export interface PromptDispatchPayload {
  promptHash: string;
  targetModel?: string;
}

export interface PromptBlockedPayload {
  blockedReason: string;
  riskGrade?: string;
}

/**
 * PromptTransparency manages the emission of transparency events
 * for the AI prompt lifecycle.
 */
export class PromptTransparency {
  private eventBus: EventBus;
  private logger: Logger;
  private activeBuilds: Map<
    string,
    { startTime: number; payload: PromptBuildStartPayload }
  > = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.logger = new Logger("PromptTransparency");
  }

  /**
   * Generate a unique event ID
   */
  private generateId(): string {
    return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit a prompt build_started event
   */
  emitBuildStarted(payload: PromptBuildStartPayload): string {
    const id = this.generateId();
    const event: PromptEvent = {
      id,
      type: "prompt.build_started",
      timestamp: new Date().toISOString(),
      sessionId: payload.sessionId,
      intentId: payload.intentId,
      agentDid: payload.agentDid,
    };

    this.activeBuilds.set(id, { startTime: Date.now(), payload });
    this.eventBus.emit("transparency.prompt" as never, event);
    this.logger.debug("Prompt build started", { id });

    return id;
  }

  /**
   * Emit a prompt build_completed event
   */
  emitBuildCompleted(
    buildId: string,
    payload: PromptBuildCompletePayload,
  ): PromptEvent {
    const build = this.activeBuilds.get(buildId);
    const duration = build ? Date.now() - build.startTime : undefined;

    const event: PromptEvent = {
      id: buildId,
      type: "prompt.build_completed",
      timestamp: new Date().toISOString(),
      sessionId: build?.payload.sessionId,
      intentId: build?.payload.intentId,
      agentDid: build?.payload.agentDid,
      promptPreview: payload.promptPreview.substring(0, 200),
      promptHash: this.hashPrompt(payload.promptPreview),
      tokenCount: payload.tokenCount,
      targetModel: payload.targetModel,
      duration: duration || payload.duration,
    };

    this.activeBuilds.delete(buildId);
    this.eventBus.emit("transparency.prompt" as never, event);
    this.logger.debug("Prompt build completed", { id: buildId, duration });

    return event;
  }

  /**
   * Emit a prompt dispatched event
   */
  emitDispatched(buildId: string, payload: PromptDispatchPayload): PromptEvent {
    const build = this.activeBuilds.get(buildId);
    const event: PromptEvent = {
      id: buildId,
      type: "prompt.dispatched",
      timestamp: new Date().toISOString(),
      sessionId: build?.payload.sessionId,
      intentId: build?.payload.intentId,
      agentDid: build?.payload.agentDid,
      promptHash: payload.promptHash,
      targetModel: payload.targetModel,
    };

    this.activeBuilds.delete(buildId);
    this.eventBus.emit("transparency.prompt" as never, event);
    this.logger.debug("Prompt dispatched", { id: buildId });

    return event;
  }

  /**
   * Emit a prompt dispatch_blocked event
   */
  emitDispatchBlocked(
    buildId: string,
    payload: PromptBlockedPayload,
  ): PromptEvent {
    const build = this.activeBuilds.get(buildId);

    const event: PromptEvent = {
      id: buildId,
      type: "prompt.dispatch_blocked",
      timestamp: new Date().toISOString(),
      sessionId: build?.payload.sessionId,
      intentId: build?.payload.intentId,
      agentDid: build?.payload.agentDid,
      blockedReason: payload.blockedReason,
      riskGrade: payload.riskGrade,
    };

    this.activeBuilds.delete(buildId);
    this.eventBus.emit("transparency.prompt" as never, event);
    this.logger.warn("Prompt dispatch blocked", {
      id: buildId,
      reason: payload.blockedReason,
    });

    return event;
  }

  /**
   * Create a simple hash of the prompt for tracking
   */
  private hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  /**
   * Get all active builds (for debugging)
   */
  getActiveBuilds(): string[] {
    return Array.from(this.activeBuilds.keys());
  }

  /**
   * Clear stale builds older than the specified timeout
   */
  clearStaleBuilds(timeoutMs: number = 60000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [id, build] of this.activeBuilds.entries()) {
      if (now - build.startTime > timeoutMs) {
        this.activeBuilds.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} stale prompt builds`);
    }

    return cleared;
  }
}

/**
 * Transparency event logger - writes events to JSONL file
 */
export class TransparencyLogger {
  private logger: Logger;
  private logPath: string | null = null;

  constructor(workspaceRoot: string) {
    this.logger = new Logger("TransparencyLogger");
    if (workspaceRoot) {
      const fs = require("fs");
      const path = require("path");
      this.logPath = path.join(
        workspaceRoot,
        ".failsafe",
        "logs",
        "transparency.jsonl",
      );

      // Ensure directory exists
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  log(event: PromptEvent): void {
    if (!this.logPath) return;

    try {
      const fs = require("fs");
      const line = JSON.stringify(event) + "\n";
      fs.appendFileSync(this.logPath, line, "utf8");
    } catch (error) {
      this.logger.error("Failed to log transparency event", error);
    }
  }

  readRecentEvents(limit: number = 100): PromptEvent[] {
    if (!this.logPath) return [];

    try {
      const fs = require("fs");
      if (!fs.existsSync(this.logPath)) return [];

      const content = fs.readFileSync(this.logPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      const events = lines
        .slice(-limit)
        .map((line: string) => JSON.parse(line) as PromptEvent);

      return events.reverse(); // Most recent first
    } catch (error) {
      this.logger.error("Failed to read transparency log", error);
      return [];
    }
  }
}
