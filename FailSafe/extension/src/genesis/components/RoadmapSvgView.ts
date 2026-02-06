/**
 * RoadmapSvgView - Reusable SVG road visualization component.
 * Renders plan phases as road segments with progress markers.
 */

import { Plan, PlanPhase, RiskMarker } from '../../qorelogic/planning/types';
import { escapeHtml } from '../../shared/utils/htmlSanitizer';

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
.road-svg { width: 100%; height: 60px; margin: 8px 0; }
.phase-legend { display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px; }
.legend-item { padding: 2px 6px; border-radius: 2px; background: var(--vscode-editor-background); }
.legend-item.completed { border-left: 3px solid var(--vscode-charts-green); }
.legend-item.active { border-left: 3px solid var(--vscode-charts-blue); }
.legend-item.blocked { border-left: 3px solid var(--vscode-charts-red); }
.legend-item.skipped { border-left: 3px solid var(--vscode-charts-orange); }
.risk-marker { cursor: help; }
`;

/**
 * Renders an SVG road visualization for the given plan.
 * Phases are rendered as segments with widths proportional to estimatedScope.
 */
export function renderRoadmapSvg(plan: Plan, risks: RiskMarker[] = []): string {
    const phases = plan.phases;
    if (phases.length === 0) {
        return '<div class="no-phases">No phases defined</div>';
    }

    // Calculate segment positions
    let x = 0;
    const segments = phases.map(ph => {
        const w = Math.min(40, Math.max(8, ph.estimatedScope || 15));
        const seg = { phase: ph, x, width: w };
        x += w;
        return seg;
    });
    const scale = x > 0 ? 100 / x : 1;

    // Render road segments
    const rects = segments.map(s => {
        const fill = STATUS_COLORS[s.phase.status] || STATUS_COLORS.pending;
        const icon = s.phase.status === 'blocked' ? renderBlockedIcon(s.width * scale) : '';
        return `<g transform="translate(${s.x * scale},5)">
            <rect width="${s.width * scale - 1}" height="30" fill="${fill}" rx="3"/>
            ${icon}
        </g>`;
    }).join('');

    // Current position marker
    const curIdx = phases.findIndex(p => p.id === plan.currentPhaseId);
    const marker = curIdx >= 0 ? renderCurrentMarker(segments[curIdx], scale) : '';

    // Risk markers
    const riskMarkers = renderRiskMarkers(segments, risks, scale);

    const svg = `<svg class="road-svg" viewBox="0 0 100 60">
        ${rects}
        ${marker}
        ${riskMarkers}
    </svg>`;

    const legend = renderLegend(phases);

    return svg + legend;
}

function renderBlockedIcon(width: number): string {
    return `<text x="${width / 2}" y="22" text-anchor="middle" font-size="12" fill="white">B</text>`;
}

function renderCurrentMarker(segment: { x: number; width: number }, scale: number): string {
    const cx = (segment.x + segment.width / 2) * scale;
    return `<circle cx="${cx}" cy="45" r="5" fill="var(--vscode-charts-blue)"/>
            <text x="${cx}" y="55" text-anchor="middle" font-size="8" fill="var(--vscode-descriptionForeground)">HERE</text>`;
}

function renderRiskMarkers(segments: { phase: PlanPhase; x: number; width: number }[], risks: RiskMarker[], scale: number): string {
    return risks.map(risk => {
        const seg = segments.find(s => s.phase.id === risk.phaseId);
        if (!seg) return '';
        const cx = (seg.x + seg.width / 2) * scale;
        const color = RISK_COLORS[risk.level] || RISK_COLORS.caution;
        return `<g class="risk-marker" transform="translate(${cx - 4}, 0)">
            <polygon points="4,0 8,7 0,7" fill="${color}"/>
            <title>${escapeHtml(risk.title)}: ${escapeHtml(risk.description)}</title>
        </g>`;
    }).join('');
}

function renderLegend(phases: PlanPhase[]): string {
    return `<div class="phase-legend">${phases.map(p =>
        `<span class="legend-item ${p.status}">${escapeHtml(p.title)}</span>`
    ).join('')}</div>`;
}
