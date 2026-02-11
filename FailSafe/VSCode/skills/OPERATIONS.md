# Skill Operations

## Validation Gate

Run local metadata + parity validation:

```powershell
powershell -File tools/reliability/validate-skill-metadata.ps1
```

## Global Codex Sync

Sync active repository skills to global Codex runtime:

```powershell
powershell -File tools/skills/sync-global-codex-skills.ps1
```

Optional quarantine-prune mode:

```powershell
powershell -File tools/skills/sync-global-codex-skills.ps1 -PruneMissing
```

## Canonical Quarantine Audit

Scan quarantined skills against known upstream repositories for exact `name + SKILL.md` matches:

```powershell
powershell -File tools/skills/audit-quarantine-canonical.ps1
```

Generated report:
- `FailSafe/VSCode/skills/CANONICAL_SKILL_RESOLUTION_REPORT.md`
