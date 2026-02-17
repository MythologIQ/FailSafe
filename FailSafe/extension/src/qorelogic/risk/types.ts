/**
 * Risk Register Types
 *
 * Data model for project-level risk tracking.
 */

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'mitigating' | 'resolved' | 'accepted';
export type RiskCategory = 
  | 'security'
  | 'performance'
  | 'technical-debt'
  | 'dependency'
  | 'governance'
  | 'compliance'
  | 'operational';

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  severity: RiskSeverity;
  status: RiskStatus;
  impact: string;
  mitigation: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  relatedArtifacts?: string[];
  checkpointId?: string;
}

export interface RiskRegister {
  projectId: string;
  projectName: string;
  risks: Risk[];
  lastUpdated: string;
}

export interface RiskSummary {
  total: number;
  bySeverity: Record<RiskSeverity, number>;
  byStatus: Record<RiskStatus, number>;
  byCategory: Record<RiskCategory, number>;
  openCritical: number;
  openHigh: number;
}

export function calculateRiskSummary(risks: Risk[]): RiskSummary {
  const summary: RiskSummary = {
    total: risks.length,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    byStatus: { open: 0, mitigating: 0, resolved: 0, accepted: 0 },
    byCategory: {
      security: 0,
      performance: 0,
      'technical-debt': 0,
      dependency: 0,
      governance: 0,
      compliance: 0,
      operational: 0,
    },
    openCritical: 0,
    openHigh: 0,
  };

  for (const risk of risks) {
    summary.bySeverity[risk.severity]++;
    summary.byStatus[risk.status]++;
    summary.byCategory[risk.category]++;
    
    if (risk.status === 'open') {
      if (risk.severity === 'critical') summary.openCritical++;
      if (risk.severity === 'high') summary.openHigh++;
    }
  }

  return summary;
}
