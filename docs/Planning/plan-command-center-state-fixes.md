# Plan: Command Center State Management Fixes

## Open Questions

- Should the ConnectionClient cache hub data internally, or should state caching be the responsibility of each renderer?
- Should wake word/voice features be disabled entirely in VSCode webview context, or show a "not available" banner?

---

## Phase 1: Tab Switch State Persistence

### Problem

When switching tabs in Command Center, renderers receive empty `{}` data instead of cached hub state, causing UI to show stale/incorrect values (e.g., "Halted" sentinel status).

### Affected Files

- [command-center.js](../../FailSafe/extension/src/roadmap/ui/command-center.js) - Tab click handler passes empty object to render()
- [connection.js](../../FailSafe/extension/src/roadmap/ui/modules/connection.js) - Add `lastHubData` caching

### Changes

**connection.js** - Cache last hub data:

```javascript
// Add property in constructor
this.lastHubData = null;

// Update fetchHub() method
async fetchHub() {
  try {
    const res = await fetch(`${this.baseUrl}/api/hub`);
    if (!res.ok) throw new Error(`Hub request failed (${res.status})`);
    const payload = await res.json();
    this.lastHubData = payload;  // Cache for tab switches
    this.notify('hub', payload);
    return payload;
  } catch (error) {
    console.error("Failed to load hub data:", error);
    return null;
  }
}
```

**command-center.js** - Use cached data on tab switch:

```javascript
// Line 122: Change from
if (renderer) renderer.render?.({});

// To:
if (renderer && client.lastHubData) {
  renderer.render?.(client.lastHubData);
}
```

### Unit Tests

- [command-center.test.js] - Tab switch preserves sentinel running state from cached hubData
- [connection.test.js] - lastHubData is populated after fetchHub() call
- [connection.test.js] - lastHubData survives WebSocket reconnection

---

## Phase 2: Scaffold Callback Initialization

### Problem

"Install Skills" button calls `/api/actions/scaffold-skills` which returns 501 because `scaffoldCallback` is never set during extension activation.

### Affected Files

- [bootstrapServers.ts](../../FailSafe/extension/src/extension/bootstrapServers.ts) - Missing setScaffoldCallback call
- [WorkspaceMigration.ts](../../FailSafe/extension/src/qorelogic/WorkspaceMigration.ts) - Has scaffoldBundledSkills but it's private/internal

### Changes

**bootstrapServers.ts** - Add scaffold callback registration after ConsoleServer creation:

```typescript
// After line 60 (consoleServer.start())
consoleServer.setScaffoldCallback(async () => {
  const bundledPath = path.join(context.extensionPath, "skills");
  const targetDir = path.join(deps.workspaceRoot, ".claude", "skills");

  let scaffolded = 0;
  let skipped = 0;

  try {
    await fs.promises.access(bundledPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const bundledFiles = await collectMarkdownFiles(bundledPath);
    for (const sourcePath of bundledFiles) {
      const skillName = path.basename(path.dirname(sourcePath));
      if (skillName === "skills" || skillName === ".") continue;

      const targetSkillDir = path.join(targetDir, skillName);
      const targetPath = path.join(targetSkillDir, "SKILL.md");

      try {
        await fs.promises.access(targetPath);
        skipped++;
      } catch {
        await fs.promises.mkdir(targetSkillDir, { recursive: true });
        await fs.promises.copyFile(sourcePath, targetPath);
        scaffolded++;
      }
    }
  } catch {
    // bundledPath doesn't exist - no skills to scaffold
  }

  return { scaffolded, skipped };
});
```

Add imports at top:
```typescript
import * as fs from "fs";
import * as path from "path";
import { collectMarkdownFiles } from "../roadmap/services/SkillFileUtils";
```

### Unit Tests

- [bootstrapServers.test.ts] - scaffoldCallback is set on consoleServer after bootstrap
- [ActionsRoute.test.ts] - POST /api/actions/scaffold-skills returns 200 when callback is set

---

## Phase 3: Phase Title/Index Synchronization

### Problem

Active build step shows "PLAN" title but "Implement" step is highlighted. The title and index are computed from different data sources.

### Affected Files

- [roadmap.js](../../FailSafe/extension/src/roadmap/ui/roadmap.js) - getPhaseInfo() has inconsistent logic

### Changes

**roadmap.js** - Unify title and index computation:

