# Plan: v5.0 Voice Brainstorm Engine

## Open Questions

- Should node "Gravity" (mass) affect purely visual size, or should it formally increase the physics mass (reducing layout volatility for anchor nodes)? (Assuming both: Visual scale and physics mass.)
- Do we process audio writes to `.failsafe/audio/` asynchronously before or after the LLM prompt? (Assuming async parallel: buffer writes local file independently while LLM starts transcription analysis.)

## Phase 1: High-Performance 3D Infrastructure

Transition from the 2D SVG canvas to WebGL-based 3D graph plotting, establishing the foundational scene and physics layout without complecting UI logic.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/modules/brainstorm-canvas.js` - Replace SVG renderer with Three.js/3d-force-graph instantiation.
- `FailSafe/extension/src/roadmap/ui/modules/force-layout.js` - Deprecate D3 2D force simulation; expose configuration adapters for 3d-force-graph layout engine.
- `FailSafe/extension/src/roadmap/ui/command-center.html` - Add `3d-force-graph` vendor script mapping.

### Changes

- Add `3d-force-graph` vendor import. Set up `BrainstormCanvas` with a `.cc-canvas` container.
- Initialize `ForceGraph3D()({ controlType: 'orbit' })` binding directly to the DOM element.
- Expose functional setters `canvas.setNodes(nodes)` and `canvas.setEdges(edges)`.
- Configure base visual morphology: High-level nodes = `SphereGeometry`, Atomic nodes = points with custom `MeshBasicMaterial` reflecting confidence gradients (Green, Yellow, Orange, Red).
- Configure directional particles on edges: `linkDirectionalParticles(2)`, `linkDirectionalParticleSpeed(0.005)`.
- Separate the 3D physics rendering bounds from any interaction logic.

### Unit Tests

- `FailSafe/extension/src/test/roadmap/brainstorm-canvas.test.ts` - Ensure `setNodes` correctly formats Three.js geometry data objects from pure node state records without mutating inputs.

## Phase 2: Ideation Prep Bay & HUD Staging

Isolate the act of recording and ideating from the act of injecting nodes into the physics graph. Introduce a pure data staging layer.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/command-center.css` - Lay out absolute-positioned Staging Canvas HUD panels.
- `FailSafe/extension/src/roadmap/ui/modules/brainstorm.js` - Re-wire toolbar interactions to manage an intermediate `IdeationBuffer` state.

### Changes

- Re-render `renderShell()` to replace `.cc-bs-chat` and `.cc-bs-toolbar` with the `Ideation Prep Bay` overlay structure (`textarea` buffer, `[ RECORD ]` mic button, `[ SEND TO MIND MAP ]` commit button, `Recent Thoughts Ledger` dropdown).
- Create pure `IdeationBuffer` state class: manages current transcript string, array of recent thoughts (max 10 cache).
- Route `VoiceController.stt.onTranscript` to update the `textarea` block directly instead of immediately dispatching to the graph.
- Clicking `[ SEND TO MIND MAP ]` fires `POST /api/v1/brainstorm/transcript` with the buffer content, pushing the submitted text into the `Recent Thoughts Ledger` and clearing the buffer.

### Unit Tests

- `FailSafe/extension/src/test/roadmap/IdeationBuffer.test.ts` - Verify buffer appends transcript deltas correctly, pushes to history cache without exceeding max size, and clears on commit.

## Phase 3: Mental Haptic Feedback Mechanics

Introduce pure functional reducers that calculate visual node states (size, ambiguity, isolation) based on graph topology, keeping layout separated from data definition.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/modules/haptic-engine.js` - New module. Pure logic for calculating node metrics.
- `FailSafe/extension/src/roadmap/ui/modules/brainstorm-canvas.js` - Apply calculated metrics to Three.js `nodeVal` (size) and `linkVisibility`.

### Changes

- `haptic-engine.js`: Export function `calculateHaptics(nodes, edges) => HapticMap`.
- **Mass Caching**: Count instances of identical topic extraction over time. Map sum to a proportional size multiplier (`node.val`). Apply equivalent multiplier to the `3d-force-graph` node mass so heavier architectures anchor the specific gravity.
- **Ambiguity Strain**: Calculate in-degree/out-degree entropy. If a node has > N divergent types attached (e.g. many unresolved questions), assign a `strain` float.
- `brainstorm-canvas.js` renderer reads `strain` to modify `MeshPhysicalMaterial`: increase `transmission`/`roughness` (cloudy) or apply a continuous pulsing scale animation in the render loop.
- **Outer Rim Isolation**: Provide a custom force configuration. Use `d3.forceRadial` or adjust `d3-force-3d` positioning to repel nodes with 0 edges to a specific bounding sphere distance (`radius: 500`), while pulling identical sub-types closer organically.

### Unit Tests

- `FailSafe/extension/src/test/roadmap/haptic-engine.test.ts` - Pass mock graph data; assert functions calculate correct sizing scalar for heavily-repeated nodes, and correct strain float for high-degree ambiguous nodes.

## Phase 4: Deterministic Audio Storage & Context Playback

Handle sensitive Audio Blobs with explicit disk writes outside repository tracking. Associate deterministic keys.

### Affected Files

- `FailSafe/extension/src/roadmap/ConsoleServer.ts` - Expose `POST /api/v1/brainstorm/audio`.
- `FailSafe/extension/src/roadmap/services/AudioVaultService.ts` - New service managing blob storage in `.failsafe/audio/`.
- `FailSafe/extension/src/roadmap/ui/modules/brainstorm.js` - Wire contextual HUD to node clicks.

### Changes

- **Frontend**: When `MediaRecorder` generates a `.webm` slice in `VoiceController`, POST the Blob to `/api/v1/brainstorm/audio` as `ArrayBuffer`.
- **Backend (`AudioVaultService`)**:
  - Ensure `.failsafe/audio/` exists. (Bootstrap process already adds it to `.gitignore`).
  - Calculate `crypto.createHash('sha256').update(buffer + date).digest('hex')`.
  - Write standard file: `.failsafe/audio/<hash>.webm`.
  - Write metadata sidecar: `.failsafe/audio/<hash>.json` containing duration, timestamp, and transcript snippet.
- **API Response**: Returns the `audioHash`. The frontend injects this hash into the subsequent LLM `POST /transcript` call as metadata.
- **UI HUD**: In `brainstorm-canvas.js`, on `onNodeClick`, reveal floating `cc-bs-node-info` context menu. If the node has an `audioHash`, render an `<audio src="/api/v1/brainstorm/audio/:hash" controls>` tag.
- Implement retention config (JSON payload in `localStorage` or `ConfigManager`): "purge_24h", "purge_7d". On server startup, `AudioVaultService` sweeps folder based on sidecar timestamps.

### Unit Tests

- `FailSafe/extension/src/test/roadmap/AudioVaultService.test.ts` - Ensure SHA256 deterministic naming, correct metadata sidecar generation, and isolation of files exclusively within the `.failsafe/audio/` bounds.
