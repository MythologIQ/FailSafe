# QoreLogic Minimal Hooks Guide

## Overview

This guide provides a concise reference for implementing the minimal set of hooks required for a functional QoreLogic plugin. These hooks provide the essential functionality for most governance system plugins.

## Minimal Hooks Summary

For most plugins, implementing these three hooks provides sufficient functionality:

| Hook         | Purpose                                 | Required | Complexity |
| ------------ | --------------------------------------- | -------- | ---------- |
| `detect()`   | Determine if system is installed/active | Yes      | Low        |
| `preSync()`  | Validate and prepare before sync        | Yes      | Low        |
| `postSync()` | Clean up and notify after sync          | Yes      | Low        |

## Hook 1: detect()

### Purpose

Determine if the governance system is installed/active in the current workspace.

### Signature

```typescript
detect(context: DetectionContext): DetectionResult | Promise<DetectionResult>
```

### Context

```typescript
interface DetectionContext {
  workspaceRoot: string; // Workspace root path
  vscode: typeof vscode; // VS Code extension API
  extensions: readonly vscode.Extension<unknown>[]; // Installed extensions
  appName: string; // Host application name
}
```

### Result

```typescript
interface DetectionResult {
  detected: boolean; // Whether system is detected
  reason?: string; // Optional reason
  metadata?: Record<string, unknown>; // Optional metadata
}
```

### Minimal Implementation

```typescript
detect(context: DetectionContext): DetectionResult {
  // Check for a specific directory
  const orbitsPath = path.join(context.workspaceRoot, '.qorelogic/orbits');
  const detected = fs.existsSync(orbitsPath);

  return {
    detected,
    reason: detected ? 'Orbits directory found' : 'Orbits directory not found'
  };
}
```

### Advanced Implementation

```typescript
detect(context: DetectionContext): DetectionResult {
  // Check for directory
  const orbitsPath = path.join(context.workspaceRoot, '.qorelogic/orbits');
  const hasOrbits = fs.existsSync(orbitsPath);

  // Check for VS Code extension
  const hasExtension = context.extensions.some(ext =>
    ext.id.includes('gemini') || ext.id.includes('cursor')
  );

  // Check for host app
  const isCursor = context.appName.toLowerCase().includes('cursor');

  const detected = hasOrbits || hasExtension || isCursor;

  return {
    detected,
    reason: detected
      ? 'Detected via orbits, extension, or host app'
      : 'No detection criteria met',
    metadata: {
      hasOrbits,
      hasExtension,
      isCursor
    }
  };
}
```

## Hook 2: preSync()

### Purpose

Validate and prepare before synchronization begins. This is your opportunity to check prerequisites and abort sync if needed.

### Signature

```typescript
preSync(context: SyncContext): PreSyncResult | Promise<PreSyncResult>
```

### Context

```typescript
interface SyncContext {
  workspaceRoot: string; // Workspace root path
  manifest: SystemManifest; // System manifest
  vscode: typeof vscode; // VS Code extension API
  logger: {
    // Logger instance
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, error?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
}
```

### Result

```typescript
interface PreSyncResult {
  proceed: boolean; // Whether to proceed with sync
  error?: string; // Optional error message if not proceeding
  data?: Record<string, unknown>; // Optional data to pass to post-sync
}
```

### Minimal Implementation

```typescript
preSync(context: SyncContext): PreSyncResult {
  // Check if source directory exists
  const sourceDir = path.join(context.workspaceRoot, context.manifest.sourceDir);

  if (!fs.existsSync(sourceDir)) {
    return {
      proceed: false,
      error: `Source directory not found: ${sourceDir}`
    };
  }

  context.logger.info('Pre-sync validation passed');
  return { proceed: true };
}
```

### Advanced Implementation

