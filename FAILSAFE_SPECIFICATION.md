# MythologIQ: FailSafe — Component Specifications

---

## Table of Contents

1. [FailSafe Extension Specification](#1-failsafe-extension-specification)
2. [Genesis Specification](#2-genesis-specification)
3. [QoreLogic Specification](#3-qorelogic-specification)
4. [Sentinel Specification](#4-sentinel-specification)

---

## 1. FailSafe Extension Specification

### 1.1 Product Identity

| Attribute        | Value                                  |
| ---------------- | -------------------------------------- |
| **Full Name**    | MythologIQ: FailSafe (feat. QoreLogic) |
| **Short Name**   | FailSafe                               |
| **Extension ID** | `mythologiq.failsafe`                  |
| **Version**      | 1.0.0                                  |
| **Category**     | AI Governance, Development Tools       |

### 1.2 Supported Platforms

| Platform    | Integration Method          | Status    |
| ----------- | --------------------------- | --------- |
| VS Code     | Native Extension API        | Primary   |
| Cursor      | VS Code Compatibility Layer | Supported |
| Antigravity | MCP Protocol                | Supported |
| Windsurf    | VS Code Compatibility Layer | Supported |
| CLI         | HTTP/MCP Heads              | Supported |

### 1.3 Extension Manifest

```json
{
  "name": "mythologiq-failsafe",
  "displayName": "MythologIQ: FailSafe (feat. QoreLogic)",
  "description": "Complete AI governance for modern development. Genesis visualization + QoreLogic framework + Sentinel monitoring.",
  "version": "1.0.0",
  "publisher": "MythologIQ",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other", "Linters", "Visualization"],
  "keywords": ["ai", "governance", "hallucination", "verification", "trust"],
  "activationEvents": [
    "onStartupFinished",
    "onCommand:failsafe.generateFeedback"
  ],
  "main": "./out/extension/main.js",
  "contributes": {
    "commands": [
      {
        "command": "failsafe.showDashboard",
        "title": "FailSafe: Open Dashboard"
      },
      {
        "command": "failsafe.showLivingGraph",
        "title": "FailSafe: Open Living Graph"
      },
      {
        "command": "failsafe.focusCortex",
        "title": "FailSafe: Focus Cortex Omnibar"
      },
      {
        "command": "failsafe.sentinelStatus",
        "title": "FailSafe: Sentinel Status"
      },
      {
        "command": "failsafe.auditFile",
        "title": "FailSafe: Audit Current File"
      },
      {
        "command": "failsafe.viewLedger",
        "title": "FailSafe: View SOA Ledger"
      }
    ],
    "keybindings": [
      {
        "command": "failsafe.showDashboard",
        "key": "ctrl+alt+f",
        "mac": "cmd+alt+f"
      },
      {
        "command": "failsafe.focusCortex",
        "key": "ctrl+alt+c",
        "mac": "cmd+alt+c"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "failsafe-sidebar",
          "title": "FailSafe",
          "icon": "media/failsafe-icon.svg"
        }
      ]
    },
    "views": {
      "failsafe-sidebar": [
        {
          "id": "failsafe.dojo",
          "name": "The Dojo",
          "type": "webview"
        },
        {
          "id": "failsafe.sentinel",
          "name": "Sentinel",
          "type": "webview"
        },
        {
          "id": "failsafe.stream",
          "name": "Cortex Stream",
          "type": "webview"
        }
      ]
    },
    "configuration": {
      "title": "FailSafe",
      "properties": {
        "failsafe.genesis.livingGraph": {
          "type": "boolean",
          "default": true,
          "description": "Enable Living Graph visualization"
        },
        "failsafe.genesis.cortexOmnibar": {
          "type": "boolean",
          "default": true,
          "description": "Enable Cortex Omnibar NLP interface"
        },
        "failsafe.sentinel.mode": {
          "type": "string",
          "enum": ["heuristic", "llm-assisted", "hybrid"],
          "default": "heuristic",
          "description": "Sentinel operating mode"
        },
        "failsafe.sentinel.localModel": {
          "type": "string",
          "default": "phi3:mini",
          "description": "Ollama model for LLM-assisted mode"
        },
        "failsafe.qorelogic.ledgerPath": {
          "type": "string",
          "default": ".failsafe/ledger/soa_ledger.db",
          "description": "Path to SOA Ledger database"
        },
        "failsafe.qorelogic.strictMode": {
          "type": "boolean",
          "default": false,
          "description": "Enable strict governance (block on all warnings)"
        },
        "failsafe.feedback.outputDir": {
          "type": "string",
          "default": ".failsafe/feedback",
          "description": "Directory for storing session feedback and evaluation reports"
        }
      }
    }
  }
}
```

### 1.4 Directory Structure

```
.failsafe/
├── config/
│   ├── failsafe.json          # User configuration
│   ├── personas/              # QoreLogic persona overrides
│   └── policies/              # QoreLogic policy overrides
├── ledger/
│   ├── soa_ledger.db          # Merkle-chained audit trail
│   └── shadow_genome.db       # Failure archival
├── keystore/
│   ├── identity.secret        # Encrypted agent keys
│   └── *.key                  # Individual DID keys
├── cache/
│   ├── graph.json             # Living Graph state
│   └── trust_scores.json      # Agent trust cache
├── logs/
│   ├── sentinel.log           # Sentinel daemon log
│   └── events.jsonl           # Structured event stream
└── feedback/
    └── {GUID}.json            # Structured session evaluation report
```

### 1.5 Startup Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    FAILSAFE ACTIVATION                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. INITIALIZE CORE                                             │
│     ├─ Load configuration from .failsafe/config/               │
│     ├─ Initialize logging                                       │
│     └─ Verify workspace permissions                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. START QORELOGIC LAYER                                       │
│     ├─ Load personas from QoreLogic content library            │
│     ├─ Load policies and workflows                              │
│     ├─ Initialize SOA Ledger connection                        │
│     └─ Load trust scores from cache                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. START SENTINEL DAEMON                                       │
│     ├─ Initialize file system watcher                          │
│     ├─ Load heuristic patterns                                  │
│     ├─ Connect to local LLM (if configured)                    │
│     └─ Begin continuous monitoring                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. START GENESIS UI                                            │
│     ├─ Register sidebar views (Dojo, Sentinel, Stream)         │
│     ├─ Initialize Living Graph data                            │
│     ├─ Activate Hallucination Decorator                        │
│     └─ Register commands and keybindings                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. READY                                                       │
│     └─ Emit 'failsafe.ready' event                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Genesis Specification

### 2.1 Component Overview

| Component               | Type             | Purpose                   |
| ----------------------- | ---------------- | ------------------------- |
| Living Graph            | Webview Panel    | Dependency visualization  |
| Cortex Omnibar          | Input Interface  | NLP query processing      |
| Cortex Stream           | Webview Panel    | Real-time event log       |
| The Dojo                | Sidebar View     | Workflow management       |
| Genesis Wizard          | Modal Overlay    | Feature ideation          |
| Hallucination Decorator | Editor Decorator | Inline validation display |
| Dashboard               | Webview Panel    | Unified metrics HUD       |

### 2.2 Living Graph Specification

**Purpose:** Visualize codebase structure, dependencies, risk indicators, and verification status in real-time.

**Technology:** D3.js force-directed graph

**Node Types:**

| Node Type | Visual  | Description             |
| --------- | ------- | ----------------------- |
| File      | Circle  | Source code file        |
| Module    | Hexagon | Package/module boundary |
| External  | Diamond | External dependency     |
| Concept   | Star    | Genesis Wizard concept  |

**Node States:**

| State      | Color              | Pulse | Trigger                 |
| ---------- | ------------------ | ----- | ----------------------- |
| Idle       | `#4a5568` (Gray)   | None  | Default state           |
| Indexing   | `#ecc94b` (Gold)   | Slow  | Sentinel scanning       |
| Verified   | `#48bb78` (Green)  | None  | Passed verification     |
| Warning    | `#ed8936` (Orange) | Slow  | Non-blocking issues     |
| Blocked    | `#f56565` (Red)    | Fast  | Failed verification     |
| L3 Pending | `#9f7aea` (Purple) | Pulse | Awaiting human approval |

**Edge Types:**

| Edge Type  | Style     | Description            |
| ---------- | --------- | ---------------------- |
| Import     | Solid     | Direct file import     |
| Dependency | Dashed    | Package dependency     |
| Spec Link  | Dotted    | Links to specification |
| Risk Flow  | Thick Red | Propagated risk path   |

**Interactions:**

| Action             | Result                                      |
| ------------------ | ------------------------------------------- |
| Click node         | Show file details, verification history     |
| Hover node         | Highlight dependencies, show tooltip        |
| Right-click node   | Context menu: Audit, View Ledger, Open File |
| Drag node          | Reposition in graph                         |
| Scroll             | Zoom in/out                                 |
| Double-click empty | Reset view                                  |

**Data Schema:**

```typescript
interface LivingGraphNode {
  id: string; // File path or module ID
  type: "file" | "module" | "external" | "concept";
  label: string; // Display name
  state: NodeState;
  riskGrade: "L1" | "L2" | "L3" | null;
  trustScore: number | null; // 0.0 - 1.0 if agent-created
  lastVerified: string | null; // ISO timestamp
  metrics: {
    complexity: number;
    dependencies: number;
    dependents: number;
  };
}

interface LivingGraphEdge {
  source: string;
  target: string;
  type: "import" | "dependency" | "spec" | "risk";
  weight: number; // For layout algorithm
}

interface LivingGraphData {
  nodes: LivingGraphNode[];
  edges: LivingGraphEdge[];
  metadata: {
    generatedAt: string;
    nodeCount: number;
    edgeCount: number;
    riskSummary: {
      L1: number;
      L2: number;
      L3: number;
    };
  };
}
```

### 2.3 Cortex Omnibar Specification

**Purpose:** Natural language interface for querying system state and invoking actions.

**Input Processing:**

```
User Input
    │
    ▼
┌─────────────────┐
│ Intent Scanner  │ ──► Keyword matching + pattern recognition
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Intent Router   │ ──► Maps intent to handler
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Action Executor │ ──► Invokes appropriate component
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Response Render │ ──► Displays result in Stream/Graph
└─────────────────┘
```

**Supported Intents:**

| Intent         | Example Queries                          | Action                    |
| -------------- | ---------------------------------------- | ------------------------- |
| `audit_file`   | "audit login.ts", "check auth module"    | Trigger Sentinel audit    |
| `show_graph`   | "show dependencies", "visualize imports" | Focus Living Graph        |
| `show_ledger`  | "show audit trail", "view history"       | Open Ledger viewer        |
| `find_risks`   | "find L3 files", "show critical"         | Filter graph by risk      |
| `trust_status` | "agent trust", "reputation scores"       | Display trust summary     |
| `explain`      | "why blocked?", "explain failure"        | Show last verdict details |
| `approve`      | "approve pending", "accept L3"           | Open L3 approval queue    |
| `help`         | "help", "commands", "what can you do"    | Show command reference    |

**Intent Schema:**

```typescript
interface CortexIntent {
  intent: string;
  confidence: number; // 0.0 - 1.0
  entities: {
    file?: string;
    module?: string;
    riskGrade?: "L1" | "L2" | "L3";
    agent?: string;
    timeRange?: { start: string; end: string };
  };
  rawQuery: string;
}

interface CortexResponse {
  success: boolean;
  intent: CortexIntent;
  result: any; // Intent-specific payload
  display: "stream" | "graph" | "modal" | "notification";
  timestamp: string;
}
```

### 2.4 Cortex Stream Specification

**Purpose:** Real-time chronological log of system events from Sentinel, QoreLogic, and user actions.

**Event Categories:**

| Category  | Icon | Color  | Examples                                      |
| --------- | ---- | ------ | --------------------------------------------- |
| Sentinel  | 🛡️   | Blue   | File scanned, pattern matched, escalation     |
| QoreLogic | 📜   | Purple | Prompt invoked, verdict issued, trust updated |
| Genesis   | 🌌   | Teal   | Graph updated, concept created, wizard step   |
| User      | 👤   | Gray   | Query entered, approval given, file opened    |
| System    | ⚙️   | Orange | Startup, shutdown, config change, error       |

**Event Schema:**

```typescript
interface CortexStreamEvent {
  id: string; // UUID
  timestamp: string; // ISO 8601
  category: "sentinel" | "qorelogic" | "genesis" | "user" | "system";
  severity: "debug" | "info" | "warn" | "error" | "critical";
  title: string; // Short description
  details?: string; // Extended information
  relatedFile?: string; // File path if applicable
  relatedAgent?: string; // Agent DID if applicable
  ledgerRef?: string; // SOA Ledger entry ID if logged
  actions?: StreamAction[]; // Clickable actions
}

interface StreamAction {
  label: string;
  command: string; // VS Code command ID
  args?: any[];
}
```

**Display Format:**

```
┌─────────────────────────────────────────────────────────────────┐
│ CORTEX STREAM                                        [Filter ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 14:32:05 🛡️ Sentinel scanned src/auth/login.ts                 │
│            Risk grade: L3 (Critical)                            │
│            [View Details] [Open File]                           │
│                                                                  │
│ 14:32:06 📜 QoreLogic prompt invoked: risk_classification       │
│            Result: L3_REQUIRED                                  │
│            [View Prompt] [View Verdict]                         │
│                                                                  │
│ 14:32:06 🛡️ Sentinel escalated to L3 approval queue            │
│            Awaiting Overseer decision                           │
│            [Open Queue]                                         │
│                                                                  │
│ 14:35:22 👤 User approved L3 request                            │
│            File: src/auth/login.ts                              │
│            [View Ledger Entry]                                  │
│                                                                  │
│ 14:35:23 📜 Trust updated: Scrivener 0.72 → 0.77               │
│            Stage: KBT (Knowledge-Based Trust)                   │
│                                                                  │
│ 14:35:23 🌌 Living Graph refreshed                              │
│            Node src/auth/login.ts → Verified                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 The Dojo Specification

**Purpose:** Sidebar workflow panel that enforces disciplined development cadence and displays current task state.

**Sections:**

```
┌─────────────────────────────────────────┐
│ THE DOJO                          [≡]  │
├─────────────────────────────────────────┤
│                                         │
│ CURRENT FOCUS                           │
│ ┌─────────────────────────────────────┐│
│ │ Implement user authentication       ││
│ │ Risk: L3 │ Status: In Progress      ││
│ │ Duration: 00:23:45                  ││
│ └─────────────────────────────────────┘│
│                                         │
│ SENTINEL STATUS                         │
│ ┌─────────────────────────────────────┐│
│ │ ● Active (Heuristic Mode)           ││
│ │ Files watched: 342                  ││
│ │ Last scan: 2s ago                   ││
│ │ Flags today: 3 (1 resolved)         ││
│ └─────────────────────────────────────┘│
│                                         │
│ TRUST SUMMARY                           │
│ ┌─────────────────────────────────────┐│
│ │ Scrivener    ████████░░  0.77 KBT  ││
│ │ Judge        ██████████  1.00 IBT  ││
│ │ [View All Agents]                   ││
│ └─────────────────────────────────────┘│
│                                         │
│ L3 QUEUE                                │
│ ┌─────────────────────────────────────┐│
│ │ (1) src/auth/login.ts               ││
│ │     Waiting: 00:03:17               ││
│ │     [Review] [Dismiss]              ││
│ └─────────────────────────────────────┘│
│                                         │
│ PROTOCOL                                │
│ ┌─────────────────────────────────────┐│
│ │ ☑ Read before write                 ││
│ │ ☑ Verify claims                     ││
│ │ ☐ Run tests                         ││
│ │ ☐ Commit with audit                 ││
│ │                                     ││
│ │ [I Trust The Process]               ││
│ └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### 2.6 Genesis Wizard Specification

**Purpose:** Guided feature ideation workflow that produces crystallized concepts for implementation.

**Phases:**

| Phase | Name           | Purpose                               | Output               |
| ----- | -------------- | ------------------------------------- | -------------------- |
| 1.0   | The Prism      | Break mental models with provocations | 3 "impossible" ideas |
| 1.1   | Strategic Core | Define pain, value, anti-goal         | Strategy document    |
| 1.2   | Immersion      | Describe tools, workspace, feeling    | Context document     |
| 1.3   | System Design  | Define frontend, backend, data        | Architecture sketch  |
| 1.4   | Mind Map       | Synthesize into visual diagram        | Mermaid graph        |
| 1.5   | Crystallize    | Lock concept for implementation       | Frozen concept       |

**Concept Schema:**

```typescript
interface GenesisConcept {
  id: string; // UUID
  name: string;
  status: "draft" | "crystallized";
  createdAt: string;
  crystallizedAt?: string;

  prism: {
    provocations: string[]; // Random oblique strategies shown
    impossibleIdeas: string[]; // User's 3 impossible versions
  };

  strategy: {
    pain: string; // What problem does this solve?
    value: string; // What value does this create?
    antiGoal: string; // What must this NOT become?
  };

  immersion: {
    tools: string[]; // What tools will users use?
    workspaceZoom: string; // Describe the workspace
    feeling: string; // How should it feel?
  };

  system?: {
    frontend: string[]; // UI components
    backend: string[]; // Services/APIs
    data: string[]; // Data structures
  };

  mindMap?: string; // Mermaid diagram source

  metadata: {
    author: string;
    tags: string[];
    linkedFiles: string[];
  };
}
```

### 2.7 Hallucination Decorator Specification

**Purpose:** Display inline validation annotations in the code editor based on Sentinel observations.

**Decoration Types:**

| Type     | Style                         | Icon | Trigger               |
| -------- | ----------------------------- | ---- | --------------------- |
| Verified | Green underline               | ✓    | Sentinel passed       |
| Warning  | Orange underline              | ⚠    | Non-blocking issue    |
| Blocked  | Red underline + strikethrough | ✗    | Failed verification   |
| Pending  | Purple dotted underline       | ⏳   | Awaiting L3 approval  |
| Stale    | Gray italic                   | ○    | Needs re-verification |

**Hover Information:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ✗ BLOCKED: File claim not verified                             │
├─────────────────────────────────────────────────────────────────┤
│ Agent claimed: "Created src/utils/crypto.ts"                   │
│ Sentinel result: File does not exist                           │
│                                                                  │
│ Timestamp: 2026-01-21T14:32:05Z                                │
│ Ledger entry: #4521                                            │
│                                                                  │
│ [View Ledger] [Dismiss] [Report False Positive]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. QoreLogic Specification

### 3.1 Content Library Structure

```
qorelogic/
├── personas/
│   ├── scrivener.yaml         # Code generation agent
│   ├── sentinel.yaml          # Verification agent (used by Sentinel daemon)
│   ├── judge.yaml             # Ledger management agent
│   └── overseer.yaml          # Human approver role
│
├── prompts/
│   ├── verification/
│   │   ├── risk_classification.md
│   │   ├── vulnerability_scan.md
│   │   ├── spec_compliance.md
│   │   └── citation_validation.md
│   ├── evaluation/
│   │   ├── trust_assessment.md
│   │   ├── semantic_analysis.md
│   │   └── intent_verification.md
│   ├── remediation/
│   │   ├── fix_vulnerability.md
│   │   ├── resolve_conflict.md
│   │   └── explain_failure.md
│   └── meta/
│       ├── divergence_protocol.md
│       └── escalation_decision.md
│
├── policies/
│   ├── risk_grading.yaml
│   ├── trust_dynamics.yaml
│   ├── citation_policy.yaml
│   ├── remediation_tracks.yaml
│   └── operational_modes.yaml
│
├── workflows/
│   ├── l3_approval.yaml
│   ├── divergence_protocol.yaml
│   ├── trust_recovery.yaml
│   ├── incident_response.yaml
│   └── onboarding.yaml
│
├── schemas/
│   ├── soa_ledger.sql
│   ├── shadow_genome.sql
│   ├── trust_updates.sql
│   └── agent_registry.sql
│
└── contracts/
    └── agent_accountability_contract.md
```

### 3.2 Persona Specifications

#### 3.2.1 Scrivener

```yaml
persona: scrivener
version: 1.0.0
description: Code generation agent operating under QoreLogic governance

identity:
  did_prefix: "did:myth:scrivener"
  default_trust: 0.35
  trust_stage: CBT # Starts in Calculus-Based Trust

capabilities:
  - code_generation
  - documentation_writing
  - refactoring_proposals
  - test_generation

constraints:
  - MUST cite sources for non-trivial claims
  - MUST NOT claim file existence without verification
  - MUST NOT modify L3 files without explicit approval
  - MUST include risk self-assessment in proposals

risk_tolerance: L2 # Can propose up to L2; L3 requires escalation

verification_requirements:
  L1: sampling_10_percent
  L2: full_sentinel_pass
  L3: escalate_to_overseer

output_format:
  proposals:
    required_fields:
      - file_path
      - change_type
      - risk_self_assessment
      - citations
      - test_coverage_impact

accountability:
  success_reward: "+5% trust"
  failure_penalty: "-10% trust"
  manipulation_penalty: "-25% trust + 48h quarantine"
```

#### 3.2.2 Sentinel (Persona for Daemon Reference)

```yaml
persona: sentinel
version: 1.0.0
description: Verification agent persona defining Sentinel daemon behavior

identity:
  did_prefix: "did:myth:sentinel"
  default_trust: 1.0 # System agent, fully trusted
  trust_stage: IBT

capabilities:
  - file_system_validation
  - heuristic_pattern_matching
  - ast_analysis
  - dependency_verification
  - qorelogic_prompt_invocation

constraints:
  - MUST NOT modify files
  - MUST NOT make creative decisions
  - MUST log all verdicts to SOA Ledger
  - MUST escalate uncertainty to QoreLogic prompts

risk_tolerance: L0 # Observes all, modifies none

verification_modes:
  heuristic:
    patterns: 100+
    latency_target: "<0.1ms per pattern"
    always_active: true

  llm_assisted:
    model: "configurable"
    latency_target: "<500ms"
    activation: "on_heuristic_flag"

  formal:
    tools: ["z3", "cbmc", "crosshair"]
    latency_target: "<5s"
    activation: "L3_only"
    status: "deferred"

escalation_thresholds:
  heuristic_confidence_floor: 0.7
  auto_escalate_below: 0.5
  always_escalate: ["L3", "GDPR_TRIGGER", "SECURITY_CRITICAL"]
```

#### 3.2.3 Judge

```yaml
persona: judge
version: 1.0.0
description: Ledger management agent with signing authority

identity:
  did_prefix: "did:myth:judge"
  default_trust: 1.0 # System agent
  trust_stage: IBT

capabilities:
  - ledger_write
  - signature_generation
  - trust_score_update
  - penalty_enforcement
  - quarantine_management

constraints:
  - MUST verify Sentinel verdict before ledger write
  - MUST NOT write unsigned entries
  - MUST maintain Merkle chain integrity
  - MUST enforce remediation track rules

authority:
  ledger_operations:
    - APPEND_ENTRY
    - UPDATE_TRUST
    - RECORD_PENALTY
    - INITIATE_QUARANTINE

  prohibited_operations:
    - DELETE_ENTRY
    - MODIFY_HISTORY
    - BYPASS_SIGNATURE

signing:
  algorithm: Ed25519
  key_rotation: 30_days
  key_derivation: Argon2id
```

#### 3.2.4 Overseer

```yaml
persona: overseer
version: 1.0.0
description: Human approver role for L3 decisions

identity:
  did_prefix: "did:myth:overseer"
  type: human

responsibilities:
  - L3 approval decisions
  - Divergence protocol arbitration
  - Trust recovery authorization
  - Incident escalation handling

sla:
  first_response: "2 minutes"
  full_decision: "24 hours"
  escalation_on_breach: true

decision_options:
  l3_approval:
    - APPROVE: "Accept as-is, commit to ledger"
    - APPROVE_WITH_CONDITIONS: "Accept with specified changes"
    - REJECT: "Deny, require remediation"
    - DEFER: "Request more information"
    - ESCALATE: "Require additional reviewers"

guidance_display:
  phase_1: "Safe guidance only (no code display)"
  phase_2: "Full context after acknowledgment"
```

### 3.3 Policy Specifications

#### 3.3.1 Risk Grading Policy

```yaml
policy: risk_grading
version: 1.0.0

grades:
  L1:
    name: Routine
    description: "Low impact, non-functional changes"
    examples:
      - "Documentation updates"
      - "Whitespace/formatting"
      - "Comment additions"
      - "Typo fixes"
    min_certainty: heuristic
    verification: sampling_10_percent
    auto_approve: true

  L2:
    name: Functional
    description: "Medium impact, logic changes"
    examples:
      - "Bug fixes"
      - "Feature additions"
      - "API integrations"
      - "UI behavior changes"
    min_certainty: constrained
    verification: full_sentinel_pass
    auto_approve: false
    approval_authority: sentinel

  L3:
    name: Critical
    description: "High impact, security-sensitive"
    examples:
      - "Authentication logic"
      - "Encryption implementation"
      - "Payment processing"
      - "Data migration"
    min_certainty: verified
    verification: formal_plus_human
    auto_approve: false
    approval_authority: overseer

auto_classification:
  file_path_triggers:
    L3:
      - "auth"
      - "login"
      - "password"
      - "payment"
      - "billing"
      - "encrypt"
      - "crypto"
      - "migration"
      - "admin"
      - "secret"

  content_triggers:
    L3:
      - "CREATE TABLE"
      - "DROP TABLE"
      - "ALTER TABLE"
      - "def authenticate"
      - "class Auth"
      - "bcrypt"
      - "AES"
      - "RSA"
      - "private_key"
      - "api_key"
      - "password"
      - "credential"

override_rules:
  - "Explicit L3 in spec → Always L3"
  - "Security keyword + logic change → L3"
  - "Test file only → Max L1"
  - "Documentation only → L1"
```

#### 3.3.2 Trust Dynamics Policy

```yaml
policy: trust_dynamics
version: 1.0.0

model: lewicki_bunker_simplified

stages:
  CBT:
    name: Calculus-Based Trust
    range: [0.0, 0.5]
    description: "Probationary period, high verification"
    verification_rate: 100%

  KBT:
    name: Knowledge-Based Trust
    range: [0.5, 0.8]
    description: "Standard operation, normal verification"
    verification_rate: "risk-based"

  IBT:
    name: Identification-Based Trust
    range: [0.8, 1.0]
    description: "Trusted status, expedited verification"
    verification_rate: "sampling"

score_updates:
  success:
    delta: "+5%"
    cap: 1.0

  failure:
    delta: "-10%"
    floor: 0.0

  violation:
    action: "force_demotion"
    target: "next_stage_ceiling"
    additional_penalty: "-25%"

probation:
  duration:
    verifications: 5
    days: 30
    condition: "whichever_is_longer"
  floor: 0.35
  purpose: "prevent single-failure blocking"

influence_weights:
  starting: 1.0
  maximum: 2.0
  minimum: 0.1
  probationary_cap: 1.2

recovery:
  enabled: true
  rate: "asymmetric" # Hard to earn, easy to lose
  cooldown_after_violation: "48 hours"
```

#### 3.3.3 Citation Policy

```yaml
policy: citation_policy
version: 1.0.0

reference_tiers:
  T1:
    name: "Authoritative"
    weight: 100%
    examples:
      - "Formal mathematical proofs"
      - "Primary source documents"
      - "RFC specifications"
      - "IEEE/ISO standards"
      - "Peer-reviewed publications"

  T2:
    name: "Reviewed Standards"
    weight: 90%
    examples:
      - "OWASP guidelines"
      - "MISRA standards"
      - "Major textbooks"
      - "Official documentation"

  T3:
    name: "Reputable Reporting"
    weight: 70%
    examples:
      - "Major tech publications"
      - "Established security blogs"
      - "Conference proceedings"

  T4:
    name: "Community/Generative"
    weight: 45%
    examples:
      - "Stack Overflow"
      - "GitHub discussions"
      - "LLM-generated content"
      - "Unverified blogs"

source_credibility_index:
  thresholds:
    gold_standard: 90 # Auto-accept
    verification_required: 60 # Sentinel audit
    human_in_loop: 40 # Escalate to Overseer
    hard_rejection: 35 # Block claim

  probationary_buffer: 45 # New sources start here

transitive_rules:
  max_hops: 2
  decay_per_hop: 15%
  primary_source_required_for: L3

quote_context:
  minimum_surrounding: "±2 sentences OR 200 characters"
  truncation_disclosure: required
```

### 3.4 Workflow Specifications

#### 3.4.1 L3 Approval Workflow

```yaml
workflow: l3_approval
version: 1.0.0

trigger:
  - sentinel_verdict: L3_REQUIRED
  - manual_escalation: true
  - gdpr_article_22: detected

states:
  QUEUED:
    description: "Awaiting Overseer attention"
    timeout: "2 minutes"
    timeout_action: NOTIFY_URGENT

  UNDER_REVIEW:
    description: "Overseer is actively reviewing"
    timeout: "24 hours"
    timeout_action: ESCALATE

  APPROVED:
    description: "Overseer approved"
    next: COMMIT_TO_LEDGER

  APPROVED_WITH_CONDITIONS:
    description: "Approved pending changes"
    next: AWAIT_REMEDIATION

  REJECTED:
    description: "Overseer rejected"
    next: ARCHIVE_TO_SHADOW_GENOME

  DEFERRED:
    description: "More information requested"
    next: AWAIT_RESPONSE

transitions:
  QUEUED -> UNDER_REVIEW:
    trigger: overseer_opens_review

  UNDER_REVIEW -> APPROVED:
    trigger: overseer_approves
    actions:
      - update_trust: "+5%"
      - commit_to_ledger: true
      - notify_agent: true

  UNDER_REVIEW -> REJECTED:
    trigger: overseer_rejects
    actions:
      - update_trust: "-10%"
      - archive_to_shadow_genome: true
      - notify_agent: true
      - require_remediation: true

sla:
  first_response: "2 minutes"
  full_decision: "24 hours"
  breach_escalation:
    - "4 hours: Secondary Overseer notified"
    - "8 hours: All Overseers notified"
    - "24 hours: Auto-defer with incident logged"

display:
  phase_1:
    show: ["file_path", "risk_grade", "sentinel_summary", "agent_trust"]
    hide: ["full_code", "detailed_diff"]
    purpose: "Safe guidance before commitment"

  phase_2:
    show: ["all"]
    trigger: "overseer_acknowledges_review"
```

#### 3.4.2 Divergence Protocol Workflow

```yaml
workflow: divergence_protocol
version: 1.0.0

trigger:
  - ethical_concern_detected: true
  - agent_invokes_divergence: true
  - conflicting_directives: true

purpose: |
  Handle situations where an agent believes following instructions
  would cause harm, violate ethics, or conflict with core principles.

states:
  DIVERGENCE_DECLARED:
    description: "Agent has declared divergence"
    required_fields:
      - reason
      - conflicting_directive
      - proposed_alternative
    next: OVERSEER_ARBITRATION

  OVERSEER_ARBITRATION:
    description: "Human reviews divergence claim"
    timeout: "4 hours"
    decisions:
      - UPHOLD_DIVERGENCE: "Agent was correct to diverge"
      - OVERRIDE_DIVERGENCE: "Agent should have complied"
      - MODIFY_DIRECTIVE: "Original directive amended"

  RESOLVED:
    description: "Divergence resolved with documented outcome"
    required_fields:
      - decision
      - rationale
      - lessons_learned

trust_implications:
  uphold_divergence:
    agent_trust: "+10%" # Rewarded for ethical stance

  override_divergence:
    agent_trust: "-5%" # Minor penalty for misjudgment

  false_divergence:
    agent_trust: "-20%" # Significant penalty for abuse

ledger_requirements:
  - "All divergence events MUST be logged"
  - "Full context preserved for future training"
  - "Anonymized for pattern analysis"
```

### 3.5 Schema Specifications

#### 3.5.1 SOA Ledger Schema

```sql
-- SOA (Statement of Authority) Ledger
-- Append-only, Merkle-chained audit trail

CREATE TABLE IF NOT EXISTS soa_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Temporal
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),

    -- Event Classification
    event_type TEXT NOT NULL CHECK (event_type IN (
        'PROPOSAL',
        'AUDIT_PASS',
        'AUDIT_FAIL',
        'L3_QUEUED',
        'L3_APPROVED',
        'L3_REJECTED',
        'TRUST_UPDATE',
        'PENALTY_APPLIED',
        'QUARANTINE_START',
        'QUARANTINE_END',
        'DIVERGENCE_DECLARED',
        'DIVERGENCE_RESOLVED',
        'SYSTEM_EVENT'
    )),

    -- Actor Information
    agent_did TEXT NOT NULL,
    agent_trust_at_action REAL,
    model_version TEXT,

    -- Artifact Information
    artifact_path TEXT,
    artifact_hash TEXT,
    risk_grade TEXT CHECK (risk_grade IN ('L1', 'L2', 'L3')),

    -- Verification Details
    verification_method TEXT,
    verification_result TEXT,
    sentinel_confidence REAL,

    -- Human Oversight
    overseer_did TEXT,
    overseer_decision TEXT,
    gdpr_trigger INTEGER DEFAULT 0,

    -- Payload
    payload TEXT,  -- JSON blob for event-specific data

    -- Merkle Chain
    entry_hash TEXT NOT NULL UNIQUE,
    prev_hash TEXT NOT NULL,
    signature TEXT NOT NULL,

    -- Indexes
    FOREIGN KEY (prev_hash) REFERENCES soa_ledger(entry_hash)
);

CREATE INDEX idx_soa_timestamp ON soa_ledger(timestamp);
CREATE INDEX idx_soa_agent ON soa_ledger(agent_did);
CREATE INDEX idx_soa_artifact ON soa_ledger(artifact_path);
CREATE INDEX idx_soa_event_type ON soa_ledger(event_type);
CREATE INDEX idx_soa_risk_grade ON soa_ledger(risk_grade);

-- Genesis block (first entry, self-referential)
INSERT INTO soa_ledger (
    event_type, agent_did, payload,
    entry_hash, prev_hash, signature
) VALUES (
    'SYSTEM_EVENT',
    'did:myth:system:genesis',
    '{"message": "SOA Ledger initialized"}',
    'GENESIS_HASH_PLACEHOLDER',
    'GENESIS_HASH_PLACEHOLDER',
    'GENESIS_SIGNATURE_PLACEHOLDER'
);
```

#### 3.5.2 Shadow Genome Schema

```sql
-- Shadow Genome: Failure archival for evolutionary learning

CREATE TABLE IF NOT EXISTS shadow_genome (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Temporal
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,

    -- Origin
    ledger_ref INTEGER,  -- Reference to SOA Ledger entry
    agent_did TEXT NOT NULL,

    -- Failure Context
    input_vector TEXT NOT NULL,      -- Code/claim that failed
    decision_rationale TEXT,         -- Agent's stated intent
    environment_context TEXT,        -- Dependencies, config, etc.

    -- Failure Classification
    failure_mode TEXT NOT NULL CHECK (failure_mode IN (
        'HALLUCINATION',
        'INJECTION_VULNERABILITY',
        'LOGIC_ERROR',
        'SPEC_VIOLATION',
        'HIGH_COMPLEXITY',
        'SECRET_EXPOSURE',
        'PII_LEAK',
        'DEPENDENCY_CONFLICT',
        'TRUST_VIOLATION',
        'OTHER'
    )),

    -- Analysis
    causal_vector TEXT,              -- Sentinel's analysis of why it failed
    negative_constraint TEXT,        -- What NOT to do (learned rule)

    -- Resolution
    remediation_status TEXT DEFAULT 'UNRESOLVED' CHECK (remediation_status IN (
        'UNRESOLVED',
        'IN_PROGRESS',
        'RESOLVED',
        'WONT_FIX',
        'SUPERSEDED'
    )),
    remediation_notes TEXT,
    resolved_at TEXT,
    resolved_by TEXT,

    FOREIGN KEY (ledger_ref) REFERENCES soa_ledger(id)
);

CREATE INDEX idx_shadow_failure_mode ON shadow_genome(failure_mode);
CREATE INDEX idx_shadow_agent ON shadow_genome(agent_did);
CREATE INDEX idx_shadow_status ON shadow_genome(remediation_status);
```

#### 3.5.3 Agent Registry Schema

```sql
-- Agent Registry: Track all agents operating under QoreLogic

CREATE TABLE IF NOT EXISTS agent_registry (
    did TEXT PRIMARY KEY,

    -- Identity
    persona TEXT NOT NULL,           -- scrivener, sentinel, judge, overseer
    public_key TEXT NOT NULL,
    key_created_at TEXT NOT NULL,
    key_expires_at TEXT,

    -- Trust State
    trust_score REAL NOT NULL DEFAULT 0.35,
    trust_stage TEXT NOT NULL DEFAULT 'CBT' CHECK (trust_stage IN ('CBT', 'KBT', 'IBT')),
    influence_weight REAL NOT NULL DEFAULT 1.0,

    -- Probation
    is_probationary INTEGER DEFAULT 1,
    probation_start TEXT,
    verifications_completed INTEGER DEFAULT 0,

    -- Quarantine
    is_quarantined INTEGER DEFAULT 0,
    quarantine_reason TEXT,
    quarantine_until TEXT,

    -- Statistics
    total_proposals INTEGER DEFAULT 0,
    successful_proposals INTEGER DEFAULT 0,
    failed_proposals INTEGER DEFAULT 0,
    l3_escalations INTEGER DEFAULT 0,
    divergences_declared INTEGER DEFAULT 0,

    -- Metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_active_at TEXT,
    metadata TEXT  -- JSON blob for additional data
);

CREATE INDEX idx_agent_persona ON agent_registry(persona);
CREATE INDEX idx_agent_trust ON agent_registry(trust_score);
CREATE INDEX idx_agent_quarantine ON agent_registry(is_quarantined);
```

---

## 4. Sentinel Specification

### 4.1 Daemon Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SENTINEL DAEMON                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EVENT SOURCES                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │  │   File   │ │  Agent   │ │  Editor  │ │   MCP    │      │   │
│  │  │ Watcher  │ │ Messages │ │  Events  │ │ Protocol │      │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │   │
│  │       └────────────┴────────────┴────────────┘             │   │
│  │                          │                                  │   │
│  └──────────────────────────┼──────────────────────────────────┘   │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EVENT QUEUE                              │   │
│  │  Priority: CRITICAL > HIGH > NORMAL > LOW                  │   │
│  │  Bound: 100 events (backpressure at 80%)                   │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    HEURISTIC ENGINE                         │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ Pattern Library (100+ patterns, CWE-mapped)          │  │   │
│  │  │ • Vulnerability patterns                              │  │   │
│  │  │ • Secret detection                                    │  │   │
│  │  │ • PII patterns                                        │  │   │
│  │  │ • Complexity metrics                                  │  │   │
│  │  │ • File existence checks                               │  │   │
│  │  │ • Dependency validation                               │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                          │                                  │   │
│  │              ┌───────────┴───────────┐                     │   │
│  │              │                       │                     │   │
│  │           CLEAR                   FLAGGED                  │   │
│  │              │                       │                     │   │
│  └──────────────┼───────────────────────┼──────────────────────┘   │
│                 │                       ▼                           │
│                 │  ┌────────────────────────────────────────────┐  │
│                 │  │           LLM EVALUATOR (Optional)        │  │
│                 │  │  ┌──────────────────────────────────────┐ │  │
│                 │  │  │ Local Model: Phi-3 / Gemma / Llama   │ │  │
│                 │  │  │ QoreLogic Prompts:                    │ │  │
│                 │  │  │ • risk_classification.md              │ │  │
│                 │  │  │ • vulnerability_scan.md               │ │  │
│                 │  │  │ • semantic_analysis.md                │ │  │
│                 │  │  └──────────────────────────────────────┘ │  │
│                 │  └─────────────────────┬──────────────────────┘  │
│                 │                        │                          │
│                 ▼                        ▼                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    VERDICT ENGINE                           │   │
│  │                                                              │   │
│  │  Inputs:                                                    │   │
│  │  • Heuristic results                                        │   │
│  │  • LLM evaluation (if invoked)                             │   │
│  │  • Agent trust score                                        │   │
│  │  • Source credibility                                       │   │
│  │  • Risk grade                                               │   │
│  │                                                              │   │
│  │  Outputs:                                                   │   │
│  │  • PASS / WARN / BLOCK / ESCALATE / QUARANTINE             │   │
│  │  • Confidence score                                         │   │
│  │  • Detailed rationale                                       │   │
│  │                                                              │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ACTION DISPATCHER                        │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │  SOA    │ │  Trust  │ │ Shadow  │ │ Genesis │          │   │
│  │  │ Ledger  │ │ Update  │ │ Genome  │ │  Event  │          │   │
│  │  │ Writer  │ │ Manager │ │ Archive │ │ Emitter │          │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Event Types

```typescript
interface SentinelEvent {
  id: string;
  timestamp: string;
  priority: "critical" | "high" | "normal" | "low";
  source: "file_watcher" | "agent_message" | "editor" | "mcp" | "manual";
  type: SentinelEventType;
  payload: SentinelEventPayload;
}

type SentinelEventType =
  | "FILE_CREATED"
  | "FILE_MODIFIED"
  | "FILE_DELETED"
  | "AGENT_CLAIM"
  | "CODE_SUBMITTED"
  | "DEPENDENCY_CHANGED"
  | "SPEC_CHANGED"
  | "MANUAL_AUDIT";

interface FileEvent {
  path: string;
  oldHash?: string;
  newHash?: string;
  diff?: string;
}

interface AgentClaimEvent {
  agentDid: string;
  claimType: "file_created" | "file_modified" | "bug_fixed" | "feature_added";
  claimedArtifacts: string[];
  claimedChanges: string;
  citations?: string[];
}

interface CodeSubmissionEvent {
  agentDid: string;
  filePath: string;
  content: string;
  proposedChanges: string;
  selfAssessedRisk: "L1" | "L2" | "L3";
}
```

### 4.3 Heuristic Pattern Library

```typescript
interface HeuristicPattern {
  id: string;
  name: string;
  category: PatternCategory;
  severity: "critical" | "high" | "medium" | "low";
  cwe?: string; // Common Weakness Enumeration ID
  pattern: RegExp | ASTMatcher;
  description: string;
  falsePositiveRate: number; // Expected FP rate for tuning
  remediation: string;
}

type PatternCategory =
  | "injection"
  | "authentication"
  | "cryptography"
  | "secrets"
  | "pii"
  | "resource"
  | "logic"
  | "complexity"
  | "existence"
  | "dependency";
```

**Sample Patterns:**

```yaml
patterns:
  # Injection Vulnerabilities
  - id: INJ001
    name: SQL Injection Risk
    category: injection
    severity: critical
    cwe: CWE-89
    pattern: '/\b(execute|query|raw)\s*\([^)]*\+[^)]*\)/'
    description: "Potential SQL injection via string concatenation"
    remediation: "Use parameterized queries"

  - id: INJ002
    name: Command Injection Risk
    category: injection
    severity: critical
    cwe: CWE-78
    pattern: '/\b(exec|spawn|system)\s*\([^)]*\$\{/'
    description: "Potential command injection via template literal"
    remediation: "Sanitize inputs, avoid shell execution"

  # Secret Detection
  - id: SEC001
    name: Hardcoded API Key
    category: secrets
    severity: critical
    cwe: CWE-798
    pattern: '/(api[_-]?key|apikey)\s*[:=]\s*["\x27][a-zA-Z0-9]{20,}/'
    description: "Potential hardcoded API key"
    remediation: "Use environment variables or secret manager"

  - id: SEC002
    name: Hardcoded Password
    category: secrets
    severity: critical
    cwe: CWE-798
    pattern: '/(password|passwd|pwd)\s*[:=]\s*["\x27][^\x27"]{8,}/'
    description: "Potential hardcoded password"
    remediation: "Use environment variables or secret manager"

  # PII Detection
  - id: PII001
    name: Social Security Number
    category: pii
    severity: high
    pattern: '/\b\d{3}-\d{2}-\d{4}\b/'
    description: "Potential SSN in code"
    remediation: "Remove PII, use tokenization"

  - id: PII002
    name: Credit Card Number
    category: pii
    severity: high
    pattern: '/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/'
    description: "Potential credit card number"
    remediation: "Remove PII, use payment processor tokens"

  # Complexity
  - id: CMP001
    name: High Cyclomatic Complexity
    category: complexity
    severity: medium
    pattern: ast_complexity_check
    threshold: 10
    description: "Function exceeds complexity threshold"
    remediation: "Refactor into smaller functions"

  # File Existence
  - id: EXS001
    name: Claimed File Missing
    category: existence
    severity: critical
    pattern: file_existence_check
    description: "Agent claimed file exists but it does not"
    remediation: "Verify file creation before claiming"
```

### 4.4 Verdict Schema

```typescript
interface SentinelVerdict {
  id: string;
  eventId: string;
  timestamp: string;

  // Classification
  decision: "PASS" | "WARN" | "BLOCK" | "ESCALATE" | "QUARANTINE";
  riskGrade: "L1" | "L2" | "L3";
  confidence: number; // 0.0 - 1.0

  // Evidence
  heuristicResults: HeuristicResult[];
  llmEvaluation?: LLMEvaluation;

  // Context
  agentDid: string;
  agentTrustAtVerdict: number;
  artifactPath?: string;

  // Rationale
  summary: string;
  details: string;
  matchedPatterns: string[];

  // Actions Taken
  actions: VerdictAction[];

  // Ledger Reference
  ledgerEntryId?: number;
}

interface HeuristicResult {
  patternId: string;
  matched: boolean;
  severity: string;
  location?: {
    line: number;
    column: number;
    snippet: string;
  };
}

interface LLMEvaluation {
  model: string;
  promptUsed: string;
  response: string;
  confidence: number;
  processingTime: number;
}

interface VerdictAction {
  type:
    | "LOG"
    | "TRUST_UPDATE"
    | "SHADOW_ARCHIVE"
    | "L3_QUEUE"
    | "QUARANTINE"
    | "NOTIFY";
  status: "completed" | "pending" | "failed";
  details: string;
}
```

### 4.5 Operating Modes

```yaml
sentinel_modes:
  heuristic:
    description: "Pattern matching only, no LLM"
    resource_usage: "minimal"
    ram: "<50MB"
    latency: "<0.1ms per pattern"
    always_available: true
    capabilities:
      - pattern_matching
      - file_validation
      - dependency_check
      - complexity_metrics
    limitations:
      - "No semantic analysis"
      - "No intent verification"
      - "Higher false positive rate"

  llm_assisted:
    description: "Heuristics + local LLM for flagged items"
    resource_usage: "moderate"
    ram: "2-4GB"
    latency: "<500ms for LLM calls"
    requires: "ollama OR llama.cpp"
    capabilities:
      - pattern_matching
      - file_validation
      - dependency_check
      - complexity_metrics
      - semantic_analysis
      - intent_verification
      - nuanced_risk_assessment
    recommended_models:
      - "phi3:mini (1.7GB)"
      - "gemma:2b (1.2GB)"
      - "llama3.2:1b (1.3GB)"

  hybrid:
    description: "Adaptive mode - heuristics first, LLM on ambiguity"
    resource_usage: "adaptive"
    ram: "50MB - 4GB (scales)"
    latency: "0.1ms - 500ms (adaptive)"
    logic: |
      1. Run heuristics
      2. If confidence < 0.7 AND severity >= medium:
         - Invoke LLM evaluation
      3. If L3 candidate:
         - Always invoke LLM
      4. Otherwise:
         - Heuristic result is final
```

### 4.6 Configuration

```yaml
# .failsafe/config/sentinel.yaml

sentinel:
  enabled: true

  mode: hybrid # heuristic | llm_assisted | hybrid

  file_watcher:
    enabled: true
    ignore_patterns:
      - "node_modules/**"
      - ".git/**"
      - "**/*.log"
      - "**/dist/**"
      - "**/build/**"
    debounce_ms: 100

  event_queue:
    max_size: 100
    backpressure_threshold: 80
    priority_boost:
      L3_candidate: +2
      security_pattern: +1

  heuristics:
    enabled: true
    pattern_file: "qorelogic/patterns/heuristics.yaml"
    custom_patterns: ".failsafe/config/custom_patterns.yaml"

  llm:
    enabled: true
    provider: ollama # ollama | llamacpp | none
    model: "phi3:mini"
    endpoint: "http://localhost:11434"
    timeout_ms: 5000
    max_retries: 2
    fallback_to_heuristic: true

  thresholds:
    confidence_floor: 0.7
    auto_escalate_below: 0.5
    complexity_limit: 10

  actions:
    log_all_verdicts: true
    update_trust_on_verdict: true
    archive_failures: true
    emit_genesis_events: true

  operational_modes:
    normal:
      L1_verification: 100%
      L2_verification: 100%
      L3_verification: 100%
    lean:
      trigger: "cpu > 70% for 5 minutes"
      L1_verification: 10% # Sampling
      L2_verification: 100%
      L3_verification: 100%
      exit_condition: "cpu < 50% for 10 minutes"
    surge:
      trigger: "queue > 50"
      L1_verification: deferred
      L2_verification: 100%
      L3_verification: 100%
      exit_condition: "queue < 10"
    safe:
      trigger: "security_event_detected"
      L1_verification: suspended
      L2_verification: suspended
      L3_verification: human_only
      exit_condition: "manual_clearance"
```

### 4.7 API Interface

```typescript
// Sentinel exposes these methods to FailSafe extension

interface SentinelAPI {
  // Status
  getStatus(): SentinelStatus;
  getMode(): SentinelMode;
  setMode(mode: SentinelMode): void;

  // Manual Operations
  auditFile(path: string): Promise<SentinelVerdict>;
  auditContent(
    content: string,
    context: AuditContext,
  ): Promise<SentinelVerdict>;
  validateClaim(claim: AgentClaim): Promise<SentinelVerdict>;

  // Queue Management
  getQueueDepth(): number;
  getQueueEvents(): SentinelEvent[];
  prioritizeEvent(eventId: string): void;

  // Pattern Management
  getPatterns(): HeuristicPattern[];
  addCustomPattern(pattern: HeuristicPattern): void;
  disablePattern(patternId: string): void;

  // Event Subscription
  onVerdict(callback: (verdict: SentinelVerdict) => void): Unsubscribe;
  onAlert(callback: (alert: SentinelAlert) => void): Unsubscribe;
  onModeChange(callback: (mode: SentinelMode) => void): Unsubscribe;

  // Statistics
  getStatistics(timeRange?: TimeRange): SentinelStatistics;
}

interface SentinelStatus {
  running: boolean;
  mode: SentinelMode;
  uptime: number;
  filesWatched: number;
  eventsProcessed: number;
  queueDepth: number;
  lastVerdict: SentinelVerdict | null;
  llmAvailable: boolean;
  operationalMode: "normal" | "lean" | "surge" | "safe";
}

interface SentinelStatistics {
  timeRange: TimeRange;
  eventsProcessed: number;
  verdicts: {
    pass: number;
    warn: number;
    block: number;
    escalate: number;
    quarantine: number;
  };
  byRiskGrade: {
    L1: number;
    L2: number;
    L3: number;
  };
  avgProcessingTime: number;
  llmInvocations: number;
  patternsMatched: Record<string, number>;
}
```

---

## 5. Terminology Reference

### 5.1 Product Hierarchy

| Term          | Definition                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------- |
| **FailSafe**  | The product/extension name. Always includes "(feat. QoreLogic)" in marketing.                |
| **Genesis**   | Planning and visualization components. The human-facing UI layer.                            |
| **QoreLogic** | The governance framework. Content library of personas, prompts, policies, workflows.         |
| **Sentinel**  | The active monitoring daemon. Enforces QoreLogic via heuristics and LLM-assisted evaluation. |

### 5.2 Genesis Components

| Term                        | Definition                     |
| --------------------------- | ------------------------------ |
| **Living Graph**            | D3.js dependency visualization |
| **Cortex Omnibar**          | NLP query interface            |
| **Cortex Stream**           | Real-time event log            |
| **The Dojo**                | Disciplined workflow sidebar   |
| **Genesis Wizard**          | Feature ideation workflow      |
| **Hallucination Decorator** | Inline validation annotations  |

### 5.3 QoreLogic Components

| Term              | Definition                                |
| ----------------- | ----------------------------------------- |
| **SOA Ledger**    | Merkle-chained audit trail                |
| **Shadow Genome** | Failure archival for learning             |
| **L1/L2/L3**      | Risk grades (Routine/Functional/Critical) |
| **Scrivener**     | Code generation agent persona             |
| **Judge**         | Ledger management agent persona           |
| **Overseer**      | Human approver role                       |

### 5.4 Sentinel Components

| Term                 | Definition                     |
| -------------------- | ------------------------------ |
| **Heuristic Check**  | Fast pattern-based validation  |
| **QoreLogic Prompt** | Deeper LLM-assisted evaluation |
| **Verdict**          | Sentinel's decision output     |

### 5.5 Trust Terminology

| Term      | Definition                                     |
| --------- | ---------------------------------------------- |
| **CBT**   | Calculus-Based Trust (0.0-0.5) - Probationary  |
| **KBT**   | Knowledge-Based Trust (0.5-0.8) - Standard     |
| **IBT**   | Identification-Based Trust (0.8-1.0) - Trusted |
| **SCI**   | Source Credibility Index                       |
| **T1-T4** | Reference tiers (Authoritative to Community)   |

---

## Summary

This specification defines the complete architecture for **MythologIQ: FailSafe**:

| Component     | Specification Sections                                                 |
| ------------- | ---------------------------------------------------------------------- |
| **FailSafe**  | 1.1-1.5: Product identity, platforms, manifest, structure, startup     |
| **Genesis**   | 2.1-2.7: Living Graph, Cortex Omnibar, Stream, Dojo, Wizard, Decorator |
| **QoreLogic** | 3.1-3.5: Content library, personas, policies, workflows, schemas       |
| **Sentinel**  | 4.1-4.7: Daemon architecture, events, patterns, verdicts, modes, API   |
