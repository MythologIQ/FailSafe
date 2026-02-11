# Release Scope Report (v3.5.0 Closure)

## Intent

Isolate the practical release surface for the v3.5.0 FailSafe UI and governance pass inside a mixed working tree.

## In-Scope Release Surface

- `FailSafe/extension/src/roadmap/ui/index.html`
- `FailSafe/extension/src/roadmap/ui/roadmap.css`
- `FailSafe/extension/src/roadmap/ui/roadmap.js`
- `FailSafe/extension/src/roadmap/ui/failsafe-icon.png`
- `FailSafe/extension/src/roadmap/ui/legacy-index.html`
- `FailSafe/extension/src/roadmap/ui/legacy-roadmap.css`
- `FailSafe/extension/src/roadmap/ui/legacy-roadmap.js`
- `FailSafe/extension/src/roadmap/ui/legacy/*`
- `FailSafe/extension/src/roadmap/RoadmapServer.ts`
- `FailSafe/extension/src/extension/commands.ts`
- `FailSafe/extension/src/test/ui/popout-ui.spec.ts`
- `FailSafe/extension/README.md`
- `FailSafe/extension/CHANGELOG.md`
- `FailSafe/extension/RELEASE_DOCS_SUBTASK.md`

## Scope Notes

- Working tree contains substantial pre-existing and parallel deltas outside this release surface.
- This report marks the minimal ship-intent set for compact webpanel + extended popout + skill provenance + checkpoint transparency documentation.
- Release packaging should include an explicit include-list review before publish.

## Validation Evidence

- `powershell -File tools/reliability/validate-skill-metadata.ps1` -> PASS
- `npm run compile` (in `FailSafe/extension`) -> PASS
- `npm run test:ui` -> PASS
- `powershell -File validate.ps1 -SkipContainerValidation` -> PASS (run in repo root)

## Unblocked Residuals

- No additional unblocked closure tasks remain in this gated slice.
- Remaining work is blocked on deliberate release include/exclude decisions for the broader mixed working tree.
