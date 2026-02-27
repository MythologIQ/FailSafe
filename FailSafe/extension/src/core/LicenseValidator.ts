/**
 * LicenseValidator - Offline license validation for FailSafe
 *
 * Reads license data from configuration or .failsafe/license.json,
 * validates structure and expiry, and returns the resolved tier.
 * Does NOT depend on any vscode.* APIs.
 *
 * SECURITY NOTE: v1 performs structural + expiry validation only.
 * The `signature` field is checked for presence but NOT cryptographically
 * verified. This is a PLACEHOLDER for the v2 implementation which will
 * use Ed25519 asymmetric signature verification with an embedded public key.
 * Do NOT rely on this for production license enforcement without implementing
 * verifySignature() against a real public key.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { FeatureTier } from './interfaces/IFeatureGate';
import { IConfigProvider } from './interfaces/IConfigProvider';

// Embedded public key for license signature verification (Ed25519)
// TODO: Replace with real production public key before shipping Pro tier
const LICENSE_PUBLIC_KEY = 'PLACEHOLDER_REPLACE_BEFORE_SHIPPING';

export interface LicenseData {
    tier: FeatureTier;
    expiresAt: string;
    signature: string;
}

export interface LicenseValidationResult {
    valid: boolean;
    tier: FeatureTier;
    expiresAt?: Date;
}

export class LicenseValidator {
    private configProvider: IConfigProvider;
    private licenseKeyOverride: string | undefined;

    constructor(configProvider: IConfigProvider, licenseKeyOverride?: string) {
        this.configProvider = configProvider;
        this.licenseKeyOverride = licenseKeyOverride;
    }

    validate(): LicenseValidationResult {
        const license = this.loadLicense();
        if (!license) {
            return { valid: false, tier: 'free' };
        }

        if (!this.isStructureValid(license)) {
            return { valid: false, tier: 'free' };
        }

        const expiresAt = new Date(license.expiresAt);
        if (isNaN(expiresAt.getTime())) {
            return { valid: false, tier: 'free' };
        }

        if (expiresAt.getTime() < Date.now()) {
            return { valid: false, tier: 'free', expiresAt };
        }

        // Pro tier requires cryptographic signature verification
        if (license.tier === 'pro' && !this.verifySignature(license)) {
            return { valid: false, tier: 'free', expiresAt };
        }

        const tier = license.tier === 'pro' ? 'pro' : 'free';
        return { valid: true, tier, expiresAt };
    }

    private loadLicense(): LicenseData | null {
        // Priority 1: license key override (from VS Code config or env)
        if (this.licenseKeyOverride) {
            return this.parseLicenseKey(this.licenseKeyOverride);
        }

        // Priority 2: .failsafe/license.json file
        return this.readLicenseFile();
    }

    private parseLicenseKey(key: string): LicenseData | null {
        try {
            const decoded = Buffer.from(key, 'base64').toString('utf8');
            const parsed: unknown = JSON.parse(decoded);
            if (this.isLicenseShape(parsed)) {
                return parsed;
            }
            return null;
        } catch {
            return null;
        }
    }

    private readLicenseFile(): LicenseData | null {
        try {
            const workspaceRoot = this.configProvider.getWorkspaceRoot();
            if (!workspaceRoot) {
                return null;
            }

            const licensePath = path.join(workspaceRoot, '.failsafe', 'license.json');
            if (!fs.existsSync(licensePath)) {
                return null;
            }

            const content = fs.readFileSync(licensePath, 'utf8');
            const parsed: unknown = JSON.parse(content);
            if (this.isLicenseShape(parsed)) {
                return parsed;
            }
            return null;
        } catch {
            return null;
        }
    }

    private isLicenseShape(value: unknown): value is LicenseData {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const obj = value as Record<string, unknown>;
        return (
            typeof obj.tier === 'string' &&
            typeof obj.expiresAt === 'string' &&
            typeof obj.signature === 'string'
        );
    }

    private isStructureValid(license: LicenseData): boolean {
        if (license.tier !== 'free' && license.tier !== 'pro') {
            return false;
        }
        if (!license.signature || license.signature.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * Verify the cryptographic signature of a license.
     * Returns true only when a real public key is configured and the
     * signature is valid. Returns false (fails closed) when the public
     * key is the placeholder, ensuring Pro features cannot be unlocked
     * until a real signing infrastructure is deployed.
     */
    private verifySignature(license: LicenseData): boolean {
        if (LICENSE_PUBLIC_KEY === 'PLACEHOLDER_REPLACE_BEFORE_SHIPPING') {
            // No real key configured - fail closed (no Pro access)
            return false;
        }

        try {
            const payload = JSON.stringify({ tier: license.tier, expiresAt: license.expiresAt });
            const verify = crypto.createVerify('Ed25519');
            verify.update(payload);
            return verify.verify(LICENSE_PUBLIC_KEY, license.signature, 'base64');
        } catch {
            return false;
        }
    }
}
