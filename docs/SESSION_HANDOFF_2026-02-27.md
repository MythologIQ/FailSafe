# QoreLogic Handoff: Proceeding to v4.x.x Implementation

**Date:** 2026-02-27
**Target Agent:** Claude Code CLI (Executor / Architect)
**From:** Antigravity (Governor / Scrivener)

---

## 1. System Status & Context

The repository has been successfully updated to structural baseline **v3.7.0**.

- All architecture planning for TypeScript Extension architecture with service-boundary extraction readiness is complete.
- The test suite is currently **100% passing** (191 tests, 0 failures). _Note: The `EventBus.ts` dispose bug has been formally patched._
- Workspace boundaries, physical isolation protocols, and the Meta Ledger are fully up to date.

### Primary Reference Documents

Before generating any code, Claude MUST read and adhere to:

1. `PRIVATE/docs/DUAL_TRACK_ARCHITECTURE.md`
2. `PRIVATE/docs/HANDOFF_V4_V5_ARCHITECTURE.md`
3. `docs/CORE_AXIOMS_AND_RULES_COMPILED.md`

---

## 2. The Implementation Mandate: Token Economics Dashboard

The first feature of the v4.x.x "Goodwill Expansion" is the **Token Economics ROI Dashboard**. We are bringing metrics out of the dark without removing any free features (Moral Decency strategy).

### Claude's Exact Objectives:

**Phase A: The Core Service (`TokenAggregatorService.ts`)**

- Create an isolated service that listens to the `EventBus` for prompt usage (e.g., `prompt.dispatch` and `prompt.response`).
- It must calculate the delta between "tokens sent" (full context window) and "tokens saved" (lightweight Sentinel RAG).
- It must explicitly save this telemetry to `.failsafe/telemetry/economics.json`.
- _Crucial API-First Constraint:_ Structure the service boundaries heavily so that fetching data feels like querying a remote API. This prepares the service for future extraction to a standalone daemon.

**Phase B: The Webview UI**

- Add a new "Economics" tab or panel in the Genesis Operations Hub.
- Use high-contrast formatting: Hero Metric ("Tokens Saved This Week"), Cost Equivalent ($), Context Sync Ratio donut chart, and a 30-day trending chart.
- Ensure the UI loads purely against generic JSON schemas so that it requires zero refactoring when a standalone daemon replaces the `.failsafe` file read with an `http://localhost:7777/api/economics` socket fetch.

---

## 3. Strict Development Guardrails

- **Section 4 Razor:** No TypeScript source file may exceed 250 lines. You must aggressively extract types, schemas, and helper functions into separate files.
- **Service Isolation:** Do not mix `vscode.*` APIs inside the core `TokenAggregatorService.ts` logic.
- **Test Integrity:** The build must pass 100% of unit tests after your implementation. You must provide tests for the Token Aggregator logic.
- **No Bait-and-Switch:** This is an additive feature to the free VS Code extension. Do not hide it or gate it.

---

## Prompt to Execute in Claude CLI

Copy and paste the following prompt string directly into your running `claude` CLI terminal:

READ the handoff document at `docs/SESSION_HANDOFF_2026-02-27.md` and review `PRIVATE/docs/HANDOFF_V4_V5_ARCHITECTURE.md`. Your mission is to implement Phase A (the isolated TokenAggregatorService) and Phase B (the Genesis Hub ROI UI) exactly as specified. Begin by scaffolding the TypeScript services for token telemetry. Ensure test coverage and do not break the currently 100% passing test suite. Apply the Section 4 Razor.
