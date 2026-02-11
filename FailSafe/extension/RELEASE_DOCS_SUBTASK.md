# FailSafe Release Docs Subtask (README + CHANGELOG Integration)

## Purpose
Create one source-of-truth handoff for documenting current FailSafe UI and skill-governance updates without mixing unverified claims.

## Scope
- Target docs: `FailSafe/extension/README.md`, `FailSafe/extension/CHANGELOG.md`.
- Method: claim-to-source mapping first, then copy-ready sections.
- Constraint: only use status labels `implemented`, `in_progress`, `planned`, `deferred`, `unknown`.

## Claim Map

| Claim | Status | Source |
|---|---|---|
| Compact sidebar webpanel is the UI-02 shell with branded header and legal footer. | implemented | `FailSafe/extension/src/roadmap/ui/index.html:17`, `FailSafe/extension/src/roadmap/ui/index.html:97` |
| Sidebar has a real favicon and header icon via `failsafe-icon.png`. | implemented | `FailSafe/extension/src/roadmap/ui/index.html:7`, `FailSafe/extension/src/roadmap/ui/index.html:15` |
| Sidebar summary now reports `Recently Completed`, `Backlog`, `Wishlist`, `Critical Features`. | implemented | `FailSafe/extension/src/roadmap/ui/index.html:33`, `FailSafe/extension/src/roadmap/ui/roadmap.js:162` |
| Summary metric mapping is data-driven (completed milestones/phases, pending phases, undated milestones, hard blockers + danger risks). | implemented | `FailSafe/extension/src/roadmap/ui/roadmap.js:167`, `FailSafe/extension/src/roadmap/ui/roadmap.js:174` |
| "Open FailSafe Operations Hub" opens a separate window/tab popout from compact UI. | implemented | `FailSafe/extension/src/roadmap/ui/roadmap.js:59` |
| Extension command path also opens the hub externally via VS Code `openExternal`. | implemented | `FailSafe/extension/src/extension/commands.ts:70`, `FailSafe/extension/src/extension/commands.ts:107` |
| Extended popout shell currently resolves to `legacy-index.html` and includes Home/Run/Skills/Reports + All Relevant section. | implemented | `FailSafe/extension/src/test/ui/popout-ui.spec.ts:5`, `FailSafe/extension/src/roadmap/ui/legacy-index.html:36`, `FailSafe/extension/src/roadmap/ui/legacy-index.html:84` |
| Roadmap server exposes installed skills and phase relevance APIs. | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:187`, `FailSafe/extension/src/roadmap/RoadmapServer.ts:193` |
| Skill metadata supports creator/source provenance and admission details, including `SOURCE.yml` ingestion. | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:25`, `FailSafe/extension/src/roadmap/RoadmapServer.ts:651`, `FailSafe/extension/src/roadmap/RoadmapServer.ts:677` |
| Checkpoint ledger persists to SQLite table `failsafe_checkpoints` with chain verification and summary reporting. | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:767`, `FailSafe/extension/src/roadmap/RoadmapServer.ts:1007`, `FailSafe/extension/src/roadmap/RoadmapServer.ts:1058` |
| First-party `/ql` skill metadata is marked with creator `MythologIQ Labs, LLC`. | implemented | `FailSafe/VSCode/skills/compliance/SOURCE.yml:6` |
| External skill source credits are registered in a dedicated registry. | implemented | `FailSafe/VSCode/skills/SOURCE_REGISTRY.md:1` |
| Extension README currently still references older Genesis wording that includes Dojo. | in_progress | `FailSafe/extension/README.md:68` |
| Extension changelog has no concrete entry yet for this UI + skills provenance pass. | in_progress | `FailSafe/extension/CHANGELOG.md:8`, `FailSafe/extension/CHANGELOG.md:10` |

## Copy-Ready README Insert

Add under Highlights or Features:

```md
### Operations Hub UX (UI-02 + Extended Popout)

- Compact sidebar webpanel (`UI-02`) provides phase status, prioritized feature counters, Sentinel state, and workspace health at-a-glance.
- The `Open FailSafe Operations Hub` action opens the extended popout console for deeper workflow views (Run, Skills, Reports, intent packaging).
- Branding is consistent across shell surfaces, including FailSafe icon usage in header and favicon contexts.

### Skill Governance and Provenance

- Installed skills are discovered across canonical project and local/global skill roots.
- Phase-aware relevance ranking returns `recommended`, `allRelevant`, and `otherAvailable` groups.
- Skill cards and APIs include provenance metadata (creator, source repo/path, source type/priority, admission state, trust tier, version pin).
- `SOURCE.yml` metadata is parsed to preserve attribution and authorship for bundled and imported skills.

### Checkpoint Reliability Backbone

- Checkpoint events are recorded in a local SQLite ledger (`failsafe_checkpoints`) with typed events and parent-chain integrity checks.
- Hub APIs expose checkpoint summaries and recent checkpoint history for UI transparency.
```

## Copy-Ready CHANGELOG Insert

Add under `## [Unreleased]`:

```md
### Added

- UI-02 compact sidebar shell for the Operations Hub with FailSafe branding, favicon support, and standardized legal footer.
- Extended popout hub workflow coverage validated by Playwright smoke test (`Home`, `Run`, `Skills`, `Reports`).
- Skill provenance pipeline with `SOURCE.yml` ingestion (creator/source repo/source path/source type/source priority/admission state).
- Skill relevance APIs for phase-aware recommendations (`/api/skills`, `/api/skills/relevance`).
- SQLite-backed checkpoint ledger table (`failsafe_checkpoints`) with checkpoint chain verification and summary APIs.

### Changed

- Compact sidebar feature counters now track `Recently Completed`, `Backlog`, `Wishlist`, and `Critical Features`.
- Operations Hub open action routes to external popout context from both webpanel and command flows.

### Documentation

- Added source registry support for bundled and imported skills to improve attribution traceability.
```

## Integration Checklist

1. Update `FailSafe/extension/README.md` using the copy-ready README block.
2. Replace outdated Genesis wording that references removed/legacy terminology.
3. Update `FailSafe/extension/CHANGELOG.md` under `[Unreleased]` using the copy-ready changelog block.
4. Keep only claims that remain verifiable against current branch files.
5. Re-run tests before release note finalization: `npm run test -- popout-ui.spec.ts`.
