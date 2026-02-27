# FailSafe Pro: Enterprise Governance Daemon

FailSafe Pro is the OS-level thick daemon that handles Enterprise compliance, Air-Gapped Judge routing, and multi-IDE synchronization for the FailSafe Q-DNA ecosystem.

This repository runs locally via Tauri 2.x and connects to lightweight IDE extensions (VS Code, Cursor, JetBrains) via IPC/WebSockets.

## Architecture

- **Backend:** Rust, Tauri 2.0, `rusqlite`, `notify`
- **Frontend:** Vue 3, TypeScript
- **Licensing/SSO:** Built into the desktop UI

## Getting Started

1. Install Node and Rust prerequisites for Tauri 2.x
2. Run `npm install`
3. Run `npm run tauri dev`
