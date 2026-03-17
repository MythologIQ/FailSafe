# Plan: Release Integrity & Debug Unification

**Current Version**: v4.9.6
**Target Version**: v4.9.7
**Change Type**: hotfix
**Risk Grade**: L1

## Open Questions

None — both workstreams are well-scoped from the debugging session that surfaced the issues.

---

## Workstream A: Release Integrity — Fix Broken Promises

B158-B160 (v4.9.5 seal) and B167-B169 (v4.10.0 seal) were marked complete but their changes were either overwritten by subsequent work or never wired. This phase fixes every known broken promise and adds a build-time guard to prevent recurrence.

### Phase A1: Fix setupConsoleRoutes Dead Code

**Affected Files**

- `FailSafe/extension/src/roadmap/ConsoleServer.ts` — wire `setupConsoleRoutes()` into `setupRoutes()`

**Changes**

Already applied in this session (line 251: `this.setupConsoleRoutes();` added before `registerSpaFallback()`). Verify the fix survives the bundle step.

**Verification**

- Start extension, navigate to `http://localhost:9376/console/sre` — should render SRE tracker, not command center
- Navigate to `http://localhost:9376/console/home` — should render home route, not SPA fallback

### Phase A2: Fix CSS Selectors for Consolidated Tabs

**Affected Files**

- `FailSafe/extension/src/roadmap/ui/command-center.css` — update `#brainstorm` selectors to `.cc-subview-content` equivalents

**Changes**

Already applied in this session:
- Line 517-520: `#brainstorm.tab-panel.active` → `.cc-subview-content:has(.cc-canvas)`
- Line 664: `#brainstorm.active` → `.cc-subview-content:has(.cc-canvas)`
- Line 667-674: `#brainstorm .cc-canvas` → `.cc-subview-content .cc-canvas`

**Verification**

- Open Command Center → Workspace → Mindmap pill → force-graph canvas fills space edge-to-edge
- Open Command Center → Workspace → Skills pill → content scrolls normally

### Phase A3: Fix Overflow Logic for Workspace Sub-views

**Affected Files**

- `FailSafe/extension/src/roadmap/ui/command-center.js` — remove tab-level overflow hack

**Changes**

Already applied in this session:
- Line 138: removed `targetId === 'workspace' ? 'hidden' : 'auto'`, always set `'auto'`
- Brainstorm overflow handled by CSS `:has(.cc-canvas)` selector instead

### Phase A4: Add Missing Backlog Entries

**Affected Files**

- `docs/BACKLOG.md` — add B158-B160, mark complete; reopen B167-B169 noting the wiring fix

**Changes**

Add under appropriate section:
```markdown
- [x] [B158] Fix audit log blank — fetchHistory, event type fix, verdict routing | v4.9.5
- [x] [B159] Tab consolidation 8→5 — TabGroup, tickers extraction | v4.9.5
- [x] [B160] Wire skills propagation — adaptSkillsForModel in autoIngest | v4.9.5
```

Update B167-B169 annotations to note the routing fix:
```markdown
- [x] [B167] ... (v4.10.0 - Complete; route wiring fix in v4.9.7)
- [x] [B168] ... (v4.10.0 - Complete; route wiring fix in v4.9.7)
- [x] [B169] ... (v4.10.0 - Complete; CSS/overflow fix in v4.9.7)
```

### Phase A5: Bundle Guard

**Affected Files**

- `FailSafe/extension/scripts/bundle.cjs` — add stale-detection check

**Changes**

After the `copyDir` call that copies `src/roadmap/ui/` → `dist/extension/ui/`, add a post-copy verification that compares the `command-center.html` tab count between source and dist:

```javascript
// Post-bundle integrity check: verify UI files were copied
const srcHtml = fs.readFileSync(path.join(srcUiDir, 'command-center.html'), 'utf8');
const distHtml = fs.readFileSync(path.join(distUiDir, 'command-center.html'), 'utf8');
const srcTabs = (srcHtml.match(/class="tab-btn/g) || []).length;
const distTabs = (distHtml.match(/class="tab-btn/g) || []).length;
if (srcTabs !== distTabs) {
  console.error(`BUNDLE ERROR: tab count mismatch (src=${srcTabs}, dist=${distTabs})`);
  process.exit(1);
}
```

**Unit Tests**

- No test file — this is a build script guard, verified by the bundle process itself

---

## Workstream B: Debug Unification — Two-Phase /ql-debug

Combine `ultimate-debugger` (rapid root-cause) and `ql-fixer` (residual sweep) into a single `/ql-debug` invocation that runs both phases automatically.

