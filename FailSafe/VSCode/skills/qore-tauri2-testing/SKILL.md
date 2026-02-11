---
name: qore-tauri2-testing
description: Validate Tauri 2.x behavior with Rust tests, manual validation, and CI-friendly checks. Use when adding commands, changing permissions, or upgrading Tauri versions.
creator: MythologIQ Labs, LLC
---

# Tauri2 Testing Validation

## Overview
Verify command correctness, permission scopes, and upgrade changes in Tauri 2.x apps. Confirm the app's Tauri version before applying validation guidance.

## Workflow
1. Test Rust logic
   - Add unit tests for core modules and state handling.

2. Validate permissions
   - Exercise the UI flows that require capabilities and plugins.
   - Confirm no unexpected permission denials.

3. Regression checks
   - Re-run any existing integration or e2e tests.

## Notes
- Keep tests deterministic; avoid external network calls when possible.
- Use `references/links.md` for current guidance.

## Scope Boundary

**In scope**
- Validation strategy for Tauri 2.x changes: Rust tests, manual checks, CI-friendly verification.

**Out of scope**
- Writing/maintaining Playwright selector and IPC mock infrastructure as primary work (use `playwright-e2e-mocks`).


