import * as assert from "assert";
import { BUILT_IN_AGENTS } from "../../qorelogic/AgentDefinitions";

suite("AgentDefinitions Test Suite", () => {
  test("BUILT_IN_AGENTS has exactly 6 entries", () => {
    assert.strictEqual(BUILT_IN_AGENTS.length, 6);
  });

  test("all agent IDs are unique", () => {
    const agentIds = BUILT_IN_AGENTS.map((a) => a.id);
    const uniqueIds = new Set(agentIds);
    assert.strictEqual(uniqueIds.size, agentIds.length);
  });

  test("every agent has at least one governancePaths entry", () => {
    for (const agent of BUILT_IN_AGENTS) {
      assert.ok(
        agent.governancePaths && agent.governancePaths.length > 0,
        `${agent.id} must have governancePaths`,
      );
    }
  });

  test("every agent has at least one detection method", () => {
    for (const agent of BUILT_IN_AGENTS) {
      const detection = agent.detection;
      assert.ok(detection, `${agent.id} must have detection rules`);
      const hasMethod =
        (detection.folderExists && detection.folderExists.length > 0) ||
        (detection.extensionKeywords && detection.extensionKeywords.length > 0) ||
        (detection.hostAppNames && detection.hostAppNames.length > 0);
      assert.ok(hasMethod, `${agent.id} must have at least one detection method`);
    }
  });

  test("every agent has a non-empty description", () => {
    for (const agent of BUILT_IN_AGENTS) {
      assert.ok(
        agent.description && agent.description.length > 0,
        `${agent.id} must have a description`,
      );
    }
  });

  test("all agents have targetDir set to null", () => {
    for (const agent of BUILT_IN_AGENTS) {
      assert.strictEqual(
        agent.targetDir,
        null,
        `${agent.id} should have null targetDir`,
      );
    }
  });
});
