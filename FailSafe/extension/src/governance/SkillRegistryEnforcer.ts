import { PermissionScopeManager } from './PermissionScopeManager';

interface SkillManifest {
  name: string;
  version: string;
  scopes: string[];
  pinned?: boolean;
}

interface EnforcementResult {
  allowed: boolean;
  reason: string;
}

export class SkillRegistryEnforcer {
  constructor(private readonly permissionManager: PermissionScopeManager) {}

  enforce(manifest: SkillManifest): EnforcementResult {
    if (!manifest.pinned) {
      return { allowed: false, reason: `Skill "${manifest.name}" is not version-pinned.` };
    }

    for (const scope of manifest.scopes) {
      const scopeId = `${manifest.name}:${scope}`;
      if (!this.permissionManager.check(manifest.name, scope)) {
        return { allowed: false, reason: `Scope "${scopeId}" not granted.` };
      }
    }

    return { allowed: true, reason: 'All checks passed.' };
  }

  redactSensitiveScopes(manifest: SkillManifest): SkillManifest {
    const sensitivePattern = /password|secret|key|token/i;
    const redactedScopes = manifest.scopes.map(s =>
      sensitivePattern.test(s) ? '[REDACTED]' : s
    );
    return { ...manifest, scopes: redactedScopes };
  }
}
