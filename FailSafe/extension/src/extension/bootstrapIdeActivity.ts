/**
 * IDE Activity Bootstrap Module
 *
 * Subscribes to VS Code task/debug lifecycle events and
 * forwards them through EventBus for IdeActivityTracker consumption.
 */

import * as vscode from "vscode";
import type { CoreSubstrate } from "./bootstrapCore";

export function bootstrapIdeActivity(
  context: vscode.ExtensionContext,
  core: CoreSubstrate,
): void {
  context.subscriptions.push(
    vscode.tasks.onDidStartTask((e) => {
      const t = e.execution.task;
      const name = t.name || t.definition.type || "unnamed-task";
      core.eventBus.emit("ide.taskStarted", {
        name,
        group: t.group?.id,
        source: t.source,
      });
    }),
    vscode.tasks.onDidEndTask((e) => {
      const t = e.execution.task;
      const name = t.name || t.definition.type || "unnamed-task";
      core.eventBus.emit("ide.taskEnded", {
        name,
        group: t.group?.id,
      });
    }),
    vscode.debug.onDidStartDebugSession((session) => {
      core.eventBus.emit("ide.debugStarted", {
        name: session.name,
        type: session.type,
      });
    }),
    vscode.debug.onDidTerminateDebugSession((session) => {
      core.eventBus.emit("ide.debugEnded", {
        name: session.name,
        type: session.type,
      });
    }),
  );
}