```typescript
preSync(context: SyncContext): PreSyncResult {
  // Check source directory
  const sourceDir = path.join(context.workspaceRoot, context.manifest.sourceDir);

  if (!fs.existsSync(sourceDir)) {
    return {
      proceed: false,
      error: `Source directory not found: ${sourceDir}`
    };
  }

  // Check target directory (if specified)
  if (context.manifest.targetDir) {
    const targetDir = path.join(context.workspaceRoot, context.manifest.targetDir);

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      context.logger.info(`Created target directory: ${targetDir}`);
    }
  }

  // Validate required files
  const requiredFiles = ['orbits/orbit-governor.json', 'policies/security-gate.yaml'];
  for (const file of requiredFiles) {
    const filePath = path.join(sourceDir, file);
    if (!fs.existsSync(filePath)) {
      return {
        proceed: false,
        error: `Required file not found: ${file}`
      };
    }
  }

  context.logger.info('Pre-sync validation passed');
  return {
    proceed: true,
    data: {
      validatedAt: new Date().toISOString(),
      requiredFilesValidated: requiredFiles.length
    }
  };
}
```

## Hook 3: postSync()

### Purpose

Clean up and notify after synchronization completes. This is your opportunity to perform post-sync tasks and notify the user.

### Signature

```typescript
postSync(context: SyncContext, preSyncData?: Record<string, unknown>): PostSyncResult | Promise<PostSyncResult>
```

### Context

```typescript
interface SyncContext {
  workspaceRoot: string; // Workspace root path
  manifest: SystemManifest; // System manifest
  vscode: typeof vscode; // VS Code extension API
  logger: {
    // Logger instance
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, error?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
}
```

### Result

```typescript
interface PostSyncResult {
  success: boolean; // Whether post-sync operations succeeded
  error?: string; // Optional error message if failed
  data?: Record<string, unknown>; // Optional data to return
}
```

### Minimal Implementation

```typescript
postSync(context: SyncContext): PostSyncResult {
  // Show notification to user
  context.vscode.window.showInformationMessage(
    `${context.manifest.name} synchronized successfully`
  );

  context.logger.info('Post-sync completed');
  return { success: true };
}
```

### Advanced Implementation

```typescript
postSync(context: SyncContext, preSyncData?: Record<string, unknown>): PostSyncResult {
  // Log sync completion with metadata
  context.logger.info('Post-sync started', {
    systemId: context.manifest.id,
    preSyncData
  });

  // Show notification to user
  context.vscode.window.showInformationMessage(
    `${context.manifest.name} synchronized successfully`,
    'Open Documentation',
    'View Governance'
  ).then(selection => {
    if (selection === 'Open Documentation') {
      context.vscode.env.openExternal(
        context.vscode.Uri.parse('https://github.com/mythologiq/failsafe')
      );
    } else if (selection === 'View Governance') {
      const governancePath = path.join(
        context.workspaceRoot,
        context.manifest.governancePaths?.[0] || '.qorelogic'
      );
      context.vscode.commands.executeCommand(
        'vscode.openFolder',
        context.vscode.Uri.file(governancePath)
      );
    }
  });

  // Emit telemetry event (if telemetry is enabled)
  if (preSyncData?.telemetryEnabled) {
    // Emit telemetry event
    context.logger.debug('Telemetry event emitted', {
      event: 'sync_completed',
      systemId: context.manifest.id
    });
  }

  context.logger.info('Post-sync completed');
  return {
    success: true,
    data: {
      completedAt: new Date().toISOString(),
      notificationShown: true
    }
  };
}
```

## Optional Hook: renderTemplate()

### Purpose

Customize template rendering for generating root-level instruction files.

### Signature

```typescript
renderTemplate(context: TemplateRenderContext): TemplateRenderResult | Promise<TemplateRenderResult>
```

### Context

```typescript
interface TemplateRenderContext {
  workspaceRoot: string; // Workspace root path
  manifest: SystemManifest; // System manifest
  template: TemplateConfig; // Template configuration
  templateContent: string; // Raw template content
  vscode: typeof vscode; // VS Code extension API
  logger: {
    // Logger instance
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, error?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
}
```

### Result

```typescript
interface TemplateRenderResult {
  content: string; // Rendered content
  success: boolean; // Whether rendering succeeded
  error?: string; // Optional error message if failed
}
```

### Minimal Implementation

```typescript
renderTemplate(context: TemplateRenderContext): TemplateRenderResult {
  // Use default simple variable replacement
  const content = context.templateContent
    .replaceAll('{{SYSTEM_NAME}}', context.manifest.name)
    .replaceAll('{{SYSTEM_ID}}', context.manifest.id);

  return { content, success: true };
}
```

### Advanced Implementation (with Handlebars)

