# Blueprint: Project FailSafe (v2.0 Rebirth)

**Status:** DRAFT
**Version:** 2.0.0 (Genesis Edition)
**Visionary:** The User
**Architect:** Antigravity (Dojo Master)

---

## I. Strategic Core (DeepWisdom)

### 1. Problem Statement

- **The Pain**: AI ("The Agent") is prone to "Hallucinations"—claiming files exist when they don't, promising features that aren't built, and drifting from the spec.
- **The Cost**: Broken trust, wasted developer cycles, and "vaporware" codebases.

### 2. Value Proposition

- **The Gain**: **Zero Hallucination Development**.
- **The Mechanism**: A "Passive Safety Net" (VS Code Extension) that watches the Agent's output and validates it against reality in real-time.
- **The Core Loop**: Agent speaks -> FailSafe checks (File System / Git / Spec) -> FailSafe flags lies -> Agent corrects.

### 3. Success Metrics (KPIs)

- [ ] **Zero False Claims**: 100% of "File X exists" claims are verified.
- [ ] **Passive Protection**: Validation happens < 3s without user intervention.
- [ ] **Accountability**: Every "Plan" has a "Proof" attached.

---

## II. Identity Framework (TACHES)

### T - Target & Trouble

- **Target**: Developers using AI Assistants (Cursor/Windsurf) who are tired of "Gaslighting".
- **Trouble**: "The AI lied to me again about the import path."

### A - Atmosphere & Attitude

- **Vibe**: **The Spec Gatekeeper**. Cold, hard, factual. "Trust but Verify."
- **Tone**: Clinical, Precise, Unforgiving of ambiguity.

### C - Core Content

- **Key Message**: "If it isn't in the file system, it doesn't exist."

### E - Experience & Actions

- **Primary Action**: "Validate Chat" (Command).
- **Visuals**:
  - **The HUD**: A Dashboard showing "Hallucination Rate" and "Drift Status".
  - **Inline Decorations**: Red squiggles under hallucinated file paths in Chat.
  - **The Shield**: A green/red status bar indicator.

---

## III. System Architecture (The Machine)

### 1. The Frontend (VS Code Extension)

- **Sidebar**: Dashboard View (Metrics, Sprints).
- **Decorators**: Editor/Chat highlighting.
- **Commands**: `FailSafe: Validate Chat`, `FailSafe: Check Code`.

### 2. The Backend (Server)

- **Technology**: Fastify (Node.js).
- **Role**: Heavy lifting for "Content Analysis" and "Validation Logic".
- **Plugins**:
  - `fs-gate`: Validates file paths.
  - `spec-gate`: Validates against `specs/*.md`.
  - `rule-watchdog`: Enforces `.cursorrules`.

### 3. The Data Layer

- **Storage**: Local JSON / Git Tags (No external database).
- **Logs**: `failsafe.log` (Audit Trail).

---

## IV. Execution Notes (Legacy extraction)

- **Keep**: The `Fastify` architecture (it was marked "Implemented").
- **Keep**: The `Dashboard` concept (Chart.js was integrated).
- **Discard**: Any "Planned" feature that was purely aspirational vaporware. We build _only_ what we can prove.
