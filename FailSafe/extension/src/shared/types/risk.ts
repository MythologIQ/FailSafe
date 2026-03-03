/**
 * Risk Grading Types
 *
 * Risk classification and grading for governance decisions.
 */

export type RiskGrade = "L1" | "L2" | "L3";

export interface RiskClassification {
  grade: RiskGrade;
  confidence: number;
  triggers: string[];
  reasoning: string;
}
