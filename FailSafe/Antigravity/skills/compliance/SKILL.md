# Compliance Skill

## Enforce Physical Isolation and Environment-Specific Constraints

**Skill Name:** compliance
**Version:** 1.0
**Purpose:** Verify that all repository changes adhere to Physical Isolation rules and Environment Compliance requirements.

---

## Usage

```bash
# Full compliance audit
/compliance audit

# Check physical isolation only
/compliance isolation

# Check platform constraints only
/compliance constraints
```

---

## What This Skill Does

This skill enforces the "System Governance Rules" for repository integrity:

1.  **Physical Isolation**: Ensures application source code stays within the designated "Application Container" and workspace governance stays at the root.
2.  **Environment Compliance**: Verifies that workflows, agents, and skills meet the technical requirements of the targeting environments (e.g., character description limits).
3.  **Security Hygiene**: Audits the safety of marketplace tokens, credentials, and sensitive files.
4.  **Structure Integrity**: Validates that all directories match the prescribed structure in the workspace configuration.

---

## Skill Instructions

When this skill is invoked:

### 1. Perform Structural Audit

Verify that the "Isolation Boundary" is intact:

- **Forbidden at Root**: Ensure development source, build scripts, and target constraints are NOT at the root level.
- **Mandatory in Container**: Ensure the project source directories exist within the designated application container (as defined in `.failsafe/workspace-config.json`).
- **Root Hygiene**: Check that the root only contains authorized governance directories (`.agent/`, `.claude/`, `.qorelogic/`, etc.) and essential workspace config files.

### 2. Perform Constraint Audit

Check all workflows and prompts for platform-specific violations:

- **Gemini/Antigravity**: Check description lengths against a 250-character limit.
- **VSCode/Prompts**: Verify flat structure and `.prompt.md` extensions.
- **Metadata**: Ensure required YAML headers are present and valid.

### 3. Perform Security Audit

- Verify environment tokens and API keys are stored in authorized locations and gitignored.
- Check for "sensitiveFiles" entries in the workspace configuration.
- Ensure no credentials are leaked in public documentation or READMEs.

### 4. Report Findings

Generate a structured report:

- ✅ **PASS**: Requirement met.
- ⚠️ **WARNING**: Non-breaking deviation or recommendation.
- ❌ **FAIL**: Critical violation that blocks deployment or breaks isolation.

---

## Validation Protocols

### Physical Isolation (Protocol-A)

- **Rule**: The isolation boundary defined in the workspace configuration must be 100% consistent.
- **Action**: Verify that no source files have drifted from the container to the root.

### Character Limits (Protocol-B)

- **Rule**: Description strings must be under the platform-specific limit (e.g., 250 chars).
- **Action**: Perform character count audits on all metadata headers.

---

## Success Criteria

1.  ✅ **Zero Isolation Leaks**: Source code never drifts back to the root.
2.  ✅ **100% Metadata Compliance**: No workflow exceeds target platform limits.
3.  ✅ **Credential Safety**: Sensitive tokens are never committed to the repository.
4.  ✅ **Deployment Readiness**: The application container is always ready for packaging.

---

_This skill is the "Guardian of the Architecture" and must be consulted before every final check._
