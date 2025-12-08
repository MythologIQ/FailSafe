# Gemini Genesis: System Architecture

**Version:** 1.0
**Status:** IMPLEMENTED

This document describes the "Operating System" established for the MythologIQ Genesis repository. It is designed to ensure Agentic Determinism through rigid protocols and standard operating procedures.

## I. The Cortex (Memory & Rules)

Located in `.gemini/`, this layer defines the "Brain" of the project.

- **`REPO_CONSTITUTION.md`**: The supreme law. Contains the Prime Directives (e.g., "Read-Before-Write", "Git Status First") and Tech Stack constraints.
- **`CONTEXT_MAP.json`**: A high-signal navigation map. Allows the agent to "know" where important documents are without burning tokens on recursive searches.

## II. The Workflow Engine (Automation)

Located in `.agent/workflows/`, this layer defines the "Habits" of the agent.

- **`initialize_session.md`**: Run at start. Force-loads the Constitution and Map.
- **`pre_commit_audit.md`**: Run before saving. Enforces hygiene (no console.logs, updated tasks).
- **`generate_handoff.md`**: Run at end. Dumps state to JSON to cure "Amnesia."

## III. The Meta-Protocol (Task Management)

The agent operates within a strict "Artifact Loop":

1.  **Task Boundary**: Defines the active chunk of work.
2.  **Implementation Plan**: Must exist and be approved before writing code.
3.  **Task Artifact**: Tracks granular progress.

## Usage Guide for Agents

1.  **Start:** `view_file .agent/workflows/initialize_session.md` -> Follow steps.
2.  **Work:** Adhere to `REPO_CONSTITUTION.md`.
3.  **Finish:** `view_file .agent/workflows/pre_commit_audit.md` -> Verify -> Commit.
