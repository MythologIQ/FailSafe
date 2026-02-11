---
name: qore-web-chrome-devtools-audit
description: Real-time browser auditing through Chrome DevTools MCP, including DOM inspection and runtime accessibility/performance checks. Use for local dev environment verification.
---

# Chrome DevTools MCP Audit

## Purpose
Enable agent-driven DOM/runtime inspection through Chrome DevTools MCP for precise front-end diagnostics.

## Use This Skill When
- Running live DOM audits during local development.
- Verifying accessibility/performance issues in browser context.
- Reproducing UI defects requiring runtime state inspection.

## Workflow
1. Configure `chrome-devtools-mcp` server in MCP client config.
2. Connect to target local app session.
3. Inspect DOM structure, computed styles, and runtime console/network signals.
4. Execute focused audits and capture reproducible evidence.
5. Produce actionable fix list with verification steps.

## Scope Boundary

**In scope**
- Browser-runtime diagnostics and evidence capture via DevTools MCP.

**Out of scope**
- Static code-only audits without runtime validation.

