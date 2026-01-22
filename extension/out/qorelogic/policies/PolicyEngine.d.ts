/**
 * PolicyEngine - Governance Policy Management
 *
 * Manages:
 * - Risk grading policies
 * - Citation policies
 * - Trust dynamics rules
 * - Operational modes
 */
import * as vscode from 'vscode';
import { RiskGrade, OperationalMode } from '../../shared/types';
export declare class PolicyEngine {
    private context;
    private riskPolicy;
    private citationPolicy;
    private operationalMode;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load policies from workspace configuration
     */
    loadPolicies(): Promise<void>;
    /**
     * Classify risk grade for a file
     */
    classifyRisk(filePath: string, content?: string): RiskGrade;
    /**
     * Get verification requirements for a risk grade
     */
    getVerificationRequirements(riskGrade: RiskGrade): {
        minCertainty: string;
        verification: string;
        autoApprove: boolean;
        approvalAuthority: string;
    };
    /**
     * Calculate Source Credibility Index for a reference
     */
    calculateSCI(sources: string[]): number;
    /**
     * Classify a source into a tier
     */
    private classifySourceTier;
    /**
     * Get current operational mode
     */
    getOperationalMode(): OperationalMode;
    /**
     * Set operational mode
     */
    setOperationalMode(mode: OperationalMode): void;
    /**
     * Get verification rate based on operational mode and risk grade
     */
    getVerificationRate(riskGrade: RiskGrade): number;
    /**
     * Default risk grading policy
     */
    private getDefaultRiskPolicy;
    /**
     * Default citation policy
     */
    private getDefaultCitationPolicy;
}
//# sourceMappingURL=PolicyEngine.d.ts.map