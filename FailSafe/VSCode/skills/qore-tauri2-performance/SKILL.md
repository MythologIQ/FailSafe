---
name: qore-tauri2-performance
description: Improve Tauri 2.x performance for command execution, UI responsiveness, and background workloads. Use when optimizing startup, long-running tasks, or Rust/frontend performance issues.
creator: MythologIQ Labs, LLC
---

# Tauri2 Performance Optimization

## Overview
Reduce latency and avoid blocking the main thread in Tauri 2.x apps. Confirm the app's Tauri version before applying optimization guidance.

## Workflow
1. Identify bottlenecks
   - Look for long-running commands, large payloads, or frequent IPC calls.

2. Move work off the main thread
   - Use async commands and background tasks.
   - Emit progress events rather than returning huge payloads.

3. Optimize state usage
   - Minimize lock duration and clone data for read-heavy paths.

4. Validate
   - Measure before and after with basic timing or logs.

## Notes
- Use `references/links.md` for current recommendations and APIs.
- Prefer official plugins over custom OS calls when possible.


