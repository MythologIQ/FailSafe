import { describe, it } from "mocha";
import { strict as assert } from "assert";
import {
    TRUST_CONFIG, determineStage,
    isProbationary, calculateInfluenceWeight,
} from '../../qorelogic/trust/TrustCalculator';
import type { AgentIdentity } from '../../shared/types';

function makeAgent(overrides: Partial<AgentIdentity> = {}): AgentIdentity {
    return {
        did: 'did:myth:test:abc',
        persona: 'scrivener',
        publicKey: 'pk-test',
        trustScore: 0.5,
        trustStage: 'KBT',
        isQuarantined: false,
        verificationsCompleted: 3,
        createdAt: new Date().toISOString(),
        version: 1,
        ...overrides,
    };
}

describe('TrustCalculator', () => {
    describe('determineStage', () => {
        it('returns CBT for scores below 0.5', () => {
            assert.equal(determineStage(0.0, TRUST_CONFIG), 'CBT');
            assert.equal(determineStage(0.35, TRUST_CONFIG), 'CBT');
            assert.equal(determineStage(0.49, TRUST_CONFIG), 'CBT');
        });

        it('returns KBT for scores 0.5 to 0.79', () => {
            assert.equal(determineStage(0.5, TRUST_CONFIG), 'KBT');
            assert.equal(determineStage(0.65, TRUST_CONFIG), 'KBT');
            assert.equal(determineStage(0.79, TRUST_CONFIG), 'KBT');
        });

        it('returns IBT for scores 0.8 and above', () => {
            assert.equal(determineStage(0.8, TRUST_CONFIG), 'IBT');
            assert.equal(determineStage(1.0, TRUST_CONFIG), 'IBT');
        });
    });

    describe('isProbationary', () => {
        it('returns true for recently created agents', () => {
            const agent = makeAgent({ createdAt: new Date().toISOString() });
            assert.equal(isProbationary(agent, TRUST_CONFIG), true);
        });

        it('returns false for agents older than probation period', () => {
            const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
            const agent = makeAgent({ createdAt: old.toISOString() });
            assert.equal(isProbationary(agent, TRUST_CONFIG), false);
        });
    });

    describe('calculateInfluenceWeight', () => {
        it('caps probationary agents at 1.2', () => {
            const agent = makeAgent({
                trustScore: 0.9,
                createdAt: new Date().toISOString(),
            });
            assert.ok(calculateInfluenceWeight(agent, TRUST_CONFIG) <= 1.2);
        });

        it('floors quarantined agents at 0.1', () => {
            const agent = makeAgent({ isQuarantined: true, trustScore: 0.9 });
            assert.equal(calculateInfluenceWeight(agent, TRUST_CONFIG), 0.1);
        });

        it('returns weight in valid range [0.1, 2.0]', () => {
            const agent = makeAgent({ trustScore: 0.7 });
            const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            agent.createdAt = old.toISOString();
            const weight = calculateInfluenceWeight(agent, TRUST_CONFIG);
            assert.ok(weight >= 0.1);
            assert.ok(weight <= 2.0);
        });
    });
});
