---
name: idempotency-resilience-pack
description: Apply backend resilience patterns including idempotency keys, retries, circuit breakers, and failure-mode controls.
---

# Idempotency Resilience Pack

## Purpose
Harden service operations against transient failures and duplicate execution.

## Use This Skill When
- Designing reliable API/job processing behavior.
- Preventing duplicate side effects.

## Workflow
1. Identify side-effecting operations.
2. Apply idempotency key strategy and storage contract.
3. Configure retries with jitter/backoff and failure budgets.
4. Add circuit breaker thresholds and fallback behaviors.

## Scope Boundary

**In scope**
- Reliability control patterns for services and jobs.

**Out of scope**
- Infrastructure incident RCA (use `sre-causal-rca`).
