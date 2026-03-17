# Plan: v4.9.9 — Right Panel Fix + Install Skills Path Fix

**Current Version**: v4.9.8
**Target Version**: v4.9.9
**Change Type**: hotfix
**Risk Grade**: L1

## Open Questions

None.

---

## Phase 1: Fix Install Skills Path (B189)

### Root Cause

`bootstrapServers.ts:69` constructs `path.join(context.extensionPath, "skills")` but `bundle.cjs:165` places skills at `dist/extension/skills/`. The `fs.access()` throws, the catch at line 95 silently swallows it, returns `{scaffolded: 0}`, page reloads unchanged. Same bug in `WorkspaceMigration.ts:208`.

This also causes Bug 2 (AEGIS leak): when Install Skills fails, new repos have no workspace-level skill overrides, so stale global skills with old terminology are used.

### Affected Files

- `FailSafe/extension/src/extension/bootstrapServers.ts` — fix bundled skills path
- `FailSafe/extension/src/qorelogic/WorkspaceMigration.ts` — fix bundled skills path

### Changes

**bootstrapServers.ts:69** — Fix path:

```typescript
// Before:
const bundledPath = path.join(context.extensionPath, "skills");
// After:
const bundledPath = path.join(context.extensionPath, "dist", "extension", "skills");
```

**bootstrapServers.ts:95-97** — Add logging to silent catch:

```typescript
// Before:
} catch {
  // bundledPath doesn't exist - no skills to scaffold
}
// After:
} catch (err) {
  console.warn("[FailSafe] No bundled skills found at", bundledPath, (err as Error).message);
}
```

**WorkspaceMigration.ts:208** — Fix identical path:

```typescript
// Before:
const bundledPath = path.join(context.extensionPath, "skills");
// After:
const bundledPath = path.join(context.extensionPath, "dist", "extension", "skills");
```

### Unit Tests

- `src/test/extension/bootstrapServers.test.ts` — add or update:
  - `scaffold callback resolves bundled skills from dist/extension/skills/`
  - `scaffold callback logs warning when bundled path missing`

---

## Phase 2: Fix Brainstorm Right Panel Missing (B188)

### Root Cause

`TabGroup` does not proxy `renderRightPanel()` or `bindToolbar()` from the active sub-view. When the Workspace tab is active, `renderers['workspace']` is a `TabGroup`. `updateUIForPanelState()` in `command-center.js:97` checks `!!renderer.renderRightPanel` — false for `TabGroup` — so the right panel (`context-hub`) is hidden.

Additionally, `TabGroup.switchTo()` doesn't notify the parent when the pill changes, so switching between Skills and Mindmap never triggers a right-panel update.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/modules/tab-group.js` — add `renderRightPanel()`, `bindToolbar()`, `onSubViewSwitch` callback
- `FailSafe/extension/src/roadmap/ui/command-center.js` — wire callback, refine hasContext check

### Changes

**tab-group.js** — Add 3 proxy methods and modify `switchTo`:

```javascript
renderRightPanel() {
  const sv = this.subViews.find(s => s.key === this.activeKey);
  if (!sv?.renderer.renderRightPanel) return null;
  return sv.renderer.renderRightPanel();
}

bindToolbar() {
  const sv = this.subViews.find(s => s.key === this.activeKey);
  sv?.renderer.bindToolbar?.();
}

switchTo(key, hubData) {
  this.activeKey = key;
  this.container.querySelector('.cc-subview-bar')?.querySelectorAll('.cc-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.key === key);
  });
  this.renderActive(hubData);
  this.onSubViewSwitch?.();
}
```

**command-center.js** — Wire callbacks (after line 117, after `updateUIForPanelState` is defined):

```javascript
renderers.agents.onSubViewSwitch = () => updateUIForPanelState();
renderers.governance.onSubViewSwitch = () => updateUIForPanelState();
renderers.workspace.onSubViewSwitch = () => updateUIForPanelState();
```

**command-center.js** — Refine `updateUIForPanelState` (replace lines 97-107):

```javascript
const hasContext = renderer && !!renderer.renderRightPanel;
if (contextHub) {
  if (panelUserCollapsed || !hasContext) {
    contextHub.classList.add('hidden');
  } else {
    const html = renderer.renderRightPanel();
    if (!html) {
      contextHub.classList.add('hidden');
    } else {
      contextHub.classList.remove('hidden');
      contextHub.innerHTML = html;
      if (renderer.bindToolbar) renderer.bindToolbar();
    }
  }
}
```

### Unit Tests

- `src/test/ui/user-stories.spec.ts` — add:
  - `US: Workspace Mindmap sub-view shows right panel with prep bay`
  - `US: Workspace Skills sub-view hides right panel`

---

## Summary

| Phase | File | Lines Before | Est. After | Change |
|-------|------|-------------|-----------|--------|
| 1 | bootstrapServers.ts | ~110 | ~112 | +2 (path fix + logging) |
| 1 | WorkspaceMigration.ts | ~230 | ~230 | path string only |
| 2 | tab-group.js | 54 | ~68 | +14 (3 methods + callback) |
| 2 | command-center.js | 177 | ~184 | +7 (wiring + hasContext) |
