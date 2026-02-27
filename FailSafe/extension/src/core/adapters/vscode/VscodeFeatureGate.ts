/**
 * VscodeFeatureGate - VS Code adapter for feature gating
 *
 * Thin adapter that wires FeatureGateService to VS Code configuration,
 * reading failsafe.license.key from workspace settings and refreshing
 * the license when configuration changes.
 */

import * as vscode from 'vscode';
import { IConfigProvider } from '../../interfaces/IConfigProvider';
import { FeatureGateService } from '../../FeatureGateService';
import { LicenseValidator } from '../../LicenseValidator';

export function createVscodeFeatureGate(configProvider: IConfigProvider): FeatureGateService {
    const licenseKey = vscode.workspace
        .getConfiguration('failsafe')
        .get<string>('license.key');

    const validator = new LicenseValidator(configProvider, licenseKey || undefined);
    const gate = new FeatureGateService(validator);

    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('failsafe.license.key')) {
            const newKey = vscode.workspace
                .getConfiguration('failsafe')
                .get<string>('license.key');
            const newValidator = new LicenseValidator(configProvider, newKey || undefined);
            gate.setValidator(newValidator);
            gate.refreshLicense();
        }
    });

    return gate;
}
