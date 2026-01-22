/**
 * LivingGraphProvider - Living Graph Sidebar/Panel View
 *
 * D3.js force-directed visualization of:
 * - File dependencies
 * - Module boundaries
 * - Risk indicators
 * - Verification status
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { LivingGraphData } from '../../shared/types';

export class LivingGraphProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private extensionUri: vscode.Uri;
    private eventBus: EventBus;
    private graphData: LivingGraphData | undefined;

    constructor(
        extensionUri: vscode.Uri,
        initialData: LivingGraphData | undefined,
        eventBus: EventBus
    ) {
        this.extensionUri = extensionUri;
        this.graphData = initialData;
        this.eventBus = eventBus;

        // Subscribe to graph updates
        this.eventBus.on('genesis.graphUpdate', (event) => {
            this.graphData = event.payload as LivingGraphData;
            this.refresh();
        });
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlContent();

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'nodeClick':
                    this.handleNodeClick(message.nodeId);
                    break;
                case 'auditNode':
                    vscode.commands.executeCommand('failsafe.auditFile');
                    break;
                case 'openFile':
                    vscode.workspace.openTextDocument(message.file).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                    break;
            }
        });
    }

    private refresh(): void {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'updateGraph',
                data: this.graphData
            });
        }
    }

    private handleNodeClick(nodeId: string): void {
        // Open file in editor
        Promise.resolve(vscode.workspace.openTextDocument(nodeId)).then(doc => {
            vscode.window.showTextDocument(doc);
        }).catch(() => {
            // Node might be a module or concept, not a file
        });
    }

    private getHtmlContent(): string {
        const graphDataJson = JSON.stringify(this.graphData || { nodes: [], edges: [], metadata: {} });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Living Graph</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #graph {
            width: 100%;
            height: 100vh;
        }
        .node {
            cursor: pointer;
        }
        /* Node type base colors */
        .node-file { fill: #4a5568; }
        .node-module { fill: #2d3748; }
        .node-external { fill: #718096; }
        .node-concept { fill: #9f7aea; }

        /* State colors (operational) */
        .state-idle { fill: #4a5568; }
        .state-indexing { fill: #ecc94b; }
        .state-verified { fill: #48bb78; }
        .state-warning { fill: #ed8936; }
        .state-blocked { fill: #f56565; }
        .state-l3-pending { fill: #9f7aea; }

        /* Risk grade colors (L1=safe, L2=moderate, L3=critical) */
        .risk-L1 { fill: #48bb78; } /* Green - Safe */
        .risk-L2 { fill: #ecc94b; } /* Yellow - Moderate */
        .risk-L3 { fill: #f56565; } /* Red - Critical */
        .risk-L1-stroke { stroke: #48bb78; stroke-width: 2; }
        .risk-L2-stroke { stroke: #ecc94b; stroke-width: 2; }
        .risk-L3-stroke { stroke: #f56565; stroke-width: 3; }

        /* Trust-based visual effects */
        .trust-high { filter: drop-shadow(0 0 4px #48bb78); }
        .trust-medium { filter: drop-shadow(0 0 2px #ecc94b); }
        .trust-low { filter: drop-shadow(0 0 3px #f56565); opacity: 0.8; }

        /* Edge/Link styling */
        .link {
            stroke: #4a5568;
            stroke-opacity: 0.6;
        }
        .link-import { stroke: #63b3ed; stroke-dasharray: none; }
        .link-dependency { stroke: #a0aec0; stroke-dasharray: 5,5; }
        .link-spec { stroke: #9f7aea; stroke-dasharray: 2,2; }
        .link-risk { stroke: #f56565; stroke-width: 2; stroke-dasharray: 3,3; animation: pulse-risk 1.5s infinite; }

        @keyframes pulse-risk {
            0%, 100% { stroke-opacity: 1; }
            50% { stroke-opacity: 0.4; }
        }

        .node-label {
            font-size: 10px;
            fill: var(--vscode-foreground);
            pointer-events: none;
        }
        .tooltip {
            position: absolute;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 4px;
            padding: 8px;
            font-size: 11px;
            pointer-events: none;
            display: none;
            z-index: 1000;
        }
        .stats {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: var(--vscode-editor-background);
            padding: 8px;
            border-radius: 4px;
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div id="graph"></div>
    <div class="tooltip" id="tooltip"></div>
    <div class="stats" id="stats">Loading...</div>

    <script>
        const vscode = acquireVsCodeApi();
        let graphData = ${graphDataJson};
        let simulation;

        function initGraph() {
            const container = document.getElementById('graph');
            const width = container.clientWidth;
            const height = container.clientHeight;

            const svg = d3.select('#graph')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            // Add zoom behavior
            const g = svg.append('g');
            svg.call(d3.zoom()
                .extent([[0, 0], [width, height]])
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => g.attr('transform', event.transform)));

            // Create simulation with trust-aware collision
            simulation = d3.forceSimulation()
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(d => {
                    // Dynamic collision radius based on trust
                    const baseRadius = d.type === 'module' ? 12 : 8;
                    const trustBonus = (d.trustScore || 0.5) * 10;
                    return baseRadius + trustBonus + 8; // Add padding
                }));

            updateGraph(graphData);
        }

        function updateGraph(data) {
            if (!data || !data.nodes) return;

            const svg = d3.select('#graph svg g');
            svg.selectAll('*').remove();

            // Links
            const link = svg.append('g')
                .selectAll('line')
                .data(data.edges || [])
                .enter()
                .append('line')
                .attr('class', d => \`link link-\${d.type}\`)
                .attr('stroke-width', d => Math.sqrt(d.weight || 1));

            // Nodes
            const node = svg.append('g')
                .selectAll('g')
                .data(data.nodes || [])
                .enter()
                .append('g')
                .attr('class', 'node')
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));

            // Helper: Calculate radius based on trust (0.0-1.0 maps to 8-18px)
            function getNodeRadius(d) {
                const baseRadius = d.type === 'module' ? 12 : 8;
                const trustBonus = (d.trustScore || 0.5) * 10; // 0-10px bonus
                return baseRadius + trustBonus;
            }

            // Helper: Get trust class for visual effects
            function getTrustClass(trustScore) {
                if (trustScore === null || trustScore === undefined) return '';
                if (trustScore >= 0.7) return 'trust-high';
                if (trustScore >= 0.4) return 'trust-medium';
                return 'trust-low';
            }

            // Helper: Get risk class
            function getRiskClass(riskGrade) {
                if (!riskGrade) return '';
                return 'risk-' + riskGrade;
            }

            // Risk grade stroke ring (outer ring for L1/L2/L3 indicator)
            node.filter(d => d.riskGrade)
                .append('circle')
                .attr('r', d => getNodeRadius(d) + 3)
                .attr('fill', 'none')
                .attr('class', d => 'risk-' + d.riskGrade + '-stroke');

            // Node circles with trust-based scaling and risk coloring
            node.append('circle')
                .attr('r', d => getNodeRadius(d))
                .attr('class', d => {
                    const classes = ['node-circle'];
                    classes.push('state-' + (d.state || 'idle'));
                    if (d.riskGrade) classes.push(getRiskClass(d.riskGrade));
                    classes.push(getTrustClass(d.trustScore));
                    return classes.join(' ');
                });

            // Node labels
            node.append('text')
                .attr('class', 'node-label')
                .attr('dx', 15)
                .attr('dy', 4)
                .text(d => d.label.split('/').pop());

            // Node interactions
            node.on('click', (event, d) => {
                vscode.postMessage({ command: 'nodeClick', nodeId: d.id });
            })
            .on('mouseover', (event, d) => {
                const tooltip = document.getElementById('tooltip');
                tooltip.innerHTML = \`
                    <strong>\${d.label}</strong><br>
                    Type: \${d.type}<br>
                    State: \${d.state || 'idle'}<br>
                    Risk: \${d.riskGrade || 'N/A'}<br>
                    Trust: \${d.trustScore ? (d.trustScore * 100).toFixed(0) + '%' : 'N/A'}
                \`;
                tooltip.style.display = 'block';
                tooltip.style.left = event.pageX + 10 + 'px';
                tooltip.style.top = event.pageY + 10 + 'px';
            })
            .on('mouseout', () => {
                document.getElementById('tooltip').style.display = 'none';
            });

            // Update simulation
            simulation.nodes(data.nodes || []);
            simulation.force('link').links(data.edges || []);
            simulation.alpha(1).restart();

            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node.attr('transform', d => \`translate(\${d.x},\${d.y})\`);
            });

            // Update stats
            const stats = document.getElementById('stats');
            stats.innerHTML = \`
                Nodes: \${data.metadata?.nodeCount || 0} |
                Edges: \${data.metadata?.edgeCount || 0} |
                L1: \${data.metadata?.riskSummary?.L1 || 0} |
                L2: \${data.metadata?.riskSummary?.L2 || 0} |
                L3: \${data.metadata?.riskSummary?.L3 || 0}
            \`;
        }

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'updateGraph') {
                graphData = message.data;
                updateGraph(graphData);
            }
        });

        // Initialize
        initGraph();
    </script>
</body>
</html>`;
    }
}
