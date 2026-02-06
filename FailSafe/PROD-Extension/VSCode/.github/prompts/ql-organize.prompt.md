---
name: ql-organize
description: Adaptive workspace organization that detects project type, analyzes existing conventions, and proposes context-aware restructuring. Supports software repos, monorepos, data science, documentation, and hybrid workspaces.
---

# /ql-organize - Adaptive Workspace Organization

<skill>
  <trigger>/ql-organize</trigger>
  <phase>ORGANIZE</phase>
  <persona>Governor</persona>
  <output>Context-aware reorganization proposal, optional execution, FILE_INDEX.md audit trail</output>
</skill>

## Purpose

Intelligently organize workspaces by **detecting project archetype**, **analyzing existing conventions**, and **proposing adaptive restructuring**. Unlike static organization rules, this skill learns from the workspace and proposes changes that fit the project's nature.

## Core Philosophy

1. **Detect, Don't Assume** - Analyze before proposing
2. **Conventions Over Configuration** - Follow ecosystem standards
3. **Propose, Don't Prescribe** - User approves before execution
4. **Incremental Over Wholesale** - Small targeted changes beat full restructuring
5. **Preserve Intent** - Existing meaningful structure is signal, not noise
6. **Consistency Over Novelty** - Once established, maintain the standard
7. **🔒 ISOLATION MANDATORY** - Workspace directories (`.agent/`, `.claude/`, `.qorelogic/`, `.failsafe/`) are NEVER reorganized

---

## ⛔ Phase -1: Workspace Isolation Enforcement

**CRITICAL**: Before ANY analysis or reorganization, establish protected paths.

### Workspace Operational Directories (HANDS OFF - NEVER REORGANIZE)

The following directories are **workspace-level AI governance** where QoreLogic agents READ instructions and WRITE operational state. These are **NEVER considered part of the repository source code** and MUST be excluded from ALL reorganization proposals:

```
FORBIDDEN_PATHS = [
    '.agent/',          # Antigravity/Gemini workspace workflows
    '.claude/',         # Claude CLI workspace commands
    '.qorelogic/',      # QoreLogic workspace configuration
    '.failsafe/',       # FailSafe extension workspace state
]
```

### FailSafe Development Source Directories (CONDITIONAL - HANDS OFF IF DETECTED)

**If this is the FailSafe development repository** (detected by presence of `src/Genesis/workflows/` + `build/transform.ps1` + `targets/`), the following are **extension source code** and MUST also be excluded:

```
FAILSAFE_DEV_PATHS = [
    'src/',             # Canonical extension source
    'qorelogic/',       # Legacy extension source staging
    'build/',           # Extension build scripts
    'targets/',         # Target environment constraints
    'PROD-Extension/',  # Generated extension packages
]
```

### Detection: Is This FailSafe Development Repo?

```
Check for ALL:
- src/Genesis/workflows/*.yml
- src/Qorelogic/workflows/*.yml
- build/transform.ps1
- targets/Antigravity/constraints.yml
```

**If ALL present:**

```markdown
🔒 **FailSafe Development Repository Detected**

This repository contains both:

1. Workspace governance (`.agent/`, `.claude/`, etc.)
2. FailSafe extension source code (`src/`, `build/`, etc.)

**Isolation Active**: The following paths are EXCLUDED from reorganization:

- All workspace directories (`.agent/`, `.claude/`, `.qorelogic/`, `.failsafe/`)
- All extension source directories (`src/`, `qorelogic/`, `build/`, `targets/`, `PROD-Extension/`)

**Reorganization scope limited to**: Application code, tests, documentation (non-governance)
```

### Validation Function

Before proposing ANY file move:

```python
def is_path_safe_to_reorganize(path):
    """Check if path can be reorganized without violating isolation."""

    # Always forbidden
    FORBIDDEN = ['.agent/', '.claude/', '.qorelogic/', '.failsafe/']
    for forbidden in FORBIDDEN:
        if path.startswith(forbidden):
            return False, f"Workspace directory - isolation violation"

    # Conditionally forbidden (if FailSafe dev repo)
    if is_failsafe_dev_repo():
        FAILSAFE_FORBIDDEN = ['src/', 'qorelogic/', 'build/', 'targets/', 'PROD-Extension/']
        for forbidden in FAILSAFE_FORBIDDEN:
            if path.startswith(forbidden):
                return False, f"Extension source code - isolation violation"

    return True, "OK to reorganize"
```

