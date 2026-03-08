import * as assert from "assert";
import { evaluateAssistMode } from "../../governance/enforcement/AssistModeEvaluator";
import type { AssistDeps } from "../../governance/enforcement/AssistModeEvaluator";
import type { ActionContext } from "../../governance/enforcement/types";

suite("AssistModeEvaluator", () => {
  const baseAction = { targetPath: "/test/file.ts", actionType: "save" } as any;

  function makeDeps(opts: { createFails?: boolean } = {}) {
    const warnings: string[] = [];
    return {
      deps: {
        axiom1: {
          enforce: () => ({ status: "ALLOW" as const, reason: "ok", intentId: "test" }),
        },
        intentProvider: {
          getActiveIntent: async () => null,
          createIntent: async (params: any) => {
            if (opts.createFails) throw new Error("fail");
            return { id: "auto-1", ...params };
          },
        },
        workspaceRoot: "/workspace",
        logger: { info: () => {}, error: () => {} } as any,
        notifications: {
          showInfo: () => Promise.resolve(undefined),
          showWarning: (...args: unknown[]) => {
            warnings.push(String(args[0]));
            return Promise.resolve(undefined);
          },
        } as any,
      } as AssistDeps,
      warnings,
    };
  }

  test("auto-creates intent when none active", async () => {
    const { deps } = makeDeps();
    const context: ActionContext = {
      action: baseAction,
      activeIntent: null,
      workspaceRoot: "/workspace",
    };
    const result = await evaluateAssistMode(context, deps);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("auto-1"));
  });

  test("allows action when intent creation fails", async () => {
    const { deps } = makeDeps({ createFails: true });
    const context: ActionContext = {
      action: baseAction,
      activeIntent: null,
      workspaceRoot: "/workspace",
    };
    const result = await evaluateAssistMode(context, deps);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("failed"));
  });

  test("uses existing intent without auto-creating", async () => {
    const { deps } = makeDeps();
    const context: ActionContext = {
      action: baseAction,
      activeIntent: { id: "existing-1" } as any,
      workspaceRoot: "/workspace",
    };
    const result = await evaluateAssistMode(context, deps);
    assert.strictEqual(result.status, "ALLOW");
    assert.ok(result.reason.includes("existing-1"));
  });
});
