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
        vscode.workspace.openTextDocument(nodeId).then(doc => {
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
        .node-file { fill: #4a5568; }
        .node-module { fill: #2d3748; }
        .node-external { fill: #718096; }
        .node-concept { fill: #9f7aea; }

        .state-idle { fill: #4a5568; }
        .state-indexing { fill: #ecc94b; }
        .state-verified { fill: #48bb78; }
        .state-warning { fill: #ed8936; }
        .state-blocked { fill: #f56565; }
        .state-l3-pending { fill: #9f7aea; }

        .link {
            stroke: #4a5568;
            stroke-opacity: 0.6;
        }
        .link-import { stroke-dasharray: none; }
        .link-dependency { stroke-dasharray: 5,5; }
        .link-spec { stroke-dasharray: 2,2; }
        .link-risk { stroke: #f56565; stroke-width: 2; }

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

            // Create simulation
            simulation = d3.forceSimulation()
                .force('link', d3.forceLink().id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-200))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(30));

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

            // Node circles
            node.append('circle')
                .attr('r', d => d.type === 'module' ? 15 : 10)
                .attr('class', d => \`node-\${d.type} state-\${d.state || 'idle'}\`);

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
