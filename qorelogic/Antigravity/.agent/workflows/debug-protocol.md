---
description: Emergency protocol for debugging failures, errors, or hallucinations.
---

# Debug Protocol

## 1. Stop and Assess

- **Trigger:**
  - Build Failure.
  - Test Failure.
  - "I fixed it but it didn't change" (the Ghost UI effect).
  - Loop detected (trying same fix > 2 times).

## 2. Root Cause Analysis (RCA)

- **Action:**
  - **Do NOT** write code yet.
  - **Read** the error message carefully.
  - **Read** the code around the error.
  - **Hypothesize:** Write down 2 possible causes in memory.
  - **Verify:** Add logging or use a debugger/inspector to confirm the cause.

## 3. The "Rubber Duck"

- **Action:**
  - Explain the bug to the User in plain English.
  - "I am seeing [Error]. I think it's because [Reason]. I verified this by [Method]."

## 4. Fix Implementation

- **Action:**
  - Apply the fix using `safe_file_rewrite`.
  - **Constraint:** Change as little as possible.

## 5. Verification

- **Action:**
  - Run the specific test case that failed.
  - **Verify** visually if UI.