### Phase B1: Merge Agent Capabilities

**Affected Files**

- `.claude/agents/ql-fixer.md` — merge ultimate-debugger strengths into the fixer agent

**Changes**

The `ultimate-debugger` is a built-in agent type (not a file in this repo). Its strengths relative to `ql-fixer`:

| Capability | ultimate-debugger | ql-fixer |
|-----------|-------------------|----------|
| Rapid symptom triage | Strong | Adequate |
| Cross-file call-graph analysis | Strong | Strong |
| Residual sweep | Weak | Strong |
| Hypothesis elimination discipline | Adequate | Strong |
| Build/bundle process awareness | Strong | Adequate |

The unified agent should retain the ql-fixer's four-layer methodology as the backbone, but add:

1. **Build-artifact awareness** (from ultimate-debugger): Always check if `dist/` or `out/` copies are stale relative to source. Add to Layer 1 (Dijkstra):
   ```
   - **Build artifact staleness**: Check if compiled/bundled outputs match source files
   ```

2. **Dead code detection** (from ultimate-debugger): Verify that functions/methods are actually called, not just defined. Add to Layer 1:
   ```
   - **Reachability verification**: Confirm key functions are invoked, not orphaned dead code
   ```

3. **SPA fallback awareness** (from this session): When debugging web routes, check if SPA fallbacks are silently masking routing errors. Add to Layer 2:
   ```
   - **Silent fallback detection**: Check if catch-all handlers mask routing failures
   ```

### Phase B2: Update /ql-debug Skill for Two-Phase Dispatch

**Affected Files**

- `.claude/skills/ql-debug/SKILL.md` — update execution protocol

**Changes**

Replace Step 2 (Agent Dispatch) with a two-phase protocol:

```markdown
### Step 2: Two-Phase Agent Dispatch

**Phase 1 — Rapid Root-Cause (ql-fixer)**

Launch the `ql-fixer` agent with the problem description. The fixer runs all four layers
(Dijkstra → Hamming/Shannon → Turing/Hopper → Zeller) focused on the REPORTED symptoms.
It identifies root causes and proposes fixes.

**Phase 2 — Residual Sweep (ql-fixer, resumed)**

After Phase 1 fixes are applied, resume the same `ql-fixer` agent to:
- Verify the fixes are complete and correct
- Sweep for residual issues introduced or exposed by the fixes
- Check for similar patterns elsewhere in the codebase
- Validate build artifacts match source (dist/out staleness check)

Phase 2 uses the same four-layer methodology but scoped to the FIXED state,
not the original symptoms.
```

Remove the `<agent>ql-fixer</agent>` tag and replace with explicit dispatch instructions so the orchestrating agent always uses `subagent_type: "ql-fixer"` (not `ultimate-debugger`).

**Update the skill XML block:**

```xml
<skill>
  <trigger>/ql-debug</trigger>
  <phase>IMPLEMENT / SUBSTANTIATE / GATE</phase>
  <persona>Fixer</persona>
  <dispatch>
    <phase1>ql-fixer — Rapid root-cause identification (4-layer analysis on reported symptoms)</phase1>
    <phase2>ql-fixer — Residual sweep and verification (4-layer analysis on fixed state)</phase2>
  </dispatch>
  <output>Two-phase diagnosis: root-cause fix + residual sweep report</output>
</skill>
```

### Phase B3: Remove Duplicate Frontmatter

**Affected Files**

- `.claude/skills/ql-debug/SKILL.md` — fix duplicate YAML frontmatter blocks

**Changes**

The current file has two `---` frontmatter blocks (lines 1-7 and 9-12). Merge into one:

```yaml
---
name: ql-debug
description: >
  Two-phase diagnostic system combining rapid root-cause identification with
  residual sweep verification. Prevents cascading AI debugging damage by
  enforcing four mandatory analysis layers before any code change.
user-invocable: true
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
---
```

**Unit Tests**

- No test file — agent/skill definitions are structural, validated by the SHIELD lifecycle

---

## Summary

| Phase | Scope | Status |
|-------|-------|--------|
| A1 | Wire setupConsoleRoutes | Already applied |
| A2 | Fix CSS selectors | Already applied |
| A3 | Fix overflow logic | Already applied |
| A4 | Add missing backlog entries | Pending |
| A5 | Bundle guard | Pending |
| B1 | Merge agent capabilities | Pending |
| B2 | Update /ql-debug skill | Pending |
| B3 | Fix duplicate frontmatter | Pending |
