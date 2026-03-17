# Plan: v4.9.7 Diagnostic Fixes

**Current Version**: v4.9.6
**Target Version**: v4.9.7
**Change Type**: hotfix
**Risk Grade**: L2

## Open Questions

None — root causes identified via `/ql-debug` four-layer analysis.

---

## Phase 1: Governance Mode Configuration Gap (P0)

**Root Cause**: `EnforcementEngine.getGovernanceMode()` reads `config.governance?.mode` but `FailSafeConfig` type only has `overseerId` — mode is never read from VS Code settings, always defaults to `"observe"`.

### Affected Files

- `FailSafe/extension/src/shared/types/config.ts` — add `mode` to governance type
- `FailSafe/extension/src/shared/ConfigManager.ts` — read `failsafe.governance.mode` setting

### Changes

**config.ts:51-54** — Add `mode` to governance interface:

```typescript
governance?: {
  mode?: "observe" | "assist" | "enforce";
  overseerId: string;
};
```

**ConfigManager.ts:44-74** — In `getConfig()`, add governance section with mode:

```typescript
governance: {
  mode: sentinelYaml?.governance?.mode ?? config.get<"observe" | "assist" | "enforce">("governance.mode", "observe"),
  overseerId: sentinelYaml?.governance?.overseerId ?? config.get<string>("governance.overseerId", "did:myth:overseer:local"),
},
```

### Unit Tests

- `ConfigManager.test.ts` — verify `getConfig().governance.mode` returns VS Code setting value
- `EnforcementEngine.test.ts` — verify `getGovernanceMode()` returns mode from config, not hardcoded default

---

## Phase 2: Agent Run Capture for External Agents (P1)

**Root Cause**: `AgentRunRecorder` only triggers on `ide.taskStarted` from VS Code tasks. External agents (Claude Code, Copilot) don't emit VS Code task events.

### Affected Files

- `FailSafe/extension/src/sentinel/AgentRunRecorder.ts` — detect external agent sessions via file operation patterns
- `FailSafe/extension/src/extension/bootstrapGovernance.ts` — emit synthetic `ide.taskStarted` on rapid file edits

### Changes

**AgentRunRecorder.ts** — Add file-based session detection:

```typescript
// Add property
private lastFileEditTime = 0;
private rapidEditThreshold = 5000; // 5 seconds

// Add method
handleFileEdit(filePath: string, agentDid: string): void {
  const now = Date.now();
  const timeSinceLastEdit = now - this.lastFileEditTime;
  this.lastFileEditTime = now;

  // If no active run and rapid edits detected, start implicit run
  if (this.activeRuns.size === 0 && timeSinceLastEdit < this.rapidEditThreshold) {
    this.startRun(agentDid || "external-agent", "file-edit", "implicit");
  }

  // Record file edit as step if run is active
  if (this.activeRuns.size > 0) {
    const step: RunStep = {
      seq: 0,
      kind: "file_edit",
      timestamp: new Date().toISOString(),
      title: `File edit: ${path.basename(filePath)}`,
      artifactPath: filePath,
    };
    for (const run of this.activeRuns.values()) {
      run.steps.push({ ...step, seq: run.steps.length + 1 });
    }
  }
}
```

**bootstrapGovernance.ts:113-123** — Wire file edit detection:

```typescript
// In onWillSaveTextDocument handler, after handleFileOperation:
if (core.agentRunRecorder) {
  core.agentRunRecorder.handleFileEdit(event.document.uri.fsPath, "vscode-user");
}
```

### Unit Tests

- `AgentRunRecorder.test.ts` — verify rapid file edits start implicit run
- `AgentRunRecorder.test.ts` — verify file edits recorded as steps when run active

---

## Phase 3: Genome View Data Visibility (P2)

**Root Cause**: `analyzeFailurePatterns()` only queries `WHERE remediation_status = 'UNRESOLVED'`. If all entries resolved or none exist, view shows empty.

### Affected Files

- `FailSafe/extension/src/qorelogic/shadow/ShadowGenomeManager.ts` — add method for all patterns
- `FailSafe/extension/src/roadmap/routes/AgentApiRoute.ts` — expose both filtered and all patterns
- `FailSafe/extension/src/roadmap/ui/modules/genome.js` — show all patterns with status filter

### Changes

**ShadowGenomeManager.ts** — Add `analyzeAllPatterns()` method:

