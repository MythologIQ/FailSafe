# Gap Audit: FailSafe Specification vs .qorelogic Implementation

Scope: Only artifacts under `g:\MythologIQ\Q-DNA\.qorelogic`.

## Snapshot of Current Implementation

- VS Code extension scaffold with Genesis, Sentinel, and QoreLogic modules exists.
- Event bus wiring, basic UI panels, and minimal Sentinel heuristics are implemented.
- Ledger is JSON-backed with Merkle-like chaining; no DB backing.
- L3 queue exists in workspace state; approval UI exists.

## Gaps (Spec vs Implementation)

1. Storage + runtime assets

- Spec calls for `.failsafe` files (config JSON/YAML, keystore, cache, shadow genome DB, ledger DB).
- Implementation only creates directories and a JSON ledger file.
- No shadow genome archival or keystore handling.
- Evidence: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\shared\ConfigManager.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\ledger\LedgerManager.ts`.

2. Sentinel feature coverage

- Pattern library is hardcoded; no YAML load/custom patterns.
- No file existence or dependency validation; complexity is simplified regex count.
- No operational mode enforcement (normal/lean/surge/safe) or backpressure logic.
- LLM evaluation response is not parsed for confidence or risk grade.
- Evidence: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\SentinelDaemon.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\engines\HeuristicEngine.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\engines\VerdictEngine.ts`.

3. QoreLogic governance coverage

- Trust data is in-memory only; no persistence or stats tracking.
- Shadow Genome is not implemented.
- Policy loading is limited to JSON overrides; no persona/workflow ingestion.
- Evidence: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\QoreLogicManager.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\trust\TrustEngine.ts`.

4. Genesis / UI coverage

- Living Graph data is empty; full dependency graph build is TODO.
- LivingGraphProvider is implemented but not registered; Sentinel sidebar view is declared but not wired.
- Full-screen graph panel is a placeholder.
- Cortex Omnibar only uses simple keyword matching and does not render responses into stream/graph.
- Evidence: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\GenesisManager.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\views\LivingGraphProvider.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\panels\LivingGraphPanel.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\cortex\IntentScout.ts`.

5. Manifest and spec drift

- Spec lists `main` at `./out/extension/main.js`, implementation uses `./out/extension.js`.
- Spec lacks implemented commands/config keys (`approveL3`, `genesis.theme`, `sentinel.enabled`, `ollamaEndpoint`, `l3SLA`).
- Evidence: `g:\MythologIQ\Q-DNA\.qorelogic\FAILSAFE_SPECIFICATION.md`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\package.json`.

6. Platform support claims

- Spec claims Antigravity/MCP/CLI integration but only VS Code extension exists in `.qorelogic`.

7. Governance Substrate (Axioms & Sovereignty)

- System lacks "Non-negotiable laws" in code; currently relies on "Interpretation".
- No explicit "Intent-Action" binding artifact.
- Survivability across cold restarts is not yet proven/implemented in a way that "Locks" the session.
- Integration contract for execution systems is non-existent.

## Remediation Plan (Start-to-Finish, Token-Efficient Sprints)

Design goal: each sprint is narrow in scope, touches few files, and minimizes cross-context dependencies.

### Milestone M0: Alignment Baseline

Goal: align spec references with actual code surface so future sprints are deterministic.

Sprint 0.1: Manifest and spec alignment

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\FAILSAFE_SPECIFICATION.md`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\package.json`.
- Deliverables:
  - Spec and manifest agree on `main`, commands, views, and config keys.
  - Add missing keys to spec (theme, ollama endpoint, l3 SLA, sentinel enabled).
- Acceptance: spec lists all real commands/config and matches manifest paths.

### Milestone M1: Storage and Ledger Backbone

Goal: persistent data stores and runtime assets.

Sprint 1.1: `.failsafe` filesystem scaffold

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\shared\ConfigManager.ts`.
- Deliverables:
  - Create config file templates on first run (failsafe.json, sentinel.yaml, custom patterns YAML).
  - Create keystore stub file and cache/log placeholders.
- Acceptance: expected files are created on activation when absent.

