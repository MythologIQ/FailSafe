# Plan: v2.0.1 Tooltip Remediation + Modularization

## Open Questions

- Confirm documentation targets for the 2.0.1 bump: root `README.md`, `FailSafe/extension/README.md`, root `CHANGELOG.md`, `FailSafe/extension/CHANGELOG.md`, `docs/FAILSAFE_SPECIFICATION.md`, and any `PROD-Extension` manifests.
- Is it acceptable to introduce a shared tooltip module used by all webviews (data attributes + CSS/JS), or must tooltips stay native via `title` in any non-webview surfaces?
- Confirm the glossary list for “proprietary calculations / advanced terminology” beyond: Novelty L/M/H, Cache Hits/Misses/Sizes, Trust Stages, Risk Grade, L3 Queue, SOA Ledger, Influence Weight.

## Phase 1: Modularize Oversized Webviews (Razor Compliance)

### Affected Files

- `FailSafe/extension/src/genesis/views/CortexStreamProvider.ts` - trim to coordinator-only logic (=250 lines).
- `FailSafe/extension/src/genesis/views/DojoViewProvider.ts` - trim to coordinator-only logic (=250 lines).
- `FailSafe/extension/src/genesis/panels/DashboardPanel.ts` - trim to coordinator-only logic (=250 lines).
- `FailSafe/extension/src/genesis/views/LivingGraphProvider.ts` - trim to coordinator-only logic (=250 lines).
- `FailSafe/extension/src/genesis/views/templates/CortexStreamTemplate.ts` - new HTML/CSS builder.
- `FailSafe/extension/src/genesis/views/templates/DojoTemplate.ts` - new HTML/CSS builder.
- `FailSafe/extension/src/genesis/views/templates/LivingGraphTemplate.ts` - new HTML/CSS builder.
- `FailSafe/extension/src/genesis/panels/templates/DashboardTemplate.ts` - new HTML/CSS builder.

### Changes

- Extract `getHtmlContent()` and inline CSS/JS blocks into template modules per view.
- Keep providers/panels focused on data prep + message routing only.
- Enforce Section 4 Razor limits by splitting template logic and helper formatting into dedicated modules.

### Unit Tests

- None (structure refactor only).

## Phase 2: Tooltip System + Cortex Stream Cleanup

### Affected Files

- `FailSafe/extension/src/shared/components/InfoHint.ts` - migrate to data-tooltip output + glossary expansion.
- `FailSafe/extension/src/shared/styles/common.ts` - shared tooltip CSS tokens.
- `FailSafe/extension/src/shared/components/Tooltip.ts` - new helper for tooltip markup + style injection.
- `FailSafe/extension/src/genesis/views/templates/CortexStreamTemplate.ts` - remove redundant “Search” overlay and wire tooltips.
- `FailSafe/extension/src/genesis/views/templates/DojoTemplate.ts` - ensure info hints render with working tooltips.
- `FailSafe/extension/src/genesis/panels/templates/DashboardTemplate.ts` - add tooltips for advanced metrics.
- `FailSafe/extension/src/genesis/views/templates/LivingGraphTemplate.ts` - add tooltip/legend for risk grades and trust bands.

### Changes

- Implement a shared tooltip pattern using `data-tooltip` + `aria-label` and consistent styling.
- Replace the Cortex Stream “Search” text overlay with a single placeholder-only input.
- Add tooltips for proprietary calculations and advanced terminology across the dashboard, Dojo, and Living Graph.

### Unit Tests

- `FailSafe/extension/src/test/htmlSanitizer.test.ts` - cover tooltip text escaping in data attributes.

## Phase 3: Version + Documentation Update (2.0.1)

### Affected Files

- `FailSafe/extension/package.json` - bump to `2.0.1`.
- `CHANGELOG.md` - add `2.0.1` entry with tooltip fixes + UI cleanup + doc updates.
- `FailSafe/extension/CHANGELOG.md` - mirror `2.0.1` entry for extension package.
- `README.md` - update version language / release notes for 2.0.1.
- `FailSafe/extension/README.md` - update version mention and tooltip/documentation improvements.

### Changes

- Align version numbers and release notes across root + extension docs for 2.0.1.
- Summarize remediation: modularized webviews for Razor compliance + tooltip fixes/expansion.

### Unit Tests

- None.
