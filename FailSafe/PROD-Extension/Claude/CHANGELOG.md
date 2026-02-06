# Changelog - Claude CLI

All notable changes to the FailSafe Claude CLI extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1] - 2026-02-06

### Added

- **Release Discipline** - Support for `/ql-repo-release` workflow.

### Changed

- **Governance Sync** - Updated command logic to match 3.0.1 architectural standards.
- **Documentation** - Synced versioning with FailSafe core.

## [2.0.1] - 2026-02-05

### Changed

- **Governance Sync** - Updated to match core v2.0.1 Tooltip Remediation release
- **Documentation** - Aligned version numbering with main FailSafe extension

---

## [2.0.0] - 2026-02-05

### Added

- **3 Repository Governance Commands** - Gold Standard audit and scaffolding
  - `/ql-repo-audit` - Gap analysis against Gold Standard checklist
  - `/ql-repo-scaffold` - Generate missing community files
  - `/ql-repo-release` - Release discipline enforcement

- **2 Specialized Agents** - Documentation and UX testing
  - `ql-technical-writer` - Documentation quality specialist
  - `ql-ux-evaluator` - UI/UX testing with optional Playwright

- **1 Reference** - GitHub API helpers
  - `github-api-helpers.md` - gh CLI patterns for PR/issue/release automation

- **Ambient Integration** - Repository governance hooks in existing commands
  - `/ql-bootstrap` Step 2.5: Repository readiness check
  - `/ql-plan` Step 4.5: Plan branch creation
  - `/ql-audit` Pass 7 + Step 5.5: Repo governance audit
  - `/ql-implement` Step 12.5: Implementation staging
  - `/ql-substantiate` Step 9.5: Final staging & merge

---

## [1.0.0] - 2026-02-05

### Added

- **10 QoreLogic Commands** - Complete A.E.G.I.S. governance lifecycle
  - `/ql-bootstrap` - Project DNA seeder for workspace initialization
  - `/ql-help` - Quick reference for all commands
  - `/ql-status` - Lifecycle diagnostic with backlog tracking
  - `/ql-plan` - Simple Made Easy planning protocol
  - `/ql-audit` - Gate tribunal for PASS/VETO verdicts
  - `/ql-implement` - Implementation pass with Section 4 Razor
  - `/ql-refactor` - KISS simplification for code cleanup
  - `/ql-validate` - Merkle chain validator for integrity verification
  - `/ql-substantiate` - Session seal verification
  - `/ql-organize` - Adaptive workspace organization

- **3 Persona Agents** - Role-based AI behavior
  - Governor - Strategic planning (ALIGN/ENCODE phases)
  - Judge - Adversarial auditing (GATE/SUBSTANTIATE phases)
  - Specialist - Precision implementation (IMPLEMENT phase)

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

- **Command format** - Canonical YAML source with XML-compatible body format
- **Documentation structure** - Organized into `.claude/commands/` for CLI recognition

## Installation

```bash
# Copy to Claude CLI directory
Copy-Item -Recurse PROD-Extension\Claude\.claude\* ~/.claude/
```

## Requirements

- Claude CLI
- No description length limits
- XML-style skill tags supported

---

_For detailed technical specifications, see [CROSS_ENVIRONMENT_STANDARDIZATION.md](../../docs/specs/CROSS_ENVIRONMENT_STANDARDIZATION.md)_
