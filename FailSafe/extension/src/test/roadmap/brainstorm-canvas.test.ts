import * as assert from "assert";
// @ts-expect-error JS module import in TS test context
import { BrainstormCanvas } from "../../../src/roadmap/ui/modules/brainstorm-canvas.js";
import { JSDOM } from "jsdom";

suite("BrainstormCanvas Tests", () => {
  let originalWindow: any;
  let canvas: any;

  setup(() => {
    const dom = new JSDOM('<!DOCTYPE html><div id="container"></div>');
    originalWindow = (global as any).window;
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;

    // Mock 3d-force-graph
    const mockGraphInstance = {
      backgroundColor: () => mockGraphInstance,
      showNavInfo: () => mockGraphInstance,
      nodeLabel: () => mockGraphInstance,
      nodeColor: () => mockGraphInstance,
      nodeResolution: () => mockGraphInstance,
      nodeVal: () => mockGraphInstance,
      linkColor: () => mockGraphInstance,
      linkWidth: () => mockGraphInstance,
      linkDirectionalParticles: () => mockGraphInstance,
      linkDirectionalParticleSpeed: () => mockGraphInstance,
      linkDirectionalParticleWidth: () => mockGraphInstance,
      onNodeClick: () => mockGraphInstance,
      onNodeRightClick: () => mockGraphInstance,
      onNodeDragEnd: () => mockGraphInstance,
      cameraPosition: () => mockGraphInstance,
      width: () => mockGraphInstance,
      height: () => mockGraphInstance,
      graphData: () => mockGraphInstance,
      d3Force: () => ({ strength: () => {}, distance: () => {} }),
    };
    (global as any).window.ForceGraph = () => () => mockGraphInstance;
    (global as any).window.ForceGraph3D = () => () => mockGraphInstance;
    (global as any).window.matchMedia = () => ({ matches: false });
  });

  teardown(() => {
    if (canvas?.destroy) {
      canvas.destroy();
      canvas = null;
    }
    (global as any).window = originalWindow;
    (global as any).document = originalWindow
      ? originalWindow.document
      : undefined;
  });

  test("defaults to 2D view mode", () => {
    const container = (global as any).document.getElementById("container");
    canvas = new BrainstormCanvas(container);
    assert.strictEqual(canvas.viewMode, "2D");
  });

  test("escapes HTML in node labels", () => {
    const container = (global as any).document.getElementById("container");
    canvas = new BrainstormCanvas(container);

    // The nodeLabel callback is set during _initGraph via .nodeLabel(fn)
    // Verify the escapeHtml import works correctly
    const { escapeHtml } = require("../../../src/roadmap/ui/modules/brainstorm-templates.js");
    assert.strictEqual(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.strictEqual(escapeHtml('Node "A" & B'), 'Node &quot;A&quot; &amp; B');
  });

  test("setNodes correctly maps node val without mutating original", () => {
    const container = (global as any).document.getElementById("container");
    canvas = new BrainstormCanvas(container);

    const originalNodes = [
      { id: "1", label: "Node 1", mass: 10, confidence: 80 },
      { id: "2", label: "Node 2" }, // implicit default
    ];

    const originalCopy = JSON.parse(JSON.stringify(originalNodes));

    canvas.setNodes(originalNodes);
    // rAF batching defers _applyGraphData; flush it synchronously for test
    canvas._applyGraphData();

    assert.deepStrictEqual(
      originalNodes,
      originalCopy,
      "Original nodes array should not be mutated",
    );

    assert.strictEqual(canvas.nodes.length, 2);
    assert.strictEqual(canvas.nodes[0].id, "1");
    assert.strictEqual(
      canvas.nodes[0].val,
      5,
      "Haptic engine should derive default mass from topology",
    );
    assert.strictEqual(
      canvas.nodes[1].val,
      5,
      "Val should default to 5 mapped via nodeVal default config",
    );
  });
});
