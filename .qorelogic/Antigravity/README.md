# QoreLogic A.E.G.I.S. Framework for Antigravity

A governance framework for AI-assisted development using Antigravity's Orbit-based architecture, providing cryptographic traceability, KISS enforcement, and multi-persona orchestration.

## Overview

This adaptation brings the QoreLogic A.E.G.I.S. (Align, Encode, Gate, Implement, Substantiate) methodology to Antigravity, leveraging its unique features:

- **Orbits**: Specialized agent configurations replacing personas
- **Workflows**: Multi-step execution pipelines with governance gates
- **Policies**: Rule-based enforcement integrated with Antigravity's policy system
- **Macro-level KISS**: Project structure, file organization, dependency management
- **Micro-level KISS**: Function length, nesting depth, variable naming
- **Merkle-chained traceability**: Every decision cryptographically linked

## Antigravity-Specific Concepts

### Orbits (Agent Configurations)

Antigravity uses "Orbits" as specialized agent configurations. QoreLogic maps its personas to Orbits:

| QoreLogic Persona | Antigravity Orbit | Purpose |
|-------------------|-------------------|---------|
| Governor | `orbit-governor` | Strategic planning, ALIGN/ENCODE phases |
| Judge | `orbit-judge` | Adversarial audit, GATE/SUBSTANTIATE phases |
| Specialist | `orbit-specialist` | Implementation with KISS enforcement |
| Sentinel | `orbit-sentinel` | Automated policy enforcement (new) |

### Workflow Integration

Antigravity workflows integrate with A.E.G.I.S. phases:

```
User Request
     │
     ▼
┌─────────────────┐
│ workflow-triage │ ← Analyzes request, assigns risk grade
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌───────┐
│  L1   │  │ L2/L3 │
│ Fast  │  │ Gated │
│ Path  │  │ Path  │
└───┬───┘  └───┬───┘
    │          │
    │     ┌────┴────┐
    │     ▼         ▼
    │  ENCODE    GATE
    │     │         │
    │     └────┬────┘
    │          ▼
    └─────► IMPLEMENT
              │
              ▼
         SUBSTANTIATE
```

## Directory Structure

```
.qorelogic/Antigravity/
├── README.md                    # This file
├── INSTALL.md                   # Installation guide
├── orbits/                      # Agent configurations
│   ├── orbit-governor.json      # Strategic architect
│   ├── orbit-judge.json         # Security auditor
│   ├── orbit-specialist.json    # Implementation engine
│   └── orbit-sentinel.json      # Policy enforcer
├── workflows/                   # Execution pipelines
│   ├── aegis-bootstrap.yaml     # Initialize project DNA
│   ├── aegis-triage.yaml        # Request classification
│   ├── aegis-encode.yaml        # Blueprint creation
│   ├── aegis-gate.yaml          # Tribunal audit
│   ├── aegis-implement.yaml     # Build with KISS
│   ├── aegis-refactor.yaml      # KISS simplification
│   ├── aegis-validate.yaml      # Merkle verification
│   ├── aegis-substantiate.yaml  # Session seal
│   └── aegis-status.yaml        # Lifecycle diagnostic
├── policies/                    # Rule enforcement
│   ├── kiss-razor.yaml          # §4 Simplicity enforcement
│   ├── security-gate.yaml       # L3 path protection
│   ├── merkle-integrity.yaml    # Chain validation
│   ├── orphan-detection.yaml    # Build path verification
│   └── cognitive-budget.yaml    # Context management
├── templates/                   # Document scaffolds
│   ├── CONCEPT.md
│   ├── ARCHITECTURE_PLAN.md
│   ├── META_LEDGER.md
│   ├── SYSTEM_STATE.md
│   └── SHADOW_GENOME.md
└── docs/                        # Supporting documentation
    ├── MERKLE_ITERATION_GUIDE.md
    ├── ORBIT_SPECIFICATION.md
    └── AEGIS_SELF_AUDIT.md
```

