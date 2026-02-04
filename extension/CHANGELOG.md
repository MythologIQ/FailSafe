# Changelog

All notable changes to the MythologIQ FailSafe extension will be documented in this file.

## [1.0.4] - 2026-02-04

### Fixed

- Marketplace icon now uses the packaged extension icon.

## [1.0.0] - 2026-02-04

### Added

- **Sentinel Daemon**: Real-time file monitoring with heuristic pattern analysis
- **Trust Engine**: Lewicki-Bunker progressive trust model (CBT → KBT → IBT stages)
- **SOA Ledger**: Merkle-chained audit trail with SQLite persistence
- **L3 Escalation**: Human-in-the-loop approval queue for security-critical paths
- **Dashboard Panel**: Main governance overview with real-time metrics
- **Living Graph**: Visual dependency and trust relationship explorer
- **Cortex Stream**: NLP command interface for governance queries
- **Enforcement Engine**: Three Prime Axioms for action validation
- **Shadow Genome**: Failure pattern archival for continuous learning
- **QoreLogic Integration**: Multi-agent framework synchronization

### Security

- Path traversal prevention with symlink resolution
- SSRF protection for LLM endpoint validation
- ReDoS protection for custom pattern definitions
- TOCTOU race condition mitigations
- Content size limits to prevent DoS

### Configuration

- Heuristic, LLM-assisted, and hybrid analysis modes
- Configurable Ollama endpoint and model selection
- Adjustable L3 SLA thresholds
- Strict mode for zero-tolerance governance
