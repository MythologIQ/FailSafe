# QoreLogic A.E.G.I.S. Framework for Claude Code

A governance framework for AI-assisted development with cryptographic traceability, KISS enforcement, and persona-based routing.

## Overview

This adaptation brings the QoreLogic A.E.G.I.S. (Align, Encode, Gate, Implement, Substantiate) methodology to Claude Code, providing:

- **Macro-level KISS**: Project structure, file organization, dependency management
- **Micro-level KISS**: Function length, nesting depth, variable naming
- **Merkle-chained traceability**: Every decision cryptographically linked
- **Persona-based routing**: Right expertise for each domain

## Installation

### 1. Copy to Your Project

```bash
# Copy the .qorelogic/claude directory to your project root
cp -r .qorelogic/claude /path/to/your/project/.claude/
```

### 2. Configure Claude Code Settings

Add to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [".claude/hooks/kiss-razor-gate.sh"],
    "PostToolUse": [".claude/hooks/complexity-audit.sh"],
    "Stop": [".claude/hooks/session-seal.sh"]
  },
  "permissions": {
    "allow": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
  }
}
```

### 3. Initialize QoreLogic DNA

```bash
# In your project directory, use the bootstrap skill
claude --skill ql-bootstrap
```

## Directory Structure

```
.qorelogic/claude/
├── README.md                 # This file
├── subagents/               # Specialized agent definitions
│   ├── ql-governor.md       # Strategic planning & encoding
│   ├── ql-judge.md          # Security auditing & verification
│   └── ql-specialist.md     # Implementation with KISS razor
├── skills/                  # Slash command skills
│   ├── ql-bootstrap.md      # Initialize project DNA
│   ├── ql-status.md         # Lifecycle diagnostic
│   ├── ql-audit.md          # Gate tribunal (PASS/VETO)
│   ├── ql-implement.md      # Build with §4 Razor
│   ├── ql-refactor.md       # KISS simplification pass
│   ├── ql-validate.md       # Merkle chain verification
│   └── ql-substantiate.md   # Session seal
├── hooks/                   # Automated enforcement
│   ├── kiss-razor-gate.sh   # Pre-commit complexity check
│   ├── complexity-audit.sh  # Post-edit verification
│   └── session-seal.sh      # End-of-session seal
└── templates/               # Document templates
    ├── CONCEPT.md           # Strategic "Why" template
    ├── ARCHITECTURE_PLAN.md # Technical blueprint template
    ├── META_LEDGER.md       # Merkle chain template
    ├── SYSTEM_STATE.md      # Project tree snapshot
    └── SHADOW_GENOME.md     # Failure mode documentation
```

## The A.E.G.I.S. Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     A.E.G.I.S. LIFECYCLE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ALIGN ──► ENCODE ──► GATE ──► IMPLEMENT ──► SUBSTANTIATE      │
│    │         │         │          │              │              │
│    ▼         ▼         ▼          ▼              ▼              │
│ CONCEPT  BLUEPRINT  VERDICT    CODE         SEALED            │
│   .md      .md      PASS/VETO   src/        LEDGER            │
│                                                                 │
│  [Governor]  [Governor]  [Judge]  [Specialist]  [Judge]        │
└─────────────────────────────────────────────────────────────────┘
```

### Phase Descriptions

| Phase | Persona | Purpose | Artifact |
|-------|---------|---------|----------|
| **ALIGN** | Governor | Define the "Why" in one sentence | `docs/CONCEPT.md` |
| **ENCODE** | Governor | Technical blueprint with risk grade | `docs/ARCHITECTURE_PLAN.md` |
| **GATE** | Judge | Adversarial audit, PASS/VETO verdict | `.agent/staging/AUDIT_REPORT.md` |
| **IMPLEMENT** | Specialist | Build with §4 Razor constraints | `src/*` |
| **SUBSTANTIATE** | Judge | Verify reality matches promise, seal | `docs/META_LEDGER.md` |

## KISS Enforcement (§4 Simplicity Razor)

### Macro Level (Project Structure)
- Files must not exceed **250 lines**
- No "God Objects" or utility dumping grounds
- Dependencies must prove necessity (10-line vanilla rule)
- All files must be in active build path (no orphans)

### Micro Level (Code Quality)
- Functions must not exceed **40 lines**
- Maximum **3 levels of nesting**
- No nested ternaries: `a ? b : c ? d : e`
- Explicit naming: `noun` or `verbNoun` (no `x`, `data`, `obj`)
- No `console.log` artifacts in production code

## Risk Grading System

| Grade | Definition | Examples | Verification |
|-------|------------|----------|--------------|
| **L1** | Routine, reversible | UI text, comments, renames | Static analysis |
| **L2** | Logic changes | New functions, APIs, schemas | Sentinel + Citation |
| **L3** | Security/irreversible | Auth, encryption, PII, keys | Formal review + seal |

## Quick Start Commands

```bash
# Initialize a new project with QoreLogic DNA
/ql-bootstrap

# Check project lifecycle status
/ql-status

# Run gate tribunal for L2/L3 changes
/ql-audit

# Implement with KISS razor enforcement
/ql-implement

# Refactor existing code for KISS compliance
/ql-refactor

# Validate Merkle chain integrity
/ql-validate

# Seal session and verify promise matches reality
/ql-substantiate
```

## Automatic Persona Routing

The framework automatically routes to the appropriate persona based on file paths:

| Path Pattern | Routed Persona | Enforcement |
|--------------|----------------|-------------|
| `*/security/*`, `*/auth/*` | Judge | L3 lockdown, formal review |
| `*/src/*`, `*/components/*` | Specialist | 40-line razor |
| `*/docs/*` | Governor | Merkle chain verification |

## Merkle Chain Traceability

Every significant decision is cryptographically linked:

```
Entry #1 (Genesis)
  hash: SHA256(CONCEPT.md + ARCHITECTURE_PLAN.md)

Entry #2 (Audit)
  hash: SHA256(AUDIT_REPORT.md + Entry#1.hash)

Entry #3 (Implementation)
  hash: SHA256(src/* changes + Entry#2.hash)

Entry #4 (Seal)
  hash: SHA256(final state + Entry#3.hash)
```

## Migration from Zo

If you have an existing Zo configuration:

1. The persona definitions map directly to subagents
2. The prompts become skills (slash commands)
3. The JSON rules become hooks + skill enforcement
4. Document templates remain compatible

## Troubleshooting

### "Gate locked. Tribunal audit required."
Run `/ql-audit` to generate a PASS/VETO verdict before implementation.

### "Chain Broken at Entry #X"
The Merkle chain has been tampered with or corrupted. Manual audit required.

### "Complexity razor triggered"
Your code exceeds KISS constraints. Run `/ql-refactor` for automatic simplification.

### "Target file appears orphaned"
The file is not connected to the build path. Verify imports or remove dead code.