## The A.E.G.I.S. Lifecycle in Antigravity

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
│ [Governor] [Governor] [Judge] [Specialist]   [Judge]           │
│   Orbit      Orbit     Orbit     Orbit        Orbit            │
└─────────────────────────────────────────────────────────────────┘
```

### Phase Descriptions

| Phase | Orbit | Workflow | Output |
|-------|-------|----------|--------|
| **ALIGN** | orbit-governor | aegis-bootstrap | `docs/CONCEPT.md` |
| **ENCODE** | orbit-governor | aegis-encode | `docs/ARCHITECTURE_PLAN.md` |
| **GATE** | orbit-judge | aegis-gate | `.agent/staging/AUDIT_REPORT.md` |
| **IMPLEMENT** | orbit-specialist | aegis-implement | `src/*` |
| **SUBSTANTIATE** | orbit-judge | aegis-substantiate | `docs/META_LEDGER.md` (sealed) |

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

| Grade | Definition | Workflow Path | Verification |
|-------|------------|---------------|--------------|
| **L1** | Routine, reversible | Fast path (no gate) | Static analysis |
| **L2** | Logic changes | Gated path + audit | Sentinel + Citation |
| **L3** | Security/irreversible | Locked until sealed | Formal review + human sign-off |

## Quick Start

```yaml
# 1. Initialize project DNA
workflow: aegis-bootstrap
input:
  project_name: "My Project"

# 2. Check status
workflow: aegis-status

# 3. Run gate tribunal (L2/L3)
workflow: aegis-gate
input:
  target: "feature-x"

# 4. Implement with KISS
workflow: aegis-implement

# 5. Seal session
workflow: aegis-substantiate
```

## Automatic Orbit Routing

The Sentinel orbit automatically routes requests:

| Path Pattern | Routed Orbit | Policy Applied |
|--------------|--------------|----------------|
| `*/security/*`, `*/auth/*` | orbit-judge | security-gate.yaml |
| `*/src/*`, `*/components/*` | orbit-specialist | kiss-razor.yaml |
| `*/docs/*` | orbit-governor | merkle-integrity.yaml |

## Policy Enforcement

Policies run automatically via the Sentinel orbit:

```yaml
# Example: kiss-razor.yaml
triggers:
  - on_file_write
  - on_code_generation

checks:
  - name: function_length
    max: 40
    action: block_with_refactor_suggestion

  - name: nesting_depth
    max: 3
    action: warn_and_suggest_early_return

  - name: nested_ternary
    pattern: "\\?[^:]+\\?"
    action: block_always
```

## Merkle Chain Integrity

Every decision is cryptographically linked:

```
Entry #1 (Genesis)
  hash: SHA256(CONCEPT.md + ARCHITECTURE_PLAN.md)

Entry #2 (Gate)
  hash: SHA256(AUDIT_REPORT.md + Entry#1.hash)

Entry #3 (Implement)
  hash: SHA256(src/* + Entry#2.hash)

Entry #4 (Seal)
  hash: SHA256(final_state + Entry#3.hash)
```

## Migration from Other Platforms

### From Zo (Native QoreLogic)
- Personas → Orbits (direct mapping)
- Prompts → Workflows (YAML format)
- Rules → Policies (YAML format)
- Templates → Templates (no change)

### From Claude Code
- Subagents → Orbits
- Skills → Workflows
- Hooks → Policies
- Templates → Templates (no change)

## Troubleshooting

### "Workflow blocked by policy"
The Sentinel detected a policy violation. Check the specific policy message and remediate.

### "Chain integrity failure"
Run `aegis-validate` to identify the break point. See MERKLE_ITERATION_GUIDE.md.

### "Orbit routing failed"
Verify the file path matches expected patterns. Check policies/routing rules.

### "Gate locked"
Run `aegis-gate` to generate a PASS verdict before implementation.
