/**
 * Genesis Components - Reusable view components for planning visualization.
 * Export all components and their styles for use in panels and views.
 */

export { renderRoadmapSvg, ROADMAP_SVG_STYLES } from './RoadmapSvgView';
export { renderKanbanView, KANBAN_STYLES } from './KanbanView';
export { renderTimelineView, TIMELINE_STYLES, Milestone } from './TimelineView';

/** Combined styles for all components */
export const COMPONENT_STYLES = `
/* RoadmapSvgView */
.road-svg { width: 100%; height: 60px; margin: 8px 0; }
.phase-legend { display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px; }
.legend-item { padding: 2px 6px; border-radius: 2px; background: var(--vscode-editor-background); }
.legend-item.completed { border-left: 3px solid var(--vscode-charts-green); }
.legend-item.active { border-left: 3px solid var(--vscode-charts-blue); }
.legend-item.blocked { border-left: 3px solid var(--vscode-charts-red); }
.legend-item.skipped { border-left: 3px solid var(--vscode-charts-orange); }
.risk-marker { cursor: help; }

/* KanbanView */
.kanban { display: flex; gap: 8px; margin: 12px 0; }
.kanban-col { flex: 1; background: var(--vscode-editor-background); border-radius: 6px; padding: 8px; min-height: 100px; border: 1px solid var(--vscode-panel-border); }
.kanban-col.blocked { border-color: var(--vscode-charts-red); }
.col-header { font-size: 10px; text-transform: uppercase; color: var(--vscode-descriptionForeground); margin-bottom: 8px; font-weight: bold; letter-spacing: 0.5px; }
.col-header .count { font-weight: normal; opacity: 0.7; }
.kanban-card { padding: 8px 10px; background: var(--vscode-inputOption-activeBackground); border-radius: 4px; margin-bottom: 6px; font-size: 11px; transition: transform 0.1s, box-shadow 0.1s; }
.kanban-card:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.kanban-card .progress-bar { height: 3px; background: var(--vscode-progressBar-background); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.kanban-card .progress-fill { height: 100%; background: var(--vscode-charts-blue); transition: width 0.3s; }
.kanban-card.blocked { border-left: 3px solid var(--vscode-charts-red); }
.kanban-card.active { border-left: 3px solid var(--vscode-charts-blue); }
.kanban-card.completed { border-left: 3px solid var(--vscode-charts-green); }

/* TimelineView */
.timeline { display: flex; flex-direction: column; gap: 0; margin: 12px 0; padding-left: 20px; position: relative; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: var(--vscode-panel-border); }
.timeline-item { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; position: relative; }
.timeline-item .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--vscode-disabledForeground); flex-shrink: 0; margin-left: -14px; margin-top: 2px; border: 2px solid var(--vscode-sideBar-background); z-index: 1; }
.timeline-item.completed .dot { background: var(--vscode-charts-green); }
.timeline-item.active .dot { background: var(--vscode-charts-blue); animation: pulse 1.5s infinite; }
.timeline-item.blocked .dot { background: var(--vscode-charts-red); }
.timeline-item.skipped .dot { background: var(--vscode-charts-orange); }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(66, 135, 245, 0.4); } 50% { box-shadow: 0 0 0 6px rgba(66, 135, 245, 0); } }
.timeline-item .content { flex: 1; }
.timeline-item .title { font-size: 12px; font-weight: 500; color: var(--vscode-foreground); }
.timeline-item .description { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
.timeline-item .progress { font-size: 9px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
.milestone-marker { display: flex; align-items: center; gap: 8px; padding: 4px 8px; background: var(--vscode-editor-background); border-radius: 4px; margin: 4px 0 4px -14px; border-left: 3px solid var(--vscode-charts-yellow); font-size: 10px; }
.milestone-marker.completed { border-left-color: var(--vscode-charts-green); }
.milestone-marker .icon { font-size: 12px; }
`;
