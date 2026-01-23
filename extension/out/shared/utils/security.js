"use strict";
/**
 * Security Utilities for FailSafe Extension
 *
 * Provides:
 * - DID hash derivation using SHA-256
 * - Ed25519 signature verification
 * - Persona assignment restrictions
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
exports.SECURITY_CONSTANTS = void 0;
exports.deriveDIDHash = deriveDIDHash;
exports.verifyDIDHash = verifyDIDHash;
exports.extractPersonaFromDID = extractPersonaFromDID;
exports.verifySignature = verifySignature;
exports.createSignature = createSignature;
exports.generateKeyPair = generateKeyPair;
exports.checkPersonaAssignmentRestriction = checkPersonaAssignmentRestriction;
exports.validateAgentPersona = validateAgentPersona;
const crypto = __importStar(require("crypto"));
/**
 * Derive a DID hash from persona and public key using SHA-256
 *
 * @param persona - The persona type (scrivener, sentinel, judge, overseer)
 * @param publicKey - The agent's public key (hex string)
 * @param salt - Optional salt for deterministic generation (hex string)
 * @returns DID hash result
 */
function deriveDIDHash(persona, publicKey, salt) {
    const saltValue = salt ? `:${salt}` : '';
    const input = Buffer.from(`${persona}:${publicKey}${saltValue}`, 'utf-8');
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    // Format DID: did:myth:persona:hash
    const hashHex = hash.substring(0, 32);
    const did = `did:myth:${persona}:${hashHex}`;
    return {
        did,
        hash,
        salt: salt || '',
        version: '1.0.0'
    };
}
/**
 * Verify a DID hash against persona and public key
 *
 * @param did - The DID to verify
 * @param persona - The expected persona type
 * @param publicKey - The expected public key (hex string)
 * @param salt - The salt used during derivation
 * @returns true if valid, false otherwise
 */
function verifyDIDHash(did, persona, publicKey, salt) {
    const result = deriveDIDHash(persona, publicKey, salt);
    return result.did === did;
}
/**
 * Extract persona from DID
 *
 * @param did - The DID string
 * @returns The persona type or null if invalid
 */
function extractPersonaFromDID(did) {
    const match = did.match(/^did:myth:(scrivener|sentinel|judge|overseer):[a-f0-9]+$/);
    return match ? match[1] : null;
}
/**
 * Verify an Ed25519 signature
 *
 * @param signedData - The signed data object
 * @returns Verification result
 */
function verifySignature(signedData) {
    try {
        // Validate inputs
        if (!signedData.data || !signedData.signature || !signedData.publicKey) {
            return {
                valid: false,
                error: 'Missing required fields (data, signature, or publicKey)'
            };
        }
        const signatureBuffer = Buffer.from(signedData.signature, 'hex');
        const publicKey = crypto.createPublicKey({
            key: Buffer.from(signedData.publicKey, 'hex'),
            format: 'der',
            type: 'spki'
        });
        // Create message to verify (data + timestamp)
        const message = Buffer.from(`${signedData.data}:${signedData.timestamp}`, 'utf-8');
        // Verify signature using Ed25519
        const isValid = crypto.verify(null, message, publicKey, signatureBuffer);
        return {
            valid: isValid,
            error: isValid ? undefined : 'Signature verification failed'
        };
    }
    catch (error) {
        return {
            valid: false,
            error: `Verification error: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
/**
 * Create an Ed25519 signature
 *
 * @param data - The data to sign
 * @param privateKey - The private key (hex string)
 * @returns Signed data object
 */
function createSignature(data, privateKey) {
    const privateKeyObject = crypto.createPrivateKey({
        key: Buffer.from(privateKey, 'hex'),
        format: 'der',
        type: 'pkcs8'
    });
    const publicKeyObject = crypto.createPublicKey(privateKeyObject);
    const timestamp = new Date().toISOString();
    const message = Buffer.from(`${data}:${timestamp}`, 'utf-8');
    const signature = crypto.sign(null, message, privateKeyObject);
    return {
        data,
        signature: signature.toString('hex'),
        publicKey: publicKeyObject.export({ type: 'spki', format: 'der' }).toString('hex'),
        timestamp
    };
}
/**
 * Generate a new Ed25519 key pair
 *
 * @returns Object with publicKey and privateKey (hex strings)
 */
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    return {
        publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('hex'),
        privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex')
    };
}
/**
 * Check if a persona assignment is allowed based on DID and context
 *
 * @param did - The DID to check
 * @param targetPersona - The persona type being assigned
 * @param existingPersona - The existing persona type (if any)
 * @returns Restriction result
 */
function checkPersonaAssignmentRestriction(did, targetPersona, existingPersona) {
    // Extract persona from DID
    const didPersona = extractPersonaFromDID(did);
    if (!didPersona) {
        return {
            persona: targetPersona,
            allowed: false,
            reason: 'Invalid DID format'
        };
    }
    // Rule 1: DID persona must match target persona
    if (didPersona !== targetPersona) {
        return {
            persona: targetPersona,
            allowed: false,
            reason: `DID persona '${didPersona}' does not match target persona '${targetPersona}'`
        };
    }
    // Rule 2: Overseer is human-only and cannot be assigned to agents
    if (targetPersona === 'overseer') {
        return {
            persona: targetPersona,
            allowed: false,
            reason: 'Overseer persona is reserved for human approvers only'
        };
    }
    // Rule 3: Sentinel and Judge are system personas (trust = 1.0)
    if ((targetPersona === 'sentinel' || targetPersona === 'judge') && existingPersona) {
        if (existingPersona === 'scrivener') {
            return {
                persona: targetPersona,
                allowed: false,
                reason: 'Cannot upgrade Scrivener to system persona (Sentinel/Judge)'
            };
        }
    }
    // Rule 4: Scrivener is the only persona that can change
    if (existingPersona && existingPersona !== targetPersona) {
        if (existingPersona === 'sentinel' || existingPersona === 'judge') {
            return {
                persona: targetPersona,
                allowed: false,
                reason: 'System personas (Sentinel/Judge) cannot be reassigned'
            };
        }
    }
    // All checks passed
    return {
        persona: targetPersona,
        allowed: true
    };
}
/**
 * Validate that an agent's DID matches its registered persona
 *
 * @param did - The agent's DID
 * @param registeredPersona - The registered persona type
 * @returns true if valid, false otherwise
 */
function validateAgentPersona(did, registeredPersona) {
    const restriction = checkPersonaAssignmentRestriction(did, registeredPersona);
    return restriction.allowed;
}
// =============================================================================
// SECURITY CONSTANTS
// =============================================================================
exports.SECURITY_CONSTANTS = {
    // Hash derivation
    DID_HASH_ALGO: 'sha256',
    DID_HASH_LENGTH: 32,
    // Signature
    ED25519_PUBLIC_KEY_LENGTH: 32,
    ED25519_PRIVATE_KEY_LENGTH: 32,
    ED25519_SIGNATURE_LENGTH: 64,
    // DID format
    DID_PREFIX: 'did:myth',
    DID_VERSION: '1.0.0',
    // Persona restrictions
    PERSONA_SCRIVENER: 'scrivener',
    PERSONA_SENTINEL: 'sentinel',
    PERSONA_JUDGE: 'judge',
    PERSONA_OVERSEER: 'overseer'
};
//# sourceMappingURL=security.js.map