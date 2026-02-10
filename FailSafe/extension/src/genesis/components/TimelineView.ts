/**
 * TimelineView - Reusable timeline/Gantt visualization component.
 * Renders plan phases as a vertical timeline with milestones.
 */

import { Plan, PlanPhase } from '../../qorelogic/planning/types';
import { escapeHtml } from '../../shared/utils/htmlSanitizer';

/** Milestone type for timeline markers */
export interface Milestone {
    id: string;
    phaseId: string;
    title: string;
    targetDate?: string;
    completedAt?: string;
    icon?: string;
}

export const TIMELINE_STYLES = `
.timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 12px 0;
    padding-left: 20px;
    position: relative;
}
.timeline::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--vscode-panel-border);
}
.timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 0;
    position: relative;
}
.timeline-item .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--vscode-disabledForeground);
    flex-shrink: 0;
    margin-left: -14px;
    margin-top: 2px;
    border: 2px solid var(--vscode-sideBar-background);
    z-index: 1;
}
.timeline-item.completed .dot { background: var(--vscode-charts-green); }
.timeline-item.active .dot { background: var(--vscode-charts-blue); animation: pulse 1.5s infinite; }
.timeline-item.blocked .dot { background: var(--vscode-charts-red); }
.timeline-item.skipped .dot { background: var(--vscode-charts-orange); }
@keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(var(--vscode-charts-blue-rgb, 66, 135, 245), 0.4); }
    50% { box-shadow: 0 0 0 6px rgba(var(--vscode-charts-blue-rgb, 66, 135, 245), 0); }
}
.timeline-item .content {
    flex: 1;
}
.timeline-item .title {
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
}
.timeline-item .description {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
}
.timeline-item .progress {
    font-size: 9px;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
}
.milestone-marker {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: var(--vscode-editor-background);
    border-radius: 4px;
    margin: 4px 0 4px -14px;
    border-left: 3px solid var(--vscode-charts-yellow);
    font-size: 10px;
}
.milestone-marker.completed {
    border-left-color: var(--vscode-charts-green);
}
.milestone-marker .icon { font-size: 12px; }
`;

/**
 * Renders a timeline view for the given plan.
 * Phases are displayed vertically with optional milestone markers.
 */
export function renderTimelineView(plan: Plan, milestones: Milestone[] = []): string {
    const phases = plan.phases;
    if (phases.length === 0) {
        return '<div class="no-phases">No phases defined</div>';
    }

    const items = phases.map(phase => {
        const phaseMilestones = milestones.filter(m => m.phaseId === phase.id);
        return renderTimelineItem(phase, phaseMilestones);
    }).join('');

    return `<div class="timeline">${items}</div>`;
}

function renderTimelineItem(phase: PlanPhase, milestones: Milestone[]): string {
    const progressText = phase.status === 'active' ? `${phase.progress}% complete` : '';
    const milestonesHtml = milestones.map(m => renderMilestone(m)).join('');

    return `<div class="timeline-item ${phase.status}">
        <div class="dot"></div>
        <div class="content">
            <div class="title">${escapeHtml(phase.title)}</div>
            ${phase.description ? `<div class="description">${escapeHtml(phase.description)}</div>` : ''}
            ${progressText ? `<div class="progress">${progressText}</div>` : ''}
            ${milestonesHtml}
        </div>
    </div>`;
}

function renderMilestone(milestone: Milestone): string {
    const isComplete = !!milestone.completedAt;
    const icon = milestone.icon || (isComplete ? '✓' : '◇');

    return `<div class="milestone-marker ${isComplete ? 'completed' : ''}">
        <span class="icon">${icon}</span>
        <span>${escapeHtml(milestone.title)}</span>
    </div>`;
}
