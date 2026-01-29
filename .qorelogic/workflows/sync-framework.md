---
description: Synchronizes the local workspace's agent framework with the Global Golden Path.
---

# SYNC FRAMEWORK PROTOCOL

**Trigger:** Manual or Periodic
**Scope:** Browser/Local mismatch

## 1. PURPOSE

Ensures that the local project (`.agent/`) is using the latest, hardened workflows from the Global Library (`C:\Users\krkna\.gemini\antigravity\global_workflows`).

## 2. EXECUTION

- **Action:**
  - **Source:** `C:\Users\krkna\.gemini\antigravity\global_workflows\*.md`
  - **Destination:** `.agent/workflows/global/` (Note: separate folder to avoid overwriting project-specific overrides).
  - OR **Overwrite** `.agent/workflows/` (if strict enforcement).

## 3. CONFLICT RESOLUTION

- **Logic:**
  - If Local file has User Edits (verify via hashing or comment header): **SKIP**.
  - If Local file is unmodified from previous version: **UPDATE**.

## 4. COMMAND

```powershell
# Default to Overwrite for Core Protocols
$GlobalDocs = "C:\Users\krkna\.gemini\antigravity\global_workflows"
$LocalDocs = ".agent/workflows"

Copy-Item "$GlobalDocs/document_governance.md" -Destination $LocalDocs -Force
Copy-Item "$GlobalDocs/00_WORKFLOW_PROTOCOL.md" -Destination $LocalDocs -Force
Copy-Item "$GlobalDocs/close-session.md" -Destination $LocalDocs -Force

Write-Host "✅ Framework Synchronized with Global." -ForegroundColor Cyan
```
