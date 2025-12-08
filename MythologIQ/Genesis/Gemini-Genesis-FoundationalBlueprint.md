# GEMINI GENESIS: The Antigravity Foundation Blueprint

This document represents the translation of "Context Engineering" into the specific capabilities of the Antigravity agent (Gemini). It fundamentally shifts the workflow from "interactive chatting" to "deterministic agentic operation."

**Core Philosophy:**
The goal is to create a repository environment where the Agent cannot "drift" because the scaffolding (artifacts, workflows, and rules) holds it in place. We replace "prompting" with "protocols."

---

## Phase 1: The Cortex (Project Memory & Context)

Unlike standard LLMs which need a single file dump, Antigravity uses a "Working Memory" directory. We will formalize this to prevent hallucinations about file structure.

### 1. The `REPO_CONSTITUTION.md` (The Law)

_Equivalent to `CLAUDE.md`, but tailored for Antigravity's "User Rules" injection._

A single source of truth file located at `.gemini/REPO_CONSTITUTION.md` that defines:

- **The Prime Directives**: (e.g., "Answer First", "Read-Before-Write").
- **The Tech Stack**: Hard constraints (e.g., "Use Tailwind", "No Class Components").
- **The File Structure**: A rigid map of where things go (e.g., "All components in `src/components/[module]/`").

### 2. The `CONTEXT_MAP.json` (The Map)

_Equivalent to `project_index.py`._

A regularly updated JSON artifact that maps the "High Signal" nodes of the application.

- _Why?_ Antigravity has tools to search `ls` and `grep`, but they are "expensive" (costing steps and tokens). A pre-compiled map allows for "Zero-Shot Navigation."
- _Mechanism:_ A workflow script (or tool sequence) that updates this map after major refactors.

---

## Phase 2: The Meta-Protocol (Structuring Thought)

We replace "Slash Commands" (which Antigravity doesn't natively have in the prompt box) with **Task Boundaries** and **Artifact Workflows**.

### 1. The Tri-Artifact System

Antigravity already uses `task.md`, `implementation_plan.md`, and `walkthrough.md`. We will **weaponize** these by enforcing valid schemas.

- **The Gatekeeper Protocol**: The agent is forbidden from writing code until `implementation_plan.md` contains a specific section: `## Risk Assessment & Rollback Strategy`.
- **The Progress Latch**: `task.md` must be updated _atomically_. Every checkmark requires a corresponding tool output proving success.

### 2. The Mode-Switching Protocol

Instead of separate agents, we define explicit **Cognitive Modes** that the single agent must announce via `task_boundary`.

- **MODE: ARCHITECT** (Read-Only)
  - _Allowed Tools_: `search`, `read_file`, `list_dir`.
  - _Forbidden Tools_: `write_file`, `run_command` (except info gather).
  - _Output_: An Implementation Plan.
- **MODE: BUILDER** (Write-Only)
  - _Allowed Tools_: `write_file`, `run_command`.
  - _Constraint_: Can only touch files listed in the Plan.
- **MODE: AUDITOR** (Verify-Only)
  - _Allowed Tools_: `run_command` (tests), `browser_subagent`.
  - _Constraint_: Must assume the code is broken. "Guilty until proven working."

---

## Phase 3: The Workflow Engine ("Workflows as Code")

Antigravity supports `.agent/workflows/*.md`. We will build a library of "Standard Operating Procedures" (SOPs).

### 1. `workflows/initialize_session.md`

A script that runs automatically (or is requested) at the start of a session:

1.  Read `task.md`.
2.  Run `git status` + `git fetch`.
3.  Read `REPO_CONSTITUTION.md`.
4.  Output a "Session Context" summary.

### 2. `workflows/pre_commit_audit.md`

A checklist the agent must execute before asking to commit:

1.  Verify no lint errors.
2.  Verify no "console.log" litter.
3.  Verify `task.md` is updated.

---

## Phase 4: The Handoff (Session Continuity)

The biggest failure point in long-running projects is "Amnesia" between sessions.

### The `HANDOFF_PACKET.json`

A structured JSON file updated at the _end_ of every session (via `notify_user` or artifact write).

- **Current State**: What is broken _right now_?
- **Next Immediate Action**: The exact command to run next.
- **Active Context**: List of files that were "hot" in the last session.

---

## Implementation Roadmap

To activate this foundation, I propose we generate the following documentation only (no code yet):

1.  `Design Documents/BuildFoundations/GEMINI_PROTOCOLS/REPO_CONSTITUTION_TEMPLATE.md`
2.  `Design Documents/BuildFoundations/GEMINI_PROTOCOLS/WORKFLOW_CATALOG.md`
3.  `Design Documents/BuildFoundations/GEMINI_PROTOCOLS/CONTEXT_MAP_SCHEMA.md`

This structure ensures that any "Product Manager" (User) can simply drag-and-drop these files into a new repo, and Antigravity will immediately "wake up" knowing how to behave.
