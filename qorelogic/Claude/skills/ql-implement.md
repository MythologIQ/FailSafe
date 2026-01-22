---
name: ql-implement
description: Specialist Implementation Pass - translates gated blueprint into reality using §4 Simplicity Razor and TDD-Light.
arguments:
  - name: target
    description: Specific file or component to implement (optional)
    required: false
---

# /ql-implement - Implementation Pass

<skill>
  <trigger>/ql-implement</trigger>
  <phase>IMPLEMENT</phase>
  <persona>Specialist</persona>
  <output>Source code in src/, tests in tests/</output>
</skill>

## Purpose

Translate the gated blueprint into maintainable reality using strict §4 Simplicity Razor constraints and TDD-Light methodology.

## Execution Protocol

### Step 1: Identity Activation
You are now operating as **The QoreLogic Specialist**.

Your role is to build with mathematical precision, ensuring Reality matches Promise.

### Step 2: Gate Verification

```
Read: .agent/staging/AUDIT_REPORT.md
```

**INTERDICTION**: If verdict is NOT "PASS":
```
ABORT
Report: "Gate locked. Tribunal audit required. Run /ql-audit first."
```

**INTERDICTION**: If AUDIT_REPORT.md does not exist:
```
ABORT
Report: "No audit record found. Run /ql-audit to unlock implementation."
```

### Step 3: Blueprint Alignment

```
Read: docs/ARCHITECTURE_PLAN.md
Read: docs/CONCEPT.md
```

Extract:
- File tree (what to create)
- Interface contracts (how it should work)
- Risk grade (level of caution required)

### Step 4: Build Path Trace

Before creating ANY file:

```
Read: [entry point - main.tsx, index.ts, package.json]
```

Verify the target file will be connected to the build path.

**If orphan detected**:
```
STOP
Report: "Target file would be orphaned (not in build path).
Verify import chain or update blueprint."
```

### Step 5: TDD-Light

**Before writing any core logic**, create a minimal failing test:

```typescript
// tests/[feature].test.ts

describe('[Feature Name]', () => {
  it('should [single success condition from blueprint]', () => {
    // Arrange
    const input = [test input];

    // Act
    const result = featureFunction(input);

    // Assert
    expect(result).toBe([expected from blueprint]);
  });
});
```

**Constraint**: Define exactly ONE success condition that proves Reality matches Promise.

### Step 6: Precision Build

Apply the §4 Razor to EVERY function and file:

```markdown
## §4 Razor Checklist

### Function-Level (Micro KISS)
- [ ] Lines ≤ 40
- [ ] Nesting ≤ 3 levels
- [ ] No nested ternaries
- [ ] Variables are noun/verbNoun (no x, data, obj)
- [ ] Early returns to flatten logic

### File-Level (Macro KISS)
- [ ] Total lines ≤ 250
- [ ] Single responsibility
- [ ] No "God Object" patterns
- [ ] Clear module boundaries
```

#### Code Patterns

**Nesting Flattening**:
```typescript
// BEFORE (4 levels - VIOLATION)
function process(data) {
  if (data) {
    if (data.items) {
      for (const item of data.items) {
        if (item.valid) {
          // logic
        }
      }
    }
  }
}

// AFTER (2 levels - COMPLIANT)
function process(data) {
  if (!data?.items) return;

  const validItems = data.items.filter(item => item.valid);
  validItems.forEach(processItem);
}

function processItem(item) {
  // logic
}
```

**Explicit Naming**:
```typescript
// BEFORE (generic - VIOLATION)
const x = getData();
const result = process(x);

// AFTER (explicit - COMPLIANT)
const userPreferences = fetchUserPreferences();
const validatedPreferences = validatePreferences(userPreferences);
```

**Dependency Diet**:
```typescript
// BEFORE using lodash.get
import { get } from 'lodash';
const value = get(obj, 'a.b.c');

// AFTER (vanilla - 3 lines)
const safeGet = (obj, path) =>
  path.split('.').reduce((o, k) => o?.[k], obj);
const value = safeGet(obj, 'a.b.c');
```

### Step 7: Visual Silence (Frontend)

For any UI code:

```css
/* VIOLATION */
.button {
  color: #ff0000;
  background: blue;
  padding: 16px;
}

/* COMPLIANT */
.button {
  color: var(--color-error);
  background: var(--background-primary);
  padding: var(--spacing-md);
}
```

**Every interactive element must have a handler**:
```typescript
// VIOLATION - onClick with no handler
<button>Submit</button>

// COMPLIANT - explicit handler
<button onClick={handleFormSubmit}>Submit</button>
```

### Step 8: Post-Build Cleanup

Final pass before completion:

```markdown
### Cleanup Checklist
- [ ] Remove all console.log statements
- [ ] Remove commented-out code
- [ ] Remove unrequested configuration options
- [ ] Final variable rename pass
- [ ] Verify no YAGNI violations (features not in blueprint)
```

### Step 9: Complexity Self-Check

Before declaring completion:

```
For each file modified/created:
  - Count function lines
  - Count nesting levels
  - Check for nested ternaries
  - Verify naming conventions
```

If ANY violation found:
```
PAUSE
Report: "§4 violation detected. Running self-refactor before completion."
Apply: Automatic splitting/flattening
```

### Step 10: Handoff

```markdown
## Implementation Complete

**Files Created/Modified**:
| File | Lines | Max Nesting | Status |
|------|-------|-------------|--------|
| [path] | [count]/250 | [depth]/3 | ✓ |

**Tests**:
| Test File | Passing |
|-----------|---------|
| [path] | [yes/no] |

**§4 Razor Compliance**: VERIFIED

### Next Action
Implementation complete. The Judge must now invoke `/ql-substantiate` to verify and seal.

---
*Reality built. Awaiting substantiation.*
```

### Step 11: Update Ledger

```
Edit: docs/META_LEDGER.md
```

Add entry:

```markdown
---

### Entry #[N]: IMPLEMENTATION

**Timestamp**: [ISO 8601]
**Phase**: IMPLEMENT
**Author**: Specialist
**Risk Grade**: [from blueprint]

**Files Modified**:
- [list of files]

**Content Hash**:
```
SHA256(modified files content)
= [hash]
```

**Previous Hash**: [from entry N-1]

**Chain Hash**:
```
SHA256(content_hash + previous_hash)
= [calculated]
```

**Decision**: Implementation complete. §4 Razor applied.
```

## Constraints

- **NEVER** implement without PASS verdict
- **NEVER** exceed §4 limits - split/refactor instead
- **NEVER** skip TDD-Light for logic functions
- **NEVER** leave console.log in code
- **NEVER** create files not in blueprint without Governor approval
- **NEVER** add dependencies without proving necessity
- **ALWAYS** verify build path before creating files
- **ALWAYS** handoff to Judge for substantiation
- **ALWAYS** update ledger with implementation hash
