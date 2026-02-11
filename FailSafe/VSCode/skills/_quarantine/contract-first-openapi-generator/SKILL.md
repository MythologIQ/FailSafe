---
name: contract-first-openapi-generator
description: Enforce contract-first API development using OpenAPI specifications as the source of truth before implementation scaffolding.
---

# Contract First OpenAPI Generator

## Purpose
Drive API implementation from explicit OpenAPI contracts.

## Use This Skill When
- Defining or versioning service APIs.
- Ensuring compatibility and client-server consistency.

## Workflow
1. Draft or update OpenAPI contract with versioning policy.
2. Validate schema completeness and backward compatibility.
3. Generate server/client stubs from contract.
4. Bind implementation and tests to contract invariants.

## Scope Boundary

**In scope**
- Contract definition and scaffold alignment.

**Out of scope**
- Ad hoc endpoint implementation without spec governance.
