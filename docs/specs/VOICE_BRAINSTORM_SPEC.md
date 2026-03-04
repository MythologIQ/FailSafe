# Voice Brainstorm Specification

Status Date: 2026-03-04  
Target Track: `v4.3.2`

## 1. Purpose

Document the shipped Brainstorm voice architecture and clearly separate it from future enhancements.

## 2. Current Reality (`v4.3.2`)

Shipped Brainstorm capabilities:

- microphone-driven voice capture in Console Brainstorm tab
- STT pipeline in browser via `SttEngine` (`whisper` primary, Web Speech fallback)
- transcript submission to backend extraction route
- backend graph extraction + event broadcast
- confidence-colored nodes and force-directed auto-layout
- TTS spoken response playback via `TtsEngine`
- manual node add/drag/export workflows

Prerequisite:

- vendor runtime assets must be staged under:
  - `FailSafe/extension/src/roadmap/ui/vendor/whisper/`
  - `FailSafe/extension/src/roadmap/ui/vendor/piper/`

## 3. Shipped Interaction Loop

### Phase A: Voice Capture

- User toggles mic button in Brainstorm toolbar.
- Browser captures audio and STT engine emits transcript text.

### Phase B: Transcript to Graph

- Frontend calls `POST /api/v1/brainstorm/transcript`.
- Backend `BrainstormService` extracts nodes/edges/verbal response.
- Console broadcasts `brainstorm.update`.

### Phase C: Visual + Spoken Feedback

- Canvas ingests nodes/edges and applies confidence color.
- Force layout settles new nodes.
- TTS speaks extractor `verbalResponse`.

## 4. API Surface (Shipped)

- `POST /api/v1/brainstorm/transcript` - process transcript and return extraction
- `POST /api/v1/brainstorm/node` - add manual node
- `GET /api/v1/brainstorm/graph` - fetch current graph
- `DELETE /api/v1/brainstorm/graph` - reset graph

## 5. Data Contract

```json
{
  "nodes": [
    {
      "id": "n1",
      "label": "Tenant Sharding",
      "type": "Architecture",
      "confidence": 55
    }
  ],
  "edges": [
    {
      "source": "n1",
      "target": "n2",
      "label": "depends on"
    }
  ],
  "verbalResponse": "I mapped the concept and flagged a governance conflict for review."
}
```

## 6. Forward Scope (Planned)

- optional raw-audio ingestion endpoint (`POST /api/v1/brainstorm/voice`) for server-side STT
- richer node editing/delete/edge authoring UX
- expanded quality telemetry for STT/TTS runtime health

## 7. Status Matrix

| Capability                  | Status      |
| --------------------------- | ----------- |
| Brainstorm tab shell        | implemented |
| Manual node canvas/export   | implemented |
| Voice capture UI            | implemented |
| STT transcript extraction   | implemented |
| TTS spoken response         | implemented |
| Confidence color semantics  | implemented |
| Raw-audio `/voice` endpoint | planned     |

## 8. Claim Map

| Claim                                                             | Status      | Source                                                                                                                                                                          |
| ----------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brainstorm module is wired in Command Center tab routing          | implemented | `FailSafe/extension/src/roadmap/ui/command-center.js`, `FailSafe/extension/src/roadmap/ui/command-center.html`                                                                  |
| Voice STT/TTS engines are integrated into Brainstorm renderer     | implemented | `FailSafe/extension/src/roadmap/ui/modules/brainstorm.js`, `FailSafe/extension/src/roadmap/ui/modules/stt-engine.js`, `FailSafe/extension/src/roadmap/ui/modules/tts-engine.js` |
| Transcript/graph endpoints are shipped in ConsoleServer           | implemented | `FailSafe/extension/src/roadmap/ConsoleServer.ts`                                                                                                                               |
| Force layout and confidence color rendering are shipped           | implemented | `FailSafe/extension/src/roadmap/ui/modules/brainstorm-canvas.js`, `FailSafe/extension/src/roadmap/ui/modules/force-layout.js`                                                   |
| Vendor runtime files are required for full voice runtime behavior | implemented | `FailSafe/extension/src/roadmap/ui/vendor/whisper/VENDOR.md`, `FailSafe/extension/src/roadmap/ui/vendor/piper/VENDOR.md`                                                        |

