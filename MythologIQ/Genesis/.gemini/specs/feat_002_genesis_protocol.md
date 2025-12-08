# Specification: Feature 002 - The Genesis Protocol Infrastructure

**Status:** DRAFT
**Owner:** Antigravity (Dojo Master)
**Date:** 2025-12-08

## 1. Context & Goal

The "Genesis Protocol" Blueprint defines a "Net Positive," deterministic development environment. The `REPO_CONSTITUTION.md` and User Rules mandate specific safety protocols (Git Safety, Read-Before-Write), but the actual _Workflow Files_ (`.agent/workflows/*.md`) to enforce these are missing or incomplete.

**Goal**: Implement the "Missing Engine Parts" — the specific workflows that enforce the safety and consistency rules defined in the Constitution.

## 2. User Stories

- **As the Agent**, I want a `safe_git_operation` workflow so that I never accidentally destroy user data with `git checkout` or `git reset`.
- **As the User**, I want a `pristine_git_sync` workflow so that I can trust my local repo is always aligned with GitHub before starting work.
- **As the System**, I want a `safe_file_rewrite` workflow to prevent "lazy rewrites" that drop imports or code blocks.

## 3. Technical Constraints & Patterns

- **Format**: All workflows must be Markdown with YAML frontmatter.
- **Location**: `g:\MythologIQ\Genesis\.agent\workflows\`
- **Pattern**: "Check First, Act Second." (e.g., `git status` before `git checkout`).

## 4. The Change Delta (Plan)

### [NEW] [.agent/workflows/safe_git_operation.md](file:///g:/MythologIQ/Genesis/.agent/workflows/safe_git_operation.md)

- **Purpose**: Enforces `git status` before any destructive command.
- **Steps**:
  1.  Run `git status`.
  2.  If dirty, STOP and Notify User.
  3.  If clean, proceed.

### [NEW] [.agent/workflows/safe_file_rewrite.md](file:///g:/MythologIQ/Genesis/.agent/workflows/safe_file_rewrite.md)

- **Purpose**: Enforces "Read-Before-Write" for large files.
- **Steps**:
  1.  Read target file.
  2.  Extract Key Components (Imports, Functions).
  3.  Compare with proposed content.
  4.  If missing keys, ABORT.

### [NEW] [.agent/workflows/pristine_git_sync.md](file:///g:/MythologIQ/Genesis/.agent/workflows/pristine_git_sync.md)

- **Purpose**: Safe synchronization logic.
- **Steps**:
  1.  `git fetch origin`.
  2.  `git status`.
  3.  `git pull` (only if clean).

### [MODIFY] [.agent/workflows/initialize_session.md](file:///g:/MythologIQ/Genesis/.agent/workflows/initialize_session.md)

- **Change**: Add a step to run/reference `pristine_git_sync` at the start of every session.

## 5. Verification Steps

- [ ] **Manual Audit**: Verify all 3 new workflow files exist.
- [ ] **Simulation**: Run `safe_git_operation` (via `read_file` or mental simulation) to confirm it blocks destructive actions on a dirty tree.
