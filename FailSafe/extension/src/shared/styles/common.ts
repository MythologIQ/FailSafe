/**
 * Common Style Constants for Genesis UI Components
 *
 * Provides consistent spacing, typography, and color tokens
 * across all view providers (CortexStream, Roadmap, Sentinel).
 */

export const SPACING = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    section: '20px',
} as const;

export const TYPOGRAPHY = {
    title: '11px',
    body: '12px',
    small: '10px',
    micro: '9px',
} as const;

/**
 * Common CSS for sections with improved breathing room
 */
export const SECTION_STYLES = `
    .section {
        margin-bottom: ${SPACING.section};
        padding: 14px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        border: 1px solid var(--vscode-panel-border);
    }
    .section-title {
        font-weight: bold;
        font-size: ${TYPOGRAPHY.title};
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
        margin-bottom: ${SPACING.md};
        letter-spacing: 0.5px;
    }
    .section-divider {
        height: 1px;
        background: var(--vscode-panel-border);
        margin: ${SPACING.md} 0;
        opacity: 0.5;
    }
    .metric {
        display: flex;
        justify-content: space-between;
        margin: 6px 0;
        font-size: ${TYPOGRAPHY.body};
    }
    .metric-label {
        color: var(--vscode-descriptionForeground);
    }
    .metric-value {
        font-weight: 500;
    }
`;

/**
 * Common CSS for event cards with improved spacing
 */
export const EVENT_CARD_STYLES = `
    .event-card {
        margin-bottom: ${SPACING.md};
        padding: ${SPACING.md} 14px;
    }
    .event-header {
        margin-bottom: 6px;
    }
`;