## 9. Next Generation: 3D Spatial Mindmap (v5.0.0 Architecture Addendum)

The 2D SVG `brainstorm-canvas.js` is slated for an upgrade to a fully interactive 3D WebGL experience. This will blend the aesthetic of structured hierarchical mapping with deep multi-dimensional knowledge graphs.

### 9.1 Core Capabilities

- **3D Manipulation Engine**: Users click, drag, and rotate the entire spatial graph mapping. Zooming is granular and supports massive multi-node memory clusters without performance degradation.
- **Underlying Technology Pipeline**: Replaces base SVG with `3d-force-graph` (via Three.js) directly managed inside `brainstorm-canvas.js`. `force-layout.js` handles spatial 3D physics (repulsion, springs).

### 9.2 HUD & GUI Overlays

The design will incorporate the following floating HTML/CSS interface wrappers over the 3D canvas:

1. **View Control Toolbar (Top Center)**: Toggles allowing the user to snap the force-directed graph into specific algorithmic layouts instantly: `[ FORCE ] [ TREE ] [ CIRCLE ] [ GRID ]` or switch between traditional `Graph` and 3D `Spatial`.
2. **Legend & Filter Panel (Bottom Left)**: A dark-glass control panel for live-filtering the graph depth:
   - **Statistics**: Tally of Memories, Documents, Connections.
   - **Relations Toggles**: Show/hide node edges based on type (e.g., `Updates`, `Extends`, `Inferences`, `Doc > Memory`, `Similarity`).
   - **Similarity Toggles**: Show/hide `Strong` vs `Weak` associative links.
3. **Context Menus (On Node Click)**: Holographic pop-over cards displaying metadata, sub-cluster counts, and actions (`Go to document`, `Next memory`, `Prev memory`).

### 9.3 Node & Edge Morphology

- **Cluster Spheres**: High-level nodes render as translucent spheres indicating they contain sub-trees (e.g., displaying "4 ideas").
- **Atomic Nodes**: Individual memories or concepts render as hard geometric points with glowing rings indicative of their viability (Green, Yellow, Orange, Red) from the STT extraction constraints.
- **Directional Particles**: Instead of static SVG lines for edges, relationships will feature subtle animated particles traveling along the links to show data/memory flow between components.

### 9.4 Audio Data Retention, Privacy & Playback

Voice-captured audio is a highly sensitive telemetry stream. The system must enforce strict privacy controls and storage mechanisms:

- **Private Storage Directory**: Raw `.webm` (or `.wav`) voice captures must be saved strictly to a `PRIVATE(FailSafe)` local folder inside the workspace. This directory is defined as `.failsafe/audio/` and is automatically injected into `.gitignore` during the `/ql-bootstrap` workflow. **No audio files will ever be committed to the repo.**
- **Cryptographic Filenames & Deduplication**: To prevent duplicates and expose a deterministic reference, audio files are saved using a hashed GUID (e.g., `SHA256(audioData + timestamp)`).
- **Embedded Metadata**: Alongside the raw audio, a parallel `.json` file or SQLite entry will store the metadata payload:
  ```json
  {
    "id": "hash123...",
    "timestamp": "2026-03-04T12:00:00Z",
    "topics": ["database", "sharding", "risk"],
    "durationMs": 4500,
    "transcript": "Let's redesign the core database..."
  }
  ```
- **Retention & Playback GUI**: The Brainstorm HUD (or `Settings` tab) will feature an **Audio Management Element**:
  - **Retention Controls**: A selector allowing users to set auto-purge policies (e.g. `Purge after 24 hours`, `Purge after 7 days`, `Keep forever`).
  - **Playback Scrubbing**: An embedded audio player bound to nodes. When a user selects a voice-generated node on the 3D map, the Context Menu will feature a "Play Original Audio" button, allowing them to hear their exact spoken dictation alongside the LLM's abstraction.
