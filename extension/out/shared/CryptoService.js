"use strict";
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
exports.CryptoService = void 0;
const crypto = __importStar(require("crypto"));
class CryptoService {
    keyRegistry = new Map();
    usedNonces = new Set();
    deriveDID(persona, publicKeyHex) {
        const hashInput = `${persona}:${publicKeyHex}`;
        const hash = crypto.createHash('sha256').update(hashInput, 'utf-8').digest('hex');
        return `did:myth:${persona}:${hash.substring(0, 32)}`;
    }
    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        return {
            publicKeyHex: publicKey.export({ type: 'spki', format: 'der' }).toString('hex'),
            privateKeyHex: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex')
        };
    }
    registerAgent(record) {
        this.keyRegistry.set(record.did, record);
    }
    sign(payload, privateKeyHex, signerDid) {
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
    verify(envelope) {
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
            const valid = crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(envelope.signature, 'hex'));
            if (valid) {
                this.usedNonces.add(envelope.nonce);
                return { valid: true, signerDid: envelope.signerDid, verifiedAt };
            }
        }
        catch {
            // Fall through to invalid signature.
        }
        return { valid: false, signerDid: envelope.signerDid, error: 'INVALID_SIGNATURE', verifiedAt };
    }
    canonicalize(obj) {
        return JSON.stringify(obj, Object.keys(obj).sort());
    }
}
exports.CryptoService = CryptoService;
//# sourceMappingURL=CryptoService.js.map