```javascript
getPhaseInfo(plan) {
  const runState = this.hub?.runState;

  // If IDE is actively debugging or building, that takes precedence
  if (runState && runState.currentPhase && runState.currentPhase !== 'Plan') {
    const title = runState.currentPhase;
    const normalized = title.toLowerCase();
    let index = 0;  // Default to Plan index

    if (normalized.startsWith('debug')) index = 3;
    else if (normalized.startsWith('build') || normalized.includes('implement')) index = 2;
    else if (normalized.includes('audit') || normalized.includes('review')) index = 1;
    else if (normalized.includes('substantiat') || normalized.includes('release')) index = 4;

    return { title, index };
  }

  // Fall back to plan phase data
  const phases = Array.isArray(plan?.phases) ? plan.phases : [];
  const active = phases.find((phase) => phase.id === plan?.currentPhaseId)
    || phases.find((phase) => phase.status === 'active')
    || phases[0]
    || null;

  const title = String(active?.title || 'Plan');
  const normalized = title.toLowerCase();
  let index = 0;

  if (normalized.includes('substantiat') || normalized.includes('release')) index = 4;
  else if (normalized.includes('debug') || normalized.includes('fix')) index = 3;
  else if (normalized.includes('implement') || normalized.includes('build')) index = 2;
  else if (normalized.includes('audit') || normalized.includes('review')) index = 1;

  return { title, index };
}
```

Key fix: Both branches now use consistent keyword matching for index computation, and default index is 0 (Plan) not 2 (Implement).

### Unit Tests

- [roadmap.test.js] - getPhaseInfo returns index=0 and title="Plan" when no active phase
- [roadmap.test.js] - getPhaseInfo returns matching title and index for "Debug: xyz"
- [roadmap.test.js] - getPhaseInfo returns matching title and index for "Implement" phase

---

## Phase 4: Platform Feature Feedback (Voice/Wake Word)

### Problem

Wake word and voice recording fail silently in VSCode webview because Web Speech API is unavailable. Users see no feedback.

### Affected Files

- [wake-word-listener.js](../../FailSafe/extension/src/roadmap/ui/modules/wake-word-listener.js) - Silent return when SpeechRecognition unavailable
- [stt-engine.js](../../FailSafe/extension/src/roadmap/ui/modules/stt-engine.js) - No error feedback for model load failure

### Changes

**wake-word-listener.js** - Add explicit error reporting:

```javascript
start() {
  if (!this.SpeechRecognitionCtor) {
    // Report unavailability to caller
    this.onError?.('Voice activation unavailable in this environment');
    return false;
  }
  // ... rest of existing start logic
  return true;
}
```

**stt-engine.js** - Add model load failure feedback:

```javascript
async startListening() {
  if (!this._whisperReady) {
    this.onError?.('Voice model not loaded - check network connection');
    return false;
  }
  // ... rest of existing logic
}
```

**brainstorm.js** - Handle errors and show user feedback:

```javascript
// In voice initialization
voice.stt.onError = (msg) => {
  showStatus(msg, 'var(--accent-red)');
};
voice.wakeWord.onError = (msg) => {
  showStatus(msg, 'var(--accent-red)');
};
```

### Unit Tests

- [wake-word-listener.test.js] - start() returns false and calls onError when SpeechRecognition unavailable
- [stt-engine.test.js] - startListening() returns false and calls onError when model not loaded

---

## Phase 5: Gemini Nano Detection Bug

### Problem

Gemini Nano shows "Enable?" even when Chrome flags ARE enabled and user is in Chrome browser. The detection code at `recheckNative()` doesn't handle all `capabilities()` return states properly.

The Prompt API `capabilities()` can return:
- `'readily'` - model ready (handled)
- `'after-download'` - needs download (handled)
- `'no'` - **not available on this hardware** (NOT HANDLED - silent failure)

Additionally, `browserSupported` check only looks at user agent, not actual API availability.

### Affected Files

- [web-llm-engine.js](../../FailSafe/extension/src/roadmap/ui/modules/web-llm-engine.js) - `recheckNative()` doesn't handle `'no'` status
- [llm-status.js](../../FailSafe/extension/src/roadmap/ui/modules/llm-status.js) - `_getRowInfo()` shows misleading "Enable?"
- [connection.js](../../FailSafe/extension/src/roadmap/ui/modules/connection.js) - `webLlmState` needs `unavailableReason` field

### Changes

**web-llm-engine.js** - Track unavailability reason:

