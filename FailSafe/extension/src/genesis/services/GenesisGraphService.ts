import { LivingGraphData, SentinelVerdict } from '../../shared/types';

export function createInitialGraphData(): LivingGraphData {
  return {
    nodes: [],
    edges: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: 0,
      edgeCount: 0,
      riskSummary: { L1: 0, L2: 0, L3: 0 }
    }
  };
}

export function applyVerdictToGraph(
  graphData: LivingGraphData | undefined,
  verdict: SentinelVerdict
): LivingGraphData | undefined {
  if (!graphData || !verdict.artifactPath) {
    return graphData;
  }

  const node = graphData.nodes.find((n) => n.id === verdict.artifactPath);
  if (!node) {
    return graphData;
  }

  node.state = verdict.decision === 'PASS'
    ? 'verified'
    : verdict.decision === 'WARN'
      ? 'warning'
      : verdict.decision === 'ESCALATE'
        ? 'l3-pending'
        : 'blocked';

  node.riskGrade = verdict.riskGrade;
  node.lastVerified = verdict.timestamp;
  return graphData;
}
