"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const htmlSanitizer_1 = require("../shared/utils/htmlSanitizer");
const assert = __importStar(require("assert"));
console.log('Running htmlSanitizer tests...');
try {
    // 1. Test escapeHtml
    assert.strictEqual((0, htmlSanitizer_1.escapeHtml)('<div>'), '&lt;div&gt;', 'Should escape HTML tags');
    assert.strictEqual((0, htmlSanitizer_1.escapeHtml)('"quoted"'), '&quot;quoted&quot;', 'Should escape double quotes');
    assert.strictEqual((0, htmlSanitizer_1.escapeHtml)("'single'"), '&#039;single&#039;', 'Should escape single quotes');
    assert.strictEqual((0, htmlSanitizer_1.escapeHtml)('A & B'), 'A &amp; B', 'Should escape ampersands');
    assert.strictEqual((0, htmlSanitizer_1.escapeHtml)(null), '', 'Should handle null');
    assert.strictEqual((0, htmlSanitizer_1.escapeHtml)(undefined), '', 'Should handle undefined');
    console.log('✓ escapeHtml passed');
    // 2. Test escapeJsString
    assert.strictEqual((0, htmlSanitizer_1.escapeJsString)("Can't"), "Can\\'t", 'Should escape single quote in JS string');
    assert.strictEqual((0, htmlSanitizer_1.escapeJsString)('"Hello"'), '\\"Hello\\"', 'Should escape double quote in JS string');
    assert.strictEqual((0, htmlSanitizer_1.escapeJsString)('Line\nBreak'), 'Line\\nBreak', 'Should escape newlines');
    assert.strictEqual((0, htmlSanitizer_1.escapeJsString)('Back\\slash'), 'Back\\\\slash', 'Should escape backslashes');
    assert.strictEqual((0, htmlSanitizer_1.escapeJsString)(null), '', 'Should handle null');
    console.log('✓ escapeJsString passed');
    // 3. Test getNonce
    const nonce1 = (0, htmlSanitizer_1.getNonce)();
    const nonce2 = (0, htmlSanitizer_1.getNonce)();
    assert.strictEqual(nonce1.length, 32, 'Nonce should be 32 chars long');
    assert.notStrictEqual(nonce1, nonce2, 'Nonces should be random/unique');
    assert.match(nonce1, /^[A-Za-z0-9]+$/, 'Nonce should contain only alphanumeric chars');
    console.log('✓ getNonce passed');
    console.log('All tests passed!');
    process.exit(0);
}
catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
}
//# sourceMappingURL=htmlSanitizer.test.js.map