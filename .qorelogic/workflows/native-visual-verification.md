---
description: Mandatory Visual Verification Protocol using the Native Browser Subagent
---

# NATIVE VISUAL VERIFICATION PROTOCOL

**Trigger:** ANY change to Frontend Artifacts (HTML, CSS, JS, Streamlit, etc.).
**Agent:** Governor (via `browser_subagent`)

> ⚠️ **MANDATE:** The User often forgets to ask for visual verification. You must **ALWAYS** execute this workflow after touching UI code.

## STEP 1: DEFINE TARGET

Identify the local file path or localhost URL to test.

- Static Files: `file:///C:/Users/krkna/.../path/to/file.html`
- Live Servers: `http://localhost:port`

## STEP 2: SPAWN SUBAGENT

Invoke the `browser_subagent` with a strict visual audit task.

**Template Task:**

```text
Navigate to [TARGET].
1. Open DevTools and report any Console Errors.
2. Verify that [CHANGED_FEATURE] is visible and interactive.
3. Critically analyze the aesthetics:
   - Does it look "Premium"?
   - Are the fonts correct?
   - Is the layout broken?
4. Take a screenshot of the final state.
Return a summary of findings.
```

## STEP 3: ANALYZE & ITERATE

- If the subagent reports "Basic/Ugly" aesthetics -> **REFINE**.
- If the subagent reports Console Errors -> **FIX**.
- If the subagent reports Success -> **PROCEED**.

## STEP 4: REPORT

Include the subagent's findings (and mention the screenshot recording) in your final response to the user.
