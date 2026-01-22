"use strict";
/**
 * VerdictEngine - Verdict Generation & Action Dispatch
 *
 * Combines heuristic results and LLM evaluation to produce
 * final verdicts and trigger appropriate actions.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerdictEngine = void 0;
const crypto = __importStar(require("crypto"));
class VerdictEngine {
    trustEngine;
    policyEngine;
    ledgerManager;
    shadowGenomeManager;
    constructor(trustEngine, policyEngine, ledgerManager, shadowGenomeManager) {
        this.trustEngine = trustEngine;
        this.policyEngine = policyEngine;
        this.ledgerManager = ledgerManager;
        this.shadowGenomeManager = shadowGenomeManager;
    }
    /**
     * Generate a verdict from analysis results
     */
    async generateVerdict(event, filePath, heuristicResults, llmEvaluation) {
        // Determine risk grade
        const riskGrade = this.policyEngine.classifyRisk(filePath);
        // Calculate confidence
        const confidence = this.calculateConfidence(heuristicResults, llmEvaluation);
        // Get matched patterns
        const matchedPatterns = heuristicResults
            .filter(r => r.matched)
            .map(r => r.patternId);
        // Determine decision
        const decision = this.determineDecision(riskGrade, heuristicResults, llmEvaluation, confidence);
        // Generate summary
        const summary = this.generateSummary(decision, matchedPatterns, riskGrade);
        // Generate details
        const details = this.generateDetails(heuristicResults, llmEvaluation);
        // Get agent info (default to system agent for file watcher events)
        const agentDid = event.payload.agentDid || 'did:myth:system:watcher';
        const trustScore = this.trustEngine.getTrustScore(agentDid);
        // Create verdict
        const verdict = {
            id: crypto.randomUUID(),
            eventId: event.id,
            timestamp: new Date().toISOString(),
            decision,
            riskGrade,
            confidence,
            heuristicResults,
            llmEvaluation,
            agentDid,
            agentTrustAtVerdict: trustScore?.score || 0.35,
            artifactPath: filePath,
            summary,
            details,
            matchedPatterns,
            actions: []
        };
        // Execute actions
        verdict.actions = await this.executeActions(verdict);
        return verdict;
    }
    /**
     * Calculate overall confidence
     */
    calculateConfidence(heuristicResults, llmEvaluation) {
        // Base confidence from heuristic consistency
        const matchedCount = heuristicResults.filter(r => r.matched).length;
        const totalCount = heuristicResults.length;
        const heuristicConfidence = totalCount > 0 ? 1 - (matchedCount / totalCount) * 0.3 : 0.8;
        // Incorporate LLM confidence if available
        if (llmEvaluation) {
            return (heuristicConfidence * 0.6) + (llmEvaluation.confidence * 0.4);
        }
        return heuristicConfidence;
    }
    /**
     * Determine the final decision
     */
    determineDecision(riskGrade, heuristicResults, llmEvaluation, confidence) {
        const criticalMatches = heuristicResults.filter(r => r.matched && r.severity === 'critical');
        const highMatches = heuristicResults.filter(r => r.matched && r.severity === 'high');
        const mediumMatches = heuristicResults.filter(r => r.matched && r.severity === 'medium');
        // Critical issues always block
        if (criticalMatches.length > 0) {
            // L3 requires human approval for critical
            if (riskGrade === 'L3') {
                return 'ESCALATE';
            }
            return 'BLOCK';
        }
        // L3 always escalates for human review
        if (riskGrade === 'L3') {
            return 'ESCALATE';
        }
        // High issues block or warn based on risk grade
        if (highMatches.length > 0) {
            if (riskGrade === 'L2') {
                return 'BLOCK';
            }
            return 'WARN';
        }
        // Medium issues warn
        if (mediumMatches.length > 0) {
            return 'WARN';
        }
        // Low confidence might need review
        if (confidence && confidence < 0.5) {
            return 'WARN';
        }
        return 'PASS';
    }
    /**
     * Generate a human-readable summary
     */
    generateSummary(decision, matchedPatterns, riskGrade) {
        switch (decision) {
            case 'PASS':
                return `File passed verification (${riskGrade})`;
            case 'WARN':
                return `${matchedPatterns.length} issue(s) detected - review recommended`;
            case 'BLOCK':
                return `Blocked: ${matchedPatterns.length} critical/high issue(s) found`;
            case 'ESCALATE':
                return `${riskGrade} file requires human approval`;
            case 'QUARANTINE':
                return `Agent quarantined due to repeated violations`;
        }
    }
    /**
     * Generate detailed explanation
     */
    generateDetails(heuristicResults, llmEvaluation) {
        const lines = [];
        // Heuristic findings
        const matched = heuristicResults.filter(r => r.matched);
        if (matched.length > 0) {
            lines.push('Heuristic Findings:');
            for (const result of matched) {
                let line = `  - ${result.patternId} (${result.severity})`;
                if (result.location) {
                    line += ` at line ${result.location.line}`;
                }
                lines.push(line);
            }
        }
        // LLM evaluation
        if (llmEvaluation) {
            lines.push('');
            lines.push('LLM Analysis:');
            lines.push(`  Model: ${llmEvaluation.model}`);
            lines.push(`  Confidence: ${(llmEvaluation.confidence * 100).toFixed(0)}%`);
            if (llmEvaluation.response) {
                lines.push(`  Summary: ${llmEvaluation.response.substring(0, 200)}...`);
            }
        }
        return lines.join('\n');
    }
    /**
     * Execute actions based on verdict
     */
    async executeActions(verdict) {
        const actions = [];
        // Always log to ledger
        try {
            const entry = await this.ledgerManager.appendEntry({
                eventType: verdict.decision === 'PASS' ? 'AUDIT_PASS' : 'AUDIT_FAIL',
                agentDid: verdict.agentDid,
                agentTrustAtAction: verdict.agentTrustAtVerdict,
                artifactPath: verdict.artifactPath,
                riskGrade: verdict.riskGrade,
                verificationMethod: 'sentinel_heuristic',
                verificationResult: verdict.decision,
                sentinelConfidence: verdict.confidence,
                payload: {
                    matchedPatterns: verdict.matchedPatterns,
                    summary: verdict.summary
                }
            });
            actions.push({
                type: 'LOG',
                status: 'completed',
                details: `Logged to ledger entry #${entry.id}`
            });
            verdict.ledgerEntryId = entry.id;
        }
        catch (error) {
            actions.push({
                type: 'LOG',
                status: 'failed',
                details: `Failed to log: ${error}`
            });
        }
        // Update trust if not a system agent
        if (!verdict.agentDid.includes(':system:')) {
            try {
                const outcome = verdict.decision === 'PASS' ? 'success' :
                    verdict.decision === 'QUARANTINE' ? 'violation' : 'failure';
                await this.trustEngine.updateTrust(verdict.agentDid, outcome);
                actions.push({
                    type: 'TRUST_UPDATE',
                    status: 'completed',
                    details: `Trust updated for ${verdict.agentDid}`
                });
            }
            catch (error) {
                actions.push({
                    type: 'TRUST_UPDATE',
                    status: 'failed',
                    details: `Failed to update trust: ${error}`
                });
            }
        }
        // Archive to Shadow Genome for non-PASS verdicts
        if (verdict.decision !== 'PASS' && this.shadowGenomeManager) {
            try {
                const inputVector = verdict.artifactPath || 'unknown';
                const entry = await this.shadowGenomeManager.archiveFailure({
                    verdict,
                    inputVector,
                    decisionRationale: verdict.summary,
                    causalVector: verdict.details
                });
                actions.push({
                    type: 'SHADOW_ARCHIVE',
                    status: 'completed',
                    details: `Archived to Shadow Genome entry #${entry.id}`
                });
            }
            catch (error) {
                actions.push({
                    type: 'SHADOW_ARCHIVE',
                    status: 'failed',
                    details: `Failed to archive: ${error}`
                });
            }
        }
        // Handle escalation
        if (verdict.decision === 'ESCALATE') {
            actions.push({
                type: 'L3_QUEUE',
                status: 'pending',
                details: 'Queued for L3 approval'
            });
        }
        // Handle quarantine
        if (verdict.decision === 'QUARANTINE') {
            try {
                await this.trustEngine.quarantineAgent(verdict.agentDid, verdict.summary, 48);
                actions.push({
                    type: 'QUARANTINE',
                    status: 'completed',
                    details: 'Agent quarantined for 48 hours'
                });
            }
            catch (error) {
                actions.push({
                    type: 'QUARANTINE',
                    status: 'failed',
                    details: `Failed to quarantine: ${error}`
                });
            }
        }
        return actions;
    }
}
exports.VerdictEngine = VerdictEngine;
//# sourceMappingURL=VerdictEngine.js.map