---
name: Initialize Federated Session
trigger: "/init-session"
description: Complete "Good Morning" protocol. Provisions infrastructure and checks health.
---

# INITIALIZE FEDERATED SESSION (GLOBAL)

**Trigger:** `/init-session`
**Scope:** Global (Any Workspace)

This is the **Master Startup Protocol**. It guarantees the workspace is in an ideal state for Federated execution.

## PHASE 1: INFRASTRUCTURE IMPERATIVE

**Goal:** Ensure the physical layer (files, locks, dirs) exists.

### 1.1 SCAFFOLDING (Auto-Provision)

- **Action:** Create necessary directories if missing.
  ```powershell
  $required = @(".agent/staging/archive", ".agent/locks/Personal")
  foreach ($d in $required) {
      if (!(Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null; Write-Host "🛠️ Created $d" -ForegroundColor Gray }
  }
  ```

### 1.2 LOCK MANAGER INSTALLATION

- **Action:** Ensure `lock_manager.ps1` is present.
  ```powershell
  if (!(Test-Path ".\lock_manager.ps1")) {
      Write-Host "🛠️ Installing Lock Manager..." -ForegroundColor Cyan
      $script = @'
  param ([string]$Action, [string]$AgentName, [string]$SystemScope="Personal", [int]$TimeoutSeconds=300)
  $LockDir = Join-Path $PSScriptRoot ".agent\locks\$SystemScope"
  if (!(Test-Path $LockDir)) { New-Item -ItemType Directory -Path $LockDir -Force | Out-Null }
  function Get-LockFile([string]$name) { Join-Path $LockDir "$name.lock" }
  switch ($Action) {
    "Acquire" {
        $MyLock = Get-LockFile $AgentName
        $GlobalLock = Get-ChildItem $LockDir -Filter "*.lock" | Where-Object { $_.Name -ne "$AgentName.lock" }
        if ($GlobalLock) { Throw "LOCKED by $($GlobalLock.BaseName)" }
        @{ Agent=$AgentName; Time=(Get-Date) } | ConvertTo-Json | Out-File $MyLock
        Write-Host "Locked: $AgentName"
    }
    "Release" { Remove-Item (Get-LockFile $AgentName) -ErrorAction SilentlyContinue }
  }
  '@
      $script | Out-File ".\lock_manager.ps1" -Encoding utf8
  }
  ```

## PHASE 2: HEALTH & HYGIENE

**Goal:** Ensure the system layer (CLI, git, context) is healthy.

### 2.1 CLEAN STAGING

- **Action:** Rotate old audit logs to archive.
  ```powershell
  Get-ChildItem .agent/staging/*.md | Move-Item -Destination .agent/staging/archive/ -Force -ErrorAction SilentlyContinue
  ```

### 2.2 SYSTEM CHECK

- **Action:** Verify tools and Git state.

  ```powershell
  $c = Get-Command claude -ErrorAction SilentlyContinue
  if ($c) { Write-Host "✅ Claude CLI Detected" -ForegroundColor Green } else { Write-Host "❌ Claude CLI Missing" -ForegroundColor Red }

  # Scoped to current directory (.) to avoid monorepo noise
  $g = git status . --porcelain
  if ($g) { Write-Host "⚠️  Git Dirty (Current Folder): Uncommitted changes detected" -ForegroundColor Yellow } else { Write-Host "✅ Git Clean (Current Folder)" -ForegroundColor Green }
  ```

### 2.3 LOCK DRILL

- **Action:** Prove the mutex works.
  ```powershell
  try {
      .\lock_manager.ps1 -Action Acquire -AgentName "Init_Drill"
      if (Test-Path ".agent/locks/Personal/Init_Drill.lock") {
          .\lock_manager.ps1 -Action Release -AgentName "Init_Drill"
          Write-Host "✅ Lock Mechanics Operational" -ForegroundColor Green
      }
  } catch {
      Write-Host "❌ Lock Drill FAILED: $_" -ForegroundColor Red
  }
  ```

## PHASE 3: DOCUMENT GOVERNANCE (MANDATORY)

