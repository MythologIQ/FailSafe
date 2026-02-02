const assert = require("assert");
const { EvaluationRouter } = require("../out/governance/EvaluationRouter");

async function run() {
  const router = new EvaluationRouter();

  assert.strictEqual(router.determineTier("R1", "low", "high"), 1);
  assert.strictEqual(router.determineTier("R2", "low", "high"), 2);
  assert.strictEqual(router.determineTier("R3", "low", "high"), 3);

  const event = {
    id: "test-1",
    timestamp: new Date().toISOString(),
    category: "user",
    payload: { targetPath: __filename },
  };
  const decision = await router.route(event);
  assert.ok(decision.tier >= 0 && decision.tier <= 3);
  assert.ok(decision.triage);
  console.log("Novelty smoke test: OK");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
