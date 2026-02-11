---
name: elevenlabs-voice-production-ops
description: End-to-end voice production operations for ElevenLabs pipelines, including agent evaluation, latency budgeting, and tool-call validation. Use for production voice readiness.
---

# ElevenLabs Voice Production Ops

## Purpose
Operationalize voice systems with measurable quality, latency, and reliability controls.

## Use This Skill When
- Establishing evaluation and QA for voice agents.
- Measuring STT -> LLM -> TTS latency budgets.
- Validating tool-call reliability in voice-driven flows.

## Workflow
1. Define quality rubric (prosody, intent fidelity, emotional alignment).
2. Build latency budget targets and measure each pipeline stage.
3. Run tool-call validation for voice-triggered actions.
4. Triage regressions and prioritize fixes by user impact.
5. Produce production readiness report with pass/fail criteria.

## Scope Boundary

**In scope**
- Voice ops readiness, evals, latency, and tool-call QA.

**Out of scope**
- API-key bootstrap only (use `elevenlabs-setup-api-key`).
- One-off TTS/STT generation without ops framework.
