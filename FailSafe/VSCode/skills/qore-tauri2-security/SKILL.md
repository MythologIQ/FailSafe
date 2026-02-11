---
name: qore-tauri2-security
description: Configure and audit Tauri 2.x security for capabilities, window permissions, CSP, and resource access. Use when editing tauri.conf.json, adding or changing Tauri commands/plugins, migrating from allowlist to capabilities, or tightening permissions in Hearthlink.
creator: MythologIQ Labs, LLC
---

# Tauri2 Security Permissions

## Overview
Define least-privilege access for windows, commands, plugins, and external resources in Tauri 2.x. Confirm the app's Tauri version before applying capability guidance.

## Workflow
1. Confirm version
   - Check `src-tauri/Cargo.toml` for the `tauri` version.
   - Check `src-tauri/tauri.conf.json` schema version.
   - If still on Tauri 1.x, do not apply capability JSON changes.

2. Map actions to permissions
   - List the commands/plugins being used and which windows need them.
   - Create or update capability files in `src-tauri/capabilities/`.
   - Keep permissions minimal and scoped to the correct window labels.

3. Secure configuration
   - Update CSP in `src-tauri/tauri.conf.json` for only required domains and protocols.
   - Remove legacy allowlist entries when migrating to Tauri 2.x.

4. Validate
   - Run the app and exercise the feature that needs permissions.
   - Re-check the capability files and CSP if a permission error occurs.

## Notes
- Favor multiple narrowly scoped capabilities over one broad capability.
- Keep capability identifiers stable; update references if filenames change.
- Use `references/links.md` to verify current permission names and schema details.

## Scope Boundary

**In scope**
- Capability files, window permissions, CSP/resource allow rules, and least-privilege config in Tauri 2.x.

**Out of scope**
- Business-level consent UX/audit logging workflow design (use `security-permission-audit`).
- Plugin API integration details not directly tied to permission model (use `tauri2-plugin-integration`).


