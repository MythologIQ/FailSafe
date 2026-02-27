/**
 * VS Code adapter implementations for FailSafe core interfaces
 *
 * These adapters bridge the platform-agnostic core interfaces
 * to the VS Code extension host APIs.
 */

export { VscodeSecretStore } from './VscodeSecretStore';
export { VscodeStateStore } from './VscodeStateStore';
export { VscodeConfigProvider } from './VscodeConfigProvider';
export { VscodeLogSink } from './VscodeLogSink';
export { VscodeNotificationService } from './VscodeNotificationService';
export { createVscodeFeatureGate } from './VscodeFeatureGate';
