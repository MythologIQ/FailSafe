/**
 * Shared utility for HTML sanitization and escaping to prevent XSS.
 * Critical for verifying untrusted input before rendering in webviews.
 */
export declare function escapeHtml(text: string | undefined | null): string;
export declare function escapeJsString(text: string | undefined | null): string;
/**
 * Generates a cryptographic nonce for CSP headers.
 */
export declare function getNonce(): string;
//# sourceMappingURL=htmlSanitizer.d.ts.map