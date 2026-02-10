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
        border-bottom: 1px dotted var(--vscode-descriptionForeground);
    }
    [data-tooltip]::after,
    [data-tooltip]::before {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        z-index: 1000;
    }
    [data-tooltip]::after {
        content: attr(data-tooltip);
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%) translateY(4px);
        display: inline-block;
        background: var(--vscode-editorHoverWidget-background);
        color: var(--vscode-editorHoverWidget-foreground);
        border: 1px solid var(--vscode-editorHoverWidget-border);
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        max-width: 300px;
        white-space: normal;
        text-align: left;
        word-break: break-word;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    [data-tooltip]::before {
        content: '';
        bottom: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%) translateY(4px);
        border-width: 6px;
        border-style: solid;
        border-color: var(--vscode-editorHoverWidget-border) transparent transparent transparent;
    }
    [data-tooltip]:hover::after,
    [data-tooltip]:hover::before,
    [data-tooltip]:focus::after,
    [data-tooltip]:focus::before {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        animation: tooltipFade 0.15s ease-out;
    }
    @keyframes tooltipFade {
        from { opacity: 0; transform: translateX(-50%) translateY(4px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
