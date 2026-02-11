---
name: setup-api-key
description: Guides setup and validation of ElevenLabs API keys for voice tooling. Use when keys are missing, invalid, or not configured in the environment.
---

# ElevenLabs API Key Setup

## Purpose
Set up and verify ElevenLabs API key configuration for voice development workflows.

## Use This Skill When
- ElevenLabs calls fail due to auth errors.
- A new environment needs voice API setup.
- A teammate asks where/how to configure `ELEVENLABS_API_KEY`.

## Workflow
1. Confirm target runtime and shell context.
2. Configure `ELEVENLABS_API_KEY` using secure environment-variable practices.
3. Validate connectivity with a minimal authenticated API request.
4. Document key location and rotation expectations without exposing secrets.

## Guardrails
- Never print full API keys.
- Prefer environment variables over hardcoded secrets.
- Recommend key rotation if leakage is suspected.
## Scope Boundary

**In scope**`r`n- ElevenLabs credential configuration and auth verification.`r`n`r`n**Out of scope**`r`n- Building agent behavior or audio generation pipelines.

