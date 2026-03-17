# Plan: SRE Panel Expansion — Adapter v2 + Fleet Observability (Amended v2)

**Current Version**: v4.9.6
**Target Version**: v4.9.8
**Change Type**: feature
**Risk Grade**: L2
**Prior Verdicts**: VETO (Entry #244, V1: file size Razor) → this amendment

## Open Questions

1. **Adapter port configurability**: Currently hardcoded to `127.0.0.1:9377` in 3 places. Should this be configurable via `AdapterConfig`? (Recommendation: yes, add `adapterBaseUrl` field to `AdapterConfig`)

## Context

Two research briefs inform this plan:
- **Entry #242**: AGT has 25+ endpoints, 7 SLI types, Merkle-chained audit, FleetManager, trust dimensional scores
- **Entry #243**: agent-failsafe adapter v0.4.0 has 11 internal capabilities but only 1 REST endpoint (`GET /sre/snapshot`) returning mostly-empty data

The adapter is a **separate Python repo** (`github.com/MythologIQ/agent-failsafe`). This plan covers the **extension side only** — changes to the TypeScript codebase that consume adapter data. Adapter-side changes are tracked in the adapter repo's own governance.

## Design Principle: Schema-Driven, Not Endpoint-Driven

The extension defines the TypeScript types it expects. The adapter conforms. This keeps the extension independent of adapter implementation details. The extension fetches from versioned endpoints and gracefully degrades when fields are absent.

---

## Phase 1: Type Extraction + Snapshot v2 Schema + Adapter Port Config

Extract SRE types to a dedicated file (Razor remediation for D28-D30), expand to v2 schema, and wire adapter port config.

### Affected Files

- `FailSafe/extension/src/roadmap/routes/templates/SreTypes.ts` — **NEW**: all SRE type definitions (~60 lines)
- `FailSafe/extension/src/roadmap/routes/templates/SreTemplate.ts` — remove type definitions, import from `SreTypes.ts`
- `FailSafe/extension/src/roadmap/services/AdapterTypes.ts` — add `adapterBaseUrl` to `AdapterConfig`
- `FailSafe/extension/src/roadmap/routes/SreApiRoute.ts` — read base URL from config
- `FailSafe/extension/src/roadmap/ConsoleServer.ts` — pass config to SRE route
- `FailSafe/extension/src/test/roadmap/SreRoute.test.ts` — update imports

### Changes

**0. Extract types to `SreTypes.ts`** (resolves D28-D30, VETO V1):

Create `FailSafe/extension/src/roadmap/routes/templates/SreTypes.ts` containing all type definitions. `SreTemplate.ts` imports from it. This keeps the template file at ~100 lines (rendering only) even after Phases 2-3 add section builders.

```typescript
// SreTypes.ts — SRE panel type definitions
export type AsiControl = { label: string; covered: boolean; feature: string };
// ... all existing types + v2 types below
```

`SreTemplate.ts` becomes:
```typescript
import { escapeHtml } from "../../../shared/utils/htmlSanitizer";
import type { AgtSreSnapshot, SreViewModel, ... } from "./SreTypes";
// ... rendering functions only
```

**1. Define v2 schema types** in `SreTypes.ts`:

```typescript
export type TrustDimension = {
  name: string;           // e.g. "policy_compliance"
  score: number;          // 0-1000
  weight: number;         // 0-1
};

export type TrustScore = {
  agentId: string;
  stage: string;          // CBT | KBT | IBT
  meshScore: number;      // 0-1 (v1 compat)
  totalScore?: number;    // 0-1000 (v2)
  tier?: string;          // Untrusted | Basic | Verified | Trusted | Highly Trusted
  dimensions?: TrustDimension[];
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  type: string;           // tool_invocation | tool_blocked | policy_evaluation | ...
  agentId: string;
  action: string;         // ALLOW | DENY | AUDIT
  reason?: string;
  resource?: string;
};

export type SliMetric = {
  name: string;
  target: number;
  currentValue: number | null;
  meetingTarget: boolean | null;
  totalDecisions: number;
  errorBudgetRemaining?: number;  // 0-1
};

export type FleetAgent = {
  agentId: string;
  status: string;         // active | idle | error
  circuitState: string;   // closed | open | half-open
  taskCount: number;
  successRate: number;
  avgLatencyMs: number;
  lastActiveAt: string;
};

export type AgtSreSnapshot = {
  schemaVersion?: number; // 1 (legacy) or 2
  policies: Array<{ name: string; type: string; enforced: boolean }>;
  trustScores: TrustScore[];
  sli: SliMetric;
  slis?: SliMetric[];     // v2: all 7 SLI types
  asiCoverage: Record<string, AsiControl>;
  auditEvents?: AuditEvent[];  // v2: recent governance events
  fleet?: FleetAgent[];        // v2: per-agent fleet status
};
```

All v2 fields are optional (`?`) so the existing v1 adapter works unchanged.

**2. Add `adapterBaseUrl` to `AdapterConfig`** in `AdapterTypes.ts`:

```typescript
export interface AdapterConfig {
  adapterBaseUrl?: string;  // default: "http://127.0.0.1:9377"
  mcpServerCommand: string[];
  failOpen: boolean;
  // ... existing fields
}
```

**3. Wire config into SRE routes** — `SreApiRoute.ts` and `ConsoleServer.ts` read `adapterBaseUrl` from config instead of hardcoded `"http://127.0.0.1:9377"`.

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts` — add:
  - `buildSreHtml renders v1 snapshot (no schemaVersion field)`
  - `buildSreHtml renders v2 snapshot with fleet and audit events`
  - `v2 optional fields gracefully absent`

---

## Phase 2: Activity Feed — Audit Events + Governance Decisions

Add an audit event feed to the SRE panel showing real-time governance decisions.

### Affected Files

- `FailSafe/extension/src/roadmap/routes/templates/SreTemplate.ts` — add `buildAuditFeedHtml` section builder
- `FailSafe/extension/src/roadmap/routes/SreApiRoute.ts` — add `GET /api/v1/sre/events` endpoint

### Changes

**1. Add `buildAuditFeedHtml(events)` section builder** (~20 lines):

Renders recent audit events as a scrollable list. Each event shows:
- Timestamp (relative, e.g. "2m ago")
- Agent ID
- Action badge (ALLOW=green, DENY=red, AUDIT=yellow)
- Event type + resource
- Reason (truncated, expandable)

Events are sorted newest-first, limited to 20.

**2. Add events endpoint** — `GET /api/v1/sre/events`:

Proxies to adapter `GET /sre/events` (new adapter endpoint). Returns `{ events: AuditEvent[] }`. Falls back to `snapshot.auditEvents` if the dedicated endpoint isn't available.

**3. Add feed section to `buildSreConnectedHtml`** assembler:

```typescript
${s.auditEvents?.length ? buildAuditFeedHtml(s.auditEvents) : ''}
```

Only renders if the adapter provides event data — no empty section for v1 adapters.

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts` — add:
  - `buildAuditFeedHtml renders ALLOW/DENY badges with correct colors`
  - `buildAuditFeedHtml omits section when events array is empty`
  - `buildAuditFeedHtml truncates reason text at 80 chars`

---

## Phase 3: SLO Dashboard — Multi-SLI + Fleet Health

Surface all 7 SLI types with error budget gauges and per-agent fleet cards.

### Affected Files

- `FailSafe/extension/src/roadmap/routes/templates/SreTemplate.ts` — add `buildSliDashboardHtml`, `buildFleetHtml` section builders
- `FailSafe/extension/src/roadmap/routes/SreApiRoute.ts` — add `GET /api/v1/sre/fleet` endpoint

### Changes

**1. Add `buildSliDashboardHtml(slis)` section builder** (~25 lines):

Replaces the single SLI card with a grid of SLI meters when `slis` array is present. Each SLI shows:
- Name
- Current value vs target (meter bar)
- Error budget remaining (secondary meter, red when < 10%)
- Meeting target badge

Falls back to single `buildSliHtml(sli)` when `slis` array is absent (v1 compat).

**2. Add `buildFleetHtml(fleet)` section builder** (~25 lines):

Renders per-agent cards in a compact grid. Each card shows:
- Agent ID
- Status indicator (green=active, gray=idle, red=error)
- Circuit breaker state badge (closed=green, open=red, half-open=yellow)
- Task count + success rate
- Average latency

**3. Add fleet endpoint** — `GET /api/v1/sre/fleet`:

Proxies to adapter `GET /sre/fleet`. Returns `{ agents: FleetAgent[] }`.

**4. Update `buildSreConnectedHtml`** assembler to use multi-SLI when available:

```typescript
${s.slis?.length ? buildSliDashboardHtml(s.slis) : buildSliHtml(s.sli)}
${s.fleet?.length ? buildFleetHtml(s.fleet) : ''}
```

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts` — add:
  - `buildSliDashboardHtml renders 7 SLI types with error budget meters`
  - `buildFleetHtml renders circuit breaker state badges`
  - `buildFleetHtml shows agent status indicators`
  - `falls back to single SLI when slis array absent`

---

## Summary

| Phase | Scope | Backlog | File Budget |
|-------|-------|---------|-------------|
| 1 | Type extraction + v2 schema + adapter port config | B178, D30 | SreTypes.ts: ~60L, SreTemplate.ts: ~100L |
| 2 | Activity Feed — audit events + governance decisions | B179 | SreTemplate.ts: ~120L |
| 3 | SLO Dashboard — multi-SLI + fleet health | B180 | SreTemplate.ts: ~170L |

All phases keep `SreTemplate.ts` under 250 lines. Types live in `SreTypes.ts` (~60 lines, stable after Phase 1).

Phase 4 (Controls — trust override, chaos, circuit breakers) is deferred to a separate plan after Phases 1-3 are validated, as it introduces write operations to the adapter (POST endpoints) which require additional security audit.