```typescript
import * as Handlebars from 'handlebars';

renderTemplate(context: TemplateRenderContext): TemplateRenderResult {
  try {
    // Compile template with Handlebars
    const template = Handlebars.compile(context.templateContent);

    // Prepare data for rendering
    const data = {
      systemName: context.manifest.name,
      systemId: context.manifest.id,
      description: context.manifest.description,
      workspaceRoot: context.workspaceRoot,
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear(),
      // Add custom helpers
      uppercase: (str: string) => str.toUpperCase(),
      lowercase: (str: string) => str.toLowerCase()
    };

    // Render template
    const content = template(data);

    return { content, success: true };
  } catch (error) {
    context.logger.error('Template rendering failed', error);
    return {
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Complete Minimal Plugin Example

```typescript
import * as fs from "fs";
import * as path from "path";
import {
  QoreLogicSystem,
  SystemManifest,
  DetectionContext,
  DetectionResult,
  SyncContext,
  PreSyncResult,
  PostSyncResult,
} from "./types/QoreLogicSystem";

export class MinimalPlugin implements QoreLogicSystem {
  private manifest: SystemManifest = {
    id: "minimal-plugin",
    name: "Minimal Plugin",
    description: "A minimal QoreLogic plugin implementation",
    sourceDir: "qorelogic/Minimal",
    targetDir: ".qorelogic",
  };

  getManifest(): SystemManifest {
    return this.manifest;
  }

  detect(context: DetectionContext): DetectionResult {
    const targetPath = path.join(
      context.workspaceRoot,
      this.manifest.targetDir!,
    );
    const detected = fs.existsSync(targetPath);

    return {
      detected,
      reason: detected
        ? "Target directory found"
        : "Target directory not found",
    };
  }

  preSync(context: SyncContext): PreSyncResult {
    const sourceDir = path.join(context.workspaceRoot, this.manifest.sourceDir);

    if (!fs.existsSync(sourceDir)) {
      return {
        proceed: false,
        error: `Source directory not found: ${sourceDir}`,
      };
    }

    context.logger.info("Pre-sync validation passed");
    return { proceed: true };
  }

  postSync(context: SyncContext): PostSyncResult {
    context.vscode.window.showInformationMessage(
      `${context.manifest.name} synchronized successfully`,
    );

    context.logger.info("Post-sync completed");
    return { success: true };
  }
}
```

## Quick Reference

### Required Method

- `getManifest()` - Always required, returns the system manifest

### Essential Hooks

- `detect()` - Determine if system is installed
- `preSync()` - Validate before sync
- `postSync()` - Clean up after sync

### Optional Hooks

- `renderTemplate()` - Custom template rendering
- `dispose()` - Clean up resources

### Error Handling

Always return appropriate error messages in hooks:

- `detect()`: Include `reason` in result
- `preSync()`: Include `error` in result and set `proceed: false`
- `postSync()`: Include `error` in result and set `success: false`
- `renderTemplate()`: Include `error` in result and set `success: false`

### Logging

Use the provided logger for consistent logging:

- `logger.info()` - Informational messages
- `logger.warn()` - Warning messages
- `logger.error()` - Error messages
- `logger.debug()` - Debug messages

### VS Code API

Access VS Code functionality via `context.vscode`:

- `vscode.window.showInformationMessage()` - Show notifications
- `vscode.env.openExternal()` - Open URLs
- `vscode.commands.executeCommand()` - Execute commands

## Next Steps

1. Implement the three essential hooks (`detect`, `preSync`, `postSync`)
2. Test your plugin with the [`FrameworkSync.ts`](../extension/src/qorelogic/FrameworkSync.ts) integration
3. Add optional hooks as needed for advanced functionality
4. Refer to the full [`PLUGIN_INTERFACE_PROPOSAL.md`](./PLUGIN_INTERFACE_PROPOSAL.md) for detailed examples

## Related Documentation

- [`QoreLogicSystem.ts`](../extension/src/qorelogic/types/QoreLogicSystem.ts) - TypeScript type definitions
- [`manifest.schema.json`](./manifest.schema.json) - JSON schema for manifests
- [`MANIFEST_MIGRATION.md`](./MANIFEST_MIGRATION.md) - Migration guide for manifests
- [`PLUGIN_INTERFACE_PROPOSAL.md`](./PLUGIN_INTERFACE_PROPOSAL.md) - Full plugin interface documentation
