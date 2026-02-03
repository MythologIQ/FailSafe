# QoreLogic Plugin Interface Proposal

## Overview

This document proposes a plugin interface for the QoreLogic governance framework, enabling extensible governance system synchronization across multi-agent environments. The plugin system allows third-party developers to create custom governance systems that integrate seamlessly with the FailSafe extension.

## Design Goals

1. **Extensibility**: Enable custom governance systems to be added without modifying core code
2. **Type Safety**: Provide strong TypeScript interfaces for all plugin interactions
3. **Backward Compatibility**: Support existing manifest-based systems without breaking changes
4. **Minimal Complexity**: Keep the plugin API simple and focused on essential hooks
5. **Testability**: Make plugins easy to test in isolation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FailSafe Extension                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              QoreLogic Plugin Registry                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │  Extension   │  │  Extension   │  │  Extension   │   │  │
│  │  │   Point:     │  │   Point:     │  │   Point:     │   │  │
│  │  │  Detection   │  │     Sync     │  │   Template   │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Plugin Instances                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Antigravity  │  │    Claude    │  │    Cursor    │   │  │
│  │  │   Plugin     │  │    Plugin    │  │    Plugin    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Interfaces

### QoreLogicSystem Interface

The main plugin interface that all governance systems must implement:

```typescript
export interface QoreLogicSystem {
  // Required
  getManifest(): SystemManifest;

  // Optional hooks
  detect?(
    context: DetectionContext,
  ): DetectionResult | Promise<DetectionResult>;
  preSync?(context: SyncContext): PreSyncResult | Promise<PreSyncResult>;
  postSync?(
    context: SyncContext,
    preSyncData?: Record<string, unknown>,
  ): PostSyncResult | Promise<PostSyncResult>;
  renderTemplate?(
    context: TemplateRenderContext,
  ): TemplateRenderResult | Promise<TemplateRenderResult>;
  dispose?(): void | Promise<void>;
}
```

### MinimalQoreLogicSystem Interface

For plugins that require minimal functionality:

```typescript
export interface MinimalQoreLogicSystem extends QoreLogicSystem {
  detect(context: DetectionContext): DetectionResult | Promise<DetectionResult>;
  preSync(context: SyncContext): PreSyncResult | Promise<PreSyncResult>;
  postSync(context: SyncContext): PostSyncResult | Promise<PostSyncResult>;
}
```

## Extension Points

### 1. Detection Extension Point

Allows plugins to customize how their system is detected.

**Interface:**

```typescript
export interface DetectionExtensionPoint {
  registerDetector(
    systemId: string,
    detector: (
      context: DetectionContext,
    ) => DetectionResult | Promise<DetectionResult>,
  ): void;
  unregisterDetector(systemId: string): void;
}
```

**Detection Context:**

```typescript
export interface DetectionContext {
  workspaceRoot: string;
  vscode: typeof vscode;
  extensions: readonly vscode.Extension<unknown>[];
  appName: string;
}
```

**Detection Result:**

```typescript
export interface DetectionResult {
  detected: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}
```

**Use Cases:**

- Check for specific file patterns
- Query VS Code extensions
- Validate environment variables
- Check for running processes

### 2. Sync Extension Point

Allows plugins to customize synchronization behavior.

**Interface:**

```typescript
export interface SyncExtensionPoint {
  registerSyncStrategy(
    systemId: string,
    strategy: (context: SyncContext) => Promise<void>,
  ): void;
  unregisterSyncStrategy(systemId: string): void;
}
```

**Sync Context:**

```typescript
export interface SyncContext {
  workspaceRoot: string;
  manifest: SystemManifest;
  vscode: typeof vscode;
  logger: {
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, error?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
}
```

**Use Cases:**

- Custom file copying logic
- Conditional sync based on environment
- Post-sync validation
- Integration with external systems

### 3. Template Rendering Extension Point

Allows plugins to customize template rendering.

**Interface:**

```typescript
export interface TemplateExtensionPoint {
  registerRenderer(
    systemId: string,
    renderer: (
      context: TemplateRenderContext,
    ) => TemplateRenderResult | Promise<TemplateRenderResult>,
  ): void;
  unregisterRenderer(systemId: string): void;
}
```

**Template Render Context:**

```typescript
export interface TemplateRenderContext {
  workspaceRoot: string;
  manifest: SystemManifest;
  template: TemplateConfig;
  templateContent: string;
  vscode: typeof vscode;
  logger: {
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, error?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
  };
}
```

**Template Render Result:**

```typescript
export interface TemplateRenderResult {
  content: string;
  success: boolean;
  error?: string;
}
```

**Use Cases:**

