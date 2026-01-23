import { AgentDID, AgentKeyRecord, SerializedKeyPair, SignedEnvelope, VerificationResult } from './crypto.types';
export declare class CryptoService {
    private keyRegistry;
    private usedNonces;
    deriveDID(persona: string, publicKeyHex: string): AgentDID;
    generateKeyPair(): SerializedKeyPair;
    registerAgent(record: AgentKeyRecord): void;
    sign<T>(payload: T, privateKeyHex: string, signerDid: AgentDID): SignedEnvelope<T>;
    verify<T>(envelope: SignedEnvelope<T>): VerificationResult;
    private canonicalize;
}
//# sourceMappingURL=CryptoService.d.ts.map