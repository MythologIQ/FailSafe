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

  function makeDeps(axiom1Status: "ALLOW" | "BLOCK" = "ALLOW") {
    const logged: unknown[] = [];
    const notifications: string[] = [];
    return {
      deps: {
        axiom1: {
          enforce: () =>
            axiom1Status === "ALLOW"
              ? { status: "ALLOW", reason: "ok", intentId: "test" }
              : { status: "BLOCK", violation: "No intent", reason: "blocked" },
        } as any,
        logger: { info: (...args: unknown[]) => logged.push(args) } as any,
        notifications: {
          showInfo: (...args: unknown[]) => {
            notifications.push(String(args[0]));
            return Promise.resolve(undefined);
          },
        } as any,
        executeCommand: () => {},
      } as ObserveDeps,
      logged,
      notifications,
    };
  }

  test("allows action when axiom1 passes", async () => {
    const { deps } = makeDeps("ALLOW");
    const result = evaluateObserveMode(baseContext, deps);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("permitted"));
  });

  test("allows action but logs when axiom1 fails", async () => {
    const { deps, logged, notifications } = makeDeps("BLOCK");
    const result = evaluateObserveMode(baseContext, deps);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("logged but not blocked"));
    assert.strictEqual(logged.length, 1);
    assert.strictEqual(notifications.length, 1);
  });
});
