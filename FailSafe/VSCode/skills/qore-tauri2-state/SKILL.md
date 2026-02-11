---
name: qore-tauri2-state
description: Implement or refactor shared state in Tauri 2.x using tauri::State, Arc/Mutex, and event-driven updates. Use when adding session/context storage, global app state, or cross-window data flow in Rust or frontend.
creator: MythologIQ Labs, LLC
---

# Tauri2 State Management

## Overview
Use Tauri 2.x managed state to share data across commands and windows safely. Confirm the app's Tauri version before applying state API guidance.

## Workflow
1. Confirm version and location
   - Check `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
   - Identify the Rust module where state lives (often `src-tauri/src/`).

2. Define state types
   - Use `tauri::State` with `Arc<Mutex<...>>` for shared mutable data.
   - Keep state structs small and focused per domain (sessions, config, metrics).

3. Wire state into commands
   - Inject `State<'_, T>` in command signatures.
   - Avoid holding locks across awaits; clone data when needed.

4. Notify the UI
   - Emit events when state changes if the frontend needs to react.

## Notes
- Prefer read-only accessors for config and immutable data.
- Consider background tasks for long operations; do not block on locks.
- Use `references/links.md` to verify API changes between Tauri versions.

## Scope Boundary

**In scope**
- Cross-command/window shared state design using `tauri::State` and synchronization patterns.

**Out of scope**
- Individual command payload registration and command route wiring (use `tauri-ipc-wiring`).


