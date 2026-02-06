/**
 * KanbanView - Reusable Kanban board visualization component.
 * Renders plan phases as cards in status columns.
 */

import { Plan, PlanPhase, PhaseStatus } from '../../qorelogic/planning/types';
import { escapeHtml } from '../../shared/utils/htmlSanitizer';

/** Column order for Kanban board */
const COLUMN_ORDER: PhaseStatus[] = ['pending', 'active', 'blocked', 'completed'];

/** Column display names */
const COLUMN_NAMES: Record<PhaseStatus, string> = {
    pending: 'Pending',
    active: 'Active',
    blocked: 'Blocked',
    completed: 'Completed',
    skipped: 'Skipped'
};

export const KANBAN_STYLES = `
.kanban { display: flex; gap: 8px; margin: 12px 0; }
.kanban-col {
    flex: 1;
    background: var(--vscode-editor-background);
    border-radius: 6px;
    padding: 8px;
    min-height: 100px;
    border: 1px solid var(--vscode-panel-border);
}
.kanban-col.blocked { border-color: var(--vscode-charts-red); }
.col-header {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
    font-weight: bold;
    letter-spacing: 0.5px;
}
.col-header .count {
    font-weight: normal;
    opacity: 0.7;
}
.kanban-card {
    padding: 8px 10px;
    background: var(--vscode-inputOption-activeBackground);
    border-radius: 4px;
    margin-bottom: 6px;
    font-size: 11px;
    transition: transform 0.1s, box-shadow 0.1s;
}
.kanban-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.kanban-card .progress-bar {
    height: 3px;
    background: var(--vscode-progressBar-background);
    border-radius: 2px;
    margin-top: 6px;
    overflow: hidden;
}
.kanban-card .progress-fill {
    height: 100%;
    background: var(--vscode-charts-blue);
    transition: width 0.3s;
}
.kanban-card.blocked { border-left: 3px solid var(--vscode-charts-red); }
.kanban-card.active { border-left: 3px solid var(--vscode-charts-blue); }
.kanban-card.completed { border-left: 3px solid var(--vscode-charts-green); }
`;

/**
 * Renders a Kanban board for the given plan.
 * Phases are grouped into columns by status.
 */
export function renderKanbanView(plan: Plan): string {
    const phases = plan.phases;
    if (phases.length === 0) {
        return '<div class="no-phases">No phases defined</div>';
    }

    const columns = COLUMN_ORDER.map(status => {
        const items = phases.filter(p => p.status === status);
        return renderColumn(status, items);
    }).join('');

    return `<div class="kanban">${columns}</div>`;
}

function renderColumn(status: PhaseStatus, phases: PlanPhase[]): string {
    const isBlocked = status === 'blocked';
    return `<div class="kanban-col ${isBlocked ? 'blocked' : ''}">
        <div class="col-header">
            ${COLUMN_NAMES[status]} <span class="count">(${phases.length})</span>
        </div>
        ${phases.map(p => renderCard(p)).join('')}
    </div>`;
}

function renderCard(phase: PlanPhase): string {
    const progressBar = phase.progress > 0 && phase.status !== 'completed'
        ? `<div class="progress-bar"><div class="progress-fill" style="width:${phase.progress}%"></div></div>`
        : '';

    return `<div class="kanban-card ${phase.status}">
        <div class="card-title">${escapeHtml(phase.title)}</div>
        ${progressBar}
    </div>`;
}
