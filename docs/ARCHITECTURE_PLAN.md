# Plan: Fix Governance Propagation Pipeline

**Current Version**: v4.9.2
**Target Version**: v4.9.3
**Change Type**: hotfix
**Risk Grade**: L2

## Open Questions

1. **Amazon Q support**: Cross-agent conventions list it (`.amazonq/rules/*.md`) but no VS Code presence. **Recommendation**: Defer.
2. **Antigravity/Gemini identity**: Old manifest uses `id: "antigravity"`. **Recommendation**: Replace with `id: "gemini"`, detect `.gemini/` and `GEMINI.md`, inject to `GEMINI.md`.
3. **VSCode system**: Old manifest is `alwaysInstalled: true` for FailSafe's own config. **Recommendation**: Remove from agent governance pipeline. It is not an external AI coding assistant.
4. **FrameworkSync directory-copy**: `syncSystem()` copies from `sourceDir` which no longer exists. **Recommendation**: Keep method guarded but skip for built-in agents (no `sourceDir`). Injection via `AgentConfigInjector` is the working path.

## Phase 1: Define Built-In Agent Definitions (In-Code)

### Affected Files

- `FailSafe/extension/src/qorelogic/AgentDefinitions.ts` — NEW (~80 lines, 6 agent definitions)
- `FailSafe/extension/src/qorelogic/types/QoreLogicSystem.ts` — Make `sourceDir` optional
- `FailSafe/extension/src/qorelogic/AgentConfigInjector.ts` — Add `gemini` to `AGENT_CONFIG_MAP`

### Changes

**1a. Create `AgentDefinitions.ts`**

Export `BUILT_IN_AGENTS: SystemManifest[]` with 6 agents:

| ID | Name | detection.folderExists | detection.extensionKeywords | detection.hostAppNames | governancePaths | configPath |
|---|---|---|---|---|---|---|
| `claude` | Claude Code | `.claude` | `claude`, `anthropic` | — | `.claude/skills`, `.claude/agents`, `.claude/CLAUDE.md` | `.claude/CLAUDE.md` |
| `copilot` | GitHub Copilot | `.github/copilot-instructions.md` | `copilot` | — | `.github/copilot-instructions.md` | `.github/copilot-instructions.md` |
| `cursor` | Cursor | `.cursor` | — | `cursor` | `.cursor/rules/failsafe.mdc` | `.cursor/rules/failsafe.mdc` |
| `codex` | OpenAI Codex | `codex.md`, `AGENTS.md` | `codex` | — | `codex.md` | `codex.md` |
| `windsurf` | Windsurf | `.windsurfrules`, `.windsurf` | — | `windsurf` | `.windsurfrules` | `.windsurfrules` |
| `gemini` | Gemini CLI | `.gemini`, `GEMINI.md` | `gemini` | — | `GEMINI.md`, `.gemini/settings.json` | `GEMINI.md` |

No `sourceDir` or `targetDir` — built-in agents use `AgentConfigInjector` for governance injection, not directory-copy sync.

**1b. Make `sourceDir` optional in `SystemManifest`**

In `QoreLogicSystem.ts`, change `sourceDir: string` to `sourceDir?: string`.

**1c. Add `gemini` to `AGENT_CONFIG_MAP`**

```typescript
gemini: { configPath: 'GEMINI.md', format: 'markdown' },
```

### Unit Tests

`FailSafe/extension/src/test/qorelogic/AgentDefinitions.test.ts` (NEW):
- `BUILT_IN_AGENTS` has exactly 6 entries
- All IDs are unique
- Every agent has at least one `governancePaths` entry
- Every agent has at least one detection method (`folderExists`, `extensionKeywords`, or `hostAppNames`)
- Every agent ID has a corresponding entry in `AGENT_CONFIG_MAP`

## Phase 2: Rewire SystemRegistry to Use Built-In Definitions

### Affected Files

