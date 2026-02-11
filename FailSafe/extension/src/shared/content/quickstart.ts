/**
 * Quick Start Guide Content
 *
 * Declarative content for the collapsible FailSafe quick-start guide.
 * Follows Simple Made Easy: data objects over imperative rendering.
 */

export interface QuickStartSection {
    title: string;
    content?: string;
    steps?: Array<{ label: string; desc: string }>;
}

export const QUICKSTART_SECTIONS: QuickStartSection[] = [
    {
        title: 'What is FailSafe?',
        content: 'FailSafe monitors AI-generated code for risks, tracks trust scores, and requires human approval for high-risk changes.',
    },
    {
        title: 'The Workflow',
        steps: [
            { label: 'Scan', desc: 'Sentinel watches file changes and runs heuristic checks.' },
            { label: 'Triage', desc: 'Policy engine classifies risk level (L1/L2/L3).' },
            { label: 'Review', desc: 'L3 items queue for human approval.' },
            { label: 'Record', desc: 'Approved changes log to immutable ledger.' },
        ],
    },
    {
        title: 'Trust Levels',
        content: 'Agents earn trust through successful verifications. New agents start at CBT (probation), graduate to KBT (standard), then IBT (trusted).',
    },
];

/**
 * CSS styles for the Quick Start Guide section.
 */
export const QUICKSTART_STYLES = `
    .guide-section {
        margin-bottom: 16px;
        border: 1px dashed var(--vscode-panel-border);
        border-radius: 4px;
        background: var(--vscode-editor-background);
    }
    .guide-section.collapsed .guide-content {
        display: none;
    }
    .guide-section.expanded .guide-content {
        display: block;
    }
    .guide-toggle {
        width: 100%;
        padding: 10px 12px;
        background: transparent;
        border: none;
        color: var(--vscode-textLink-foreground);
        cursor: pointer;
        text-align: left;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .guide-toggle:hover {
        background: var(--vscode-list-hoverBackground);
    }
    .guide-icon {
        font-size: 10px;
    }
    .guide-content {
        padding: 0 12px 12px;
        font-size: 11px;
        line-height: 1.5;
        color: var(--vscode-descriptionForeground);
    }
    .guide-subsection {
        margin: 12px 0;
    }
    .guide-subsection-title {
        font-weight: bold;
        color: var(--vscode-foreground);
        margin-bottom: 6px;
    }
    .guide-step {
        display: flex;
        gap: 8px;
        margin: 8px 0;
    }
    .guide-step-label {
        font-weight: bold;
        color: var(--vscode-foreground);
        min-width: 50px;
    }
`;
