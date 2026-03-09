# Architecture Plan

## Risk Grade: L3

### Risk Assessment

- [x] Contains security/auth logic -> L3
- [x] Modifies existing APIs -> L2
- [ ] UI-only changes -> L1

**Rationale**: FailSafe contains TrustEngine, EnforcementEngine, PolicyEngine, and CryptoService - all security-critical components requiring mandatory /ql-audit before any changes.

---

## Version Roadmap Reference

| Version | Codename | Focus |
|---------|----------|-------|
| **1.0.x** | Foundation | Current stable: governance core, basic visualization |
| **1.1.0** | Pathfinder | Event-sourced Plans, YAML persistence |
| **1.2.0** | Navigator | Roadmap View MVP (SVG road visualization) |
| **1.3.0** | Autopilot | Governance integration (auto-progress tracking) |
| **2.0.0** | Governance | Gold Standard skills + ambient integration (B12-B28) |
| **3.0.0** | Horizon | Alternate views, Token ROI, Claude unified build (B6-B11, B29) |
| **4.0.0** | Economics | Token economics, governance modes, risk register, transparency |
| **4.1.0** | Governance Gaps | Break-glass, artifact hash, verdict replay, mode-change audit |
| **4.2.0** | The Answer | Multi-agent governance fabric, intent schema v2, discovery phase |

### Architecture Change (v3.0.0) - Three-Build Model

**Decision**: Three PROD-Extension builds target different AI toolchains. Claude Code commands and SHIELD skills are maintained in the Claude build. Antigravity and VSCode builds use their native AI integrations (Gemini and Copilot respectively) without Claude Code commands.

| Build | Contents | Destination |
|-------|----------|-------------|
| **Antigravity** | Gemini workflows | OpenVSX |
| **VSCode** | Copilot prompts | VS Code Marketplace |
| **Claude** | Claude commands + SHIELD skills | Claude Code CLI |

`.claude/commands/` exists only under `PROD-Extension/Claude/`.

**Planning Sources**:
- `plan-roadmap-visualization.md` - Roadmap & accountability layer
- `plan-ui-clarity.md` - UI discoverability enhancements
- `plan-beta-release.md` - Marketplace requirements
- `Planning/plan-repo-gold-standard.md` - v2.0.0 Governance suite

---

## File Tree (The Contract)

### Current Structure (v3.0.2 - Physical Isolation)

```
FailSafe/extension/src/
|-- extension/
|   `-- main.ts                    # Extension entry point
|-- genesis/
|   |-- GenesisManager.ts          # Core genesis orchestration
|   |-- FeedbackManager.ts         # User feedback handling
|   |-- cortex/
|   |   `-- IntentScout.ts         # Intent detection
|   |-- decorators/
|   |   `-- HallucinationDecorator.ts
|   |-- panels/
|   |   |-- DashboardPanel.ts
|   |   |-- LedgerViewerPanel.ts
|   |   |-- L3ApprovalPanel.ts
|   |   `-- LivingGraphPanel.ts
|   `-- views/
|       |-- CortexStreamProvider.ts
|       |-- DojoViewProvider.ts
|       `-- LivingGraphProvider.ts
|-- governance/
|   |-- EnforcementEngine.ts       # CRITICAL: Policy enforcement
|   |-- GovernanceRouter.ts        # Route governance decisions
|   |-- IntentService.ts           # Intent management
|   |-- IntentStore.ts             # Intent persistence
|   |-- SessionManager.ts          # Session tracking
|   |-- EvaluationRouter.ts        # Evaluation routing
|   `-- types/
|       `-- IntentTypes.ts
|-- sentinel/
|   |-- SentinelDaemon.ts          # Background monitoring
|   |-- VerdictArbiter.ts          # Verdict decisions
|   |-- VerdictRouter.ts           # Verdict routing
|   |-- PatternLoader.ts           # Pattern loading
|   `-- engines/
|       |-- VerdictEngine.ts
|       |-- HeuristicEngine.ts
|       |-- ArchitectureEngine.ts
|       `-- ExistenceEngine.ts
|-- qorelogic/
|   |-- QoreLogicManager.ts        # QoreLogic orchestration
|   |-- FrameworkSync.ts           # Framework synchronization
|   |-- PluginRegistry.ts          # Plugin management
|   |-- SystemRegistry.ts          # System registration
|   |-- policies/
|   |   `-- PolicyEngine.ts        # CRITICAL: Policy evaluation
|   |-- trust/
|   |   `-- TrustEngine.ts         # CRITICAL: Trust computation
|   |-- shadow/
|   |   |-- ShadowGenomeManager.ts
|   |   |-- RetentionPolicy.ts
|   |   `-- SchemaVersionManager.ts
|   `-- ledger/
|       `-- LedgerManager.ts       # Merkle ledger
|-- shared/
|   |-- CryptoService.ts           # CRITICAL: Cryptographic ops
|   |-- ConfigManager.ts           # Configuration
|   |-- EventBus.ts                # Event handling
|   |-- Logger.ts                  # Logging
|   |-- LRUCache.ts                # Caching
|   `-- utils/
|       |-- security.ts            # CRITICAL: Security utils
|       |-- htmlSanitizer.ts
|       `-- capabilities.ts
`-- mcp/
    `-- FailSafeServer.ts          # MCP server interface
