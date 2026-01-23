export interface Ed25519KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}

export interface SerializedKeyPair {
    publicKeyHex: string;
    privateKeyHex: string;
}

export type AgentDID = `did:myth:${string}`;

export interface SignedEnvelope<T = unknown> {
    payload: T;
    signature: string;
    signerDid: AgentDID;
    signedAt: string;
    nonce: string;
}

export interface VerificationResult {
    valid: boolean;
    signerDid: AgentDID | null;
    error?: 'INVALID_SIGNATURE' | 'UNKNOWN_DID' | 'REPLAY_DETECTED';
    verifiedAt: string;
}

export interface AgentKeyRecord {
    did: AgentDID;
    publicKeyHex: string;
    persona: 'scrivener' | 'sentinel' | 'judge' | 'overseer';
    registeredAt: string;
    revokedAt?: string;
}
