---
name: qore-tauri2-cicd
description: Build and distribute Tauri 2.x apps with CI/CD, signing, and updater workflows. Use when configuring release pipelines, code signing, or auto-updates.
creator: MythologIQ Labs, LLC
---

# Tauri2 CI/CD Distribution

## Overview
Automate builds and distribution for Tauri 2.x across platforms. Confirm the app's Tauri version before applying CI/CD guidance.

## Workflow
1. Select pipeline
   - Use official Tauri GitHub Action where possible.
   - Add build matrix for Windows, macOS, and Linux.

2. Configure signing and updates
   - Wire platform-specific signing in CI.
   - Configure updater endpoints when needed.

3. Package and release
   - Produce platform bundles and publish to the release channel.

## Notes
- Use `references/links.md` for current CI/CD configuration and action docs.


