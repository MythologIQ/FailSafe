---
name: zero-downtime-schema-migrator
description: Plan and generate zero-downtime schema migration workflows, including expand-contract, dual-write, backfill, and cutover validation.
---

# Zero Downtime Schema Migrator

## Purpose
Design safe schema migrations without service interruption.

## Use This Skill When
- Evolving SQL/NoSQL schemas in production systems.
- Migrating with backward compatibility constraints.

## Workflow
1. Define expand-contract phases.
2. Introduce dual-write/read compatibility layer.
3. Execute controlled backfill with verification.
4. Cut over reads/writes and retire legacy paths.

## Scope Boundary

**In scope**
- Migration strategy, sequencing, and validation planning.

**Out of scope**
- Generic feature coding unrelated to schema transition.