```typescript
async analyzeAllPatterns(): Promise<FailurePattern[]> {
  if (!this.db) { return []; }
  const rows = this.db.prepare(`
    SELECT
      failure_mode,
      remediation_status,
      COUNT(*) as count,
      GROUP_CONCAT(DISTINCT agent_did) as agent_dids,
      GROUP_CONCAT(causal_vector, '|||') as causes
    FROM shadow_genome
    GROUP BY failure_mode, remediation_status
    ORDER BY count DESC
  `).all() as Array<{ failure_mode: FailureMode; remediation_status: RemediationStatus; count: number; agent_dids: string | null; causes: string | null }>;

  return rows.map(row => ({
    failureMode: row.failure_mode,
    count: row.count,
    agentDids: row.agent_dids ? row.agent_dids.split(',') : [],
    recentCauses: row.causes ? row.causes.split('|||').slice(0, 3) : [],
    remediationStatus: row.remediation_status,
  }));
}
```

**AgentApiRoute.ts:29-34** — Return both pattern sets:

```typescript
app.get("/api/v1/genome", async (req: Request, res: Response) => {
  if (deps.rejectIfRemote(req, res)) return;
  const patterns = await deps.getGenomePatterns();
  const allPatterns = await deps.getGenomeAllPatterns();
  const unresolved = await deps.getGenomeUnresolved(50);
  res.json({ patterns, allPatterns, unresolved });
});
```

**genome.js:35-61** — Add toggle for showing all vs unresolved:

```typescript
// Add property
this.showAll = false;

// Add toggle button in render
<button class="cc-btn cc-genome-toggle" style="margin-bottom:12px">
  ${this.showAll ? 'Show Unresolved Only' : 'Show All Patterns'}
</button>

// Bind toggle
this.container.querySelector('.cc-genome-toggle')?.addEventListener('click', () => {
  this.showAll = !this.showAll;
  this.render();
});

// Use appropriate pattern set
const displayPatterns = this.showAll ? this.allPatterns : this.patterns;
```

### Unit Tests

- `ShadowGenomeManager.test.ts` — verify `analyzeAllPatterns()` returns all statuses
- `genome.test.js` — verify toggle switches between pattern sets

---

## Phase 4: Timeline Entry Expansion (P2)

**Root Cause**: `TimelineRenderer.renderEntries()` creates static HTML with no click handlers or expandable detail sections.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/modules/timeline.js` — add click-to-expand functionality

### Changes

**timeline.js:71-86** — Add expandable detail like transparency.js:

```typescript
renderEntries() {
  if (!this.entries.length) {
    // ... empty state unchanged
  }
  const rows = this.entries.slice(0, 50).map(e => {
    const sevColors = { error: 'var(--accent-red)', warning: 'var(--accent-gold)', info: 'var(--accent-cyan)' };
    const color = sevColors[e.severity] || 'var(--text-muted)';
    const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
    return `
      <div class="cc-timeline-entry" style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-left:3px solid ${color};
        background:rgba(0,0,0,0.12);border-radius:4px;margin-bottom:6px;cursor:pointer">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="cc-badge" style="background:${color};color:#fff;font-size:0.65rem;min-width:50px;text-align:center">${esc(e.category || 'event')}</span>
          <div style="flex:1">
            <div style="font-size:0.83rem;color:var(--text-main)">${esc(e.summary || e.type || 'Event')}</div>
            ${e.agentDid ? `<div style="font-size:0.7rem;color:var(--text-muted)">Agent: ${esc(e.agentDid.slice(0, 12))}...</div>` : ''}
          </div>
          <span style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono)">${esc(time)}</span>
        </div>
        <pre class="cc-timeline-detail" style="display:none;margin:0;font-size:0.7rem;
          overflow-x:auto;color:var(--console-text);background:var(--console-bg);
          padding:8px;border-radius:6px">${esc(JSON.stringify(e.payload || e, null, 2))}</pre>
      </div>`;
  }).join('');
  return `<div style="max-height:600px;overflow-y:auto">${rows}</div>`;
}
```

**timeline.js:89-102** — Add entry click binding:

```typescript
bindFilters() {
  // ... existing filter bindings

  // Bind entry expansion
  this.container.querySelectorAll('.cc-timeline-entry').forEach(entry => {
    entry.addEventListener('click', () => {
      const detail = entry.querySelector('.cc-timeline-detail');
      if (detail) {
        detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
      }
    });
  });
}
```

### Unit Tests

- `timeline.test.js` — verify click toggles detail visibility
- `timeline.test.js` — verify payload JSON is escaped and displayed

---

## Phase 5: Clickable Blocked Message Navigation (P2)

**Root Cause**: Sentinel alert in Monitor shows blocked verdicts but clicking only opens generic Command Center — no direct navigation to specific audit entries.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/roadmap.js` — pass verdict IDs to audit navigation
- `FailSafe/extension/src/roadmap/ui/modules/transparency.js` — support URL hash-based entry highlighting
- `FailSafe/extension/src/roadmap/ui/command-center.js` — parse hash params on load