Sprint 1.2: Ledger DB implementation

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\ledger\LedgerManager.ts`.
- Deliverables:
  - Replace JSON storage with SQLite or equivalent (as specified).
  - Preserve Merkle-style chaining and integrity checks.
- Acceptance: ledger entries persist across restarts; chain verification passes.

### Milestone M2: Sentinel Enforcement Engine

Goal: real enforcement pipeline.

Sprint 2.1: Pattern library loader

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\engines\HeuristicEngine.ts`.
- Deliverables:
  - Load patterns from YAML + custom overrides.
  - Implement enable/disable and pattern edits.
- Acceptance: modifying custom pattern file changes analysis without rebuild.

Sprint 2.2: Structural checks

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\engines\HeuristicEngine.ts`.
- Deliverables:
  - File existence validation, dependency validation, AST-based complexity.
- Acceptance: tests show checks fire on synthetic cases.

Sprint 2.3: Operational modes + backpressure

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\SentinelDaemon.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\policies\PolicyEngine.ts`.
- Deliverables:
  - Mode switching and verification rate sampling per spec.
  - Queue backpressure rules.
- Acceptance: mode changes alter verification behavior.

Sprint 2.4: LLM evaluation parsing

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\SentinelDaemon.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\sentinel\engines\VerdictEngine.ts`.
- Deliverables:
  - Parse risk grade and confidence from LLM response.
  - Feed into verdict confidence and decision logic.
- Acceptance: LLM responses adjust verdict confidence deterministically.

### Milestone M3: QoreLogic Governance Layer

Goal: trust persistence and failure archival.

Sprint 3.1: Trust persistence + metrics

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\trust\TrustEngine.ts`.
- Deliverables:
  - Persist agent identities and trust scores in ledger or new store.
  - Track verification counts and last updated.
- Acceptance: trust survives reload and is reflected in UI.

Sprint 3.2: Shadow Genome

- Scope: new module under `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\shadow` plus `VerdictEngine` integration.
- Deliverables:
  - Create and update shadow genome entries on failure.
  - Link to ledger entry IDs.
- Acceptance: shadow genome entries are created for failures and queryable.

Sprint 3.3: Persona/policy/workflow ingestion

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\qorelogic\QoreLogicManager.ts`.
- Deliverables:
  - Load personas/policies/workflows from `.failsafe/config`.
- Acceptance: local overrides change governance behavior.

### Milestone M4: Genesis UI Completion

Goal: Living Graph and Cortex UX are fully real.

Sprint 4.1: Wire LivingGraphProvider and Sentinel view

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\extension.ts`.
- Deliverables:
  - Register LivingGraphProvider and implement Sentinel sidebar view or remove it.
- Acceptance: all declared views resolve.

Sprint 4.2: Build Living Graph data pipeline

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\GenesisManager.ts` plus new graph builder.
- Deliverables:
  - Generate nodes/edges from workspace deps and risk status.
  - Update risk summary metadata.
- Acceptance: graph nodes reflect real workspace files and risk grades.

Sprint 4.3: Full-screen Living Graph

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\panels\LivingGraphPanel.ts`.
- Deliverables:
  - Real D3 graph with filter/search/export.
- Acceptance: panel parity with sidebar view.

Sprint 4.4: Cortex Omnibar responses

- Scope: `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\cortex\IntentScout.ts`, `g:\MythologIQ\Q-DNA\.qorelogic\extension\src\genesis\GenesisManager.ts`.
- Deliverables:
  - Intent execution returns structured responses to stream/graph/modal.
- Acceptance: Omnibar outputs are visible in stream and actionable.

### Milestone M5: Platform Extensions

Goal: Antigravity/MCP/CLI integration.

Sprint 5.1: MCP adapter contract

- Scope: new adapter module under `.qorelogic`.
- Deliverables:
  - Define MCP interface for Sentinel/QoreLogic operations.
- Acceptance: basic MCP stub can query status.

Sprint 5.2: CLI head

- Scope: new CLI entry in `.qorelogic`.
- Deliverables:
  - CLI commands for audit, ledger, and L3 queue.
- Acceptance: CLI can run a manual audit and show verdict summary.
