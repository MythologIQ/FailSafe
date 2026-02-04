# Plan: FailSafe Beta Release (Marketplace Push)

## Open Questions

1. **Publisher account**: Is `MythologIQ` publisher already created on VS Code Marketplace and Open VSX?
2. **Icon design**: Need `failsafe-icon.svg` (128x128 minimum) - do you have brand assets?
3. **License**: MIT is specified - is this final?

---

## Phase 1: Critical Blockers (Marketplace Requirements)

### Affected Files

- [extension/media/failsafe-icon.svg](extension/media/failsafe-icon.svg) - CREATE: Extension icon (required)
- [extension/README.md](extension/README.md) - CREATE: Marketplace listing description
- [extension/CHANGELOG.md](extension/CHANGELOG.md) - CREATE: Version history
- [extension/LICENSE](extension/LICENSE) - CREATE: MIT license file
- [CLAUDE.md](CLAUDE.md) - FIX: Wrong path references

### Changes

**1. Create extension/media/failsafe-icon.svg**
```svg
<!-- Minimal placeholder icon - replace with brand asset -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="60" fill="#1a1a2e" stroke="#00d9ff" stroke-width="4"/>
  <path d="M64 24 L94 54 L84 64 L64 44 L44 64 L34 54 Z" fill="#00d9ff"/>
  <path d="M64 104 L34 74 L44 64 L64 84 L84 64 L94 74 Z" fill="#00d9ff"/>
</svg>
```

**2. Create extension/README.md**
```markdown
# MythologIQ FailSafe

AI governance extension for VS Code. Monitors agent actions, enforces trust policies, and provides real-time verification.

## Features

- **Sentinel Monitoring**: File-level heuristic analysis with optional LLM assistance
- **Trust Engine**: Lewicki-Bunker progressive trust model
- **SOA Ledger**: Merkle-chained audit trail
- **L3 Escalation**: Human-in-the-loop for security-critical paths

## Quick Start

1. Install extension
2. Open any workspace
3. Press `Ctrl+Alt+F` to open Dashboard
4. Sentinel begins monitoring automatically

## Configuration

See Settings > Extensions > FailSafe
```

**3. Create extension/CHANGELOG.md**
```markdown
# Changelog

## [1.0.0] - 2026-02-04

### Added
- Initial Beta release
- Sentinel daemon with heuristic analysis
- Trust Engine with progressive trust stages
- SOA Ledger with Merkle chain integrity
- L3 escalation queue for human review
- Dashboard, Living Graph, Cortex Stream views
```

**4. Fix CLAUDE.md**
```markdown
# QoreLogic A.E.G.I.S. Governance (Claude Code)
Follow the rules in .claude/commands/agents/ and .claude/commands/.
All writes are subject to EnforcementEngine (FailSafe Extension).
Use /ql-status to check current governance state.
```

### Unit Tests

- None required (static assets)

---

## Phase 2: Placeholder Implementations

### Affected Files

- [extension/src/sentinel/engines/ArchitectureEngine.ts](extension/src/sentinel/engines/ArchitectureEngine.ts) - FIX: Implement complexity calculation
- [extension/src/shared/ConfigManager.ts](extension/src/shared/ConfigManager.ts) - ADD: contributors config property
- [qorelogic/Claude/manifest.json](qorelogic/Claude/manifest.json) - FIX: Remove non-existent `.claude/policies`

### Changes

**1. ArchitectureEngine.ts - Implement complexity**

Replace placeholder in `checkGodModules`:
```typescript
// Calculate actual max complexity using HeuristicEngine's complexity algorithm
let maxComplexity = 0;
// ... inside loop after reading content:
const complexity = this.calculateFileComplexity(content);
maxComplexity = Math.max(maxComplexity, complexity);

// Add method:
private calculateFileComplexity(content: string): number {
    const patterns = [
        /\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g,
        /\bwhile\s*\(/g, /\bswitch\s*\(/g, /\bcase\s+/g,
        /\bcatch\s*\(/g, /\?\s*[^:]+\s*:/g, /&&/g, /\|\|/g
    ];
    let complexity = 1;
    for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) complexity += matches.length;
    }
    return complexity;
}
```

**2. ConfigManager.ts - Add contributors config**

Add to FailSafeConfig interface:
```typescript
architecture: {
    contributors: number;  // Default: 1
    maxComplexity: number; // Default: 20
};
```

**3. manifest.json - Fix governancePaths**
```json
"governancePaths": [".claude/commands/agents"]
```

### Unit Tests

- [extension/src/test/architectureEngine.test.ts](extension/src/test/architectureEngine.test.ts) - Test complexity calculation returns >0 for code with branches

---

## Phase 3: Build & Package

### Affected Files

- [extension/package.json](extension/package.json) - Verify version, publisher
- Terminal commands (no file changes)

### Changes

**1. Verify package.json**
- Confirm `publisher: "MythologIQ"` matches marketplace account
- Confirm `version: "1.0.0"` is correct for beta
- Confirm `repository.url` is public and accessible

**2. Build commands**
```bash
cd extension
npm install
npm run lint
npm run compile
npm run test
npm run package
```

**3. Publish commands**
```bash
# VS Code Marketplace
vsce publish

# Open VSX
npx ovsx publish mythologiq-failsafe-1.0.0.vsix -p <OVSX_TOKEN>
```

### Unit Tests

- All existing tests must pass before package

---

## Summary

| Phase | Files | Risk | Blocking |
|-------|-------|------|----------|
| 1. Critical Blockers | 5 | Low | YES |
| 2. Placeholders | 3 | Medium | NO |
| 3. Build & Package | 1 | Low | YES |

**Estimated Complexity**: Medium (mostly asset creation and config fixes)

**Critical Path**: Phase 1 must complete first - marketplace rejects packages without icon/readme.

---

_Plan follows Simple Made Easy principles_
