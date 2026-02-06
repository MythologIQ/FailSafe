/**
 * Tooltip helpers for webview UI.
 *
 * Uses data-tooltip attributes with CSS-only rendering.
 */

import { escapeHtml } from '../utils/htmlSanitizer';

export function tooltipAttrs(text: string | undefined | null): string {
  if (!text) {
    return '';
  }
  const safe = escapeHtml(text);
  if (!safe) {
    return '';
  }
  return `data-tooltip="${safe}" aria-label="${safe}"`;
}

export const TOOLTIP_STYLES = `
    [data-tooltip] {
        position: relative;
        cursor: help;
    }
    [data-tooltip]::after,
    [data-tooltip]::before {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s ease-out, transform 0.12s ease-out;
        z-index: 1000;
    }
    [data-tooltip]::after {
        content: attr(data-tooltip);
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%) translateY(2px);
        display: inline-block;
        background: var(--vscode-editorWidget-background);
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-editorWidget-border);
        border-radius: 4px;
        padding: 6px 8px;
        font-size: 10px;
        max-width: 240px;
        white-space: normal;
        text-align: left;
        word-break: break-word;
        line-height: 1.3;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    [data-tooltip]::before {
        content: '';
        bottom: calc(100% + 3px);
        left: 50%;
        transform: translateX(-50%) translateY(2px);
        border-width: 5px;
        border-style: solid;
        border-color: var(--vscode-editorWidget-background) transparent transparent transparent;
    }
    [data-tooltip]:hover::after,
    [data-tooltip]:hover::before,
    [data-tooltip]:focus::after,
    [data-tooltip]:focus::before {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
`;
