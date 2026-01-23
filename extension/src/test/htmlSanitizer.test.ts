
import { escapeHtml, escapeJsString, getNonce } from '../shared/utils/htmlSanitizer';
import * as assert from 'assert';

console.log('Running htmlSanitizer tests...');

try {
    // 1. Test escapeHtml
    assert.strictEqual(escapeHtml('<div>'), '&lt;div&gt;', 'Should escape HTML tags');
    assert.strictEqual(escapeHtml('"quoted"'), '&quot;quoted&quot;', 'Should escape double quotes');
    assert.strictEqual(escapeHtml("'single'"), '&#039;single&#039;', 'Should escape single quotes');
    assert.strictEqual(escapeHtml('A & B'), 'A &amp; B', 'Should escape ampersands');
    assert.strictEqual(escapeHtml(null), '', 'Should handle null');
    assert.strictEqual(escapeHtml(undefined), '', 'Should handle undefined');
    console.log('✓ escapeHtml passed');

    // 2. Test escapeJsString
    assert.strictEqual(escapeJsString("Can't"), "Can\\'t", 'Should escape single quote in JS string');
    assert.strictEqual(escapeJsString('"Hello"'), '\\"Hello\\"', 'Should escape double quote in JS string');
    assert.strictEqual(escapeJsString('Line\nBreak'), 'Line\\nBreak', 'Should escape newlines');
    assert.strictEqual(escapeJsString('Back\\slash'), 'Back\\\\slash', 'Should escape backslashes');
    assert.strictEqual(escapeJsString(null), '', 'Should handle null');
    console.log('✓ escapeJsString passed');

    // 3. Test getNonce
    const nonce1 = getNonce();
    const nonce2 = getNonce();
    assert.strictEqual(nonce1.length, 32, 'Nonce should be 32 chars long');
    assert.notStrictEqual(nonce1, nonce2, 'Nonces should be random/unique');
    assert.match(nonce1, /^[A-Za-z0-9]+$/, 'Nonce should contain only alphanumeric chars');
    console.log('✓ getNonce passed');

    console.log('All tests passed!');
    process.exit(0);

} catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
}
