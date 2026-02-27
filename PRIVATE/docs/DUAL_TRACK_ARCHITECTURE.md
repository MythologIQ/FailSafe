# FailSafe Dual-Track Implementation & Enterprise Rust Plan

This document outlines the strategic split between the free, open-source Developer Experience (VS Code / TypeScript) and the enterprise monetization layer, the **FailSafe Enterprise Governance Daemon** (Rust / Tauri).

By establishing a clean Client-Server model now, we ensure features built today in TypeScript can be easily ported to the high-performance Rust backend tomorrow.

---

## The Vision: A "Thin Client" IDE, A "Thick" OS Daemon

The ultimate architecture removes heavy processing (like LLM coordination, large Git diffs, and RAG SQLite queries) from the VS Code Extension Host. Instead, VS Code, Cursor, and JetBrains become "dumb UI terminals" that send governance intents via local IPC/WebSocket to the OS-level Rust daemon.

### Current State vs. Target State

- **Current**: VS Code processes file watching, runs Sentinel heuristics, accesses SQLite, and coordinates API calls.
- **Target**: VS Code simply renders the Governance Dashboard and highlights editor lines. The Rust Daemon watches the OS, runs the Air-Gapped Judge, processes the Merkle chain, and manages Token ROI logic.

---

## Track 1: The VS Code "Thin Client" Strategy (TypeScript)

**Focus:** Developer Experience (DX), Rendering, Editor Bindings, and Command Palette.
**Constraints:** Build features as decoupled TypeScript classes (Services) that do not depend directly on `vscode.*` APIs for core logic.

### M7-M10 Features (Built for Easy Porting)

- **Token Economics UI**: Build the front-end graphs and panels in Webview. The data aggregation logic should be contained in a standalone `TokenService.ts` that will eventually be replaced by a fetch to the Rust Daemon.
- **FailSafe Revert Trigger**: The extension provides the "Revert" button and command. The actual Git logic (`GitRevertService.ts`) is written in plain Node child-processes, isolated for a quick port run to Rust's `git2` crate.
- **Governance Graph Rendering**: Webviews listen to an event stream. Currently powered by Node's internal `EventEmitter`, future-proofed by structuring it like a Server-Sent Event (SSE) stream.
- **Shared Core Axioms (Client Sync)**: Make HTTP requests to pull Q-DNA Axioms on startup, but avoid deeply coupling how the extension saves them to the `.failsafe` directory.

---

## Track 2: FailSafe Pro (Rust Daemon / Tauri Enterprise App)

**Focus:** Monetization, Cross-IDE Support, Security, Air-Gapped Compliance, Performance.
**Tech Stack:** Rust, Tauri 2.x (for the desktop UI/Settings app), SQLite, local open-weight LLM bridges.

### Core Architecture

