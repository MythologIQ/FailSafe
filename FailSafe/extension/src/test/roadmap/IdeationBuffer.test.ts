import * as assert from "assert";
// @ts-ignore
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
    for (let i = 0; i < 15; i++) {
      buffer.setText(`Thought ${i}`);
      const t = buffer.commit();
      assert.ok(t);
    }

    assert.strictEqual(buffer.currentText, "");
    const history = buffer.getHistory();
    assert.strictEqual(history.length, 10, "Max history cache is 10");
    assert.strictEqual(history[0].text, "Thought 14");
    assert.strictEqual(history[9].text, "Thought 5");
  });

  test("commit ignores empty strings", () => {
    const buffer = new IdeationBuffer();
    buffer.setText("   ");
    const res = buffer.commit();
    assert.strictEqual(res, null);
    assert.strictEqual(buffer.getHistory().length, 0);
  });
});
