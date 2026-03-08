import * as assert from "assert";
// @ts-expect-error JS module import in TS test context
import { IdeationBuffer } from "../../../src/roadmap/ui/modules/ideation-buffer.js";

suite("IdeationBuffer Tests", () => {
  test("buffer appends transcript deltas correctly", () => {
    const buffer = new IdeationBuffer();
    buffer.appendTranscript("Hello");
    assert.strictEqual(buffer.currentText, "Hello");
    buffer.appendTranscript("world");
    assert.strictEqual(buffer.currentText, "Hello world");
  });

  test("setText overwrites current context", () => {
    const buffer = new IdeationBuffer();
    buffer.appendTranscript("Hello");
    buffer.setText("Replace all");
    assert.strictEqual(buffer.currentText, "Replace all");
  });

  test("commit pushes to history cache without exceeding max size", () => {
    const buffer = new IdeationBuffer();
    let lastDropped = null;
    for (let i = 0; i < 15; i++) {
      buffer.setText(`Thought ${i}`);
      const { thought, dropped } = buffer.commit();
      assert.ok(thought);
      if (dropped) lastDropped = dropped;
    }

    assert.strictEqual(buffer.currentText, "");
    const history = buffer.getHistory();
    assert.strictEqual(history.length, 10, "Max history cache is 10");
    assert.strictEqual(history[0].text, "Thought 14");
    assert.strictEqual(history[9].text, "Thought 5");
  });

  test("commit returns dropped item when history overflows", () => {
    const buffer = new IdeationBuffer();
    for (let i = 0; i < 10; i++) {
      buffer.setText(`Thought ${i}`);
      buffer.commit();
    }
    buffer.setText("Overflow");
    const { thought, dropped } = buffer.commit();
    assert.ok(thought);
    assert.ok(dropped, "Should return dropped item");
    assert.strictEqual(dropped.text, "Thought 0");
  });

  test("commit returns { thought: null, dropped: null } for empty strings", () => {
    const buffer = new IdeationBuffer();
    buffer.setText("   ");
    const { thought, dropped } = buffer.commit();
    assert.strictEqual(thought, null);
    assert.strictEqual(dropped, null);
    assert.strictEqual(buffer.getHistory().length, 0);
  });
});
