---
name: speech-to-text
description: Transcribe audio/video to text with timestamps. Use for meetings, subtitles, transcripts, and spoken-content indexing.
---

# ElevenLabs Speech to Text

## Purpose
Convert audio to structured text for analysis, indexing, and downstream automation.

## Use This Skill When
- Generating transcripts from recordings.
- Building subtitles/captions.
- Processing spoken content into searchable text.

## Workflow
1. Validate source audio quality and format.
2. Run STT with appropriate language/model options.
3. Capture timestamps and segment structure.
4. Post-process transcript for punctuation and speaker readability.

## Guardrails
- Preserve source timestamps for traceability.
- Flag low-confidence segments for review.
- Avoid destructive normalization before QA.
## Scope Boundary

**In scope**`r`n- Audio transcription (speech to text), segmentation, confidence handling.`r`n`r`n**Out of scope**`r`n- Text-to-speech generation.

