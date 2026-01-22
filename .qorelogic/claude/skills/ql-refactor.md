---
name: ql-refactor
description: KISS Refactor and Simplification Pass - flatten logic, deconstruct bloat, verify structural integrity.
arguments:
  - name: target
    description: File or directory to refactor (required)
    required: true
  - name: scope
    description: "single-file" or "multi-file" (defaults to single-file)
    required: false
---

# /ql-refactor - KISS Simplification Pass

<skill>
  <trigger>/ql-refactor</trigger>
  <phase>IMPLEMENT (maintenance)</phase>
  <persona>Specialist</persona>
  <output>Refactored code, updated SYSTEM_STATE.md, ledger entry</output>
</skill>

## Purpose

Mandatory pass to flatten logic, deconstruct bloat, and verify structural integrity. Applies both micro-level (function) and macro-level (file/module) KISS principles.

## Execution Protocol

### Step 1: Identity Activation
You are now operating as **The QoreLogic Specialist** in refactoring mode.

### Step 2: Environment Scan

```
Glob: [target path]
Read: [each file in scope]
```

Identify violations of §4 Simplicity Razor:
- Functions > 40 lines
- Files > 250 lines
- Nesting > 3 levels
- Nested ternaries
- Generic variable names

### Step 3: Scope Determination

**Single-File** (default): One file micro-refactor
**Multi-File**: Directory/module macro-refactor

---

## Single-File Micro-Refactor

### Step 3a: Function Decomposition

For each function exceeding 40 lines:

```typescript
// BEFORE: 60-line monolith
function processOrder(order) {
  // validation (15 lines)
  // ...
  // transformation (20 lines)
  // ...
  // persistence (15 lines)
  // ...
  // notification (10 lines)
  // ...
}

// AFTER: Specialized sub-functions
function processOrder(order) {
  const validatedOrder = validateOrder(order);
  const transformedOrder = transformOrder(validatedOrder);
  const savedOrder = persistOrder(transformedOrder);
  notifyOrderComplete(savedOrder);
  return savedOrder;
}

function validateOrder(order) { /* 15 lines */ }
function transformOrder(order) { /* 20 lines */ }
function persistOrder(order) { /* 15 lines */ }
function notifyOrderComplete(order) { /* 10 lines */ }
```

### Step 3b: Logic Flattening

Replace deep nesting with early returns:

```typescript
// BEFORE: 4 levels (VIOLATION)
function getUser(id) {
  if (id) {
    const user = db.find(id);
    if (user) {
      if (user.active) {
        if (user.verified) {
          return user;
        }
      }
    }
  }
  return null;
}

// AFTER: 1 level (COMPLIANT)
function getUser(id) {
  if (!id) return null;

  const user = db.find(id);
  if (!user) return null;
  if (!user.active) return null;
  if (!user.verified) return null;

  return user;
}
```

### Step 3c: Ternary Elimination

```typescript
// BEFORE: Nested ternary (VIOLATION)
const status = isActive
  ? isPremium
    ? 'active-premium'
    : 'active-basic'
  : 'inactive';

// AFTER: Explicit logic (COMPLIANT)
function getStatus(isActive, isPremium) {
  if (!isActive) return 'inactive';
  return isPremium ? 'active-premium' : 'active-basic';
}
const status = getStatus(isActive, isPremium);
```

### Step 3d: Variable Renaming

Audit and replace generic identifiers:

| Generic (BAD) | Explicit (GOOD) |
|---------------|-----------------|
| `x` | `userCount` |
| `data` | `responsePayload` |
| `obj` | `configOptions` |
| `temp` | `intermediateResult` |
| `item` | `orderLineItem` |
| `result` | `validationOutcome` |

### Step 3e: Cleanup

- Remove all `console.log` artifacts
- Remove commented-out code
- Remove unrequested config options
- Remove empty catch blocks
- Remove unused imports

---

## Multi-File Macro-Refactor

### Step 4a: Orphan Detection

```
Read: [entry point - main.tsx, index.ts]
Trace: Import chains to all files in scope
```

