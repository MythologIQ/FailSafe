---
name: qore-tauri2-plugins
description: Integrate official Tauri 2.x plugins (fs, shell, http, dialog, etc.) and wire frontend imports. Use when replacing custom OS access, adding new plugins, or updating IPC/bridge layers.
creator: MythologIQ Labs, LLC
---

# Tauri2 Plugin Integration

## Overview
Prefer official Tauri plugins for OS-level capabilities and keep IPC payloads aligned. Confirm the app's Tauri version before applying plugin guidance.

## Workflow
1. Select plugin
   - Use official plugins when available (fs, shell, http, dialog).
   - Check the plugin version matches the Tauri major version.

2. Wire Rust side
   - Add the plugin crate to `src-tauri/Cargo.toml`.
   - Initialize the plugin in `src-tauri/src/main.rs`.

3. Update capabilities
   - Add plugin permissions to capability files for the correct window.

4. Update frontend imports
   - Tauri 2.x uses plugin packages (for example, `@tauri-apps/plugin-fs`).
   - Update IPC payloads to match Rust command shapes.

## Notes
- Validate against `references/links.md` for plugin docs and APIs.
- If a plugin is missing, keep custom logic behind a tight capability.

## Scope Boundary

**In scope**
- Integrating official Tauri plugins and wiring frontend imports/API usage.

**Out of scope**
- Capability/CSP hardening as the primary deliverable (use `tauri2-security-permissions`).
- Command payload contract design for custom commands (use `tauri-ipc-wiring`).


