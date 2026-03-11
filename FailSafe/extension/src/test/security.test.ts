import * as assert from 'assert';
import { describe, it } from 'mocha';
import {
    deriveDIDHash,
    verifyDIDHash,
    extractPersonaFromDID,
    checkPersonaAssignmentRestriction,
    validateAgentPersona,
    generateKeyPair,
    createSignature,
    verifySignature
} from '../shared/utils/security';
import { PersonaType } from '../shared/types';

describe('Security Utilities', () => {

    describe('extractPersonaFromDID', () => {
        it('should correctly extract scrivener persona', () => {
            const did = 'did:myth:scrivener:abcdef0123456789abcdef0123456789';
            assert.strictEqual(extractPersonaFromDID(did), 'scrivener');
        });

        it('should correctly extract sentinel persona', () => {
            const did = 'did:myth:sentinel:abcdef0123456789abcdef0123456789';
            assert.strictEqual(extractPersonaFromDID(did), 'sentinel');
        });

        it('should correctly extract judge persona', () => {
            const did = 'did:myth:judge:abcdef0123456789abcdef0123456789';
            assert.strictEqual(extractPersonaFromDID(did), 'judge');
        });

        it('should correctly extract overseer persona', () => {
            const did = 'did:myth:overseer:abcdef0123456789abcdef0123456789';
            assert.strictEqual(extractPersonaFromDID(did), 'overseer');
        });

        it('should return null for invalid prefix', () => {
            const did = 'did:invalid:scrivener:abcdef0123456789abcdef0123456789';
            assert.strictEqual(extractPersonaFromDID(did), null);
        });

        it('should return null for unknown persona', () => {
            const did = 'did:myth:unknown:abcdef0123456789abcdef0123456789';
            assert.strictEqual(extractPersonaFromDID(did), null);
        });

        it('should return null for invalid hex hash', () => {
            const did = 'did:myth:scrivener:not-hex-hash';
            assert.strictEqual(extractPersonaFromDID(did), null);
        });

        it('should return null for empty string', () => {
            assert.strictEqual(extractPersonaFromDID(''), null);
        });
    });

    describe('DID Hash Derivation and Verification', () => {
        const publicKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        const persona: PersonaType = 'scrivener';
        const salt = 'mysalt';

        it('should derive a consistent DID hash', () => {
            const result1 = deriveDIDHash(persona, publicKey, salt);
            const result2 = deriveDIDHash(persona, publicKey, salt);
            assert.strictEqual(result1.did, result2.did);
            assert.strictEqual(result1.hash, result2.hash);
            assert.ok(result1.did.startsWith('did:myth:scrivener:'));
        });

        it('should verify a valid DID hash', () => {
            const result = deriveDIDHash(persona, publicKey, salt);
            assert.strictEqual(verifyDIDHash(result.did, persona, publicKey, salt), true);
        });

        it('should fail verification for incorrect persona', () => {
            const result = deriveDIDHash(persona, publicKey, salt);
            assert.strictEqual(verifyDIDHash(result.did, 'sentinel', publicKey, salt), false);
        });

        it('should fail verification for incorrect public key', () => {
            const result = deriveDIDHash(persona, publicKey, salt);
            assert.strictEqual(verifyDIDHash(result.did, persona, 'wrongkey', salt), false);
        });

        it('should fail verification for incorrect salt', () => {
            const result = deriveDIDHash(persona, publicKey, salt);
            assert.strictEqual(verifyDIDHash(result.did, persona, publicKey, 'wrongsalt'), false);
        });
    });

    describe('checkPersonaAssignmentRestriction', () => {
        const validScrivenerDID = 'did:myth:scrivener:abcdef0123456789abcdef0123456789';
        const validSentinelDID = 'did:myth:sentinel:abcdef0123456789abcdef0123456789';
        const validOverseerDID = 'did:myth:overseer:abcdef0123456789abcdef0123456789';

        it('should allow matching persona assignment', () => {
            const result = checkPersonaAssignmentRestriction(validScrivenerDID, 'scrivener');
            assert.strictEqual(result.allowed, true);
        });

        it('should block mismatched persona assignment', () => {
            const result = checkPersonaAssignmentRestriction(validScrivenerDID, 'sentinel');
            assert.strictEqual(result.allowed, false);
            assert.ok(result.reason?.includes('does not match target persona'));
        });

        it('should block invalid DID format', () => {
            const result = checkPersonaAssignmentRestriction('invalid-did', 'scrivener');
            assert.strictEqual(result.allowed, false);
            assert.strictEqual(result.reason, 'Invalid DID format');
        });

        it('should block overseer assignment', () => {
            const result = checkPersonaAssignmentRestriction(validOverseerDID, 'overseer');
            assert.strictEqual(result.allowed, false);
            assert.strictEqual(result.reason, 'Overseer persona is reserved for human approvers only');
        });

        it('should block upgrading scrivener to sentinel', () => {
            const result = checkPersonaAssignmentRestriction(validSentinelDID, 'sentinel', 'scrivener');
            assert.strictEqual(result.allowed, false);
            assert.strictEqual(result.reason, 'Cannot upgrade Scrivener to system persona (Sentinel/Judge)');
        });

        it('should block reassigning system personas', () => {
            const result = checkPersonaAssignmentRestriction(validScrivenerDID, 'scrivener', 'sentinel');
            assert.strictEqual(result.allowed, false);
            assert.strictEqual(result.reason, 'System personas (Sentinel/Judge) cannot be reassigned');
        });
    });

    describe('Signature Verification', () => {
        it('should sign and verify data correctly', () => {
            const { publicKey, privateKey } = generateKeyPair();
            const data = 'important message';
            const signedData = createSignature(data, privateKey);

            assert.strictEqual(signedData.data, data);

            const result = verifySignature(signedData);
            assert.strictEqual(result.valid, true);
        });

        it('should fail verification if data is tampered with', () => {
            const { publicKey, privateKey } = generateKeyPair();
            const data = 'important message';
            const signedData = createSignature(data, privateKey);

            signedData.data = 'tampered message';

            const result = verifySignature(signedData);
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.error, 'Signature verification failed');
        });

        it('should fail verification for missing fields', () => {
            const result = verifySignature({
                data: '',
                signature: '',
                publicKey: '',
                timestamp: ''
            });
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.error, 'Missing required fields (data, signature, or publicKey)');
        });

        it('should return error for malformed signature or key', () => {
            const result = verifySignature({
                data: 'data',
                signature: 'not-hex',
                publicKey: 'not-hex',
                timestamp: 'now'
            });
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.startsWith('Verification error:'));
        });
    });
});
