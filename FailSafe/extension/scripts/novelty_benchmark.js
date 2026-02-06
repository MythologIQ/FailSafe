const path = require("path");
const { EvaluationRouter } = require("../out/governance/EvaluationRouter");

async function run() {
  const router = new EvaluationRouter();
  const target = path.resolve(__dirname, "../src/extension/main.ts");
  const event = {
    id: "bench-1",
    timestamp: new Date().toISOString(),
    category: "user",
    payload: { targetPath: target },
  };

  const iterations = 50;
  const times = [];
  for (let i = 0; i < iterations; i += 1) {
    const t0 = process.hrtime.bigint();
    await router.route(event);
    const t1 = process.hrtime.bigint();
    times.push(Number(t1 - t0) / 1e6);
  }

  const avg =
    times.reduce((sum, t) => sum + t, 0) / (times.length || 1);
  const max = Math.max(...times);
  const min = Math.min(...times);

  console.log("Novelty benchmark (ms)");
  console.log(`iterations=${iterations}`);
  console.log(`avg=${avg.toFixed(3)} min=${min.toFixed(3)} max=${max.toFixed(3)}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
