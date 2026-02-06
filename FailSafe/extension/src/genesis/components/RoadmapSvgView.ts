/**
 * RoadmapSvgView - Enhanced SVG road visualization component.
 * Renders plan phases as road segments with blockers, detours, milestones, and risks.
 */

import { Plan, PlanPhase, RiskMarker, Milestone, Blocker } from '../../qorelogic/planning/types';
import { escapeHtml } from '../../shared/utils/htmlSanitizer';

const SVG_HEIGHT = 160;
const ROAD_Y = 60;
const ROAD_HEIGHT = 50;

/** Color mapping for phase status */
const STATUS_COLORS: Record<string, string> = {
    completed: 'var(--vscode-charts-green)',
    active: 'var(--vscode-charts-blue)',
    blocked: 'var(--vscode-charts-red)',
    pending: 'var(--vscode-disabledForeground)',
    skipped: 'var(--vscode-charts-orange)'
};

/** Color mapping for risk levels */
const RISK_COLORS: Record<string, string> = {
    clear: 'var(--vscode-charts-green)',
    caution: 'var(--vscode-charts-yellow)',
    danger: 'var(--vscode-charts-red)'
};

export const ROADMAP_SVG_STYLES = `
.road-svg { width: 100%; height: ${SVG_HEIGHT}px; margin: 8px 0; }
.phase-legend { display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px; margin-top: 8px; }
.legend-item { padding: 2px 6px; border-radius: 2px; background: var(--vscode-editor-background); }
.legend-item.completed { border-left: 3px solid var(--vscode-charts-green); }
.legend-item.active { border-left: 3px solid var(--vscode-charts-blue); }
.legend-item.blocked { border-left: 3px solid var(--vscode-charts-red); }
.legend-item.skipped { border-left: 3px solid var(--vscode-charts-orange); }
.risk-marker { cursor: help; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.current-marker { animation: pulse 1.5s ease-in-out infinite; }
`;

type Segment = { phase: PlanPhase; x: number; width: number };

/**
 * Renders an enhanced SVG road visualization for the given plan.
 * Phases are rendered as segments with blockers, detours, milestones, and risks.
 */
export function renderRoadmapSvg(plan: Plan, risks: RiskMarker[] = []): string {
    const phases = plan.phases;
    if (phases.length === 0) {
        return '<div class="no-phases">No phases defined</div>';
    }

    // Calculate segment positions
    let x = 0;
    const segments: Segment[] = phases.map(ph => {
        const w = Math.min(40, Math.max(10, ph.estimatedScope || 15));
        const seg = { phase: ph, x, width: w };
        x += w;
        return seg;
    });
    const scale = x > 0 ? 100 / x : 1;

    // Render road segments with enhanced styling
    const rects = segments.map(s => renderPhaseSegment(s, scale)).join('');

    // Render detour paths for blocked phases with detours
    const detours = renderDetourPaths(plan.blockers, segments, scale);

    // Current position marker
    const curIdx = phases.findIndex(p => p.id === plan.currentPhaseId);
    const marker = curIdx >= 0 ? renderCurrentMarker(segments[curIdx], scale) : '';

    // Milestones
    const milestoneMarkers = renderMilestones(plan.milestones, segments, scale);

    // Risk markers
    const riskMarkers = renderRiskMarkers(segments, risks, scale);

    const svg = `<svg class="road-svg" viewBox="0 0 100 ${SVG_HEIGHT}">
        <defs>${renderDefs()}</defs>
        ${detours}
        ${rects}
        ${milestoneMarkers}
        ${marker}
        ${riskMarkers}
    </svg>`;

    return svg + renderLegend(phases);
}

function renderDefs(): string {
    return `<pattern id="blockedStripes" patternUnits="userSpaceOnUse" width="6" height="6">
        <path d="M0,6 L6,0" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </pattern>`;
}