**If ANY proposed move violates isolation:**

```
⛔ ISOLATION VIOLATION DETECTED

Path: [path]
Reason: [workspace directory | extension source]

Workspace directories are ISOLATED from repository source code.
This ensures your active AI instructions remain stable while developing extensions.

See: docs/specs/WORKSPACE_ISOLATION_RULES.md
```

---

## Phase 0: Archetype Cache Check

**Before detection, check for established archetype:**

```
Glob: .qorelogic/workspace.json
```

### If cache exists:

```json
// .qorelogic/workspace.json
{
  "archetype": "node-app",
  "detectedAt": "2024-01-15T10:30:00Z",
  "confidence": "high",
  "lockedBy": "user-approval"
}
```

**When cached archetype exists:**

1. Load cached archetype - skip full detection
2. Verify key indicators still present (quick sanity check)
3. If indicators changed significantly, warn user:
   > "Cached archetype is `node-app` but indicators suggest `node-monorepo`.
   > Options: (1) Keep current, (2) Re-detect, (3) Manual override"
4. Proceed with cached archetype unless user requests re-detection

**Rationale**: Consistency has value. Once a project structure is established and approved, maintain it. Re-detecting every session wastes tokens and risks inconsistent proposals.

### If no cache:

Proceed to Phase 1 (full detection), then cache result.

---

## Phase 1: Workspace Detection

### Step 1.1: Scan for Archetype Indicators

```
Glob: **/package.json
Glob: **/Cargo.toml
Glob: **/go.mod
Glob: **/pyproject.toml
Glob: **/requirements.txt
Glob: **/*.sln
Glob: **/pom.xml
Glob: **/*.ipynb
Glob: **/mkdocs.yml
Glob: **/docusaurus.config.js
Glob: **/.claude/**
Glob: **/.cursor/**
Glob: **/.qorelogic/**
```

### Step 1.2: Classify Workspace Archetype

Based on detected indicators, classify as ONE of:

| Archetype          | Indicators                              | Canonical Structure                       |
| ------------------ | --------------------------------------- | ----------------------------------------- |
| **node-app**       | Single package.json at root             | `src/`, `lib/`, `test/`, `dist/`          |
| **node-monorepo**  | Multiple package.json, workspaces field | `packages/`, `apps/`, `libs/`             |
| **python-package** | pyproject.toml or setup.py              | `src/[pkg]/`, `tests/`, `docs/`           |
| **python-scripts** | .py files, requirements.txt             | `scripts/`, `data/`, `output/`            |
| **rust-crate**     | Cargo.toml                              | `src/`, `tests/`, `benches/`, `examples/` |
| **rust-workspace** | Cargo.toml with [workspace]             | `crates/`, `bins/`                        |
| **go-module**      | go.mod                                  | `cmd/`, `pkg/`, `internal/`               |
| **dotnet**         | .sln or .csproj                         | `src/`, `tests/`, `docs/`                 |
| **data-science**   | .ipynb files                            | `notebooks/`, `data/`, `models/`, `src/`  |
| **documentation**  | mkdocs.yml, docusaurus                  | `docs/`, `static/`, `src/`                |
| **ai-workspace**   | .claude/, .cursor/, .qorelogic/         | `docs/`, `.agent/`, governance dirs       |
| **mixed**          | Multiple indicators                     | Hybrid approach                           |
| **personal**       | No clear indicators                     | `Projects/`, `Documents/`, `Archive/`     |

### Step 1.3: Report Detection

```markdown
## Workspace Analysis

**Detected Archetype**: [archetype]
**Confidence**: [high/medium/low]

**Indicators Found**:

- [indicator 1]: [path]
- [indicator 2]: [path]
```

### Step 1.4: Persist Archetype (After User Confirmation)

Once user approves the detected archetype, cache it:

```
mkdir -p .qorelogic
Write: .qorelogic/workspace.json
```

