# Concept: Enforcement Mechanics (The "Physics" of FailSafe)

**Problem**: The "Chat Loophole" allows the Agent/User to bypass the design process and write code immediately ("Vibe Coding").
**Solution**: **Phase-Based File Locking**.
**Mechanism**: FailSafe acts as a "File System Governor" that physically locks specific directories based on the current _Feature Phase_.

---

## 1. The Phase States

We define three distinct phases for any active feature. The System can only be in one phase per feature.

### Phase 1: The Architect (Concept/Spec)

- **Goal**: Define _what_ to build.
- **Writable**:
  - `Design Documents/*.md` (Blueprints)
  - `.gemini/specs/*.md` (Specifications)
- **READ-ONLY (LOCKED)**:
  - `src/**/*` (Source Code)
  - `package.json` (Configuration)
- **Enforcement**: If the Agent tries to write to `src/` via `write_to_file`, the FailSafe Watcher (or VS Code API) rejects the write. "Access Denied: You are in Architect Mode."

### Phase 2: The Builder (Code)

- **Goal**: Implement the Spec.
- **Trigger**: User explicitly clicks "Approve Spec & Unlock" in the Dashboard.
- **Writable**:
  - `src/**/*`
- **READ-ONLY (LOCKED)**:
  - `.gemini/specs/*.md` (The Spec is immutable during build to prevent "Goalpost Moving").
- **Enforcement**: Changes to Specs are rejected. "Access Denied: Finish the build first."

### Phase 3: The Auditor (Verification)

- **Goal**: Prove it works.
- **Trigger**: Agent reports "Build Complete".
- **Writable**:
  - `tests/**/*`
  - `walkthrough.md`
- **READ-ONLY (LOCKED)**:
  - `src/**/*` (Code Freeze)
- **Enforcement**: Code cannot change during verification. If bugs are found, we must explicitly "Rollback" to Builder Phase.

---

## 2. Technical Implementation Options

### Option A: VS Code `FileSystemProvider` (Hard Lock)

# Concept: Enforcement Mechanics (The "Physics" of FailSafe)

**Problem**: The "Chat Loophole" allows the Agent/User to bypass the design process and write code immediately ("Vibe Coding").
**Solution**: **Phase-Based File Locking**.
**Mechanism**: FailSafe acts as a "File System Governor" that physically locks specific directories based on the current _Feature Phase_.

---

## 1. The Phase States

We define three distinct phases for any active feature. The System can only be in one phase per feature.

### Phase 1: The Architect (Concept/Spec)

- **Goal**: Define _what_ to build.
- **Writable**:
  - `Design Documents/*.md` (Blueprints)
  - `.gemini/specs/*.md` (Specifications)
- **READ-ONLY (LOCKED)**:
  - `src/**/*` (Source Code)
  - `package.json` (Configuration)
- **Enforcement**: If the Agent tries to write to `src/` via `write_to_file`, the FailSafe Watcher (or VS Code API) rejects the write. "Access Denied: You are in Architect Mode."

### Phase 2: The Builder (Code)

- **Goal**: Implement the Spec.
- **Trigger**: User explicitly clicks "Approve Spec & Unlock" in the Dashboard.
- **Writable**:
  - `src/**/*`
- **READ-ONLY (LOCKED)**:
  - `.gemini/specs/*.md` (The Spec is immutable during build to prevent "Goalpost Moving").
- **Enforcement**: Changes to Specs are rejected. "Access Denied: Finish the build first."

### Phase 3: The Auditor (Verification)

- **Goal**: Prove it works.
- **Trigger**: Agent reports "Build Complete".
- **Writable**:
  - `tests/**/*`
  - `walkthrough.md`
- **READ-ONLY (LOCKED)**:
  - `src/**/*` (Code Freeze)
- **Enforcement**: Code cannot change during verification. If bugs are found, we must explicitly "Rollback" to Builder Phase.

---

## 2. Technical Implementation Options

### Option A: VS Code `FileSystemProvider` (Hard Lock)

We register a custom `FileSystemProvider` for the workspace.

- **Pros**: Absolute control. The editor shows a "Read Only" padlock.
- **Cons**: High complexity to implement a proxy FS.

### Option B: The "Quarantine" (Held State) - **SELECTED**

We use a git-based "Staging Area" logic.

- **Logic**:
  1. Watcher detects unauthorized edit in `src/`.
  2. UI Border flashes **YELLOW** (Deviation Detected).
  3. The File is logically "Frozen" (Pending Resolution).
  4. **The Choice**: User must click a button in the Dashboard:
     - **[Resolve]**: "I was just testing. Revert it."
     - **[Adapt]**: "The Plan is wrong. Update Plan to match Code." (Trigger: Viability Assessment).
- **Pros**:
  - Non-destructive (Work is safe, just unverified).
  - Respects User Autonomy (Manual Override).
  - Enforces "Consequences" (Must do the paperwork to keep the code).
- **Cons**: slightly more complex UI state.

### Option C: The "Linter" Block (Soft Lock)

We use a `DiagnosticCollection`.

- **Logic**: validation error on every line of code in restricted files.
- **Pros**: Non-destructive.
- **Cons**: Can be ignored by a determined User/Agent.

---

## 3. The "Key" (Transitions & Resolution)

How do we resolve a "Held State"?
**The Viability Assessment**:
If the user chooses to **[Adapt]**, the System runs a check:

1.  **Drift Check**: How far does this code deviate from the Spec?
2.  **Impact Analysis**: Does this break the Blueprint?
3.  **Result**:
    - _Low Impact_: "Plan Updated automatically."
    - _High Impact_: "Viability Assessment Failed. Please update Concept first."

---

## Recommendation

**Implement Option B (The Quarantine)**. It aligns with the "Safety Net" philosophy—we catch you when you fall, we don't push you back up the cliff.
