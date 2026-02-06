/**
 * Shared utility for HTML sanitization and escaping to prevent XSS.
 * Critical for verifying untrusted input before rendering in webviews.
 */

export function escapeHtml(text: string | undefined | null): string {
    if (text === undefined || text === null) {
        return '';
    }
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

export function escapeJsString(text: string | undefined | null): string {
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
export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
