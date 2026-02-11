# External Skill Source Registry

## Naming Convention (Canonical)

- Imported external skills keep upstream names exactly.
- MythologIQ-authored skills/prompts use `qore-<domain>-<action>`.
- Example first-party Tauri naming: `qore-tauri2-init` (not `bootstrap` in the name).
- Detailed behavior belongs in description/body, not the skill slug.

## Active Imported Skills (Verbatim)

### ElevenLabs Voice Skills

- Source repository: https://github.com/elevenlabs/skills
- Commit pinned: `21a3e2fcd68448e3c1620b26a0a2cc3b4601b7d7`
- License: MIT
- Author/Copyright: ElevenLabs (`Copyright (c) 2024 ElevenLabs`)
- Imported date: 2026-02-10
- Active skills:
  - `agents`
  - `music`
  - `setup-api-key`
  - `sound-effects`
  - `speech-to-text`
  - `text-to-speech`

Each active imported skill contains `SOURCE.yml` with exact source URL and commit pin.

### WCAG Audit Patterns

- Source repository: https://github.com/wshobson/agents
- Commit pinned: `5d65aa10638bcc1b390738e11f9bff213f61955a`
- Path: `plugins/accessibility-compliance/skills/wcag-audit-patterns`
- License: MIT
- Author/Copyright: Seth Hobson (`Copyright (c) 2024 Seth Hobson`)
- Imported date: 2026-02-10
- Active skill:
  - `wcag-audit-patterns`

## Active First-Party Skills (Bundled)

- Creator: `MythologIQ Labs, LLC`
- Source type: `internal`
- Bundled skills:
  - `qore-governance-compliance` (`/ql` governance family)
  - `qore-meta-log-decision` (`/ql` meta-governance family)
  - `qore-meta-track-shadow` (`/ql` meta-governance family)
  - qore-web-chrome-devtools-audit (FailSafe runtime audit wrapper)
  - echnical-writing-narrative (/ql documentation family)
  - `qore-tauri2-ipc` (`/ql` tauri family)
  - `qore-tauri2-async` (`/ql` tauri family)
  - `qore-tauri2-cicd` (`/ql` tauri family)
  - `qore-tauri2-errors` (`/ql` tauri family)
  - `qore-tauri2-performance` (`/ql` tauri family)
  - `qore-tauri2-plugins` (`/ql` tauri family)
  - `qore-tauri2-security` (`/ql` tauri family)
  - `qore-tauri2-state` (`/ql` tauri family)
  - `qore-tauri2-testing` (`/ql` tauri family)

Each bundled first-party skill contains `SOURCE.yml` with creator and ownership metadata.
First-party naming follows the `qore-...` convention for new additions.

## Quarantined (Not Active) Until Canonical Source Verification

Quarantined in `FailSafe/VSCode/skills/_quarantine`:

- GitHub Spec-to-Issue
- ADR Lifecycle Manager
- RICE/WSJF Scorer
- Zero-Downtime Schema Migrator
- Idempotency & Resilience Pack
- Contract-First OpenAPI Generator
- Azure/AWS SRE causal RCA skill
- Living Playbook SRE
- Intent-Based Test Suite
- OWASP Top 10 Auditor
- SBOM Risk Scanner
- Agentic Threat Modeler
- WCAG-first remediation
- Blender MCP Agent skill wrapper

Reason: canonical upstream skill folders with exact files and complete author/license metadata are not yet confirmed in this migration pass.

## External Capability Verified (Not a Skill Pack)

- Blender MCP project
  - Repository: https://github.com/ahujasid/blender-mcp
  - Commit checked: `7636d13bded82eca58eb93c3f4cd8708dfdfbe8b`
  - License: MIT
  - Author/Copyright: Siddharth Ahuja (`Copyright (c) 2025 Siddharth Ahuja`)