- `FailSafe/extension/src/qorelogic/SystemRegistry.ts` — Replace `loadManifests()` with `loadBuiltInSystems()`
- `FailSafe/extension/src/qorelogic/FrameworkSync.ts` — Guard `sourceDir` null/empty check in `syncSystem()`
- `FailSafe/extension/src/test/qorelogic/SystemRegistry.test.ts` — Rewrite for in-code definitions
- `FailSafe/extension/src/test/qorelogic/AgentConfigInjector.test.ts` — Remove `_STAGING_OLD` setup, fix `sourceDir`
- `FailSafe/extension/src/test/governance/GovernanceCeremony.test.ts` — Fix `sourceDir` in mock
- `FailSafe/extension/src/test/roadmap/AgentCoverageRoute.test.ts` — Fix `sourceDir` in mock

### Changes

**2a. Replace `loadManifests()` in SystemRegistry**

Remove lines 141-158 (filesystem manifest loading). Replace with:

```typescript
private loadBuiltInSystems(): SystemManifest[] {
  return [...BUILT_IN_AGENTS];
}
```

Import `BUILT_IN_AGENTS` from `./AgentDefinitions`.

**2b. Update `getSystems()` to call `loadBuiltInSystems()`**

Keep `async` for interface compatibility. Replace `this.loadManifests()` call with `this.loadBuiltInSystems()`.

**2c. Guard `sourceDir` in FrameworkSync.syncSystem()**

Add null/empty check at top of `syncSystem()`:

```typescript
if (!manifest.targetDir || !manifest.sourceDir) {
  this.logger.info(`Skipping dir-copy for ${manifest.id} (no sourceDir/targetDir)`);
  return;
}
```

**2d. Fix all test mocks**

Update `sourceDir` in mock system objects across 3 test files:
- `AgentConfigInjector.test.ts`: Remove `_STAGING_OLD` directory setup, set `sourceDir: undefined`
- `GovernanceCeremony.test.ts`: Set `sourceDir: undefined` in `makeSystem` helper
- `AgentCoverageRoute.test.ts`: Set `sourceDir: undefined` in mock landscape

### Unit Tests

Rewrite `SystemRegistry.test.ts`:
- `should return all 6 built-in agent systems`
- `should detect claude when .claude/ folder exists`
- `should not detect copilot when no copilot markers exist`
- `hasGovernance() returns true when governance marker file exists`
- `hasGovernance() returns false for claude with old paths (.claude/commands/)`
- Keep existing tests for `resolvePath()`, `findById()`, `renderTemplate()`
- Remove `_STAGING_OLD`-dependent tests

## Phase 3: Cleanup Dead Code

### Affected Files

- `FailSafe/_STAGING_OLD/` — DELETE entire directory

### Changes

**3a. Delete `_STAGING_OLD` directory** after all tests pass.

**3b. Audit for orphan references** to `_STAGING_OLD`, `qorelogic/Claude`, `qorelogic/Antigravity`, `qorelogic/VSCode`.

### Unit Tests

No new tests. Verify existing suite passes after deletion.

## Summary

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/qorelogic/AgentDefinitions.ts` | NEW | ~80 |
| `src/qorelogic/types/QoreLogicSystem.ts` | EDIT (1 line) | `sourceDir?: string` |
| `src/qorelogic/SystemRegistry.ts` | EDIT (~20 lines) | Replace `loadManifests()` |
| `src/qorelogic/AgentConfigInjector.ts` | EDIT (1 line) | Add `gemini` |
| `src/qorelogic/FrameworkSync.ts` | EDIT (~3 lines) | Guard `sourceDir` |
| `src/test/qorelogic/AgentDefinitions.test.ts` | NEW | ~40 |
| `src/test/qorelogic/SystemRegistry.test.ts` | REWRITE | ~80 |
| `src/test/qorelogic/AgentConfigInjector.test.ts` | EDIT (~5 lines) | Fix mocks |
| `src/test/governance/GovernanceCeremony.test.ts` | EDIT (~3 lines) | Fix mocks |
| `src/test/roadmap/AgentCoverageRoute.test.ts` | EDIT (1 line) | Fix mock |
| `FailSafe/_STAGING_OLD/` | DELETE | — |