```json
{
  "archetype": "[detected]",
  "detectedAt": "[ISO 8601]",
  "confidence": "[high/medium/low]",
  "lockedBy": "user-approval",
  "indicators": ["package.json", "tsconfig.json"]
}
```

This cache persists across sessions. Future `/ql-organize` runs will use cached archetype unless:

- User explicitly requests `--force-redetect`
- Key indicators are missing (sanity check fails)

---

## Phase 2: Convention Analysis

### Step 2.1: Map Existing Conventions

For the detected archetype, analyze how well the workspace follows conventions:

**For node-app:**

```
Check: src/ exists and contains source files
Check: test/ or __tests__/ or *.test.ts pattern
Check: dist/ or build/ for output
Check: No source files in root (except config)
```

**For python-package:**

```
Check: src/[package_name]/ structure
Check: tests/ directory
Check: __init__.py files present
Check: No loose .py files in root
```

**For data-science:**

```
Check: notebooks/ for .ipynb files
Check: data/ for datasets (with .gitkeep or data/)
Check: models/ for trained models
Check: src/ for reusable code
```

**For ai-workspace:**

```
Check: docs/ for CONCEPT.md, ARCHITECTURE_PLAN.md
Check: .agent/ for staging
Check: Governance files in place
Check: META_LEDGER.md exists
```

### Step 2.2: Identify Deviations

List files/directories that deviate from archetype conventions:

```markdown
## Convention Deviations

| Item   | Current Location | Expected Location | Severity          |
| ------ | ---------------- | ----------------- | ----------------- |
| [file] | [current]        | [expected]        | [high/medium/low] |
```

---

## Phase 3: Organization Proposal

### Step 3.1: Generate Targeted Proposals

Based on archetype and deviations, propose SPECIFIC changes (not wholesale restructuring):

```markdown
## Organization Proposal

**Archetype**: [detected]
**Strategy**: [incremental/restructure/minimal]

### Proposed Changes

#### High Priority (Convention Violations)

1. Move `[file]` → `[destination]`
   - Reason: [convention requirement]

#### Medium Priority (Improvement)

2. Create `[directory]`
   - Reason: [missing standard directory]

#### Low Priority (Optional)

3. Consolidate `[files]` → `[destination]`
   - Reason: [cleaner organization]

### Preserved (No Changes)

- `[directory]` - Already well-organized
- `[directory]` - Contains managed project structure

### Estimated Impact

- Files to move: [count]
- Directories to create: [count]
- Risk level: [low/medium/high]
```

### Step 3.2: User Confirmation

**STOP and ask user to confirm before executing:**

> I've analyzed your workspace and detected it as a **[archetype]** project.
>
> **Proposed changes**: [summary]
>
> Options:
>
> 1. **Execute all** - Apply all proposed changes
> 2. **Execute high priority only** - Only convention violations
> 3. **Review individually** - Approve each change
> 4. **Cancel** - No changes
>
> Which would you prefer?

---

## Phase 4: Execution (After Approval)

### Step 4.1: Create Movement Log

Initialize tracking before any changes:

```typescript
interface MovementLog {
  timestamp: string;
  archetype: string;
  strategy: string;
  movements: Movement[];
  created: string[];
  preserved: string[];
}

interface Movement {
  id: number;
  source: string;
  destination: string;
  reason: string;
  timestamp: string;
  status: "pending" | "completed" | "failed";
}
```

### Step 4.2: Execute Approved Changes

For each approved change:

1. **Verify source exists**
2. **Create destination directory if needed**
3. **Execute move**
4. **Log movement with timestamp**
5. **Verify destination**

### Step 4.3: Generate FILE_INDEX.md

````markdown
# File Organization Index

**Generated**: [ISO 8601]
**Archetype**: [detected]
**Strategy**: [applied]

---

## Summary

| Metric              | Count |
| ------------------- | ----- |
| Files moved         | [n]   |
| Directories created | [n]   |
| Items preserved     | [n]   |
| Errors              | [n]   |

---

## Movement Log

| #   | Source | Destination | Reason   | Status |
| --- | ------ | ----------- | -------- | ------ |
| 1   | [path] | [path]      | [reason] | ✓      |

---