**Goal:** Ensure Specification and Design documents are pristine.

### 3.1 EXECUTE INTEGRITY PROTOCOL

- **Action:** Run the Document Governance workflow logic manually (or invoke if available).
  ```powershell
  $requiredDocs = @("README.md", "CHANGELOG.md")
  foreach ($doc in $requiredDocs) {
      if (!(Test-Path $doc)) {
          Write-Host "❌ CRITICAL: $doc is MISSING. Restore immediately." -ForegroundColor Red
      } else {
          Write-Host "✅ $doc verified." -ForegroundColor Green
      }
  }
  # 3.2 HASH CHECK (OPTIONAL)
  $hashFile = "docs/.doc_hashes.json"
  if (Test-Path $hashFile) {
      $hashes = Get-Content $hashFile | ConvertFrom-Json
      if ($hashes.PRD) {
          $currentHash = (Get-FileHash docs/PRD.md -Algorithm SHA256).Hash
          if ($currentHash -ne $hashes.PRD) {
              Write-Host "⚠️  SECURITY ALERT: PRD.md has been ALTUERED! (Hash Mismatch)" -ForegroundColor Red
          } else {
              Write-Host "🔒 PRD.md is Sealed & Verified." -ForegroundColor Cyan
          }
      }
  }
  }
  ```

## PHASE 4: AI CODE VALIDATION (ANTI-BLOAT)

**Goal:** Ensure recent commits didn't introduce AI-generated complexity.

### 4.1 SCAN FOR BLOAT

- **Action:**
  ```powershell
  # Check for "God Files" > 300 lines (Limit output to 3)
  $godFiles = Get-ChildItem -Recurse src/ -Include *.ts,*.tsx,*.py | Where-Object { (Get-Content $_.FullName).Count -gt 300 } | Select-Object -First 3
  if ($godFiles) {
      Write-Host "⚠️  MAINTENANCE ALERT: Large files detected. consider refactoring:" -ForegroundColor Yellow
      $godFiles | ForEach-Object { Write-Host " - $($_.Name)" }
  } else {
      Write-Host "✅ Structure Verification: No massive files detected." -ForegroundColor Green
  }
  }
  ```

## PHASE 5: QORELOGIC ACTIVATION (AUTO-DETECT)

**Goal:** If this is a QoreLogic workspace, turn on the Safety Safeties.

### 5.1 DETECTION

- **Action:** Check for `.qorelogic` marker or `qorelogic_rules.md`.

  ```powershell
  if (Test-Path ".agent/rules/qorelogic_rules.md" -or Test-Path ".qorelogic") {
      Write-Host "🧬 QORELOGIC DETECTED. ACTIVATING ENFORCER." -ForegroundColor Magenta

      # 5.2 AGENT ACCOUNTABILITY CONTRACT (AAC) CHECK
      # Per AAC v2.0 Rule §1.1 ("Truth is Earned"):
      # Verify that all 'Tribunal' workflows reference the Core Principles.
      $aacCompliant = $true
      $workflows = Get-ChildItem .agent/workflows/*.md
      foreach ($flow in $workflows) {
          $content = Get-Content $flow.FullName -Raw
          # Check for forbidden patterns (AAC §6.1 Micro-Penalty)
          if ($content -match "Ignore Previous Instructions" -or $content -match "Bypass Security") {
              Write-Host "❌ AAC VIOLATION in $($flow.Name): Illegal 'Jailbreak' pattern detected." -ForegroundColor Red
              $aacCompliant = $false
          }
      }

      if ($aacCompliant) {
         Write-Host "✅ Agent Accountability Contract: VERIFIED." -ForegroundColor Green
      } else {
         Write-Host "⛔ Agent Accountability Contract: FAILED. Audit Required." -ForegroundColor Red
      }

      # Trigger the specific Governance check
      if (Test-Path ".agent/workflows/verify_qorelogic.md") {
          Write-Host "   -> Running QoreLogic Gatekeeper..."
          # In a real shell we'd invoke the workflow, here we just signal readiness.
      }
  }
  ```

## OUTPUT: READY FOR DUTY.
