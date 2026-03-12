# Plan: Voice Brainstorm and Mindmap Production Readiness Fixes

**Current Version**: v4.7.2
**Target Version**: v4.7.3
**Change Type**: patch
**Risk Grade**: L2

## Open Questions

- Are there any other related issues in the voice brainstorm and mindmap modules that we missed?
- Should we consider refactoring the event listener registration to a central place to avoid leaks?

## Phase 1: Fix Event Listener Leaks and Resource Leaks in Audio and STT Modules

### Affected Files

- `prep-bay.js` - Fix modal keydown handler leak, TTS failure handling, audio storage failure handling
- `stt-engine.js` - Fix AudioContext leak, STT callback references, init failure handling, wake word listener retry loop
- `web-llm-engine.js` - Fix Web LLM AI session destruction
- `brainstorm.js` - Fix graph mutation during render by adding mutex

### Changes

- In `prep-bay.js`:
  _ In `openModal()`, store the escHandler and remove it in `closeModal()`.
  _ In `tts.speak()`, handle the catch error and provide feedback. \* In audio vault POST failure, log error and notify user.
- In `stt-engine.js`:
  _ In `_stopWhisper()`, move `ctx.close()` to a finally block.
  _ In `destroy()`, nullify `onTranscript`, `onStateChange`, `onAutoStop`, etc.
  _ In `init()` catch block, provide distinguishable user feedback for different error types.
  _ In `_createRecorder()`, ensure `_releaseStream()` is called in the catch block and also add a timeout for the retry loop with max retries and user notification.
- In `web-llm-engine.js`: \* Add a `destroy()` method that calls `ai.languageModel.destroy()` if it exists.
- In `brainstorm.js`: \* Add a mutex (e.g., a boolean flag) around `canvas.setNodes` in the proxy to prevent concurrent `mergeNodes()` and render frame.

### Unit Tests

- `test/prep-bay.test.js` - Test that modal keydown handler is removed after close, TTS error handling, audio storage error handling.
- `test/stt-engine.test.js` - Test AudioContext cleanup, callback cleanup, init error handling, wake word retry limits.
- `test/web-llm-engine.test.js` - Test that AI session is destroyed on destroy.
- `test/brainstorm.test.js` - Test that graph mutation during render is prevented.

## Phase 2: Fix Data Flow Integrity and Browser Compatibility

### Affected Files

- `prep-bay.js` - Fix empty transcript submission
- `heuristic-extractor.js` - Fix catch-all Feature type
- `stt-engine.js` - Fix MediaRecorder codec and Web Speech API language

### Changes

- In `prep-bay.js`: \* In `submitTranscript()`, check for empty string and return early with user feedback.
- In `heuristic-extractor.js`: \* Change the TYPE_SIGNALS for Feature to be more specific, or add a fallback to 'Unknown' instead of 'Feature'.
- In `stt-engine.js`:
  _ Specify a codec for MediaRecorder (e.g., 'audio/webm') and provide a fallback for browsers that don't support it.
  _ Make the Web Speech API language configurable from user settings or navigator.language.

### Unit Tests

- `test/prep-bay.test.js` - Test empty transcript handling.
- `test/heuristic-extractor.test.js` - Test that unclassifiable text does not become a Feature node.
- `test/stt-engine.test.js` - Test MediaRecorder codec and language settings.

## Phase 3: Fix Performance and UX Issues

### Affected Files

- `brainstorm-canvas.js` - Fix canvas resize debounce
- `prep-bay.js` - Fix modal audio visualizer canvas wiring
- `brainstorm-graph.js` - Fix export filename timestamp
- `ideation-buffer.js` - Fix ideation buffer history limit warning
- `ConsoleServer.ts` - Fix long node labels truncation feedback

### Changes

- In `brainstorm-canvas.js`: \* Debounce the window.resize handler (e.g., using setTimeout with 100ms).
- In `prep-bay.js`: \* Connect the modal audio visualizer canvas to the audio analyser.
- In `brainstorm-graph.js`: \* Append a timestamp to the export filename (e.g., brainstorm-session-<timestamp>.json).
- In `ideation-buffer.js`: \* Add a user warning when the oldest thought is dropped due to MAX_HISTORY limit.
- In `ConsoleServer.ts`: \* When truncating node labels, send a warning to the client about the truncation.

### Unit Tests

- `test/brainstorm-canvas.test.js` - Test that resize handler is debounced.
- `test/prep-bay.test.js` - Test that audio visualizer canvas is wired.
- `test/brainstorm-graph.test.js` - Test that export filename includes timestamp.
- `test/ideation-buffer.test.js` - Test warning when history is dropped.
- `test/ConsoleServer.test.js` - Test that truncation warning is sent.

## Step 3.5: Register Backlog Items

We will update the BACKLOG.md to mark these items as planned (but not yet done) by adding a plan reference.

However, note that the backlog items are already in the backlog as unchecked. We are just linking the plan.

We'll add a comment in the backlog for each item? Or we can update the plan reference in the backlog item.

The backlog items currently look like: - [ ] [B113] Modal keydown handler leak in `prep-bay.js`: ... | v4.6.0

We can change them to: - [ ] [B113] Modal keydown handler leak in `prep-bay.js`: ... | v4.6.0 (plan-voice-brainstorm-mindmap-prod-readiness.md)

But note: the ql-plan skill says to add: - [ ] [B#] [Plan name]: [Phase summary] (plan-[slug].md)

We are not adding new backlog items, we are linking existing ones to the plan.

We'll do:

        Read: docs/BACKLOG.md
        Edit: docs/BACKLOG.md

And for each of the voice brainstorm and mindmap blockers, we will append the plan reference.

However, note that the backlog might be large and we don't want to do it manually in the plan?
We are supposed to do it in step 3.5.

We'll note in the plan that we will update the backlog.

But the plan file itself should not include the backlog update?
The ql-plan skill says to do it in step 3.5, which is after creating the plan file.

So we will not include the backlog update in the plan file. We will do it separately.

However, for the purpose of this tool use, we are only creating the plan file.

We'll leave the backlog update to be done after the plan is created.

## Next Steps

1. Review plan for completeness
2. Begin Phase 1 implementation
3. Run unit tests after each phase
4. Proceed to next phase only after tests pass

---

_Plan follows Simple Made Easy principles_