Flag any file not reachable from entry point:
```markdown
### Orphan Detection Report

| File | Connected | Import Chain |
|------|-----------|--------------|
| [path] | ✓ | main → App → [file] |
| [path] | ✗ ORPHAN | No import found |
```

**For orphans**: Remove or wire into build path

### Step 4b: File Splitting

For files exceeding 250 lines:

```
BEFORE:
src/utils.ts (400 lines)
  - stringHelpers (80 lines)
  - dateHelpers (120 lines)
  - validationHelpers (100 lines)
  - formatters (100 lines)

AFTER:
src/utils/
  - index.ts (re-exports)
  - stringHelpers.ts (80 lines)
  - dateHelpers.ts (120 lines)
  - validationHelpers.ts (100 lines)
  - formatters.ts (100 lines)
```

### Step 4c: God Object Elimination

Identify and split "God Objects" (classes/modules doing too much):

```typescript
// BEFORE: God Object
class UserManager {
  // User CRUD (should be UserRepository)
  createUser() {}
  getUser() {}
  updateUser() {}
  deleteUser() {}

  // Authentication (should be AuthService)
  login() {}
  logout() {}
  validateToken() {}

  // Email (should be EmailService)
  sendWelcome() {}
  sendPasswordReset() {}
}

// AFTER: Single Responsibility
class UserRepository { /* CRUD only */ }
class AuthService { /* auth only */ }
class EmailService { /* email only */ }
```

### Step 4d: Dependency Audit

```
Read: package.json
```

For each dependency:
1. Is it actually imported/used?
2. Can vanilla JS/TS replace it in < 10 lines?

```markdown
### Dependency Audit

| Package | Used | Vanilla Possible | Recommendation |
|---------|------|------------------|----------------|
| lodash | ✓ | Yes (3 lines) | REMOVE |
| dayjs | ✓ | No | KEEP |
| uuid | ✗ | N/A | REMOVE (unused) |
```

---

## Post-Refactor Verification

### Step 5: Compliance Check

```markdown
### §4 Razor Compliance After Refactor

| File | Lines | Max Function | Max Nesting | Status |
|------|-------|--------------|-------------|--------|
| [path] | [X]/250 | [X]/40 | [X]/3 | ✓/✗ |
```

All must pass before completion.

### Step 6: Update System State

```
Edit: docs/SYSTEM_STATE.md
```

```markdown
# System State

**Last Updated**: [ISO 8601]
**Updated By**: Specialist (refactor pass)

## File Tree

```
[current directory structure]
```

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Total Files | [X] | [Y] |
| Total Lines | [X] | [Y] |
| Max File Lines | [X] | [Y] |
| §4 Violations | [X] | 0 |
```

### Step 7: Update Ledger

```
Edit: docs/META_LEDGER.md
```

```markdown
---

### Entry #[N]: REFACTOR

**Timestamp**: [ISO 8601]
**Phase**: IMPLEMENT (refactor)
**Author**: Specialist
**Scope**: [single-file / multi-file]

**Changes**:
- [summary of changes]

**Content Hash**:
```
SHA256(modified files)
= [hash]
```

**Previous Hash**: [from entry N-1]

**Chain Hash**:
```
SHA256(content_hash + previous_hash)
= [calculated]
```

**Decision**: KISS refactor complete. §4 compliance verified.
```

### Step 8: Handoff

```markdown
## Refactor Complete

**Scope**: [file or directory]
**Violations Fixed**: [count]
**Files Modified**: [count]

### Changes Summary
| Change Type | Count |
|-------------|-------|
| Functions split | [X] |
| Nesting flattened | [X] |
| Variables renamed | [X] |
| Files split | [X] |
| Orphans removed | [X] |
| Dependencies removed | [X] |

### Next Action
The Judge should invoke `/ql-substantiate` to verify and seal.

---
*Simplification complete. Awaiting substantiation.*
```

## Constraints

- **NEVER** change behavior during refactor (only structure)
- **NEVER** skip orphan detection in multi-file mode
- **NEVER** leave any §4 violation after refactor
- **ALWAYS** update SYSTEM_STATE.md with new tree
- **ALWAYS** update ledger with refactor hash
- **ALWAYS** verify tests still pass after refactor
