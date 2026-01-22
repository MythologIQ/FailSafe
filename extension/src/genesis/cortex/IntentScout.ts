/**
 * IntentScout - NLP Intent Detection for Cortex Omnibar
 *
 * Analyzes natural language queries and maps them to actions
 */

import { CortexIntent, RiskGrade } from '../../shared/types';

interface IntentPattern {
    intent: string;
    keywords: string[];
    patterns: RegExp[];
}

export class IntentScout {
    private intentPatterns: IntentPattern[] = [
        {
            intent: 'audit_file',
            keywords: ['audit', 'check', 'scan', 'verify', 'validate'],
            patterns: [
                /audit\s+(.+)/i,
                /check\s+(.+)/i,
                /scan\s+(.+)/i,
                /verify\s+(.+)/i
            ]
        },
        {
            intent: 'show_graph',
            keywords: ['graph', 'dependencies', 'visualize', 'show graph', 'living graph'],
            patterns: [
                /show\s+(the\s+)?graph/i,
                /visualize/i,
                /dependencies/i,
                /living\s*graph/i
            ]
        },
        {
            intent: 'show_ledger',
            keywords: ['ledger', 'audit trail', 'history', 'log'],
            patterns: [
                /show\s+(the\s+)?ledger/i,
                /audit\s*trail/i,
                /view\s+history/i
            ]
        },
        {
            intent: 'find_risks',
            keywords: ['risk', 'l1', 'l2', 'l3', 'critical', 'find'],
            patterns: [
                /find\s+(l[123]|critical|risk)/i,
                /show\s+(l[123]|critical)\s*(files)?/i,
                /filter\s+by\s+risk/i
            ]
        },
        {
            intent: 'trust_status',
            keywords: ['trust', 'reputation', 'agent', 'score'],
            patterns: [
                /trust\s*(status|score)?/i,
                /agent\s+trust/i,
                /reputation/i
            ]
        },
        {
            intent: 'explain',
            keywords: ['explain', 'why', 'blocked', 'failed', 'failure'],
            patterns: [
                /explain/i,
                /why\s+(was\s+it\s+)?blocked/i,
                /why\s+failed/i,
                /what\s+happened/i
            ]
        },
        {
            intent: 'approve',
            keywords: ['approve', 'accept', 'l3', 'queue', 'pending'],
            patterns: [
                /approve/i,
                /accept\s+l3/i,
                /review\s+(the\s+)?queue/i,
                /pending\s+approvals/i
            ]
        },
        {
            intent: 'help',
            keywords: ['help', 'commands', 'what can'],
            patterns: [
                /help/i,
                /commands/i,
                /what\s+can\s+(you|i)\s+do/i
            ]
        }
    ];

    /**
     * Analyze a query and return detected intent
     */
    analyze(query: string): CortexIntent {
        const normalizedQuery = query.toLowerCase().trim();

        let bestMatch: { intent: string; confidence: number } = {
            intent: 'unknown',
            confidence: 0
        };

        for (const pattern of this.intentPatterns) {
            const confidence = this.calculateConfidence(normalizedQuery, pattern);
            if (confidence > bestMatch.confidence) {
                bestMatch = { intent: pattern.intent, confidence };
            }
        }

        // Extract entities
        const entities = this.extractEntities(normalizedQuery);

        return {
            intent: bestMatch.intent,
            confidence: bestMatch.confidence,
            entities,
            rawQuery: query
        };
    }

    /**
     * Calculate confidence score for a pattern match
     */
    private calculateConfidence(query: string, pattern: IntentPattern): number {
        let score = 0;

        // Check keyword matches
        for (const keyword of pattern.keywords) {
            if (query.includes(keyword)) {
                score += 0.3;
            }
        }

        // Check regex pattern matches
        for (const regex of pattern.patterns) {
            if (regex.test(query)) {
                score += 0.5;
            }
        }

        return Math.min(score, 1.0);
    }

    /**
     * Extract entities from query
     */
    private extractEntities(query: string): CortexIntent['entities'] {
        const entities: CortexIntent['entities'] = {};

        // Extract file paths
        const fileMatch = query.match(/(?:audit|check|scan|verify)\s+([^\s]+\.[a-z]+)/i);
        if (fileMatch) {
            entities.file = fileMatch[1];
        }

        // Extract risk grade
        const riskMatch = query.match(/l([123])/i);
        if (riskMatch) {
            entities.riskGrade = `L${riskMatch[1]}` as RiskGrade;
        }

        // Extract agent references
        const agentMatch = query.match(/agent\s+([^\s]+)/i);
        if (agentMatch) {
            entities.agent = agentMatch[1];
        }

        return entities;
    }
}
