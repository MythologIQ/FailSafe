/**
 * Security Utilities for FailSafe Extension
 *
 * Provides:
 * - DID hash derivation using SHA-256
 * - Ed25519 signature verification
 * - Persona assignment restrictions
 */
import { PersonaType } from '../types';
export interface DIDHashResult {
    did: string;
    hash: string;
    salt: string;
    version: string;
}
/**
 * Derive a DID hash from persona and public key using SHA-256
 *
 * @param persona - The persona type (scrivener, sentinel, judge, overseer)
 * @param publicKey - The agent's public key (hex string)
 * @param salt - Optional salt for deterministic generation (hex string)
 * @returns DID hash result
 */
export declare function deriveDIDHash(persona: PersonaType, publicKey: string, salt?: string): DIDHashResult;
/**
 * Verify a DID hash against persona and public key
 *
 * @param did - The DID to verify
 * @param persona - The expected persona type
 * @param publicKey - The expected public key (hex string)
 * @param salt - The salt used during derivation
 * @returns true if valid, false otherwise
 */
export declare function verifyDIDHash(did: string, persona: PersonaType, publicKey: string, salt?: string): boolean;
/**
 * Extract persona from DID
 *
 * @param did - The DID string
 * @returns The persona type or null if invalid
 */
export declare function extractPersonaFromDID(did: string): PersonaType | null;
export interface SignatureVerificationResult {
    valid: boolean;
    error?: string;
}
export interface SignedData {
    data: string;
    signature: string;
    publicKey: string;
    timestamp: string;
}
/**
 * Verify an Ed25519 signature
 *
 * @param signedData - The signed data object
 * @returns Verification result
 */
export declare function verifySignature(signedData: SignedData): SignatureVerificationResult;
/**
 * Create an Ed25519 signature
 *
 * @param data - The data to sign
 * @param privateKey - The private key (hex string)
 * @returns Signed data object
 */
export declare function createSignature(data: string, privateKey: string): SignedData;
/**
 * Generate a new Ed25519 key pair
 *
 * @returns Object with publicKey and privateKey (hex strings)
 */
export declare function generateKeyPair(): {
    publicKey: string;
    privateKey: string;
};
export interface PersonaRestriction {
    persona: PersonaType;
    allowed: boolean;
    reason?: string;
}
/**
 * Check if a persona assignment is allowed based on DID and context
 *
 * @param did - The DID to check
 * @param targetPersona - The persona type being assigned
 * @param existingPersona - The existing persona type (if any)
 * @returns Restriction result
 */
export declare function checkPersonaAssignmentRestriction(did: string, targetPersona: PersonaType, existingPersona?: PersonaType): PersonaRestriction;
/**
 * Validate that an agent's DID matches its registered persona
 *
 * @param did - The agent's DID
 * @param registeredPersona - The registered persona type
 * @returns true if valid, false otherwise
 */
export declare function validateAgentPersona(did: string, registeredPersona: PersonaType): boolean;
export declare const SECURITY_CONSTANTS: {
    DID_HASH_ALGO: string;
    DID_HASH_LENGTH: number;
    ED25519_PUBLIC_KEY_LENGTH: number;
    ED25519_PRIVATE_KEY_LENGTH: number;
    ED25519_SIGNATURE_LENGTH: number;
    DID_PREFIX: string;
    DID_VERSION: string;
    PERSONA_SCRIVENER: PersonaType;
    PERSONA_SENTINEL: PersonaType;
    PERSONA_JUDGE: PersonaType;
    PERSONA_OVERSEER: PersonaType;
};
//# sourceMappingURL=security.d.ts.map