# Specification: Feature 004 - FailSafe Core (Foundation)

**Status:** DRAFT
**Owner:** Antigravity (Dojo Master)
**Date:** 2025-12-08

## 1. Context & Goal

**Context**: Project FailSafe has been defined in `Design Documents/FailSafe_BLUEPRINT.md`. We have a `REVIEW-READ ONLY` folder containing a previous iteration. We must now initialize the _active_ codebase (`src/`) by selectively porting the "meritorious" components while adhering to the new "Zero Hallucination" standard.

**Goal**: Initialize the FailSafe Extension and Server Foundation.
**Philosophy**: "Scavenge the useful; discard the broken."

## 2. User Stories

- **As the User**, I want the extension to launch in VS Code so I can see the Hello World / Dashboard.
- **As the Agent**, I want a stable `src/` directory structure that separates the Extension (Frontend) from the Server (Backend).
- **As the System**, I want to enforce **KATA-007 (The Focus)** on every file we port to ensure high quality.

## 3. Technical Constraints & Patterns

- **Architecture**:
  - `src/extension/`: VS Code Extension Logic (Client).
  - `src/server/`: Fastify Server (Backend).
  - `src/dashboard/`: Webview UI (React/HTML).
- **Porting Rule: The Archeology Protocol**:
  1.  **Investigate**: Do not assume code is "dead". Is it broken? Or is it a half-built feature (Aspiration)?
  2.  **Evaluate**: Does the Aspiration align with the Blueprint?
  3.  **Action**:
      - If _Functional_: Port to `src/`.
      - If _Aspirational/Incomplete_: **Preserve the Vision**. Comment it out with `// FUTURE:` tags or extract the logic to `Design Documents/Legacy_Ideas.md`. **Do not delete the intent.**

## 4. The Change Delta (Plan)

### [NEW] [Scaffolding]

- Initialize `package.json` (Unified vs Workspace? We will stick to a single root for now to match the legacy structure if possible, or clean it up).
- Create `tsconfig.json`.

### [PORT] [Fastify Server]

- **Source**: `REVIEW-READ ONLY/FailSafe/src/server/` (Verified as "Implemented").
- **Dest**: `src/server/`.
- **Action**: Port the Server entry point and essential plugins (`health`, `metrics`).

### [PORT] [Dashboard Foundation]

- **Source**: `REVIEW-READ ONLY/FailSafe/src/dashboard/` (Verified as "Partial").
- **Dest**: `src/dashboard/`.
- **Action**: Port the basic HTML/React structure. Ensure it connects to the Extension.

### [NEW] [Extension Entry]

- **Dest**: `src/extension/main.ts`.
- **Action**: Create a clean entry point that starts the Fastify server and registers the "Show Dashboard" command.

## 5. Verification Steps

- [ ] **Build**: Run `npm install` and `npm run compile` to verify the new `src` builds.
- [ ] **Launch**: (Simulation) Verify the extension activates and logs "FailSafe Active".
