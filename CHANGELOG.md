# Changelog

## 0.4.1 - 2026-05-19

### Added

- Added generated GitHub Pages example showcase pages that display each
  `.vspec.md` source beside the generated HTML preview.
- Added formal support and focused examples for Tabs, Popover, Tooltip,
  Accordion, Disclosure, and ActionMenu elements.
- Added route sample support for Preview Scenarios and generated project
  document-list export.
- Added auxiliary preview icons for diagnostics, source kind chips, sample-row
  references, and unplaced state-view rows.

### Changed

- Updated UI coverage documentation and Pages navigation so user-facing docs
  distinguish implemented elements from future candidates.
- Improved Display Content Spec aggregation for table columns, selection
  options, input value/source columns, conditions, sample rows, and metadata.
- Improved GitHub Pages validation to check generated UI coverage pages,
  example showcase links, and duplicate example output names.

### Fixed

- Fixed sample-row anchors, route samples across display properties, page-load
  transitions, lifecycle origins, layout condition display, and representative
  localized diagnostics.

## 0.4.0 - 2026-05-18

### Added

- Architecture-neutral Action DSL with explicit process steps, process cases,
  parallel process groups, Resolve steps, and view/context effects.
- View Context, Preview Scenarios, and Scenario Samples for state-driven
  previews without relying on legacy model samples.
- Partial update authoring through `display.partial`, template slot contracts,
  slot defaults, and richer template/partial examples.
- Validation display modeling for field errors, business rule display messages,
  split validation sections, and validation preview tables.
- Example preview audit, VSIX smoke coverage, print regression checks, and
  release-quality documentation.

### Changed

- Reworked shipped examples and user documentation around focused learning
  paths, source samples, scenario samples, templates, partials, and structured
  sections.
- Improved generated design documents with compact display content tables,
  marker/ID reference chips, clearer state/action transition summaries, and
  localized labels.
- Refreshed README paths, release screenshot generation, and release checklist
  artifacts for the 0.4.0 package.

### Removed

- Removed legacy canonical model sample authoring, direct model update preview
  semantics, legacy `bind` support, and old Front Matter `owner` / `status` /
  `viewport` metadata from the release path.

### Fixed

- Fixed marker layout, printed spec table columns, scenario/static export
  rendering, partial preview dependency handling, and VSIX smoke default paths.

## 0.2.0 - 2026-05-14

Initial MarkVSpec release for the VS Code Marketplace.

### Release Contents

- VS Code Marketplace publisher metadata for `wamukat`.
- VS Code extension icon assets derived from the MarkVSpec SVG source.
- CLI package entry point for local conversion and export workflows.
- English Application Form example covering `DateInput`, `TimeInput`,
  `NumberInput`, `Textarea`, `FileInput`, readonly values, model binding, and
  form submission.
- MIT license.
- `ServerCall` action process terminology for server-side service calls.
- Opaque `${...}` expression syntax for external data sources.
- `PresentationPanel` / `P-*` support for visual-only layout panels that stay
  out of semantic layout controls.
- English and Japanese DSL, design specification, UI coverage, example gallery,
  and brand asset documentation for the release package.
- Mobile-safe marker placement and readable inline-code styling in generated
  documents.
- Parser compatibility, validation, preview rendering, and generated input form
  specs for the supported input primitives.