- Custom template engines (Handlebars, EJS, etc.)
- Dynamic content generation
- Conditional rendering
- Internationalization

## Minimal Hooks Recommendation

For most plugins, implementing these three hooks provides sufficient functionality:

### 1. Detection Hook

**Purpose:** Determine if the system is installed/active

**Signature:**

```typescript
detect(context: DetectionContext): DetectionResult | Promise<DetectionResult>
```

**Implementation Example:**

```typescript
detect(context: DetectionContext): DetectionResult {
  const orbitsPath = path.join(context.workspaceRoot, '.qorelogic/orbits');
  const detected = fs.existsSync(orbitsPath);

  return {
    detected,
    reason: detected ? 'Orbits directory found' : 'Orbits directory not found'
  };
}
```

### 2. Pre-Sync Hook

**Purpose:** Validate and prepare before synchronization

**Signature:**

```typescript
preSync(context: SyncContext): PreSyncResult | Promise<PreSyncResult>
```

**Implementation Example:**

```typescript
preSync(context: SyncContext): PreSyncResult {
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

### 3. Post-Sync Hook

**Purpose:** Clean up and notify after synchronization

**Signature:**

```typescript
postSync(context: SyncContext, preSyncData?: Record<string, unknown>): PostSyncResult | Promise<PostSyncResult>
```

**Implementation Example:**

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

## Plugin Registration

### Registration Interface

```typescript
export interface PluginRegistrationOptions {
  plugin: QoreLogicSystem;
  priority?: number;
  autoActivate?: boolean;
}
```

### Registry Interface

```typescript
export interface QoreLogicPluginRegistry {
  register(options: PluginRegistrationOptions): string;
  unregister(id: string): void;
  get(id: string): QoreLogicSystem | undefined;
  getAll(): QoreLogicSystem[];
  getSorted(): QoreLogicSystem[];
}
```

### Registration Example

```typescript
const pluginRegistry: QoreLogicPluginRegistry = getPluginRegistry();

const registrationId = pluginRegistry.register({
  plugin: new AntigravityPlugin(),
  priority: 100,
  autoActivate: true,
});
```

## Example Plugin Implementation

### Basic Plugin

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

export class AntigravityPlugin implements QoreLogicSystem {
  private manifest: SystemManifest = {
    id: "antigravity",
    name: "Antigravity / Gemini",
    description: "Antigravity Orbit-based architecture",
    sourceDir: "qorelogic/Antigravity",
    targetDir: ".qorelogic",
    detection: {
      folderExists: [".qorelogic/orbits"],
      alwaysInstalled: true,
    },
    governancePaths: [".qorelogic/orbits"],
  };

  getManifest(): SystemManifest {
    return this.manifest;
  }

  detect(context: DetectionContext): DetectionResult {
    const orbitsPath = path.join(context.workspaceRoot, ".qorelogic/orbits");
    const detected = fs.existsSync(orbitsPath);

    return {
      detected,
      reason: detected
        ? "Orbits directory found"
        : "Orbits directory not found",
    };
  }

  preSync(context: SyncContext): PreSyncResult {
    const sourceDir = path.join(
      context.workspaceRoot,
      context.manifest.sourceDir,
    );

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

### Advanced Plugin with Custom Template Rendering

```typescript
import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";
import {
  QoreLogicSystem,
  SystemManifest,
  DetectionContext,
  DetectionResult,
  SyncContext,
  PreSyncResult,
  PostSyncResult,
  TemplateRenderContext,
  TemplateRenderResult,
} from "./types/QoreLogicSystem";

export class AdvancedPlugin implements QoreLogicSystem {
  private manifest: SystemManifest = {
    id: "advanced-plugin",
    name: "Advanced Plugin",
    description: "Plugin with custom template rendering",
    sourceDir: "qorelogic/Advanced",
    targetDir: ".qorelogic",
    templates: [
      {
        source: "qorelogic/Advanced/templates/README.md.tpl",
        output: "README.md",
      },
    ],
  };

  getManifest(): SystemManifest {
    return this.manifest;
  }

  detect(context: DetectionContext): DetectionResult {
    return { detected: true };
  }

  preSync(context: SyncContext): PreSyncResult {
    return { proceed: true };
  }

  postSync(context: SyncContext): PostSyncResult {
    return { success: true };
  }