```

### Planned Additions (v1.1.0 Pathfinder - Phase A) ✅ IMPLEMENTED

```
FailSafe/extension/src/qorelogic/planning/    # IMPLEMENTED
|-- types.ts                         # Plan, PlanPhase, Blocker, RiskMarker types
|-- events.ts                        # Event-sourced plan events (append-only)
|-- validation.ts                    # Dependency cycle detection, topological sort
`-- PlanManager.ts                   # Event-sourced plan state + YAML I/O
```

**Storage**: `.failsafe/plans.yaml` (events, not state)

### Planned Additions (v1.2.0 Navigator - Phase B) ✅ IMPLEMENTED

```
FailSafe/extension/src/genesis/views/
`-- RoadmapViewProvider.ts           # IMPLEMENTED: SVG road visualization
```

RoadmapPanel.ts was deferred indefinitely; roadmap UI is served by RoadmapViewProvider.

### Planned Additions (v1.3.0 Autopilot - Phase C) ✅ IMPLEMENTED

**Modified files only** (governance integration):
- `GovernanceRouter.ts` - Emit plan events on file operations ✅
- `DojoViewProvider.ts` - Link to Roadmap view ✅
- `main.ts` - Wire PlanManager at activation ✅

### Planned Additions (v4.1.0 Time-Travel Rollback) ✅ IMPLEMENTED

```
FailSafe/extension/src/governance/revert/    # NEW MODULE (zero vscode deps)
|-- types.ts                                 # CheckpointRef, RevertRequest, RevertResult
|-- GitResetService.ts                       # Git status/log/reset via spawn (with hash validation)
`-- FailSafeRevertService.ts                 # Orchestrator: git + RAG purge + ledger seal (TOCTOU guard)

FailSafe/extension/src/sentinel/
`-- SentinelJsonlFallback.ts                 # Extracted JSONL ops (atomic write)

FailSafe/extension/src/genesis/panels/
|-- RevertPanel.ts                           # VS Code webview (confirmation + result)
`-- templates/
    `-- RevertTemplate.ts                    # HTML template (timeline + confirm modal + cancel handler)

FailSafe/extension/src/test/governance/revert/
|-- GitResetService.test.ts                  # Git command mocking + hash validation tests
`-- FailSafeRevertService.test.ts            # Orchestration + partial failure + TOCTOU tests
```

### Planned Additions (v4.0.0 Token Economics) ✅ IMPLEMENTED

```
FailSafe/extension/src/economics/          # NEW MODULE (zero vscode deps)
|-- types.ts                               # PromptDispatchPayload, EconomicsSnapshot, ModelPricing
|-- CostCalculator.ts                      # Pure functions: calculateCost, calculateSavings, formatCurrency
|-- EconomicsPersistence.ts                # JSON file storage with atomic write
`-- TokenAggregatorService.ts              # EventBus subscriber, API-first interface

FailSafe/extension/src/genesis/panels/
|-- EconomicsPanel.ts                      # VS Code webview (loads from service API)
`-- templates/
    `-- EconomicsTemplate.ts               # HTML template (generic JSON schema consumer)

FailSafe/extension/src/test/economics/
|-- CostCalculator.test.ts                 # Pricing logic tests
|-- EconomicsPersistence.test.ts           # Load/save round-trip tests
`-- TokenAggregatorService.test.ts         # Event handling + snapshot tests
```

### Planned Additions (v3.0.0 Horizon - Phase D) 📋 PLANNED

```
FailSafe/extension/src/genesis/components/    # PLANNED FOLDER
|-- KanbanView.ts                    # Kanban column visualization
|-- TimelineView.ts                  # Gantt-style timeline
|-- RoadmapSvgView.ts                # Reusable SVG roadmap component
`-- index.ts                         # Component exports

FailSafe/extension/src/genesis/panels/
|-- RoadmapPanelWindow.ts            # Full-screen planning window
`-- AnalyticsDashboardPanel.ts       # Token ROI dashboard

FailSafe/extension/src/qorelogic/planning/
|-- types.ts                         # + Milestone type
`-- PlanManager.ts                   # + Milestone/risk methods
```

**Build Architecture Change**:
```
FailSafe/PROD-Extension/
|-- Antigravity/                     # Gemini workflows
|   |-- .agent/workflows/
|   `-- .qorelogic/orbits/
|-- Claude/                          # Claude commands (existing)
|   `-- .claude/commands/
`-- VSCode/                          # Copilot prompts
    |-- .github/prompts/
    `-- .github/copilot-instructions/
```

### Planned Additions (UI Clarity Enhancement) ✅ IMPLEMENTED

```
FailSafe/extension/src/shared/
|-- styles/
|   `-- common.ts                    # IMPLEMENTED: Shared CSS constants
|-- components/
|   `-- InfoHint.ts                  # IMPLEMENTED: Reusable help tooltips
`-- content/
    `-- quickstart.ts                # IMPLEMENTED: Quick start guide content
