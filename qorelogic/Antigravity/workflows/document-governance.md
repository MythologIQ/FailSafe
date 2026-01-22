---
description: Enforces strict versioning and integrity checks on core documentation (README, Specs, PRD).
---

# DOCUMENT GOVERNANCE PROTOCOL

**Trigger:** Session Start / Session Close / Major Feature Merge
**Scope:** Global

## 1. DEFINITION OF "CORE DOCS"

The following files are constitutionally protected. They represent the "Source of Truth" and must not drift from reality.

- `README.md` (Project Entry Point)
- `docs/PRD.md` (Product Requirements)
- `docs/SYSTEM_STATE.md` (Current Architecture Snapshot)
- `CHANGELOG.md` (Historical Record)

## 2. INTEGRITY CHECK (STARTUP/SHUTDOWN)

### Step 2.1: Existence Check

- **Action:** Verify all Core Docs exist.
- **Fail State:** If `PRD.md` or `SYSTEM_STATE.md` is missing, the session is **UNSAFE**.
- **Remedy:** Prompt user to run `init_qorelogic` or manually restore.

### Step 2.2: Drift Detection

- **Action:** Check if `README.md` or `PRD.md` has been modified since the last committed "Stable" tag (or last session).
- **Tool:** `git diff --stat HEAD...HEAD~1 -- docs/` (Pseudo-code logic).
- **Rule:** If Core Docs have changed, there **MUST** be a corresponding entry in `CHANGELOG.md`.

### Step 2.3: Cryptographic Seal (Hash Verification)

- **Mechanic:** The system maintains a `docs/.doc_hashes.json` ledger.
- **Action (Verification):**

  1. Calculate `SHA256` of current `PRD.md`.
  2. Compare with stored hash in `.doc_hashes.json`.
  3. **IF Mismatch:**
     - **Raise Alert:** "⚠️ SECURITY VIOLATION: PRD.md has been modified outside of governance."
     - **Requirement:** User must explicitly "Re-seal" the documents via `document_governance (seal)` command.

- **Action (Sealing):**
  - Triggered after valid `CHANGELOG` entry.
  - Updates `.doc_hashes.json` with new SHA256 values.

### Rule: "No Silent Edits"

Any edit to a Core Doc requires a detailed validation entry.

**Format (Append to CHANGELOG.md):**

```markdown
## [YYYY-MM-DD] - Session ID: [ID]

### Modified: [File Name]

- **Reason:** [Why was this changed?]
- **Validation:** [How do we know this new truth is accurate?]
- **Author:** [Agent Name/User]
```

## 4. CONSOLIDATION (SYSTEM STATE)

### Step 4.1: The Snapshot

- **Action:** At Session Close, generate/update `docs/SYSTEM_STATE.md`.
- **Content:**
  - Tree Structure (Level 2 depth).
  - Active Feature Flags.
  - Known Technical Debt (Top 5).

## 5. EXECUTION INSTRUCTION

When triggered:

1.  **Read** `CHANGELOG.md`.
2.  **Scan** `docs/`.
3.  **If Drift Detected:** Stop and ask User: "Docs changed without Changelog entry. Please explain."
4.  **If Sealed:** Check Hashes. If valid, Return "✅ Docs Integrity Verified (Crypto-Sealed)."
5.  **To Seal:** "Run: `document_governance -Action Seal` updates the ledger."
