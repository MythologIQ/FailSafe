# Plan: v2.0.1 Cortex Stream Cleanup + Tooltip Coverage

## Open Questions

- Which documentation artifacts are authoritative for the 2.0.1 bump: root `README.md`, `FailSafe/extension/README.md`, root `CHANGELOG.md`, `FailSafe/extension/CHANGELOG.md`, `docs/FAILSAFE_SPECIFICATION.md`, and/or any `PROD-Extension` manifests?
- Should tooltips use a shared custom tooltip system (data attributes + CSS/JS) across all webviews, or is native `title` acceptable in non-webview surfaces?
- Confirm the required glossary list for “proprietary calculations / advanced terminology” beyond the defaults below (e.g., Novelty L/M/H, Cache Hits/Misses/Sizes, Trust Stages, Risk Grade, L3 Queue, SOA Ledger).

## Phase 1: Cortex Stream Search Cleanup + Tooltip Infrastructure

### Affected Files

- `FailSafe/extension/src/genesis/views/CortexStreamProvider.ts` - remove redundant “Search” overlay, wire tooltips to search/filters/clear.
- `FailSafe/extension/src/shared/components/InfoHint.ts` - extend hint output to use data-driven tooltips (or introduce a shared tooltip helper/styling).
- `FailSafe/extension/src/shared/styles/common.ts` - add shared tooltip styles if reused across views.

### Changes

- Remove or replace the text-based “Search” overlay in the Cortex Stream search bar so only the input placeholder communicates intent.
- Introduce a shared tooltip pattern using `data-tooltip` (and `aria-label`) plus minimal CSS/JS for consistent display in webviews.
- Migrate Cortex Stream filter buttons and header actions to the shared tooltip pattern (instead of relying on `title`).

### Unit Tests

- `FailSafe/extension/src/test/htmlSanitizer.test.ts` - add coverage to ensure tooltip text is escaped when injected into data attributes.

## Phase 2: Tooltip Coverage for Advanced Terminology

### Affected Files

- `FailSafe/extension/src/genesis/views/DojoViewProvider.ts` - ensure info hints render with working tooltips.
- `FailSafe/extension/src/genesis/panels/DashboardPanel.ts` - add tooltips to advanced metrics (novelty, cache stats, trust stages, L3 queue, risk grading).
- `FailSafe/extension/src/genesis/views/LivingGraphProvider.ts` - add tooltips or legend help for risk grades, trust bands, and node types.
- `FailSafe/extension/src/shared/components/InfoHint.ts` - expand `HELP_TEXT` with new domain terms (novelty, cache, ledger, risk, trust).

### Changes

- Apply tooltips to labels that reference proprietary calculations or advanced governance terminology.
- Ensure the tooltip UI works in all webviews by including the shared tooltip styling and runtime in each template.
- Standardize tooltip phrasing for clarity (short definition + calculation basis where applicable).

### Unit Tests

- None required beyond Phase 1 escape/markup coverage.

## Phase 3: Version + Documentation Update (2.0.1)

### Affected Files

- `FailSafe/extension/package.json` - bump to `2.0.1`.
- `CHANGELOG.md` - add `2.0.1` entry summarizing tooltip fixes + Cortex Stream UI cleanup + documentation updates.
- `FailSafe/extension/CHANGELOG.md` - mirror `2.0.1` entry for extension package.
- `README.md` - update version language / release notes section to align with 2.0.1.
- `FailSafe/extension/README.md` - update version mention and note tooltip/documentation improvements.

### Changes

- Align version numbers and release notes across root + extension docs for 2.0.1.
- Add concise release notes describing: search UI cleanup, tooltips fixed + expanded, documentation refresh.

### Unit Tests

- None.