  renderTemplate(context: TemplateRenderContext): TemplateRenderResult {
    try {
      // Compile template with Handlebars
      const template = Handlebars.compile(context.templateContent);

      // Prepare data for rendering
      const data = {
        systemName: context.manifest.name,
        systemId: context.manifest.id,
        workspaceRoot: context.workspaceRoot,
        timestamp: new Date().toISOString(),
      };

      // Render template
      const content = template(data);

      return { content, success: true };
    } catch (error) {
      return {
        content: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
```

## Integration with FrameworkSync

The plugin system integrates with the existing [`FrameworkSync.ts`](../extension/src/qorelogic/FrameworkSync.ts) class:

### Detection Phase

```typescript
async detectSystems(): Promise<DetectedSystem[]> {
  const manifests = await this.loadSystemManifests();
  const detected: DetectedSystem[] = [];

  for (const manifest of manifests) {
    const plugin = this.pluginRegistry.get(manifest.id);

    if (plugin?.detect) {
      const result = await plugin.detect({
        workspaceRoot: this.workspaceRoot,
        vscode,
        extensions: vscode.extensions.all,
        appName: vscode.env.appName
      });

      detected.push({
        id: manifest.id,
        name: manifest.name,
        isInstalled: result.detected,
        hasGovernance: this.hasGovernance(manifest),
        description: manifest.description
      });
    } else {
      // Fallback to default detection
      detected.push(this.defaultDetection(manifest));
    }
  }

  return detected;
}
```

### Sync Phase

```typescript
async syncSystem(manifest: SystemManifest): Promise<void> {
  const plugin = this.pluginRegistry.get(manifest.id);

  // Pre-sync hook
  if (plugin?.preSync) {
    const preSyncResult = await plugin.preSync({
      workspaceRoot: this.workspaceRoot,
      manifest,
      vscode,
      logger: this.logger
    });

    if (!preSyncResult.proceed) {
      throw new Error(preSyncResult.error || 'Pre-sync validation failed');
    }
  }

  // Perform sync
  await this.copyRecursive(
    path.join(this.workspaceRoot, manifest.sourceDir),
    path.join(this.workspaceRoot, manifest.targetDir!)
  );

  // Post-sync hook
  if (plugin?.postSync) {
    await plugin.postSync({
      workspaceRoot: this.workspaceRoot,
      manifest,
      vscode,
      logger: this.logger
    });
  }
}
```

### Template Rendering Phase

```typescript
private async renderTemplate(template: TemplateConfig, manifest: SystemManifest): Promise<void> {
  const plugin = this.pluginRegistry.get(manifest.id);
  const templatePath = path.join(this.workspaceRoot, template.source);
  const raw = await fs.promises.readFile(templatePath, 'utf-8');

  let rendered: string;

  if (plugin?.renderTemplate) {
    // Use custom renderer
    const result = await plugin.renderTemplate({
      workspaceRoot: this.workspaceRoot,
      manifest,
      template,
      templateContent: raw,
      vscode,
      logger: this.logger
    });

    if (!result.success) {
      throw new Error(result.error || 'Template rendering failed');
    }

    rendered = result.content;
  } else {
    // Use default renderer
    rendered = this.renderTemplate(raw, manifest);
  }

  const outputPath = path.join(this.workspaceRoot, template.output);
  await fs.promises.writeFile(outputPath, rendered, 'utf-8');
}
```

## Backward Compatibility

The plugin system is designed to be fully backward compatible with existing manifest-based systems:

1. **Manifest Loading**: Existing manifests continue to work without modification
2. **Default Behavior**: If no plugin is registered for a system, default behavior is used
3. **Optional Hooks**: All hooks are optional; plugins can implement only what they need
4. **Gradual Migration**: Systems can gradually adopt plugin features without breaking existing functionality

## Future Enhancements

### Potential Future Extension Points

1. **Validation Extension Point**: Custom validation logic for manifests and governance artifacts
2. **Transformation Extension Point**: Custom transformation logic during sync
3. **Notification Extension Point**: Custom notification mechanisms
4. **Analytics Extension Point**: Custom analytics and telemetry collection

### Potential Future Features

1. **Plugin Marketplace**: Central repository for community plugins
2. **Plugin Dependencies**: Support for plugin-to-plugin dependencies
3. **Plugin Versioning**: Semantic versioning for plugins
4. **Plugin Sandboxing**: Isolated execution environment for plugins

## Conclusion

The QoreLogic plugin interface provides a flexible, extensible, and type-safe way to add custom governance systems to the FailSafe extension. The minimal hooks approach ensures that plugins can be implemented quickly while still providing powerful customization options when needed.

For implementation details, see:

- [`QoreLogicSystem.ts`](../extension/src/qorelogic/types/QoreLogicSystem.ts) - TypeScript type definitions
- [`manifest.schema.json`](./manifest.schema.json) - JSON schema for manifests
- [`MANIFEST_MIGRATION.md`](./MANIFEST_MIGRATION.md) - Migration guide for manifests
- [`FrameworkSync.ts`](../extension/src/qorelogic/FrameworkSync.ts) - Core sync implementation
