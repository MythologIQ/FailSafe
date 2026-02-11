---
name: qore-tauri2-async
description: Design and implement async Tauri 2.x commands with proper cancellation, timeouts, and non-blocking behavior. Use when adding long-running Rust commands, LLM calls, file processing, or network operations.
creator: MythologIQ Labs, LLC
---

# Tauri2 Async Commands

## Overview
Implement async commands for long-running operations without blocking the main thread. Confirm the app's Tauri version before applying async command guidance.

## Workflow
1. Identify async work
   - Network calls, file I/O, model inference, or heavy compute should be async.

2. Implement command patterns
   - Mark commands `#[tauri::command] async`.
   - Use `tokio::time::timeout` for bounded operations.
   - Use cancellation tokens for user-initiated cancel flows.

3. Manage state safely
   - Avoid holding locks across await points.
   - Emit status events to the frontend for progress.

4. Return structured errors
   - Map internal errors to user-safe strings.
   - Log detailed errors on the Rust side.

## Notes
- Use `references/links.md` for latest command API and tokio patterns.
- Keep command inputs and outputs JSON-serializable.


