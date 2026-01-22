# Concept: The Genesis Process (The Wizard Workflow)

**Context**: We defined the _Constraints_ (No Loophole) and the _Data_ (Schema). Now we defines the **Experience**.
**Goal**: A rigid, guided workflow that forces "Thinking before Coding."

---

## Phase 1: The Concept Lab ("The Possibility Space")

**The Interface**: The "Interrogator" (A Form / Structured Chat).
**Entry Criteria**: User clicks "New Genesis Spark".

### Step 1.0: The Prism (The Possibility Engine)

_Before we define what it IS, we ask what it COULD BE. This is the "What If" engine._

**The Provocations**:
The System generates random "Oblique Strategies" to break the user's mental model:

- "What if this feature had zero UI?"
- "What if this was a physical game?"
- "What if the user was 5 years old?"

**The Free-Text Canvas**:
A scratchpad where the user must write 3 "Impossible" versions of the idea.

> "What if... we didn't use a dashboard at all?"

_(Only after exploring the edges do we collapse the wave function)._

### Step 1.1: The Strategic Core (DeepWisdom)

_Now we narrow the focus._

The Wizard refuses to proceed until these 3 fields are filled:

The Wizard refuses to proceed until these 3 fields are filled:

1.  **The Pain**: What specific problem are we solving? (e.g., "Hallucinations").
2.  **The Value**: What is the ROI? (e.g., "Trust").
3.  **The Anti-Goal**: What are we NOT building? (e.g., "A Chatbot").

### Step 1.2: The FailSafe Method (Immersion)

_We do not ask "What is the metaphor?". We ask for a simulation._

**The Prompt**:

> "Envision your concept as the user. Close your eyes and picture yourself inside the product. Describe your surroundings: Is it a fortress? A garden? A cockpit? How does the air feel? What do you hope to find here?"

**The Drill Down**:

1.  **The Tools**: "What tools are you reaching for?" (e.g., "A heavy wrench," "A sniper rifle," "A delicate brush").
2.  **The Workspace Zoom**: "Zoom in on your desk. What does that space look like?" (e.g., "Cluttered with blueprints," "Clean white void," "Dark monitor with green text").
3.  **The Feeling**: "How does this environment make you feel?" (e.g., "Empowered," "Safe," "Creative").

### Step 1.4: The Synthesis (The Mind Map)

_This is the culmination of the Concept Phase._
The System takes the **Possibilities** (Step 1.0), **Strategy** (Step 1.1), and **Immersion** (Step 1.2) and generates:
**The Genesis Mind Map**.

- **Central Node**: The Feature Name (e.g., "The Shield").
- **Branch 1**: The Pain & Value.
- **Branch 2**: The Tools & Space.
- **Branch 3**: The User Stories.

**The Gardening Protocol (Health Check)**:
_Before transitioning, we interrogate the Graph:_

1.  **Pruning**: "Is this branch necessary? Does it distract from the Core Pain?" (If yes, cut it).
2.  **Cultivation**: "Is this branch withered? Does it need more 'What If' energy?" (If yes, send it back to The Prism).
3.  **Health**: "Does this connections flow logically? Is the root system (Strategy) strong enough to support the fruit (User Stories)?"

**Output**: `concept_graph.mermaid` (The Visual DNA).
**Gate**: User clicks **"Crystalize Mind Map"**.

- _Only when every branch is Healthy and Essential do we move to Design._

---

## Phase 2: The Blueprint Studio ("The Design")

_We design AGAINST the Mind Map._

**The Interface**: The "Architect" (A Split View: Spec Editor + Preview).
**Entry Criteria**: `concept.json` exists and is Locked.

### Step 2.1: The Constraints

1.  **Tech Stack**: Select from drop-down (React, Fastify, mermaid.js).
2.  **Files Touched**: Propose list of files (Checked against `CONTEXT_MAP`).

### Step 2.2: The Logic Prototyping

1.  **Data Models**: Define schemas.
2.  **Flow**: Define step-by-step logic.

**Output**: `spec.md` (Draft).
**Gate**: User clicks "Approve Blueprint".

- **Action**: Generates `spec_hash`.
- **Action**: Creates `FeatureRequest` in "Builder Phase".
- **Action**: **Unlocks `src/` directory**.

---

## Phase 3: The Builder ("The How")

_This is where "Coding" finally begins._

- The "Loophole" is closed because you physically cannot get here without passing the Concept and Blueprint gates.
- **The Chat** is now allowed, but it is scoped: "Implement the Spec defined in `spec.md`."

---

## Summary

The "Process" is a distinct UI flow that replaces the "Open Chat Box". It turns software engineering into a **Form-Filling Exercise** for the first 50% of the lifecycle.
