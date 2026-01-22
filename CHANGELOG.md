# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-foundation] - 2026-01-22

### Added

- **Federated Session Foundation**: Initial infrastructure for multi-agent development.
- **Case Studies Framework**: Established directory structure for project-specific evaluations.
- **Lessons Learned Database**: Created `Lessons-Learned.md` to track agent vs. systemic failures.
- **Mitigation Protocols**: Added "Adversarial Phase" and "Macro-KISS Architecture" requirements to the roadmap.
- **Implementation Plan**: Defined a 12-sprint plan for FailSafe feature completion.
- **SQLite Ledger**: Replaced JSON ledger with a high-integrity SQLite Merkle-chained audit trail.
- **Config Defaults**: Auto-generation of `.failsafe/` directory and default YAML configurations (Persona/Policy).

### Changed

- Aligned `FAILSAFE_SPECIFICATION.md` with `package.json` manifest.
- Refactored extension core entry point to `src/extension/main.ts`.
