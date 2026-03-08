/**
 * IdeActivityTracker - Tracks VS Code task and debug session state.
 *
 * Pure state tracker with no VS Code imports.
 * Receives events via EventBus, testable in isolation.
 */

import type { EventBus } from "../../shared/EventBus";

interface TaskEntry {
  name: string;
  group?: string;
  startedAt: string;
}

interface DebugEntry {
  name: string;
  type: string;
  startedAt: string;
}

export class IdeActivityTracker {
  private activeTasks = new Map<string, TaskEntry>();
  private activeDebugSessions = new Map<string, DebugEntry>();

  constructor(eventBus: EventBus) {
    eventBus.on("ide.taskStarted", (e) => {
      const p = e.payload as Record<string, unknown>;
      if (!p || typeof p.name !== "string") return;
      this.activeTasks.set(p.name, {
        name: p.name,
        group: typeof p.group === "string" ? p.group : undefined,
        startedAt: new Date().toISOString(),
      });
    });
    eventBus.on("ide.taskEnded", (e) => {
      const p = e.payload as Record<string, unknown>;
      if (!p || typeof p.name !== "string") return;
      this.activeTasks.delete(p.name);
    });
    eventBus.on("ide.debugStarted", (e) => {
      const p = e.payload as Record<string, unknown>;
      if (!p || typeof p.name !== "string") return;
      this.activeDebugSessions.set(p.name, {
        name: p.name,
        type: typeof p.type === "string" ? p.type : "unknown",
        startedAt: new Date().toISOString(),
      });
    });
    eventBus.on("ide.debugEnded", (e) => {
      const p = e.payload as Record<string, unknown>;
      if (!p || typeof p.name !== "string") return;
      this.activeDebugSessions.delete(p.name);
    });
  }

  getRunState(planPhase?: string): {
    currentPhase: string;
    activeTasks: TaskEntry[];
    activeDebugSessions: DebugEntry[];
  } {
    let currentPhase = planPhase || "Plan";

    if (this.activeDebugSessions.size > 0) {
      const first = [...this.activeDebugSessions.values()][0];
      currentPhase = `Debug: ${first.name}`;
    } else if (this.activeTasks.size > 0) {
      const build = [...this.activeTasks.values()].find(
        (t) => t.group === "build",
      );
      if (build) {
        currentPhase = `Build: ${build.name}`;
      }
    }

    return {
      currentPhase,
      activeTasks: [...this.activeTasks.values()],
      activeDebugSessions: [...this.activeDebugSessions.values()],
    };
  }
}
