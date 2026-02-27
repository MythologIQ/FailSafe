import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, it } from 'mocha';
import { LicenseValidator } from '../../core/LicenseValidator';
import { IConfigProvider } from '../../core/interfaces/IConfigProvider';
import { FailSafeConfig } from '../../shared/types';

const tempDirs: string[] = [];

function makeTempWorkspace(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'failsafe-license-'));
    tempDirs.push(dir);
    return dir;
}

function createMockConfigProvider(workspaceRoot: string | undefined): IConfigProvider {
    return {
        getWorkspaceRoot: () => workspaceRoot,
        getConfig: () => ({} as FailSafeConfig),
        getFailSafeDir: () => workspaceRoot ? path.join(workspaceRoot, '.failsafe') : '.failsafe',
        getLedgerPath: () => '',
        getFeedbackDir: () => '',
        getSentinelConfigPath: () => '',
        onConfigChange: () => () => {},
    };
}

function writeLicenseFile(workspaceRoot: string, content: string): void {
    const licenseDir = path.join(workspaceRoot, '.failsafe');
    fs.mkdirSync(licenseDir, { recursive: true });
    fs.writeFileSync(path.join(licenseDir, 'license.json'), content, 'utf8');
}

function makeFutureDateISO(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
}

function makePastDateISO(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
}

afterEach(() => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir && fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
});

describe('LicenseValidator', () => {
    it('returns free tier when no license is present', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const validator = new LicenseValidator(config);

        const result = validator.validate();

        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier with valid structure and future expiry (free tier license)', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'free',
            expiresAt: makeFutureDateISO(),
            signature: 'some-valid-signature-placeholder',
        };
        writeLicenseFile(workspace, JSON.stringify(license));

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        assert.equal(result.valid, true);
        assert.equal(result.tier, 'free');
        assert.ok(result.expiresAt instanceof Date);
    });

    it('returns free tier when license is expired', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'free',
            expiresAt: makePastDateISO(),
            signature: 'some-signature',
        };
        writeLicenseFile(workspace, JSON.stringify(license));

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier when license file contains invalid JSON', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        writeLicenseFile(workspace, '{ broken json !!!');

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier when signature is missing', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'free',
            expiresAt: makeFutureDateISO(),
            // signature is intentionally omitted from shape check;
            // isLicenseShape requires typeof signature === 'string'
        };
        writeLicenseFile(workspace, JSON.stringify(license));

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier for pro license with placeholder public key (fails closed)', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'pro',
            expiresAt: makeFutureDateISO(),
            signature: 'fake-signature-data',
        };
        writeLicenseFile(workspace, JSON.stringify(license));

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        // Pro tier requires real cryptographic signature verification.
        // With placeholder public key, verifySignature returns false.
        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier when licenseKeyOverride contains invalid base64', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        // Not valid base64 that decodes to JSON
        const validator = new LicenseValidator(config, '!!!not-base64!!!');

        const result = validator.validate();

        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier when license has an invalid tier value', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'enterprise',
            expiresAt: makeFutureDateISO(),
            signature: 'some-signature',
        };
        writeLicenseFile(workspace, JSON.stringify(license));

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        // isStructureValid rejects tier values other than 'free' and 'pro'
        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier when license has an invalid date', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'free',
            expiresAt: 'not-a-date',
            signature: 'some-signature',
        };
        writeLicenseFile(workspace, JSON.stringify(license));

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier when workspace root is undefined', () => {
        const config = createMockConfigProvider(undefined);
        const validator = new LicenseValidator(config);

        const result = validator.validate();

        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });

    it('uses licenseKeyOverride when provided as valid base64 encoded license', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'free',
            expiresAt: makeFutureDateISO(),
            signature: 'a-valid-sig',
        };
        const encoded = Buffer.from(JSON.stringify(license)).toString('base64');

        const validator = new LicenseValidator(config, encoded);
        const result = validator.validate();

        assert.equal(result.valid, true);
        assert.equal(result.tier, 'free');
    });

    it('returns free tier when signature is an empty string', () => {
        const workspace = makeTempWorkspace();
        const config = createMockConfigProvider(workspace);
        const license = {
            tier: 'free',
            expiresAt: makeFutureDateISO(),
            signature: '',
        };
        writeLicenseFile(workspace, JSON.stringify(license));

        const validator = new LicenseValidator(config);
        const result = validator.validate();

        // isStructureValid rejects empty signature
        assert.equal(result.valid, false);
        assert.equal(result.tier, 'free');
    });
});
