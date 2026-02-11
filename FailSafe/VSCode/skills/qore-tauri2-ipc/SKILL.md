---
name: qore-tauri2-ipc
description: Tauri Rust IPC command wiring for Hearthlink. Use when adding or changing Tauri commands, invoke handler registration, AuthenticatedRequest payload shapes, or state management in src-tauri.
creator: MythologIQ Labs, LLC
---

# Tauri IPC Wiring

## Workflow

1. Add or update the Rust command with `#[tauri::command]` in the appropriate module (for example `src-tauri/src/synapse/*.rs`).
2. Ensure the module is exported (for example in `src-tauri/src/synapse/mod.rs`).
3. Register the command in `src-tauri/src/invoke_handler_debug.inc` and `src-tauri/src/invoke_handler_release.inc`.
4. If new state is required, add `.manage(...)` in `src-tauri/src/main.rs` and wire `State<...>` parameters in the command signature.
5. Confirm AuthenticatedRequest shapes match `src-tauri/src/guards.rs` (payload is flattened at the top level with `auth_token`).
6. Update the TS bridge to match the command signature and payload shape.
7. Update mocks in `tests/e2e/mocks/tauri-commands.ts` and any affected E2E tests.

## Repo touchpoints

- Rust commands: `src-tauri/src/**/commands.rs`, `src-tauri/src/**/mod.rs`
- Invoke registration: `src-tauri/src/invoke_handler_debug.inc`, `src-tauri/src/invoke_handler_release.inc`
- Auth wrapper: `src-tauri/src/guards.rs`
- App state wiring: `src-tauri/src/main.rs`
- TS bridges: `src/bridges/*.ts`
- E2E mocks: `tests/e2e/mocks/tauri-commands.ts`

## Common pitfalls

- Forgetting to register the command in both invoke handler files.
- Passing `{ request: { payload: ... } }` when Rust expects flattened fields.
- Forgetting to wire new state in `main.rs` when using `State<...>`.

## Scope Boundary

**In scope**
- Defining and registering Rust commands, invoke handlers, and command payload contracts.

**Out of scope**
- Frontend-only bridge consumer refactors without command contract changes (use `frontend-bridge-integration`).
- Global state architecture work not centered on command wiring (use `tauri2-state-management`).


