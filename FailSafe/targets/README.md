# Target Environment Definitions

This directory contains environment-specific constraints and overrides.

## Structure

```
targets/
├── Antigravity/
│   ├── constraints.yml     # e.g., description ≤250 chars
│   └── overrides/          # Environment-specific content
├── Claude/
│   ├── constraints.yml
│   └── overrides/
└── VSCode/
    ├── constraints.yml
    └── overrides/
```

## How Constraints Work

The build script reads `constraints.yml` and applies transformations:

1. Description truncation (Antigravity: ≤250 chars)
2. File extension mapping (VSCode: `.prompt.md`, `.agent.md`)
3. Output path routing (each environment has different locations)
4. Structure conversion (VSCode skills need folder structure)

## Overrides

If an environment needs completely different content (not just transformation),
place override files in `overrides/`. These replace rather than transform.
