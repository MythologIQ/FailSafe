# QoreLogic Manifest Schema Migration Notes

## Overview

This document provides migration guidance for QoreLogic system manifests from the legacy (v0) format to the new schema-defined format (v1.0.0+).

## Schema Versions

| Version     | Status     | Description                                  |
| ----------- | ---------- | -------------------------------------------- |
| v0 (legacy) | Deprecated | Implicit schema, no version field            |
| v1.0.0      | Current    | First schema-defined version with validation |

## Required vs Optional Fields

### Required Fields (v1.0.0)

| Field         | Type   | Description                    | Legacy Support |
| ------------- | ------ | ------------------------------ | -------------- |
| `id`          | string | Unique identifier (kebab-case) | Required in v0 |
| `name`        | string | Human-readable display name    | Required in v0 |
| `description` | string | Brief description              | Required in v0 |
| `sourceDir`   | string | Source directory path          | Required in v0 |

### Optional Fields (v1.0.0)

| Field             | Type           | Description                | Legacy Support                                |
| ----------------- | -------------- | -------------------------- | --------------------------------------------- |
| `version`         | string         | Semantic version           | **New** - optional for backward compatibility |
| `targetDir`       | string \| null | Target directory path      | Required in v0, now nullable                  |
| `detection`       | object         | Detection rules            | Optional in v0                                |
| `governancePaths` | array          | Governance artifact paths  | Optional in v0                                |
| `extraCopies`     | array          | Additional copy operations | Optional in v0                                |
| `templates`       | array          | Template rendering configs | Optional in v0                                |
| `hooks`           | object         | Extension hooks            | **New**                                       |
| `capabilities`    | object         | System capabilities        | **New**                                       |
| `dependencies`    | array          | System dependencies        | **New**                                       |
| `metadata`        | object         | Additional metadata        | **New**                                       |

## Migration Guide

### Step 1: Add Version Field (Optional but Recommended)

Add a `version` field to indicate schema compliance:

```json
{
  "version": "1.0.0",
  "id": "antigravity",
  "name": "Antigravity / Gemini",
  ...
}
```

**Note**: The `version` field is optional for backward compatibility. Existing manifests without this field will be treated as v0 (legacy) and validated against the schema with `version` as optional.

### Step 2: Validate Required Fields

Ensure all required fields are present:

```json
{
  "id": "antigravity",
  "name": "Antigravity / Gemini",
  "description": "Antigravity Orbit-based architecture",
  "sourceDir": "qorelogic/Antigravity"
}
```

### Step 3: Update targetDir (if applicable)

If your system doesn't need a target directory, set `targetDir` to `null`:

```json
{
  "targetDir": null
}
```

### Step 4: Add Capabilities (Recommended)

Declare your system's capabilities for better feature detection:

```json
{
  "capabilities": {
    "supportsOrbits": true,
    "supportsPolicies": true,
    "supportsSkills": true,
    "supportsWorkflows": true,
    "supportsShadowGenome": false,
    "supportsLedger": false,
    "supportsTrustEngine": false,
    "supportsL3Approval": false
  }
}
```

### Step 5: Add Hooks (Optional)

Add lifecycle hooks for custom behavior:

```json
{
  "hooks": {
    "preSync": "scripts/pre-sync.js",
    "postSync": "scripts/post-sync.js",
    "onDetect": "scripts/on-detect.js",
    "onTemplateRender": "scripts/render-template.js"
  }
}
```

### Step 6: Add Metadata (Optional)

Add metadata for better documentation:

```json
{
  "metadata": {
    "author": "MythologIQ",
    "license": "MIT",
    "homepage": "https://github.com/mythologiq/failsafe",
    "repository": "https://github.com/mythologiq/failsafe",
    "tags": ["governance", "orbits", "production"]
  }
}
```

### Step 7: Add Dependencies (if applicable)

If your system depends on other systems:

```json
{
  "dependencies": ["base-governance", "shared-utilities"]
}
```

## Migration Examples

### Example 1: Minimal Migration (v0 → v1.0.0)

**Before (v0):**

