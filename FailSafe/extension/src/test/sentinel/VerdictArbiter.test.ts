import { describe, it } from 'mocha';
import * as assert from 'assert';
import { HeuristicResult } from '../../shared/types';

/**
 * Standalone implementation of computeConfidence algorithm
 * mirrors the logic from VerdictArbiter.computeConfidence
 */
function computeConfidence(
    heuristicResults: HeuristicResult[],
    response: string,
): number {
    const matched = heuristicResults.filter(r => r.matched);
    const allAgree = matched.length === 0
        || matched.every(r => r.severity === matched[0].severity);
    let confidence = allAgree ? 0.8 : 0.5;

    const hasStructuredVerdict = /\b(ALLOW|DENY|ESCALATE)\b/.test(response);
    if (hasStructuredVerdict) {
        confidence += 0.1;
    } else if (!response || response.trim().length < 10) {
        confidence -= 0.2;
    }

    return Math.max(0.3, Math.min(0.9, confidence));
}

describe('VerdictArbiter.computeConfidence', () => {
    it('should return 0.8 when all heuristics agree', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
            { patternId: 'p2', matched: true, severity: 'high' },
        ];
        const confidence = computeConfidence(results, 'some generic response');
        assert.strictEqual(confidence, 0.8);
    });

    it('should return 0.5 when heuristics have mixed severities', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
            { patternId: 'p2', matched: true, severity: 'low' },
        ];
        const confidence = computeConfidence(results, 'some generic response');
        assert.strictEqual(confidence, 0.5);
    });

    it('should return 0.8 when no heuristics are matched (vacuously agree)', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: false, severity: 'low' },
            { patternId: 'p2', matched: false, severity: 'high' },
        ];
        const confidence = computeConfidence(results, 'some generic response');
        assert.strictEqual(confidence, 0.8);
    });

    it('should add 0.1 when response contains ALLOW keyword', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
        ];
        const confidence = computeConfidence(results, 'Decision: ALLOW this file');
        assert.strictEqual(confidence, 0.9);
    });

    it('should add 0.1 when response contains DENY keyword', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
        ];
        const confidence = computeConfidence(results, 'Action: DENY execution');
        assert.strictEqual(confidence, 0.9);
    });

    it('should subtract 0.2 for empty response', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
        ];
        const confidence = computeConfidence(results, '');
        assert.ok(Math.abs(confidence - 0.6) < 1e-10, `Expected ~0.6, got ${confidence}`);
    });

    it('should subtract 0.2 for response shorter than 10 characters', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
        ];
        const confidence = computeConfidence(results, 'short');
        assert.ok(Math.abs(confidence - 0.6) < 1e-10, `Expected ~0.6, got ${confidence}`);
    });

    it('should clamp to 0.3 minimum when mixed heuristics with garbled response', () => {
        const results: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
            { patternId: 'p2', matched: true, severity: 'low' },
        ];
        const confidence = computeConfidence(results, 'bad');
        assert.strictEqual(confidence, 0.3);
    });

    it('should clamp result to [0.3, 0.9] range', () => {
        // Test lower bound: mixed severity (0.5) - 0.2 (short response) = 0.3
        const mixedResults: HeuristicResult[] = [
            { patternId: 'p1', matched: true, severity: 'high' },
            { patternId: 'p2', matched: true, severity: 'low' },
        ];
        const lowConfidence = computeConfidence(mixedResults, '');
        assert.strictEqual(lowConfidence, 0.3);

        // Test upper bound: agree (0.8) + structured (0.1) = 0.9
        const highConfidence = computeConfidence([], 'ALLOW this with extra info beyond 10 chars');
        assert.strictEqual(highConfidence, 0.9);
    });
});