function renderPhaseSegment(s: Segment, scale: number): string {
    const fill = STATUS_COLORS[s.phase.status] || STATUS_COLORS.pending;
    const w = s.width * scale - 1;
    const blocked = s.phase.status === 'blocked';
    const completed = s.phase.status === 'completed';

    let overlay = '';
    if (blocked) {
        overlay = `<rect width="${w}" height="${ROAD_HEIGHT}" fill="url(#blockedStripes)"/>
            <text x="${w / 2}" y="${ROAD_HEIGHT / 2 + 4}" text-anchor="middle" font-size="10" fill="white" font-weight="bold">BLOCKED</text>`;
    } else if (completed) {
        overlay = `<text x="${w / 2}" y="${ROAD_HEIGHT / 2 + 4}" text-anchor="middle" font-size="14" fill="white">✓</text>`;
    }

    return `<g transform="translate(${s.x * scale},${ROAD_Y})">
        <rect width="${w}" height="${ROAD_HEIGHT}" fill="${fill}" rx="4"/>
        ${overlay}
        <title>${escapeHtml(s.phase.title)}: ${s.phase.progress}%</title>
    </g>`;
}

function renderDetourPaths(blockers: Blocker[], segments: Segment[], scale: number): string {
    return blockers.filter(b => b.detourPhaseId && !b.resolvedAt).map(b => {
        const fromSeg = segments.find(s => s.phase.id === b.phaseId);
        const toSeg = segments.find(s => s.phase.id === b.detourPhaseId);
        if (!fromSeg || !toSeg) return '';

        const fromX = (fromSeg.x + fromSeg.width / 2) * scale;
        const toX = (toSeg.x + toSeg.width / 2) * scale;
        const midX = (fromX + toX) / 2;
        const ctrlY = ROAD_Y - 30;

        return `<path d="M${fromX},${ROAD_Y} Q${midX},${ctrlY} ${toX},${ROAD_Y}"
            stroke="var(--vscode-charts-orange)" stroke-width="2" stroke-dasharray="4,2" fill="none"/>
            <text x="${midX}" y="${ctrlY - 4}" text-anchor="middle" font-size="8" fill="var(--vscode-charts-orange)">Detour</text>`;
    }).join('');
}

function renderMilestones(milestones: Milestone[], segments: Segment[], scale: number): string {
    return milestones.map(m => {
        const seg = segments.find(s => s.phase.id === m.phaseId);
        if (!seg) return '';
        const cx = (seg.x + seg.width / 2) * scale;
        const fill = m.completedAt ? 'var(--vscode-charts-green)' : 'var(--vscode-charts-purple)';
        const icon = m.icon || '◆';
        return `<g transform="translate(${cx},${ROAD_Y - 20})">
            <text x="0" y="0" text-anchor="middle" font-size="12" fill="${fill}">${icon}</text>
            <title>${escapeHtml(m.title)}${m.targetDate ? ` (Target: ${m.targetDate})` : ''}</title>
        </g>`;
    }).join('');
}

function renderCurrentMarker(segment: Segment, scale: number): string {
    const cx = (segment.x + segment.width / 2) * scale;
    const cy = ROAD_Y + ROAD_HEIGHT + 15;
    return `<g class="current-marker">
        <circle cx="${cx}" cy="${cy}" r="6" fill="var(--vscode-charts-blue)"/>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="7" fill="var(--vscode-descriptionForeground)">YOU ARE HERE</text>
    </g>`;
}

function renderRiskMarkers(segments: Segment[], risks: RiskMarker[], scale: number): string {
    return risks.map(risk => {
        const seg = segments.find(s => s.phase.id === risk.phaseId);
        if (!seg) return '';
        const cx = (seg.x + seg.width / 2) * scale;
        const color = RISK_COLORS[risk.level] || RISK_COLORS.caution;
        return `<g class="risk-marker" transform="translate(${cx - 5}, ${ROAD_Y - 10})">
            <polygon points="5,0 10,10 0,10" fill="${color}"/>
            <text x="5" y="7" text-anchor="middle" font-size="6" fill="white">!</text>
            <title>${escapeHtml(risk.title)}: ${escapeHtml(risk.description)}</title>
        </g>`;
    }).join('');
}

function renderLegend(phases: PlanPhase[]): string {
    return `<div class="phase-legend">${phases.map(p =>
        `<span class="legend-item ${p.status}">${escapeHtml(p.title)}</span>`
    ).join('')}</div>`;
}
