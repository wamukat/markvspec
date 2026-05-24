# MarkVSpec 0.7.0 Release Notes

Release date: 2026-05-24

## Highlights

- Section-based Action authoring is now the release syntax. Action processes,
  cases, notes, migration diagnostics, generated design documents, examples,
  and Guide/Reference docs have been aligned around the new structure.
- VS Code preview is now source-aware. Preview blocks carry source anchors, can
  jump back to source, highlight/scroll from source selection, show diagnostics
  in context, recover from parse errors, and retain useful preview position
  across refreshes.
- Docs and examples now cover project preview, document-list output, source
  metadata, comments, external inputs, and framework-neutral partial updates.
- Pages and docs-site checks now rebuild with the current CLI bundle and can run
  from a clean checkout without relying on ignored generated docs-site content.

## Added

- Section-based Action syntax support in parser/model, renderer/export output,
  migration diagnostics, docs, and examples.
- VS Code preview source anchors, preview-to-source jump, source-to-preview
  highlight/scroll, diagnostics summary, and affected block indicators.
- Parse-error placeholders, last-known-good preview overlays, and preview
  refresh retention for scroll/focused source context.
- Reference coverage for source metadata, comments, external inputs, Front
  Matter, diagnostics, renderer/export output, and example mappings.
- Project preview and document-list examples in the docs site.

## Changed

- Partial update documentation is now framework-neutral and no longer frames the
  feature as HTMX-only.
- Maintainer docs now distinguish shared renderer/runtime responsibilities from
  VS Code extension preview UI and docs-site dynamic preview behavior.
- Pages build uses a shared `build:example-export-tooling` path and bundles the
  CLI before exporting examples.

## Fixed

- Fixed stale CLI bundle usage in Pages/example artifact generation.
- Fixed clean checkout Pages builds by syncing docs-site content before example
  catalog validation.
- Fixed VS Code preview behavior around parse/validation errors and refresh
  state retention.

## Compatibility Notes

- Action authoring has moved to section-based syntax. Existing Action specs
  should be migrated to the current `Triggered` / `Process` / case-oriented
  structure documented in the Guide and Reference.
- Package versions are aligned at `0.7.0` across the root package, CLI, core,
  document renderer, exporter, docs site, and VS Code extension.
