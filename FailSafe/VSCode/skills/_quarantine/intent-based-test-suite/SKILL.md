---
name: intent-based-test-suite
description: Design intent/outcome-based test suites that validate behavior semantically rather than brittle implementation selectors.
---

# Intent Based Test Suite

## Purpose
Build resilient tests around intended outcomes and user/business semantics.

## Use This Skill When
- Existing tests are brittle against UI/refactor changes.
- You need stable behavior verification over implementation details.

## Workflow
1. Define outcome-level assertions for each user intent.
2. Replace fragile checks with semantic validations.
3. Add deterministic fixtures and failure diagnostics.
4. Gate CI on outcome regressions.

## Scope Boundary

**In scope**
- Test strategy and suite design around intent/outcomes.

**Out of scope**
- Tool-specific selector/mock mechanics as primary task (use Playwright/Cypress skill).
