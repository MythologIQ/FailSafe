# Changelog

## [0.2.0] - 2026-01-22
### Added
- **Ledger Hardening:** Implemented full cryptographic verification for hash chain (M1.5.1).
- **Secure Storage:** Migrated HMAC signing keys to VS Code SecretStorage (M1.5.3).
- **Atomic Config:** Implemented atomic writes for configuration files (M1.5.4).

### Fixed
- **Database Locks:** Fixed issue where SQLite database remained locked after extension reload (M1.5.2).
- **Genesis Block:** Replaced placeholder genesis hash/signature with computed values.

## [0.1.0] - 2026-01-22
### Added
- Initial project scaffold.
- Basic SQLite Ledger implementation (M1).
