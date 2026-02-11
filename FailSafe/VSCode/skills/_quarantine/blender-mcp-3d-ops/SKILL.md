---
name: blender-mcp-3d-ops
description: Bridge LLM workflows with Blender via Blender MCP for scene/object/material operations and Python API orchestration. Use for 3D generation, editing, and procedural tasks.
---

# Blender MCP 3D Ops

## Purpose
Connect language-agent workflows to Blender's Python API through MCP for production 3D tasks.

## Use This Skill When
- Building or editing scenes via natural language.
- Applying material, object, camera, or lighting changes.
- Automating repeatable 3D operations in Blender.

## Workflow
1. Install server dependency (`pip install blender-mcp`).
2. Install/enable Blender add-on and connect from the N-panel.
3. Configure MCP client entry for `blender_mcp.server`.
4. Validate connection with a safe read operation (list objects/scene metadata).
5. Execute bounded changes and confirm scene integrity.

## Scope Boundary

**In scope**
- Blender MCP setup and Blender-scene operation orchestration.

**Out of scope**
- General game engine runtime scripting outside Blender context.
- Non-MCP Blender pipelines.
