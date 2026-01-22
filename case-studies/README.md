# Case Studies & Evaluation Logic

This directory contains retrospective evaluations of QoreLogic systems and workflows. The goal is to capture real-world performance data to drive iterative improvement of the agentic framework.

## Directory Structure

We use a project-based structure:

```
case-studies/
├── Lessons-Learned.md       # Global registry of key insights across all projects
├── {ProjectName}/           # Specific project folder (e.g., Zo, Antigravity)
│   ├── Input-Eval/          # Raw evaluation reports (Input)
│   │   └── {Date}_{Name}.md
│   └── Processed/           # Synthesized summaries (Output)
│       └── {Date}_{Name}_Summary.md
```

## Workflow Logic for New Evaluations

When a new evaluation is added to an `Input-Eval` folder:

1.  **Analyze**: Read the raw evaluation to understand key failures, successes, and metrics.
2.  **Process**: Create a condensed version in the corresponding `Processed` folder. This summary must include:
    - **Executive Verdict**: Pass/Fail and Grade.
    - **Responsibility Attribution**: Explicitly distinguish between:
      - **Behavioral Failure (Agent)**: Hallucinations, lack of seniority, "agreeableness".
      - **Systemic Failure (Us)**: Weak prompts, missing checks, bad architecture constraints.
    - **Critical System Gaps**: Where did the process break?
    - **Root Cause Analysis**: Why did it break?
    - **Actionable Recommendations (Mitigations)**: How do we harden the process?
3.  **Synthesize**: Update `Lessons-Learned.md` in the root.
    - Add a new entry under the relevant category.
    - Ensure the lesson focuses on **Mitigation** (Systemic Hardening), not just observation.

## Naming Conventions

- **Raw**: `YYYYMMDD-Project-Description.md`
- **Processed**: `YYYYMMDD-Project-Summary.md`