1.  **The Sentinel Daemon (Rust `notify`)**
    - Replaces the VS Code watcher. Capable of watching `G:\` globally or multiple repository roots securely.
2.  **The Ledger Cryptography Engine**
    - Handles the Hash Chains, Checkpoints, and `failsafe_checkpoints` verification. Rust is significantly better suited for secure Merkle tree processing and deterministic hashing.
3.  **Local LLM Router (Air-Gapped Judge)**
    - Manages the API connections to LM Studio, Ollama, or vLLM running on local silicon. This removes the risk of freezing the IDE's Extension Host when a model generates a large response.
4.  **SSO / Enterprise Hub (Tauri App)**
    - The visual desktop app where the Team Lead configures the enterprise Q-DNA axioms, manages billing, logs in via corporate SSO, and reviews cross-developer statistics.

### Feature Gating & Additive Monetization (The Transition)

When the Rust app launches, we adhere to a strict **Moral Decency strategy**. No features given away for free in the v4.x.x extension will be removed. The Enterprise paywall simply adds capabilities that strictly require the OS-Level Daemon.

| Feature                 | Free Tier (VS Code Extension)              | FailSafe Pro (Rust App & Enterprise Tier)      |
| :---------------------- | :----------------------------------------- | :--------------------------------------------- |
| **Governance Mode**     | Observe & Assist                           | + Enforce & Lock-Step                          |
| **Token ROI Dashboard** | Personal visual quantification & savings   | + Org-wide aggregation & billing sync          |
| **FailSafe Revert**     | One-Click automated rewind & context purge | + Remote-triggered rollback enforcement        |
| **Judge Location**      | Remote API (Claude/Gemini)                 | + Local Air-Gapped L3 Judge (Ollama/LM Studio) |
| **Sentinel Engine**     | In-IDE Node Heuristics & SQLite            | + OS-Level Rust `notify` Daemon & Native RAG   |
| **Core Axioms**         | Local `.failsafe` config                   | + Remote Enterprise Sync across all devs       |
| **Data Protection**     | In-IDE warning highlights                  | + Zero-Trust Intercept Proxy (DLP Blocking)    |

---

## The Enterprise Horizon (OS-Level Advantage)

Once the Rust Daemon is established, it unlocks several high-value, enterprise-grade capabilities that are impossible or highly fragile within a Node.js/VS Code Extension sandbox:

1. **The "Zero-Trust" Intercept Proxy (Enterprise DLP):**
   - The Rust daemon runs a local intercept proxy (e.g., `localhost:11434`) routing all IDE AI traffic (Copilot, Composer, Claude Code CLI).
   - Allows FailSafe to perform real-time Data Loss Prevention (DLP) by inspecting payloads and blocking outbound API calls if L3 triggers (like AWS Keys or restricted proprietary code) are detected, _before_ data leaves the machine.

2. **Global OS-Level Sandbox Monitoring:**
   - Using the native Rust `notify` crate, the daemon watches the entire filesystem context globally.
   - Ensures governance is enforced regardless of the editor used (Notepad, Vim, standard IDEs), providing actual endpoint-level security.

3. **High-Performance Native RAG & Vector Search:**
   - Port the local `better-sqlite3` RAG store and embedding pipelines to native Rust using `rusqlite`.
   - Eliminates cross-platform Node Native Module compilation headaches while increasing semantic search speeds for the Sentinel engine memory.

4. **Parallel "Tribunal" Orchestration (The Tokio Advantage):**
   - Node.js single-threaded event loops bottleneck coordinating multiple LLMs (Governor, Judge, Scrivener).
   - Rust's `tokio` async runtime allows the daemon to execute the Tribunal workflow fiercely in parallel, polling Claude, Gemini, and the Local Vector DB simultaneously, cutting "Time-to-Governance" latency from 10+ seconds to sub-3 seconds.

5. **Seamless Multi-IDE Licensing & SSO:**
   - Enterprise authentication, OAuth, SAML, and SSO logic is built _once_ in the Tauri desktop app.
   - The cryptographic license key sits in the OS Secure Enclave. The VS Code, Cursor, and JetBrains plugins all simply ping the local daemon to verify Enforce-Mode unlocks, massively reducing go-to-market friction for other IDEs.

---

## Immediate Development Directives

To successfully run these two tracks simultaneously:

1.  **Service Isolation:** For all new features (M7-M10), separate the _logic_ from the _VS Code integration_.
    - _Bad:_ `vscode.workspace.executeCommand("git.reset")` mixed inside `RevertPanel.ts`.
    - _Good:_ `GitService.rollback(hash)` called by the panel.
2.  **API-First Design:** If the extension needs token data, design `TokenService.ts` as if it's already fetching from `http://localhost:7777/api/roi` (even if it's reading a local file for now).
3.  **Cross-IDE Preparation:** Keep the Webviews generic (React/Vue/HTML). If they are tightly bound to VS Code's style engine, they will be hard to port when you build the JetBrains or Visual Studio plugins.
