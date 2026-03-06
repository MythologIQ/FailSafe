import * as assert from "assert";
// @ts-ignore
import { calculateHaptics } from "../../../src/roadmap/ui/modules/haptic-engine.js";

suite("HapticEngine Tests", () => {
  test("Calculates simple structural mass", () => {
    const nodes = [
      { id: "1", type: "Feature" },
      { id: "2", type: "Question" },
    ];
    const edges = [{ source: "1", target: "2" }];

    const map = calculateHaptics(nodes, edges);
    assert.ok(map.has("1"));
    assert.strictEqual(map.get("1").val, 5, "Base mass of 5 when degree = 1");
    assert.strictEqual(map.get("1").strain, 0, "No strain");
  });

  test("High degree with mixed types generates strain", () => {
    const nodes = [
      { id: "Core", type: "Architecture" },
      { id: "n1", type: "Question" },
      { id: "n2", type: "Risk" },
      { id: "n3", type: "Feature" },
      { id: "n4", type: "Database" },
      { id: "n5", type: "Integration" },
      { id: "n6", type: "Alignment" },
    ];
    const edges = [
      { source: "Core", target: "n1" },
      { source: "Core", target: "n2" },
      { source: "Core", target: "n3" },
      { source: "Core", target: "n4" },
      { source: "Core", target: "n5" },
      { source: "Core", target: "n6" },
    ];

    const map = calculateHaptics(nodes, edges);
    assert.ok(map.has("Core"));
    const core = map.get("Core");

    // Strain because degree > 5 (it is 6) and connected to > 2 types
    assert.strictEqual(core.strain, 0.2, "Strain scalar applied");
    // Val should increase due to degree 6 -> 5 + floor(6/3)*2 = 9
    assert.strictEqual(core.val, 9, "Mass scalar scaled properly");
  });
});
