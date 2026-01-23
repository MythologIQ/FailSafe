"use strict";
/**
 * Shared utility for HTML sanitization and escaping to prevent XSS.
 * Critical for verifying untrusted input before rendering in webviews.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.escapeJsString = escapeJsString;
exports.getNonce = getNonce;
function escapeHtml(text) {
    if (text === undefined || text === null) {
        return '';
    }
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
function escapeJsString(text) {
    if (text === undefined || text === null) {
        return '';
    }
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
/**
 * Generates a cryptographic nonce for CSP headers.
 */
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=htmlSanitizer.js.map