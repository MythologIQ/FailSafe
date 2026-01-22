# Concept: The Genesis Data Schema (The "DNA")

**Context**: We defined the "Physics" (Enforcement) and "Economics" (Debt). Now we need the "Biology" (The Feature Object).
**Goal**: A unified schema that tracks a Feature from birth (Concept) to death (Deprecated).

---

## 1. The Core Object: `FeatureRequest.json`

Every node in our "Mind Map" is backed by this JSON structure. It is the Source of Truth.

```json
{
  "id": "feat_005_mind_map",
  "title": "Genesis Mind Map",
  "phase": "AUDITOR", // ARCHITECT | BUILDER | AUDITOR
  "history": [
    { "timestamp": "2025-12-08...", "action": "PHASE_CHANGE", "user": "User" }
  ],
  "concept": {
    "vision": "Visualize the blueprint...",
    "pain_point": "Users can't see the big picture.",
    "roi": "Zero-shot context navigation."
  },
  "spec": {
    "source_file": ".gemini/specs/feat_005.md",
    "hash": "sha256...", // Integrity Lock
    "constraints": ["Must use mermaid.js", "No React"]
  },
  "implementation": {
    "branch": "feature/mind-map",
    "files_touched": ["src/server/index.ts", "src/ui/app.js"],
    "tests_passed": true
  },
  "audit": {
    "drift_score": 0.0,
    "technical_debt_impact": 0.5, // 0-100
    "signed_off_by": "User"
  }
}
```

## 2. The Relationship Graph: `ProjectGraph.json`

Because features are not isolated, we track relationships.

```json
{
  "nodes": ["feat_004", "feat_005"],
  "edges": [
    { "source": "feat_005", "target": "feat_004", "type": "DEPENDS_ON" },
    { "source": "feat_005", "target": "feat_001", "type": "CONFLICTS_WITH" }
  ]
}
```

_This is the raw data that feeds the Mermaid Mind Map._

---

## 3. The Use Case

1.  **Wizard UI**: Reads `concept` to populate the form.
2.  **Enforcement**: Checks `phase` to lock/unlock `implementation.files_touched`.
3.  **Viability**: Compares current code hash against `spec.hash`.
4.  **Debt Monitor**: Aggregates `technical_debt_impact` across all features.

## Summary

By treating the "Feature" as a structured data object (DNA), we prevent "Vibe Coding" because **you cannot code something that doesn't have an ID and a Phase.** The System literally won't recognize the files.
