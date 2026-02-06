import { HELP_TEXT } from '../../../shared/components/InfoHint';
import { tooltipAttrs, TOOLTIP_STYLES } from '../../../shared/components/Tooltip';

export type LivingGraphViewModel = {
    nonce: string;
    cspSource: string;
    graphDataJson: string;
};

const LIVING_GRAPH_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Living Graph</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style nonce="{{NONCE}}">
        body { font-family: var(--vscode-font-family); background-color: var(--vscode-editor-background); margin: 0; padding: 0; overflow: hidden; }
        {{TOOLTIP_STYLES}}
        #graph { width: 100%; height: 100vh; }
        .legend { position: absolute; top: 10px; right: 10px; display: flex; gap: 10px; font-size: 10px; color: var(--vscode-descriptionForeground); background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 6px 8px; border-radius: 4px; }
        .legend-item { display: inline-flex; align-items: center; gap: 4px; }
        .node { cursor: pointer; }
        .node-file { fill: #4a5568; } .node-module { fill: #2d3748; } .node-external { fill: #718096; } .node-concept { fill: #9f7aea; }
        .state-idle { fill: #4a5568; } .state-indexing { fill: #ecc94b; } .state-verified { fill: #48bb78; } .state-warning { fill: #ed8936; } .state-blocked { fill: #f56565; } .state-l3-pending { fill: #9f7aea; }
        .risk-L1 { fill: #48bb78; } .risk-L2 { fill: #ecc94b; } .risk-L3 { fill: #f56565; }
        .risk-L1-stroke { stroke: #48bb78; stroke-width: 2; } .risk-L2-stroke { stroke: #ecc94b; stroke-width: 2; } .risk-L3-stroke { stroke: #f56565; stroke-width: 3; }
        .trust-high { filter: drop-shadow(0 0 4px #48bb78); } .trust-medium { filter: drop-shadow(0 0 2px #ecc94b); } .trust-low { filter: drop-shadow(0 0 3px #f56565); opacity: 0.8; }
        .link { stroke: #4a5568; stroke-opacity: 0.6; } .link-import { stroke: #63b3ed; } .link-dependency { stroke: #a0aec0; stroke-dasharray: 5,5; } .link-spec { stroke: #9f7aea; stroke-dasharray: 2,2; }
        .link-risk { stroke: #f56565; stroke-width: 2; stroke-dasharray: 3,3; animation: pulse-risk 1.5s infinite; }
        @keyframes pulse-risk { 0%,100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.4; } }
        .node-label { font-size: 10px; fill: var(--vscode-foreground); pointer-events: none; }
        .tooltip { position: absolute; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); border-radius: 4px; padding: 8px; font-size: 11px; pointer-events: none; display: none; z-index: 1000; }
        .stats { position: absolute; bottom: 10px; left: 10px; background: var(--vscode-editor-background); padding: 8px; border-radius: 4px; font-size: 10px; color: var(--vscode-descriptionForeground); }
    </style>
</head>
<body>
    <div class="legend">
        <span class="legend-item" {{RISK_TOOLTIP}}>Risk: L1/L2/L3</span>
        <span class="legend-item" {{TRUST_TOOLTIP}}>Trust glow</span>
    </div>
    <div id="graph"></div>
    <div class="tooltip" id="tooltip"></div>
    <div class="stats" id="stats">Loading...</div>

    <script nonce="{{NONCE}}">
        const vscode = acquireVsCodeApi();
        let graphData = {{GRAPH_DATA_JSON}};
        let simulation;

        function initGraph() {
            const container = document.getElementById('graph');
            const width = container.clientWidth;
            const height = container.clientHeight;
            const svg = d3.select('#graph').append('svg').attr('width', width).attr('height', height);
            const g = svg.append('g');
            svg.call(d3.zoom().extent([[0, 0], [width, height]]).scaleExtent([0.1, 4]).on('zoom', (event) => g.attr('transform', event.transform)));
            simulation = d3.forceSimulation()
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(d => {
                    const baseRadius = d.type === 'module' ? 12 : 8;
                    const trustBonus = (d.trustScore || 0.5) * 10;
                    return baseRadius + trustBonus + 8;
                }));
            updateGraph(graphData);
        }

        function updateGraph(data) {
            if (!data || !data.nodes) return;
            const svg = d3.select('#graph svg g');
            svg.selectAll('*').remove();
            const link = svg.append('g').selectAll('line').data(data.edges || []).enter().append('line').attr('class', d => 'link link-' + d.type).attr('stroke-width', d => Math.sqrt(d.weight || 1));
            const node = svg.append('g').selectAll('g').data(data.nodes || []).enter().append('g').attr('class', 'node').call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));
            function getNodeRadius(d) { const baseRadius = d.type === 'module' ? 12 : 8; const trustBonus = (d.trustScore || 0.5) * 10; return baseRadius + trustBonus; }
            function getTrustClass(trustScore) { if (trustScore === null || trustScore === undefined) return ''; if (trustScore >= 0.7) return 'trust-high'; if (trustScore >= 0.4) return 'trust-medium'; return 'trust-low'; }
            function getRiskClass(riskGrade) { if (!riskGrade) return ''; return 'risk-' + riskGrade; }
            node.filter(d => d.riskGrade).append('circle').attr('r', d => getNodeRadius(d) + 3).attr('fill', 'none').attr('class', d => 'risk-' + d.riskGrade + '-stroke');
            node.append('circle').attr('r', d => getNodeRadius(d)).attr('class', d => {
                const classes = ['node-circle']; classes.push('state-' + (d.state || 'idle')); if (d.riskGrade) classes.push(getRiskClass(d.riskGrade)); classes.push(getTrustClass(d.trustScore)); return classes.join(' ');
            });
            node.append('text').attr('class', 'node-label').attr('dx', 15).attr('dy', 4).text(d => d.label.split('/').pop());
            node.on('click', (event, d) => { vscode.postMessage({ command: 'nodeClick', nodeId: d.id }); })
                .on('mouseover', (event, d) => {
                    const tooltip = document.getElementById('tooltip');
                    const trustLabel = d.trustScore ? (d.trustScore * 100).toFixed(0) + '%' : 'N/A';
                    tooltip.innerHTML = '<strong>' + d.label + '</strong><br>Type: ' + d.type + '<br>State: ' + (d.state || 'idle') + '<br>Risk: ' + (d.riskGrade || 'N/A') + '<br>Trust: ' + trustLabel;
                    tooltip.style.display = 'block';
                    tooltip.style.left = event.pageX + 10 + 'px';
                    tooltip.style.top = event.pageY + 10 + 'px';
                })
                .on('mouseout', () => { document.getElementById('tooltip').style.display = 'none'; });
            simulation.nodes(data.nodes || []);
            simulation.force('link').links(data.edges || []);
            simulation.alpha(1).restart();
            simulation.on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
            });
            const stats = document.getElementById('stats');
            stats.innerHTML = 'Nodes: ' + (data.metadata?.nodeCount || 0) + ' | Edges: ' + (data.metadata?.edgeCount || 0) + ' | L1: ' + (data.metadata?.riskSummary?.L1 || 0) + ' | L2: ' + (data.metadata?.riskSummary?.L2 || 0) + ' | L3: ' + (data.metadata?.riskSummary?.L3 || 0);
        }
        function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
        function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
        function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
        window.addEventListener('message', event => { const message = event.data; if (message.type === 'updateGraph') { graphData = message.data; updateGraph(graphData); } });
        initGraph();
    </script>
</body>
</html>`;

const applyTemplate = (template: string, tokens: Record<string, string>): string => {
    return Object.entries(tokens).reduce((result, [key, value]) => result.split(key).join(value), template);
};

export function renderLivingGraphTemplate(model: LivingGraphViewModel): string {
    const tokens = {
        '{{NONCE}}': model.nonce,
        '{{TOOLTIP_STYLES}}': TOOLTIP_STYLES,
        '{{RISK_TOOLTIP}}': tooltipAttrs(HELP_TEXT.riskGrade),
        '{{TRUST_TOOLTIP}}': tooltipAttrs(HELP_TEXT.trustScore),
        '{{GRAPH_DATA_JSON}}': model.graphDataJson
    };
    return applyTemplate(LIVING_GRAPH_TEMPLATE, tokens);
}
