/**
 * WebUI - Portable UI layer for FailSafe
 *
 * Provides platform-agnostic host bridges and API client
 * for use in VS Code webviews, Tauri windows, or standalone browsers.
 */

export { HostBridge, VscodeHostBridge, ApiHostBridge, createHostBridge } from './protocol';
export { FailSafeClient } from './lib/failsafe-client';