```javascript
constructor(store) {
  // ... existing code ...
  this.isNativeAiAvailable = false;
  this.nativeUnavailableReason = null;  // NEW: 'no-api' | 'not-supported' | 'download-failed' | null
}

async recheckNative() {
  try {
    const ai = globalThis.ai || globalThis.model;
    const lm = ai?.languageModel || ai?.assistant;
    if (!lm) {
      this.nativeUnavailableReason = 'no-api';  // API not exposed
      return false;
    }

    const status = await lm.capabilities();
    console.info('FailSafe WebLLM: Native AI capabilities =', status.available);

    if (status.available === 'readily') {
      this.isNativeAiAvailable = true;
      this.nativeUnavailableReason = null;
      // ... existing success handling ...
      return true;
    }

    if (status.available === 'after-download') {
      // ... existing download handling ...
      return true;
    }

    if (status.available === 'no') {
      this.nativeUnavailableReason = 'not-supported';  // Hardware/config not supported
      this.onStatusChange?.('native-not-supported');
      return false;
    }

    // Unknown status
    this.nativeUnavailableReason = 'unknown';
    return false;
  } catch (err) {
    console.info('FailSafe WebLLM: Native AI probe failed:', err.message);
    this.nativeUnavailableReason = 'probe-error';
    return false;
  }
}
```

**connection.js** - Propagate reason in state:

```javascript
this.webLlmState = {
  nativeAvailable: false,
  nativeUnavailableReason: null,  // NEW
  wasmReady: false,
  loading: false,
  browserSupported: isChrome || isEdge
};
```

**llm-status.js** - Show accurate status:

```javascript
_getRowInfo(id, state) {
  if (id === 'native') {
    if (state.nativeAvailable) {
      return { label: 'Gemini Nano (Native)', status: '<span style="color:var(--accent-green)">Active ✓</span>', active: true, color: 'var(--text-main)' };
    }

    // Show specific reason instead of generic "Enable?"
    const reason = state.nativeUnavailableReason || this.webLlm.nativeUnavailableReason;

    if (reason === 'not-supported') {
      return { label: 'Gemini Nano (Native)', status: '<span style="opacity:0.5">Not Supported</span>', active: false, color: 'var(--text-muted)' };
    }

    if (reason === 'no-api') {
      // API not exposed - might need flags
      if (!state.browserSupported) {
        return { label: 'Gemini Nano (Native)', status: '<span style="opacity:0.4">Chrome/Edge Only</span>', active: false, color: 'var(--text-muted)' };
      }
      // Browser supported but API missing - show enable help
      const helpLabel = this._helpVisible ? 'Close Help ↑' : 'Enable?';
      return { label: 'Gemini Nano (Native)', status: `<a href="#" class="cc-bs-llm-help-toggle" ...>${helpLabel}</a>`, active: false, color: 'var(--text-muted)' };
    }

    // Default: unknown issue
    return { label: 'Gemini Nano (Native)', status: '<span style="opacity:0.4">Unavailable</span>', active: false, color: 'var(--text-muted)' };
  }
  // ... rest unchanged
}
```

**brainstorm.js** - Propagate reason to client state:

```javascript
this.webLlm.onProgress = () => {
  this.client?.setWebLlmStatus({
    nativeAvailable: this.webLlm.isNativeAiAvailable,
    nativeUnavailableReason: this.webLlm.nativeUnavailableReason,  // NEW
    wasmReady: !!this.webLlm.pipeline,
    loading: this.webLlm.loadingStatus === 'loading' || this.webLlm.loadingStatus === 'downloading'
  });
  this.llmStatus.render(this.client);
};
```

### Unit Tests

- [web-llm-engine.test.js] - recheckNative sets `nativeUnavailableReason = 'not-supported'` when capabilities returns `'no'`
- [web-llm-engine.test.js] - recheckNative sets `nativeUnavailableReason = 'no-api'` when `window.ai` is undefined
- [llm-status.test.js] - Shows "Not Supported" when reason is `'not-supported'`
- [llm-status.test.js] - Shows "Enable?" only when reason is `'no-api'` AND browser is Chrome/Edge

---

## Summary

| Phase | Scope | Risk |
|-------|-------|------|
| 1 | Tab switch state caching | LOW - pure UI state, no backend |
| 2 | Scaffold callback init | MEDIUM - requires import changes |
| 3 | Phase title/index sync | LOW - UI logic fix |
| 4 | Voice feature feedback | LOW - adds error handling |
| 5 | Gemini Nano detection | LOW - better error reporting |

---

_Plan follows Simple Made Easy principles: each fix is isolated, minimal, and addresses root cause._