### Changes

**roadmap.js:295-309** — Pass verdict context to navigation:

```typescript
renderSentinel(status, verdicts) {
  // ... existing code until onclick

  // Collect blocked verdict IDs for navigation
  const blockedVerdicts = verdicts.filter(v =>
    ['BLOCK', 'ESCALATE', 'QUARANTINE'].includes(String(v.decision || ''))
  );
  const verdictIds = blockedVerdicts.map(v => v.id || v.timestamp).join(',');

  this.elements.sentinelAlert.onclick = () => {
    window.open(`/command-center.html#governance:audit?highlight=${encodeURIComponent(verdictIds)}`, '_blank');
  };
}
```

**transparency.js** — Add highlight support:

```typescript
// Add property
this.highlightIds = [];

// In render(), after DOM setup:
this.parseHighlightParams();
this.highlightEntries();

parseHighlightParams() {
  const hash = window.location.hash;
  const match = hash.match(/highlight=([^&]+)/);
  if (match) {
    this.highlightIds = decodeURIComponent(match[1]).split(',');
  }
}

highlightEntries() {
  if (!this.highlightIds.length) return;
  this.container.querySelectorAll('.cc-card').forEach(card => {
    const entryTime = card.querySelector('[data-entry-time]')?.dataset.entryTime;
    if (entryTime && this.highlightIds.includes(entryTime)) {
      card.style.border = '2px solid var(--accent-red)';
      card.style.animation = 'pulse 1s ease-in-out 3';
      // Auto-expand the highlighted entry
      const detail = card.querySelector('.cc-payload-detail');
      if (detail) detail.style.display = 'block';
    }
  });
  // Scroll to first highlighted
  const first = this.container.querySelector('[style*="border: 2px solid var(--accent-red)"]');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

**transparency.js:127-145** — Add data attribute for entry identification:

```typescript
appendCard(entry) {
  // ... existing card creation
  card.innerHTML = `
    <div style="..." data-entry-time="${this.esc(entry.time)}">
      <!-- ... rest of card content -->
    </div>
  `;
}
```

**command-center.js** — Parse hash on load for tab navigation:

```typescript
// In init or DOMContentLoaded:
const hash = window.location.hash;
if (hash.startsWith('#governance:audit')) {
  // Click governance tab
  document.querySelector('.tab-btn[data-target="governance"]')?.click();
  setTimeout(() => {
    // Click audit subtab
    document.querySelector('.sub-tab-btn[data-subtab="audit"]')?.click();
  }, 100);
}
```

### Unit Tests

- `roadmap.test.js` — verify blocked verdict IDs included in navigation URL
- `transparency.test.js` — verify highlight param parses and applies styles
- `transparency.test.js` — verify highlighted entries auto-expand and scroll into view

---

## Backlog Items

Add to `docs/BACKLOG.md`:

```markdown
### v4.9.7 Diagnostic Fixes

- [ ] [B181] Phase 1: Fix governance mode config gap — add mode to FailSafeConfig, read from VS Code settings | v4.9.7
- [ ] [B182] Phase 2: Agent run capture for external agents — file-based session detection, implicit run creation | v4.9.7
- [ ] [B183] Phase 3: Genome view data visibility — show all patterns with status filter toggle | v4.9.7
- [ ] [B184] Phase 4: Timeline entry expansion — click-to-expand detail sections | v4.9.7
- [ ] [B185] Phase 5: Clickable blocked message navigation — direct audit log linking with highlighting | v4.9.7
```

---

## Summary

| Phase | Priority | Files Changed | Complexity |
|-------|----------|---------------|------------|
| 1. Governance Mode | P0 | 2 | Low |
| 2. Agent Run Capture | P1 | 2 | Medium |
| 3. Genome View | P2 | 3 | Medium |
| 4. Timeline Expand | P2 | 1 | Low |
| 5. Blocked Navigation | P2 | 3 | Medium |

**Total**: 11 file changes, 5 unit test files

---

_Plan follows Simple Made Easy principles — each phase is independent and can be implemented/tested in isolation._