```json
{
  "id": "antigravity",
  "name": "Antigravity / Gemini",
  "description": "Antigravity Orbit-based architecture",
  "sourceDir": "qorelogic/Antigravity",
  "targetDir": ".qorelogic",
  "detection": {
    "folderExists": [".qorelogic/orbits"],
    "alwaysInstalled": true
  },
  "governancePaths": [".qorelogic/orbits"],
  "extraCopies": [
    {
      "source": "qorelogic/Antigravity/workflows",
      "target": ".agent/workflows"
    }
  ],
  "templates": [
    {
      "source": "qorelogic/Antigravity/templates/GEMINI.md.tpl",
      "output": "GEMINI.md"
    }
  ]
}
```

**After (v1.0.0 - Minimal):**

```json
{
  "version": "1.0.0",
  "id": "antigravity",
  "name": "Antigravity / Gemini",
  "description": "Antigravity Orbit-based architecture",
  "sourceDir": "qorelogic/Antigravity",
  "targetDir": ".qorelogic",
  "detection": {
    "folderExists": [".qorelogic/orbits"],
    "alwaysInstalled": true
  },
  "governancePaths": [".qorelogic/orbits"],
  "extraCopies": [
    {
      "source": "qorelogic/Antigravity/workflows",
      "target": ".agent/workflows"
    }
  ],
  "templates": [
    {
      "source": "qorelogic/Antigravity/templates/GEMINI.md.tpl",
      "output": "GEMINI.md"
    }
  ]
}
```

### Example 2: Full Migration (v0 → v1.0.0 with all features)

**After (v1.0.0 - Full):**

```json
{
  "version": "1.0.0",
  "id": "antigravity",
  "name": "Antigravity / Gemini",
  "description": "Antigravity Orbit-based architecture",
  "sourceDir": "qorelogic/Antigravity",
  "targetDir": ".qorelogic",
  "detection": {
    "folderExists": [".qorelogic/orbits"],
    "alwaysInstalled": true
  },
  "governancePaths": [".qorelogic/orbits"],
  "extraCopies": [
    {
      "source": "qorelogic/Antigravity/workflows",
      "target": ".agent/workflows"
    }
  ],
  "templates": [
    {
      "source": "qorelogic/Antigravity/templates/GEMINI.md.tpl",
      "output": "GEMINI.md"
    }
  ],
  "hooks": {
    "preSync": "scripts/pre-sync.js",
    "postSync": "scripts/post-sync.js"
  },
  "capabilities": {
    "supportsOrbits": true,
    "supportsPolicies": true,
    "supportsSkills": true,
    "supportsWorkflows": true,
    "supportsShadowGenome": false,
    "supportsLedger": false,
    "supportsTrustEngine": false,
    "supportsL3Approval": false
  },
  "metadata": {
    "author": "MythologIQ",
    "license": "MIT",
    "homepage": "https://github.com/mythologiq/failsafe",
    "repository": "https://github.com/mythologiq/failsafe",
    "tags": ["governance", "orbits", "production"]
  }
}
```

## Breaking Changes

### None

The v1.0.0 schema is fully backward compatible with v0 manifests. All existing fields are preserved, and new fields are optional.

## Validation

To validate your manifest against the schema:

```bash
# Using ajv-cli (requires Node.js)
npx ajv validate -s qorelogic/manifest.schema.json -d qorelogic/Antigravity/manifest.json

# Or using VS Code JSON Schema extension
# Add the following to your .vscode/settings.json:
{
  "json.schemas": [
    {
      "fileMatch": ["qorelogic/*/manifest.json"],
      "url": "./qorelogic/manifest.schema.json"
    }
  ]
}
```

## Future Schema Versions

### v2.0.0 (Planned)

Potential breaking changes for v2.0.0:

- `id` field pattern may become more restrictive
- `detection` object structure may be refactored
- New required fields may be added

Migration strategy for v2.0.0 will be documented when released.

## Support

For questions or issues with manifest migration:

- Review the [manifest.schema.json](./manifest.schema.json) for detailed field specifications
- Check existing manifests in the `qorelogic/` directory for examples
- Consult the [FrameworkSync.ts](../extension/src/qorelogic/FrameworkSync.ts) implementation for runtime behavior