## Created Directories

| Directory | Purpose                |
| --------- | ---------------------- |
| [path]    | [archetype convention] |

---

## Preserved Items

| Item   | Reason      |
| ------ | ----------- |
| [path] | [rationale] |

---

## Rollback Instructions

To undo this organization:

```bash
# Reverse movements
mv "[dest]" "[source]"
...
```
````

---

_Organized using /ql-organize with [archetype] archetype detection_

```

---

## Archetype-Specific Templates

### Template: node-app

```

project/
├── src/ # Source code
│ ├── index.ts # Entry point
│ └── lib/ # Internal libraries
├── test/ # Test files
├── dist/ # Build output (gitignored)
├── docs/ # Documentation
├── package.json
├── tsconfig.json
└── README.md

```

### Template: node-monorepo

```

project/
├── packages/ # Shared packages
│ ├── core/
│ └── utils/
├── apps/ # Applications
│ ├── web/
│ └── api/
├── docs/ # Documentation
├── package.json # Root workspace config
└── README.md

```

### Template: python-package

```

project/
├── src/
│ └── package_name/
│ ├── **init**.py
│ └── core.py
├── tests/
│ └── test_core.py
├── docs/
├── pyproject.toml
└── README.md

```

### Template: data-science

```

project/
├── notebooks/ # Jupyter notebooks
│ ├── 01_exploration.ipynb
│ └── 02_modeling.ipynb
├── data/
│ ├── raw/ # Immutable original data
│ ├── processed/ # Cleaned data
│ └── external/ # Third-party data
├── models/ # Trained models
├── src/ # Reusable code
│ └── utils.py
├── reports/ # Generated reports
├── requirements.txt
└── README.md

```

### Template: ai-workspace

```

project/
├── docs/
│ ├── CONCEPT.md
│ ├── ARCHITECTURE_PLAN.md
│ └── META_LEDGER.md
├── .agent/
│ └── staging/
├── .claude/ # Claude Code config
├── .qorelogic/ # QoreLogic orbits
├── src/ # Implementation
└── README.md

```

### Template: personal

```

workspace/
├── Projects/ # Active projects
├── Documents/ # Notes, plans
├── Research/ # Reference materials
├── Data/ # Datasets
├── Archive/ # Completed/old
└── README.md

```

---

## Phase 5: Privacy Configuration Review

### Step 5.1: Repository Visibility Check

```

AskUserQuestion: "What is this repository's visibility?"
Options:

1. Public / Open-Source
2. Private / Internal
3. Unknown / Not a Git repo

```

### Step 5.2: Privacy Audit

Scan current `.gitignore` for required privacy patterns:

```

Read: .gitignore

````

**Required Privacy Patterns** (for Public/Open-Source repos):

| Category | Patterns | Reason |
|----------|----------|--------|
| AI Governance | `.agent/`, `.claude/`, `.failsafe/`, `.qorelogic/`, `.cursor/`, `.windsurf/`, `.copilot/` | Proprietary governance state |
| AI Instructions | `CLAUDE.md`, `GEMINI.md`, `COPILOT.md`, `CURSOR.md` | Workspace-specific AI config |
| IDE Settings | `.vscode/`, `.idea/` | Local contributor settings |
| Planning Docs | `plan-*.md`, `plans/`, `Planning/`, `docs/` | Private roadmap/strategy |
| Session State | `.agent/staging/` | Audit reports, session data |

### Step 5.3: Privacy Gap Report