```

---

## Interface Contracts

### EnforcementEngine
- **Input**: Intent object, policy context
- **Output**: Verdict (ALLOW | DENY | ESCALATE)
- **Side Effects**: Logs to audit trail, may trigger L3 approval flow

### TrustEngine
- **Input**: Agent identity, action context, history
- **Output**: Trust score (0.0 - 1.0)
- **Side Effects**: Updates trust cache, emits trust events

### PolicyEngine
- **Input**: Policy rules, evaluation context
- **Output**: Policy evaluation result
- **Side Effects**: None (pure evaluation)

### SentinelDaemon
- **Input**: Monitoring configuration
- **Output**: Anomaly alerts, pattern matches
- **Side Effects**: Background thread, event emissions

### PlanManager (v1.1.0+)
- **Input**: Plan events (create, phase.started, artifact.touched, blocker.added)
- **Output**: Derived plan state (phases, progress, blockers)
- **Side Effects**: Persists events to YAML, emits events to UI via EventBus

### RoadmapViewProvider (v1.2.0+)
- **Input**: Plan state from PlanManager
- **Output**: SVG road visualization
- **Side Effects**: Handles webview messages (requestApproval, takeDetour, setViewMode)

---

## Data Flow

### Core Governance Flow (Current)

```
[Agent Intent] -> [IntentScout] -> [GovernanceRouter] -> [PolicyEngine]
                                                              |
                                                              v
                                                       [TrustEngine]
                                                              |
                                                              v
                                                    [EnforcementEngine]
                                                              |
                                         +--------------------+--------------------+
                                         |                    |                    |
                                         v                    v                    v
                                      [ALLOW]             [DENY]             [ESCALATE]
                                         |                    |                    |
                                         v                    v                    v
                                    [Execute]            [Block]          [L3ApprovalPanel]
```

### Plan Progress Flow (v1.3.0+)

```
[Intent Created] -> [Plan Created] -> [Roadmap Renders]
        |
        v
[File Write Allowed] -> [GovernanceRouter] -> [PlanManager.recordArtifactTouch()]
        |
        v
[Progress Updated] -> [EventBus.emit()] -> [RoadmapViewProvider.render()]
        |
        v
[Phase Complete] -> [Next Phase Activates]
```

---

## Dependencies

| Package | Justification | Vanilla Alternative |
|---------|---------------|---------------------|
| better-sqlite3 | High-performance SQLite for ledger | No - native SQLite critical for perf |
| vscode | Extension API | No - required for VSCode extension |
| js-yaml | Plan persistence (v1.1.0+) | No - standard YAML library |
| d3 | Visualization (existing) | No - required for graphs |
| zod | Schema validation | No - runtime type safety |

---

## Section 4 Razor Pre-Check

**Limits**: Functions <= 40 lines | Files <= 250 lines | Nesting <= 3 levels

### Compliant Files

| File | Max Fn Lines | File Lines | Max Nesting | Status |
|------|-------------|------------|-------------|--------|
| `governance/IntentService.ts` | 26 | 105 | 2 | PASS |
| `qorelogic/planning/validation.ts` | 37 | 224 | 3 | PASS |

### Grandfathered Files (pre-existing, exceed limits)

These files existed before the Razor contract was adopted. They are acknowledged as over-limit and tracked for future decomposition. No new code may increase their line counts or max function lengths.

| File | Max Fn Lines | File Lines | Violation | Freeze Rule |
|------|-------------|------------|-----------|-------------|
| `qorelogic/planning/PlanManager.ts` | 122 (applyEvent) | 490 | File +240, Fn +82 | No growth. applyEvent must be split before next feature addition. |
| `qorelogic/planning/events.ts` | 63 (applyEvent) | 353 | File +103, Fn +23 | No growth. applyEvent switch must be decomposed. |
| `qorelogic/planning/types.ts` | 0 (types only) | 282 | File +32 | No growth. Type-only file; split when next type group added. |
| `genesis/views/RoadmapViewProvider.ts` | 54 (getStyles) | 350 | File +100, Fn +14 | No growth. getStyles must be extracted to CSS constant. |
| `roadmap/ui/roadmap.js` | 35 (getPhaseInfo) | 507 | File +257 | No growth. File must be decomposed before next feature addition. |

All values measured via `wc -l` and manual method-boundary counting on 2026-03-09.

---

## Simple Made Easy Checklist

- [x] **Values over state**: Event-sourced design (append-only events, derived state)
- [x] **Composable**: PlanManager, validation, events are separate modules
- [x] **Declarative**: Plans described as data (YAML), not imperative procedures
- [x] **No complecting**: Persistence (YAML) separate from business logic (events)
- [x] **Fail fast**: Dependency cycle detection before plan creation

---
*Blueprint amended per Entry #141 GATE PASS. Remediation of V1-V8 applied.*
