import * as assert from "assert";
import { evaluateObserveMode } from "../../governance/enforcement/ObserveModeEvaluator";
import type { ObserveDeps } from "../../governance/enforcement/ObserveModeEvaluator";
import type { ActionContext } from "../../governance/enforcement/types";

suite("ObserveModeEvaluator", () => {
  const baseContext: ActionContext = {
    action: { targetPath: "/test/file.ts", actionType: "save" } as any,
    activeIntent: { id: "intent-1" } as any,
    workspaceRoot: "/workspace",
  };

  function makeDeps(axiom1Status: "ALLOW" | "BLOCK" | "ESCALATE" = "ALLOW", notificationChoice: string | undefined = undefined) {
    const logged: unknown[] = [];
    const notifications: string[] = [];
    const executedCommands: string[] = [];

    let enforceResult: any;
    if (axiom1Status === "ALLOW") {
      enforceResult = { status: "ALLOW" as const, reason: "ok", intentId: "test" };
    } else if (axiom1Status === "BLOCK") {
      enforceResult = { status: "BLOCK" as const, violation: "No intent", reason: "blocked" };
    } else if (axiom1Status === "ESCALATE") {
      enforceResult = { status: "ESCALATE" as const, escalationTo: "HUMAN_REVIEW", reason: "escalated" };
    }

    return {
      deps: {
        axiom1: {
          enforce: () => enforceResult,
        } as any,
        logger: { info: (...args: unknown[]) => logged.push(args) } as any,
        notifications: {
          showInfo: (...args: unknown[]) => {
            notifications.push(String(args[0]));
            return Promise.resolve(notificationChoice);
          },
        } as any,
        executeCommand: (command: string) => { executedCommands.push(command); },
      } as ObserveDeps,
      logged,
      notifications,
      executedCommands,
    };
  }

  test("allows action when axiom1 passes", async () => {
    const { deps } = makeDeps("ALLOW");
    const result = evaluateObserveMode(baseContext, deps as any);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("permitted"));
  });

  test("allows action but logs when axiom1 fails", async () => {
    const { deps, logged, notifications } = makeDeps("BLOCK");
    const result = evaluateObserveMode(baseContext, deps as any);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("logged but not blocked"));
    assert.strictEqual(logged.length, 1);
    assert.strictEqual(notifications.length, 1);
  });

  test("executes create intent command when user selects 'Create Intent' on failure", async () => {
    const { deps, executedCommands } = makeDeps("BLOCK", "Create Intent");
    const result = evaluateObserveMode(baseContext, deps as any);
    assert.strictEqual(result.status, "ALLOW");

    // We need to wait for the promise from showInfo to resolve and execute the callback
    await new Promise(process.nextTick);

    assert.strictEqual(executedCommands.length, 1);
    assert.strictEqual(executedCommands[0], "failsafe.createIntent");
  });

  test("uses 'Policy violation' default message when violation property is missing", async () => {
    const { deps, logged, notifications } = makeDeps("ESCALATE");
    const result = evaluateObserveMode(baseContext, deps as any);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("Policy violation"));

    assert.strictEqual(logged.length, 1);
    const logArgs = logged[0] as unknown[];
    assert.strictEqual(logArgs[0], "OBSERVE MODE: Would have blocked");
    assert.strictEqual((logArgs[1] as any).violation, "Policy violation");

    assert.strictEqual(notifications.length, 1);
    assert.ok(notifications[0].includes("Policy violation"));
  });
});