```markdown
## Privacy Configuration Status

**Repository Type**: [Public/Private/Unknown]
**Gitignore Status**: [Complete/Gaps Found/Missing]

### Protected Directories
| Pattern | Status |
|---------|--------|
| `.agent/` | [✓ Protected / ✗ EXPOSED] |
| `.claude/` | [✓ Protected / ✗ EXPOSED] |
| `.qorelogic/` | [✓ Protected / ✗ EXPOSED] |
| `docs/` | [✓ Protected / ✗ EXPOSED] |
| `plan-*.md` | [✓ Protected / ✗ EXPOSED] |

### Gaps Requiring Remediation
[List any missing patterns for public repos]

### Recommended Actions
[Based on repository visibility]
````

### Step 5.4: Privacy Modification Options

Present user with options:

> **Privacy Configuration Review**
>
> Current state: [summary of protected vs exposed]
>
> Options:
>
> 1. **Apply recommended patterns** - Add all missing privacy patterns
> 2. **Selective update** - Choose which patterns to add
> 3. **Review current patterns** - List what's already protected
> 4. **Switch visibility mode** - Change from public to private patterns or vice versa
> 5. **Skip** - Keep current configuration

### Step 5.5: Apply Privacy Updates (After Approval)

If user approves changes, update `.gitignore`:

```gitignore
# ============================================
# AI GOVERNANCE & PROPRIETARY DIRECTORIES
# ============================================
# These directories contain AI agent configuration,
# session state, and proprietary governance logic.
# MUST be excluded from public/open-source repos.
# ============================================

.agent/
.claude/
.failsafe/
.qorelogic/
.cursor/
.windsurf/
.copilot/

# AI instruction files (workspace-specific)
CLAUDE.md
GEMINI.md
COPILOT.md
CURSOR.md

# ============================================
# PLANNING & GOVERNANCE DOCUMENTS
# ============================================

plan-*.md
plans/
Planning/
docs/

# ============================================
# IDE & EDITOR SETTINGS (LOCAL)
# ============================================

.vscode/
!.vscode/extensions.json
!.vscode/settings.json.example

.idea/
```

### Step 5.6: Log Privacy Configuration

Add to `.qorelogic/workspace.json`:

```json
{
  "archetype": "[detected]",
  "detectedAt": "[ISO 8601]",
  "privacy": {
    "visibility": "public|private",
    "configuredAt": "[ISO 8601]",
    "patterns": ["list", "of", "protected", "patterns"],
    "lastAuditedAt": "[ISO 8601]"
  }
}
```

### Step 5.7: Privacy Report

```markdown
## Privacy Configuration Complete

**Visibility**: [Public/Private]
**Patterns Applied**: [count]

### Now Protected from Public Commit

- AI governance directories (`.agent/`, `.claude/`, etc.)
- AI instruction files (`CLAUDE.md`, `GEMINI.md`, etc.)
- Planning documents (`plan-*.md`, `docs/`)
- IDE local settings (`.vscode/`)

### Included in Repository

- Source code (`src/`, `extension/`)
- Public documentation (`README.md`, `CHANGELOG.md`)
- Configuration templates (`.example` files)

⚠️ **Privacy Enforcement Active**: All `/ql-*` commands that create
or modify files will verify paths against gitignore before writing.

To review privacy settings later, run `/ql-organize` and select
"Privacy Configuration Review".
```

---

## Constraints

### NEVER

- Move files without user approval
- Delete directories unless explicitly requested
- Touch `.git/`, `node_modules/`, `__pycache__/`, `venv/`
- Override detected conventions with personal preference
- Assume archetype without evidence

### ALWAYS

- Detect before proposing
- Explain reasoning for each change
- Provide rollback instructions
- Preserve existing meaningful structure
- Log every movement with source and destination
- Ask for confirmation before execution

---

## Success Criteria

Organization is successful when:

- [ ] Archetype correctly detected
- [ ] Proposals align with archetype conventions
- [ ] User approved changes before execution
- [ ] All movements logged in FILE_INDEX.md
- [ ] No data loss
- [ ] Rollback instructions provided
- [ ] Workspace follows detected archetype conventions
- [ ] Privacy configuration reviewed (public repos require explicit user acknowledgment)
- [ ] Gitignore patterns verified for governance directories

---

## Integration with QoreLogic

This skill implements:

- **Adaptive Intelligence**: Detects and adapts to workspace type
- **Convention Compliance**: Follows ecosystem-specific standards
- **Audit Trail**: Complete movement logging
- **Safe Defaults**: Proposal-first, execute-after-approval
- **Rollback Support**: Every change is reversible
- **Privacy Enforcement**: Protects governance state from public exposure
- **User-Driven Configuration**: All non-functional decisions require explicit user approval

---

**Remember**: The best organization is invisible - files are where developers expect them to be. Detect conventions, follow them, and only propose changes that improve convention compliance.
