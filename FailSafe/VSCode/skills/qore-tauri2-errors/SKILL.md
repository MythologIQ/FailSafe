---
name: qore-tauri2-errors
description: Standardize Tauri 2.x command error handling using thiserror, Result mapping, and structured error messages. Use when adding new commands, improving resilience, or normalizing Rust-to-frontend errors.
creator: MythologIQ Labs, LLC
---

# Tauri2 Error Handling

## Overview
Create consistent, user-safe errors from Tauri commands while preserving diagnostic detail in logs. Confirm the app's Tauri version before applying error guidance.

## Workflow
1. Define error types
   - Use `thiserror` to build typed errors.
   - Add variants for I/O, network, permissions, and validation.

2. Convert to command results
   - Return `Result<T, String>` in command signatures.
   - Map internal errors to concise, user-safe messages.

3. Log details
   - Log the original error with context (command name, inputs, ids).

## Notes
- Avoid panics in command paths.
- Keep error strings stable for frontend matching.
- Use `references/links.md` to check the current error handling guidance.


