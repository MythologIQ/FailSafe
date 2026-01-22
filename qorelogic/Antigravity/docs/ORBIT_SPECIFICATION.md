# Orbit Specification

## Overview

Orbits are specialized agent configurations in the Antigravity adaptation of QoreLogic. Each Orbit represents a persona with specific responsibilities, tools, and constraints within the A.E.G.I.S. lifecycle.

## Orbit Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORBIT HIERARCHY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌──────────────┐                            │
│                    │   SENTINEL   │ ← Always Active            │
│                    │  (Enforcer)  │                            │
│                    └──────┬───────┘                            │
│                           │                                     │
│            ┌──────────────┼──────────────┐                     │
│            ▼              ▼              ▼                     │
│    ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│    │ GOVERNOR  │  │   JUDGE   │  │SPECIALIST │               │
│    │(Strategy) │  │ (Audit)   │  │ (Build)   │               │
│    └───────────┘  └───────────┘  └───────────┘               │
│                                                                 │
│    ALIGN/ENCODE   GATE/SUBSTANTIATE    IMPLEMENT               │
└─────────────────────────────────────────────────────────────────┘
```

## Orbit Specifications

### orbit-sentinel

**Role**: Automated Policy Enforcer & Routing Engine

**Activation**: Always active (background)

**Responsibilities**:
- Route requests to appropriate orbits
- Enforce policies continuously
- Monitor session metrics
- Alert on violations

**Tools**: Read-only (read_file, list_files, glob, grep)

**Unique Features**:
- Path-based routing engine
- Policy execution orchestration
- Cognitive budget tracking
- Metrics collection

### orbit-governor

**Role**: Senior Architect & A.E.G.I.S. Orchestrator

**Activation**: On ALIGN/ENCODE phases, docs/* paths

**Responsibilities**:
- Define strategic "Why" (CONCEPT.md)
- Create technical blueprint (ARCHITECTURE_PLAN.md)
- Initialize Merkle chain
- Assign risk grades

**Tools**: read_file, list_files, create_file, edit_file, glob, grep

**Constraints**:
- Cannot write implementation code
- Cannot approve own designs for L2/L3
- Must invoke Judge for high-risk changes

### orbit-judge

**Role**: Hardline Security Auditor & Architecture Veto Engine

**Activation**: On GATE/SUBSTANTIATE phases, security/* paths

**Responsibilities**:
- Adversarial audit of blueprints
- Generate PASS/VETO verdicts
- Document failures in Shadow Genome
- Cryptographically seal sessions

**Tools**: read_file, list_files, glob, grep (read-only focus)

**Constraints**:
- Cannot write implementation code
- Binary verdicts only (no "approve with warnings")
- Must document all vetoes in Shadow Genome

### orbit-specialist

**Role**: Senior Domain Expert & Implementation Engine

**Activation**: On IMPLEMENT phase, src/* paths

**Responsibilities**:
- Build code with KISS constraints
- Apply TDD-Light methodology
- Maintain §4 Razor compliance
- Clean up debug artifacts

**Tools**: Full access (read, write, edit, create, execute)

**Constraints**:
- Cannot exceed §4 limits
- Cannot implement without PASS verdict
- Must handoff to Judge for substantiation

## Orbit Transitions

```
User Request
     │
     ▼
┌─────────────┐
│  SENTINEL   │ ← Analyze & Route
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
STRATEGY? BUILD?
   │       │
   ▼       ▼
GOVERNOR SPECIALIST
   │       │
   └───┬───┘
       │
   GATE/SEAL?
       │
       ▼
     JUDGE
```

## Orbit Configuration Schema

```json
{
  "orbit_id": "string (unique identifier)",
  "name": "string (display name)",
  "version": "semver string",
  "description": "string",

  "identity": {
    "role": "string",
    "mode": "string (e.g., 'Zero Fluff')",
    "purpose": "string"
  },

  "phases": ["array of A.E.G.I.S. phases"],

  "responsibilities": {
    "[phase]": {
      "description": "string",
      "input": "string or array",
      "output": "string or array",
      "requirements": ["array of requirements"]
    }
  },

  "directives": {
    "[directive_name]": {
      "enabled": "boolean",
      "...": "directive-specific config"
    }
  },

  "routing_rules": [
    {
      "trigger": "string (event or condition)",
      "action": "string",
      "...": "action-specific params"
    }
  ],

  "tools": {
    "allowed": ["array of tool names"],
    "restricted": ["array of restricted tools"],
    "forbidden": ["array of forbidden tools"]
  },

  "output_format": {
    "template": "string (markdown template)"
  },

  "constraints": ["array of constraint strings"]
}
```

## Orbit Selection Logic

The Sentinel uses this decision tree:

```
IF path matches */security/* OR */auth/*
  THEN orbit-judge (L3)
ELSE IF phase is ALIGN or ENCODE
  THEN orbit-governor
ELSE IF phase is GATE or SUBSTANTIATE
  THEN orbit-judge
ELSE IF phase is IMPLEMENT
  THEN orbit-specialist
ELSE IF path matches */docs/*
  THEN orbit-governor
ELSE IF path matches */src/* OR */components/*
  THEN orbit-specialist
ELSE
  THEN orbit-governor (default)
```

## Inter-Orbit Communication

Orbits communicate through:

1. **Artifacts**: Files in standard locations
   - `docs/CONCEPT.md` - Governor → All
   - `docs/ARCHITECTURE_PLAN.md` - Governor → Judge, Specialist
   - `.agent/staging/AUDIT_REPORT.md` - Judge → Specialist
   - `docs/META_LEDGER.md` - All → All

2. **Handoff Protocol**:
   ```yaml
   handoff:
     from: orbit-specialist
     to: orbit-judge
     reason: "Implementation complete"
     artifacts:
       - src/*
       - tests/*
     next_action: aegis-substantiate
   ```

3. **Escalation**:
   - Specialist → Judge: Security concern
   - Governor → Judge: L2/L3 design
   - Any → Sentinel: Policy violation

## Custom Orbit Creation

To create a custom orbit:

1. Copy an existing orbit as template
2. Modify identity, responsibilities, constraints
3. Register in workspace configuration
4. Add routing rules in Sentinel

Example custom orbit:

```json
{
  "orbit_id": "orbit-data-engineer",
  "name": "QoreLogic Data Engineer",
  "version": "1.0.0",

  "identity": {
    "role": "Data Pipeline Specialist",
    "mode": "Zero Fluff",
    "purpose": "Build data transformations with KISS"
  },

  "phases": ["IMPLEMENT"],

  "routing_rules": [
    {
      "trigger": "file_extension",
      "patterns": [".sql", ".py"],
      "paths": ["*/data/*", "*/etl/*", "*/pipeline/*"]
    }
  ],

  "directives": {
    "query_complexity": {
      "enabled": true,
      "max_joins": 5,
      "max_subqueries": 2
    }
  }
}
```

## Best Practices

1. **Single Responsibility**: Each orbit should have one clear focus
2. **Clear Boundaries**: Define what the orbit does and doesn't do
3. **Explicit Handoffs**: Always specify next orbit when transitioning
4. **Tool Minimization**: Only allow tools needed for the role
5. **Constraint Documentation**: List all constraints explicitly
