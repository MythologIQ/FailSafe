import { describe, it } from 'mocha';
import * as assert from 'assert';
import { escapeHtml, escapeJsString, getNonce } from '../shared/utils/htmlSanitizer';

describe('htmlSanitizer', () => {
  it('escapes HTML characters', () => {
    assert.strictEqual(escapeHtml('<div>'), '&lt;div&gt;');
    assert.strictEqual(escapeHtml('"quoted"'), '&quot;quoted&quot;');
    assert.strictEqual(escapeHtml("'single'"), '&#039;single&#039;');
    assert.strictEqual(escapeHtml('A & B'), 'A &amp; B');
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
  });

  it('escapes JS string content', () => {
    assert.strictEqual(escapeJsString("Can't"), "Can\\'t");
    assert.strictEqual(escapeJsString('"Hello"'), '\\"Hello\\"');
    assert.strictEqual(escapeJsString('Line\nBreak'), 'Line\\nBreak');
    assert.strictEqual(escapeJsString('Back\\slash'), 'Back\\\\slash');
    assert.strictEqual(escapeJsString(null), '');
  });

  it('generates random nonces', () => {
    const nonce1 = getNonce();
    const nonce2 = getNonce();
    assert.strictEqual(nonce1.length, 32);
    assert.strictEqual(nonce2.length, 32);
    assert.notStrictEqual(nonce1, nonce2);
    assert.ok(/^[A-Za-z0-9]+$/.test(nonce1));
  });
});
