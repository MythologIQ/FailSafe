# Changelog - Antigravity (Gemini)

All notable changes to the FailSafe Antigravity extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1] - 2026-02-06

### Added

- **New Workflow** - `/ql-repo-release` enforcement logic.

### Changed

- **Refactor Parity** - Optimized Antigravity governance hooks to match 3.0.1 decomposition.
- **Documentation** - Synced release timeline with FailSafe 3.0.1.

## [2.0.1] - 2026-02-05

### Changed

- **Governance Sync** - Updated to match core v2.0.1 Tooltip Remediation release
- **Documentation** - Aligned version numbering with main FailSafe extension

---

## [2.0.0] - 2026-02-05

### Added

- **2 Repository Governance Skills** - Gold Standard audit and scaffolding
  - `ql-repo-audit` - Gap analysis against Gold Standard checklist
  - `ql-repo-scaffold` - Generate missing community files

- **Ambient Integration** - Repository governance hooks in existing workflows
  - `ql-bootstrap` Step 2.5: Repository readiness check
  - `ql-plan` Step 4.5: Plan branch creation
  - `ql-audit` Pass 7 + Step 5.5: Repo governance audit
  - `ql-implement` Step 12.5: Implementation staging
  - `ql-substantiate` Step 9.5: Final staging & merge

---

## [1.0.0] - 2026-02-05

### Added

- **10 QoreLogic Workflows** - Complete A.E.G.I.S. governance lifecycle
  - `ql-bootstrap` - Project DNA seeder for workspace initialization
  - `ql-help` - Quick reference for all commands
  - `ql-status` - Lifecycle diagnostic with backlog tracking
  - `ql-plan` - Simple Made Easy planning protocol
  - `ql-audit` - Gate tribunal for PASS/VETO verdicts
  - `ql-implement` - Implementation pass with Section 4 Razor
  - `ql-refactor` - KISS simplification for code cleanup
  - `ql-validate` - Merkle chain validator for integrity verification
  - `ql-substantiate` - Session seal verification
  - `ql-organize` - Adaptive workspace organization

- **3 Persona Agents** - Role-based AI behavior
  - `ql-governor` - Strategic planning (ALIGN/ENCODE phases)
  - `ql-judge` - Adversarial auditing (GATE/SUBSTANTIATE phases)
  - `ql-specialist` - Precision implementation (IMPLEMENT phase)

- **Merkle-Chained Governance** - Cryptographic audit trail
  - META_LEDGER.md for decision tracking
  - SHA256 hash chain for tamper detection
  - Reality = Promise verification

- **Section 4 Simplicity Razor** - Code quality enforcement
  - Functions ≤ 40 lines
  - Files ≤ 250 lines
  - Nesting ≤ 3 levels
  - Zero nested ternaries

### Changed

- **All workflow descriptions** - Optimized to ≤250 characters for Antigravity compatibility
- **Workflow format** - Migrated from legacy to canonical YAML with dual descriptions (full + short)

### Fixed

- **Description length violations** - 6 workflows condensed from 250-323 chars to 115-168 chars
- **Validation compliance** - All workflows pass constraint validation

## Installation

```bash
# Copy to Antigravity directories
Copy-Item -Recurse PROD-Extension\Antigravity\.agent\* ~/.agent/
Copy-Item -Recurse PROD-Extension\Antigravity\.qorelogic\* ~/.qorelogic/
```

## Requirements

- Gemini/Antigravity AI platform
- Workflow description limit: 250 characters
- YAML frontmatter format

---

_For detailed technical specifications, see [CROSS_ENVIRONMENT_STANDARDIZATION.md](../../docs/specs/CROSS_ENVIRONMENT_STANDARDIZATION.md)_
