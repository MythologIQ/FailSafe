---
name: sbom-risk-scanner
description: Software bill-of-materials risk scanning and dependency integrity checks, including suspicious/unknown package detection. Use for supply-chain and dependency trust audits.
---

# SBOM Risk Scanner

## Purpose
Audit dependency inventories for risk, provenance, and policy compliance.

## Use This Skill When
- Performing dependency trust and supply-chain reviews.
- Detecting suspicious or unverified packages.
- Enforcing SBOM and vulnerability gate checks.

## Workflow
1. Generate or ingest SBOM from target project.
2. Classify dependencies by source trust and criticality.
3. Flag vulnerable, suspicious, and policy-noncompliant artifacts.
4. Recommend remediation (pin, replace, isolate, remove).
5. Produce risk report suitable for release gating.

## Scope Boundary

**In scope**
- Dependency and SBOM risk analysis.

**Out of scope**
- Runtime incident RCA not tied to dependency risk.
