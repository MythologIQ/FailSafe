import * as crypto from 'crypto';
import {
    AgentDID,
    AgentKeyRecord,
    SerializedKeyPair,
    SignedEnvelope,
    VerificationResult
} from './crypto.types';

export class CryptoService {
    private keyRegistry: Map<string, AgentKeyRecord> = new Map();
    private usedNonces: Set<string> = new Set();

    deriveDID(persona: string, publicKeyHex: string): AgentDID {
        const hashInput = `${persona}:${publicKeyHex}`;
        const hash = crypto.createHash('sha256').update(hashInput, 'utf-8').digest('hex');
        return `did:myth:${persona}:${hash.substring(0, 32)}` as AgentDID;
    }

    generateKeyPair(): SerializedKeyPair {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        return {
            publicKeyHex: publicKey.export({ type: 'spki', format: 'der' }).toString('hex'),
            privateKeyHex: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex')
        };
    }

    registerAgent(record: AgentKeyRecord): void {
        this.keyRegistry.set(record.did, record);
    }

    sign<T>(payload: T, privateKeyHex: string, signerDid: AgentDID): SignedEnvelope<T> {
        const nonce = crypto.randomUUID();
        const signedAt = new Date().toISOString();
        const message = this.canonicalize({ payload, signerDid, signedAt, nonce });

        const privateKey = crypto.createPrivateKey({
            key: Buffer.from(privateKeyHex, 'hex'),
            format: 'der',
            type: 'pkcs8'
        });
        const signature = crypto.sign(null, Buffer.from(message), privateKey).toString('hex');

        return { payload, signature, signerDid, signedAt, nonce };
    }

    verify<T>(envelope: SignedEnvelope<T>): VerificationResult {
        const verifiedAt = new Date().toISOString();

        const record = this.keyRegistry.get(envelope.signerDid);
        if (!record) {
            return { valid: false, signerDid: null, error: 'UNKNOWN_DID', verifiedAt };
        }
        if (record.revokedAt) {
            return { valid: false, signerDid: envelope.signerDid, error: 'INVALID_SIGNATURE', verifiedAt };
        }

        if (this.usedNonces.has(envelope.nonce)) {
            return { valid: false, signerDid: envelope.signerDid, error: 'REPLAY_DETECTED', verifiedAt };
        }

        const message = this.canonicalize({
            payload: envelope.payload,
            signerDid: envelope.signerDid,
            signedAt: envelope.signedAt,
            nonce: envelope.nonce
        });

        try {
            const publicKey = crypto.createPublicKey({
                key: Buffer.from(record.publicKeyHex, 'hex'),
                format: 'der',
                type: 'spki'
            });

            const valid = crypto.verify(
                null,
                Buffer.from(message),
                publicKey,
                Buffer.from(envelope.signature, 'hex')
            );

            if (valid) {
                this.usedNonces.add(envelope.nonce);
                return { valid: true, signerDid: envelope.signerDid, verifiedAt };
            }
        } catch {
            // Fall through to invalid signature.
        }

        return { valid: false, signerDid: envelope.signerDid, error: 'INVALID_SIGNATURE', verifiedAt };
    }

    private canonicalize(obj: Record<string, unknown>): string {
        return JSON.stringify(obj, Object.keys(obj).sort());
    }
}
