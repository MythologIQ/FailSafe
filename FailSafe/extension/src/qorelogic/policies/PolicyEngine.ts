/**
 * PolicyEngine - Governance Policy Management
 *
 * Manages:
 * - Risk grading policies
 * - Citation policies
 * - Trust dynamics rules
 * - Operational modes
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { IConfigProvider } from '../../core/interfaces';
import { RiskGrade, OperationalMode } from '../../shared/types';

interface RiskGradingPolicy {
    filePathTriggers: Record<RiskGrade, string[]>;
    contentTriggers: Record<RiskGrade, string[]>;
    defaults: {
        documentation: RiskGrade;
        functional: RiskGrade;
        security: RiskGrade;
    };
}

interface CitationPolicy {
    referenceTiers: {
        T1: { weight: number; examples: string[] };
        T2: { weight: number; examples: string[] };
        T3: { weight: number; examples: string[] };
        T4: { weight: number; examples: string[] };
    };
    thresholds: {
        goldStandard: number;
        verificationRequired: number;
        humanInLoop: number;
        hardRejection: number;
    };
    transitiveRules: {
        maxHops: number;
        decayPerHop: number;
    };
}

export class PolicyEngine {
    private configProvider: IConfigProvider;
    private riskPolicy: RiskGradingPolicy;
    private citationPolicy: CitationPolicy;
    private operationalMode: OperationalMode = 'normal';

    constructor(configProvider: IConfigProvider) {
        this.configProvider = configProvider;

        // Initialize default policies
        this.riskPolicy = this.getDefaultRiskPolicy();
        this.citationPolicy = this.getDefaultCitationPolicy();
    }

    /**
     * Load policies from workspace configuration
     */
    async loadPolicies(): Promise<void> {
        const workspaceRoot = this.configProvider.getWorkspaceRoot();
        if (!workspaceRoot) {
            return;
        }

        // Try to load custom policies
        const policyDir = path.join(workspaceRoot, '.failsafe', 'config', 'policies');

        const riskPolicyPath = path.join(policyDir, 'risk_grading.json');
        if (fs.existsSync(riskPolicyPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(riskPolicyPath, 'utf-8'));
                this.riskPolicy = { ...this.riskPolicy, ...data };
            } catch (error) {
                console.error('Failed to load risk policy:', error);
            }
        }

        const citationPolicyPath = path.join(policyDir, 'citation_policy.json');
        if (fs.existsSync(citationPolicyPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(citationPolicyPath, 'utf-8'));
                this.citationPolicy = { ...this.citationPolicy, ...data };
            } catch (error) {
                console.error('Failed to load citation policy:', error);
            }
        }
    }

    /**
     * Classify risk grade for a file
     */
    classifyRisk(filePath: string, content?: string): RiskGrade {
        const normalizedPath = filePath.toLowerCase();

        // Check L3 file path triggers
        for (const trigger of this.riskPolicy.filePathTriggers.L3) {
            if (normalizedPath.includes(trigger.toLowerCase())) {
                return 'L3';
            }
        }

        // Check L3 content triggers
        if (content) {
            for (const trigger of this.riskPolicy.contentTriggers.L3) {
                if (content.includes(trigger)) {
                    return 'L3';
                }
            }
        }

        // Check L2 triggers
        for (const trigger of this.riskPolicy.filePathTriggers.L2) {
            if (normalizedPath.includes(trigger.toLowerCase())) {
                return 'L2';
            }
        }

        if (content) {
            for (const trigger of this.riskPolicy.contentTriggers.L2) {
                if (content.includes(trigger)) {
                    return 'L2';
                }
            }
        }

        // Check for documentation/test files (L1)
        if (normalizedPath.endsWith('.md') ||
            normalizedPath.endsWith('.txt') ||
            normalizedPath.includes('test') ||
            normalizedPath.includes('spec')) {
            return 'L1';
        }

        // Default to L2 for code files
        return 'L2';
    }

    /**
     * Get verification requirements for a risk grade
     */
    getVerificationRequirements(riskGrade: RiskGrade): {
        minCertainty: string;
        verification: string;
        autoApprove: boolean;
        approvalAuthority: string;
    } {
        switch (riskGrade) {
            case 'L1':
                return {
                    minCertainty: 'heuristic',
                    verification: 'sampling_10_percent',
                    autoApprove: true,
                    approvalAuthority: 'sentinel'
                };
            case 'L2':
                return {
                    minCertainty: 'constrained',
                    verification: 'full_sentinel_pass',
                    autoApprove: false,
                    approvalAuthority: 'sentinel'
                };
            case 'L3':
                return {
                    minCertainty: 'verified',
                    verification: 'formal_plus_human',
                    autoApprove: false,
                    approvalAuthority: 'overseer'
                };
        }
    }

    /**
     * Calculate Source Credibility Index for a reference
     */
    calculateSCI(sources: string[]): number {
        if (sources.length === 0) {
            return this.citationPolicy.thresholds.hardRejection;
        }

        let totalWeight = 0;
        let count = 0;

        for (const source of sources) {
            const tier = this.classifySourceTier(source);
            const tierConfig = this.citationPolicy.referenceTiers[tier];
            totalWeight += tierConfig.weight;
            count++;
        }

        return count > 0 ? totalWeight / count : 0;
    }

    /**
     * Classify a source into a tier
     */
    private classifySourceTier(source: string): 'T1' | 'T2' | 'T3' | 'T4' {
        const lowerSource = source.toLowerCase();

        // T1: Authoritative
        if (lowerSource.includes('rfc') ||
            lowerSource.includes('ieee') ||
            lowerSource.includes('iso') ||
            lowerSource.includes('arxiv')) {
            return 'T1';
        }

        // T2: Reviewed Standards
        if (lowerSource.includes('owasp') ||
            lowerSource.includes('docs.') ||
            lowerSource.includes('documentation')) {
            return 'T2';
        }

        // T3: Reputable Reporting
        if (lowerSource.includes('blog') ||
            lowerSource.includes('medium') ||
            lowerSource.includes('dev.to')) {
            return 'T3';
        }

        // T4: Community/Generative (default)
        return 'T4';
    }

    /**
     * Get current operational mode
     */
    getOperationalMode(): OperationalMode {
        return this.operationalMode;
    }

    /**
     * Set operational mode
     */
    setOperationalMode(mode: OperationalMode): void {
        this.operationalMode = mode;
    }

    /**
     * Gap 4: Get a hash of the current policy configuration for replay fidelity
     */
    getPolicyHash(): string {
        const policyJson = JSON.stringify({
            risk: this.riskPolicy,
            citation: this.citationPolicy,
        });
        return crypto.createHash('sha256').update(policyJson).digest('hex').substring(0, 16);
    }

    /**
     * Get verification rate based on operational mode and risk grade
     */
    getVerificationRate(riskGrade: RiskGrade): number {
        switch (this.operationalMode) {
            case 'normal':
                return 1.0; // 100%

            case 'lean':
                switch (riskGrade) {
                    case 'L1': return 0.1; // 10% sampling
                    case 'L2': return 1.0;
                    case 'L3': return 1.0;
                }
                break;

            case 'surge':
                switch (riskGrade) {
                    case 'L1': return 0; // Deferred
                    case 'L2': return 1.0;
                    case 'L3': return 1.0;
                }
                break;

            case 'safe':
                // Only L3 with human approval
                return riskGrade === 'L3' ? 1.0 : 0;
        }

        return 1.0;
    }

    /**
     * Default risk grading policy
     */
    private getDefaultRiskPolicy(): RiskGradingPolicy {
        return {
            filePathTriggers: {
                L1: ['readme', 'changelog', 'license', '.md', '.txt'],
                L2: ['component', 'util', 'helper', 'service'],
                L3: ['auth', 'login', 'password', 'payment', 'billing', 'encrypt', 'crypto', 'migration', 'admin', 'secret', 'credential', 'token']
            },
            contentTriggers: {
                L1: [],
                L2: ['function', 'class', 'interface'],
                L3: ['CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'authenticate', 'bcrypt', 'AES', 'RSA', 'private_key', 'api_key', 'password', 'credential', 'secret']
            },
            defaults: {
                documentation: 'L1',
                functional: 'L2',
                security: 'L3'
            }
        };
    }

    /**
     * Default citation policy
     */
    private getDefaultCitationPolicy(): CitationPolicy {
        return {
            referenceTiers: {
                T1: {
                    weight: 100,
                    examples: ['RFC', 'IEEE', 'ISO', 'Peer-reviewed publications']
                },
                T2: {
                    weight: 90,
                    examples: ['OWASP', 'Official documentation', 'Major textbooks']
                },
                T3: {
                    weight: 70,
                    examples: ['Tech publications', 'Conference proceedings']
                },
                T4: {
                    weight: 45,
                    examples: ['Stack Overflow', 'GitHub discussions', 'LLM output']
                }
            },
            thresholds: {
                goldStandard: 90,
                verificationRequired: 60,
                humanInLoop: 40,
                hardRejection: 35
            },
            transitiveRules: {
                maxHops: 2,
                decayPerHop: 15
            }
        };
    }
}
