---
name: owasp-top10-auditor
description: Audit code and architecture against OWASP Top 10 risks with prioritized remediation guidance for injection, auth, and data protection flaws.
---

# OWASP Top 10 Auditor

## Purpose
Systematically detect and prioritize vulnerabilities aligned to OWASP Top 10 classes.

## Use This Skill When
- Performing security reviews for releases.
- Hardening auth/input/data handling paths.

## Workflow
1. Map code paths to OWASP risk categories.
2. Identify exploit conditions and affected surfaces.
3. Rank findings by exploitability and impact.
4. Generate remediation tasks with verification checks.

## Scope Boundary

**In scope**
- OWASP-aligned vulnerability auditing and remediation planning.

**Out of scope**
- Dependency SBOM/package provenance risk scanning (use `sbom-risk-scanner`).
