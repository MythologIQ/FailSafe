# Changelog - VSCode Copilot

All notable changes to the FailSafe VSCode Copilot extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1] - 2026-02-06

### Changed

- **Governance Sync** - Updated commands to reflect `main.ts` structural refactor.
- **Documentation** - Synced release notes with FailSafe 3.0.1 graduation.

## [2.0.1] - 2026-02-05

### Changed

- **Governance Sync** - Updated to match core v2.0.1 Tooltip Remediation release
- **Documentation** - Aligned version numbering with main FailSafe extension

---

## [2.0.0] - 2026-02-05

### Added

- **2 Repository Governance Prompts** - Gold Standard audit and scaffolding
  - `ql-repo-audit.prompt.md` - Gap analysis against Gold Standard checklist
  - `ql-repo-scaffold.prompt.md` - Generate missing community files

- **Ambient Integration** - Repository governance hooks in existing prompts
  - `ql-bootstrap` Step 2.5: Repository readiness check
  - `ql-plan` Step 4.5: Plan branch creation
  - `ql-audit` Pass 7 + Step 5.5: Repo governance audit
  - `ql-implement` Step 12.5: Implementation staging
  - `ql-substantiate` Step 9.5: Final staging & merge

---

## [1.0.0] - 2026-02-05

### Added

- **10 QoreLogic Prompts** - Complete A.E.G.I.S. governance lifecycle
  - `ql-bootstrap.prompt.md` - Project DNA seeder for workspace initialization
  - `ql-help.prompt.md` - Quick reference for all commands
  - `ql-status.prompt.md` - Lifecycle diagnostic with backlog tracking
  - `ql-plan.prompt.md` - Simple Made Easy planning protocol
  - `ql-audit.prompt.md` - Gate tribunal for PASS/VETO verdicts
  - `ql-implement.prompt.md` - Implementation pass with Section 4 Razor
  - `ql-refactor.prompt.md` - KISS simplification for code cleanup
  - `ql-validate.prompt.md` - Merkle chain validator for integrity verification
  - `ql-substantiate.prompt.md` - Session seal verification
  - `ql-organize.prompt.md` - Adaptive workspace organization

- **3 Agent Personas** - Role-based AI behavior
  - `ql-governor.agent.md` - Strategic planning (ALIGN/ENCODE phases)
  - `ql-judge.agent.md` - Adversarial auditing (GATE/SUBSTANTIATE phases)
  - `ql-specialist.agent.md` - Precision implementation (IMPLEMENT phase)

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

- **File format** - Canonical YAML converted to `.prompt.md` and `.agent.md` for Copilot
- **Documentation structure** - Organized into `.github/copilot-instructions/` for VSCode recognition
- **Skills structure** - Each skill in folder format with `SKILL.md` at root

## Installation

```bash
# Copy to project .github directory
Copy-Item -Recurse PROD-Extension\VSCode\.github\* .github/
```

## Requirements

- VSCode with GitHub Copilot
- YAML frontmatter in `.prompt.md` files
- Folder structure for skills (each with SKILL.md)

## Marketplace Compliance

- **Bundle Size**: <50MB (monitored via `bundle-size.ps1`)
- **File Extensions**: `.prompt.md`, `.agent.md`, `SKILL.md`
- **Additional Frontmatter**: VSCode-specific fields included

---

_For detailed technical specifications, see [CROSS_ENVIRONMENT_STANDARDIZATION.md](../../docs/specs/CROSS_ENVIRONMENT_STANDARDIZATION.md)_
