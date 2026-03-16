# Metric Integrity and Pro Broker Design

## Purpose

Define what the free build can report with confidence, what it cannot prove, and how a Pro build can move from observed activity to enforced governance.

## Current Position

The free build already has strong local evidence for some signals:

- `implemented`: seal and lifecycle state from `docs/META_LEDGER.md`
- `implemented`: checkpoint chain verification from local checkpoint records
- `implemented`: prompt and governance activity when it flows through instrumented adapters
- `implemented`: task and debug activity through VS Code lifecycle events

It does not yet have universal authority over every file mutation in the workspace.

## Free Build Goal

Make the monitor and command center honest and stable:

- Prefer canonical governance artifacts over UI heuristics
- Label metrics as `authoritative`, `inferred`, or `unknown`
- Never present inferred activity as proof of agent identity
- Detect and surface gaps instead of smoothing them over

## Free Build Scope

### Authoritative

- Seal state
- S.H.I.E.L.D. phase
- Checkpoint chain validity after local verification
- Governed prompt events with attached `agentDid`
- Ledger-backed trust and approval history

### Inferred

- IDE build/debug activity
- Generic file watcher activity
- Plan progress derived from touched artifacts
- Risk posture inferred from recent verdict trends

### Unknown

- File-to-agent attribution for writes made outside instrumented governance paths
- Agent identity for direct disk edits by external tools
- Whether a non-governed write followed required workflow rules

## Free Build Improvements

1. Add integrity labels to hub snapshot data and render them in the governance UI.
2. Keep seal state derived from `META_LEDGER.md`, not fallback heuristics.
3. Treat direct file activity as observed evidence, not proof of actor.
4. Mark unattributed changes as gaps, not silent success.

## Pro Concept

The Pro build introduces a governance broker in front of write access.

### Model

- Workspace is read-only by default for governed agents.
- Agents request write access through an MCP-compatible broker.
- Broker returns required workflow, skill, persona, and gate prerequisites.
- Agent must satisfy those prerequisites before a write lease is issued.
- Lease is narrow:
  - specific files or directories
  - allowed operation types
  - bounded time window
  - required actor identity and session
- Broker logs hashes, actor, intent, and evidence for every granted write.

### Result

For compliant agents, writes become enforceable instead of advisory.

## Pro Enforcement Levels

### Level 1: Cooperative Broker

- `planned`
- Agent tooling routes writes through MCP broker by convention
- Strong attribution for compliant agents
- External processes can still bypass controls

### Level 2: Broker Plus Local Guard

- `planned`
- Workspace defaults to read-only
- Helper process temporarily grants path-scoped access during active leases
- Unbrokered writes are flagged as non-compliant

### Level 3: Broker Plus Sandbox

- `planned`
- Agent runtime has no direct write permission
- Only brokered capabilities can mutate files
- Highest confidence available without kernel-level filesystem integration

## Broker Handshake

1. Agent identifies itself with `agentDid`, tool, version, and session.
2. Broker returns current gate requirements for target action.
3. Agent retrieves required workflow, skills, and persona constraints.
4. Agent submits proof bundle:
   - workflow id/version
   - required skills
   - persona
   - intended file scope
   - action justification
5. Broker evaluates policy and either:
   - denies access with remediation instructions
   - grants a short-lived write lease
6. Agent performs write through brokered path.
7. Broker records before/after hashes and closes lease.

## Required Pro Data Model

- `agentDid`
- `sessionId`
- `intentId`
- `workflowId`
- `skillSet`
- `persona`
- `leaseId`
- `pathScope`
- `operationSet`
- `issuedAt`
- `expiresAt`
- `beforeHash`
- `afterHash`
- `policyDecision`

## Limits

The free build cannot guarantee absolute workspace control because file watchers and IDE telemetry observe behavior after the fact.

The Pro build only achieves near-total certainty when broker control is paired with real permission boundaries. MCP alone is governance protocol, not operating-system enforcement.

## Recommended Rollout

1. Stabilize free-build integrity labels and authoritative-state routing.
2. Add unattributed-write detection and explicit compliance warnings.
3. Build the MCP write broker and proof-of-rules handshake.
4. Add scoped write leases.
5. Add sandbox or permission-backed enforcement for Pro.

## Claim Map

| Claim | Status | Source |
|---|---|---|
| Seal state is parsed from the meta ledger | implemented | `FailSafe/extension/src/roadmap/services/GovernancePhaseTracker.ts` |
| Hub snapshot already aggregates governance and IDE activity | implemented | `FailSafe/extension/src/roadmap/ConsoleServer.ts` |
| IDE activity tracking uses task/debug lifecycle events | implemented | `FailSafe/extension/src/roadmap/services/IdeActivityTracker.ts` |
| Prompt transparency carries `agentDid` on instrumented paths | implemented | `FailSafe/extension/src/governance/PromptTransparency.ts` |
| MCP enforcement is not yet universal | planned | `docs/BACKLOG.md` B151 |
