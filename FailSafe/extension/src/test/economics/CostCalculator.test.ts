import { describe, it } from 'mocha';
import * as assert from 'assert';
import {
    calculateCost,
    calculateSavings,
    formatCurrency,
} from '../../economics/CostCalculator';

describe('CostCalculator', () => {
    describe('calculateCost', () => {
        it('calculates input cost for a known model (claude-sonnet)', () => {
            // claude-sonnet: $3 per million input tokens
            const cost = calculateCost(1_000_000, 'claude-sonnet', 'input');
            assert.strictEqual(cost, 3);
        });

        it('calculates output cost for a known model (claude-sonnet)', () => {
            // claude-sonnet: $15 per million output tokens
            const cost = calculateCost(1_000_000, 'claude-sonnet', 'output');
            assert.strictEqual(cost, 15);
        });

        it('uses default pricing for an unknown model', () => {
            // default: $3 per million input, $15 per million output
            const inputCost = calculateCost(2_000_000, 'unknown-model-xyz', 'input');
            assert.strictEqual(inputCost, 6);

            const outputCost = calculateCost(500_000, 'unknown-model-xyz', 'output');
            assert.strictEqual(outputCost, 7.5);
        });

        it('returns 0 for zero tokens', () => {
            assert.strictEqual(calculateCost(0, 'claude-sonnet', 'input'), 0);
            assert.strictEqual(calculateCost(0, 'claude-sonnet', 'output'), 0);
        });

        it('handles fractional token counts correctly', () => {
            // 500 tokens at $3/MTok = 0.0015
            const cost = calculateCost(500, 'claude-sonnet', 'input');
            assert.strictEqual(cost, 0.0015);
        });
    });

    describe('calculateSavings', () => {
        it('calculates savings when full > rag', () => {
            // delta = 8000 - 2000 = 6000 tokens saved
            // claude-sonnet input: $3/MTok => 6000/1M * 3 = 0.018
            const savings = calculateSavings(8000, 2000, 'claude-sonnet');
            assert.ok(Math.abs(savings - 0.018) < 1e-10, `Expected ~0.018, got ${savings}`);
        });

        it('returns 0 when rag >= full (zero delta)', () => {
            const savings = calculateSavings(5000, 5000, 'claude-sonnet');
            assert.strictEqual(savings, 0);
        });

        it('returns 0 when rag > full (negative delta)', () => {
            const savings = calculateSavings(3000, 5000, 'claude-sonnet');
            assert.strictEqual(savings, 0);
        });

        it('uses model-specific pricing for savings', () => {
            // claude-haiku input: $0.25/MTok
            // delta = 10000 - 2000 = 8000 => 8000/1M * 0.25 = 0.002
            const savings = calculateSavings(10000, 2000, 'claude-haiku');
            assert.strictEqual(savings, 0.002);
        });
    });

    describe('formatCurrency', () => {
        it('formats to 2 decimal places with dollar sign', () => {
            assert.strictEqual(formatCurrency(3.5), '$3.50');
        });

        it('formats zero', () => {
            assert.strictEqual(formatCurrency(0), '$0.00');
        });

        it('formats small amounts', () => {
            assert.strictEqual(formatCurrency(0.018), '$0.02');
        });

        it('formats large amounts', () => {
            assert.strictEqual(formatCurrency(1234.567), '$1234.57');
        });
    });
});
