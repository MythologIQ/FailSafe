# FailSafe Architecture & UI Design Handoff: v4.0.0 & v5.0.0

This document defines the architectural boundaries, UI specifications, and versioning strategy for the transition from the monolithic VS Code extension to the Dual-Track Enterprise model.

---

## Versioning Strategy, Landing Zones & Moral Decency

The introduction of the Rust Desktop Daemon represents a massive architectural shift and the beginning of the monetization phase. Our core philosophy for this transition is **Moral Decency**: we do not bait-and-switch. Features given away for free in the v4.x.x extension (like individual Token ROI tracking and One-Click Rollbacks) will _remain_ free forever. The v5.0.0 paywall exists strictly for OS-level and Enterprise-scale features that provide massive institutional value.

### v4.x.x - The Bridge (TypeScript "Proving Ground")

**Goal:** Deliver immediate, tangible value for free, build massive user goodwill, and isolate services in preparation for Rust extraction.

- **Scope:** Token Economics Dashboard, "Time-Travel" Rollbacks, and API-First decoupling of internal TS services.
- **Platform:** Stays entirely within the VS Code Extension Host.
- **Timeline:** Current sprint.

### v5.0.0 - The Paradigm Shift (Tauri/Rust Daemon)

**Goal:** Extract the heavy lifting out of the IDE, introduce the OS-level Daemon, and launch the Enterprise Paywall.

- **Scope:** OS-Level `notify` Sentinel watch, High-Performance Native RAG, Zero-Trust Intercept Proxy, SSO/SAML Multi-IDE Licensing, Air-Gapped Judge.
- **Platform:** Tauri 2.x Rust Desktop App (`failsafed`) + "Thin Client" VS Code Extension that connects via IPC/WebSocket.
- **Timeline:** The launch of the paid product.

---

## 1. Token Economics & ROI Dashboard (v4.0.0 Target)

### Architectural Plan

**Current State:** No token tracking exists.
**Target Architecture:**

1.  **`TokenAggregatorService.ts`:** An isolated Node class that listens to the `EventBus` for `prompt.dispatch` and `prompt.response` events. It calculates the delta between "tokens sent" (full context window) and "tokens saved" (Sentinel RAG optimized context).
2.  **Telemetry Storage:** Data explicitly saved to `.failsafe/telemetry/economics.json`.
3.  **Future-Proofing:** Design the Webview to load purely via a generic generic JSON schema so that in v5.0.0, the UI simply fetches `http://localhost:7777/api/economics` from the Rust daemon instead of reading the local file.

### UI Design Specification

**Location:** Genesis Operations Hub (New "Economics" Tab).
**Aesthetic:** High-contrast data visualization.
**Components:**

- **Hero Metric:** "Tokens Saved This Week" (Large, glowing green typography).
- **Cost Equivalent:** "Estimated Savings: $XX.XX" (Based on user-configurable model pricing).
- **Context Sync Ratio:** A donut chart showing the percentage of prompts that used lightweight Sentinel RAG context versus heavy, full-file dumping.
- **Trending Bar Chart:** Daily token consumption over a 30-day rolling window.

---

## 2. "Time-Travel" Rollback (v4.0.0 Target)

### Architectural Plan

**Current State:** Governance checkpoints are hashed, but reverting is completely manual via Git CLI.
**Target Architecture:**

1.  **`FailSafeRevertService.ts`:** An isolated class that orchestrates three distinct systems:
    - _Git Interface:_ Wraps `git reset --hard` or `git checkout` via Node child process.
    - _Ledger Interface:_ Appends an "L3 REVERT" entry to the `failsafe_checkpoints` Merkle chain, preserving the forensic audit trail of the hallucination.
    - _Sentinel Interface:_ Executes a `DELETE` flush on the SQLite RAG store matching the poisoned checkpoint hash, ensuring the LLM forgets the hallucinated context.
2.  **Target v5.0.0 Extraction:** In the Rust daemon, this becomes a high-speed `git2-rs` rust function and a native `rusqlite` purge.

### UI Design Specification

**Location:** FailSafe Monitor (Sidebar) & Operations Hub (Activity Tab).
**Aesthetic:** Emergency / Recovery focused.
**Components:**

- **The Revert Button:** A prominently bordered button next to recent Checkpoints labeled "FailSafe Revert".
- **Confirmation Modal:** "You are about to rewind time. This will permanently delete the AI's changes, purge the RAG memory of this error, and seal a forensic ledger entry. Proceed?"
- **Timeline View:** A visual Git-tree representation showing the active branch, the hallucinated commits (red), and the safe checkpoint to return to (green).

---

## 3. The Tauri Enterprise Configuration Hub (v5.0.0 Target)

This is the entirely new UI that ships with the standalone binary.

### Architectural Plan

**Goal:** A system-tray application that manages the global governance state across all IDEs.

- **Backend (Rust):** Handles OS-level file watching, local LLM routing (`reqwest`), secure credentials (`keyring`), and WebSocket servers.
- **Frontend (Vue/React via Tauri):** A lightweight web GUI for configuring the daemon.

### UI Design Specification

**Location:** Standalone Desktop Application (Accessible via System Tray).
**Aesthetic:** Professional, Enterprise Security Console (Vibrant Data, Dark Mode).
**Components:**

- **Global Dashboard:** Real-time stream of all AI activity across VS Code, Cursor, and WebStorm (via the Intercept Proxy).
- **Policy Sync Manager:** Text inputs for SSO Identity Providers, and toggles for syncing Remote Q-DNA Axioms from a corporate URL.
- **Model Router:** Dropdowns to select the Air-Gapped Judge model (e.g., "Ollama - Llama-3-8B-Instruct") vs. the Cloud Governor (e.g., "Anthropic - Claude 3.5 Sonnet").
- **License Manager:** The paywall gate checking the enterprise subscription.
