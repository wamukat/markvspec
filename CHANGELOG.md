# Changelog

## 0.5.0 - 2026-05-19

### Added

- Added controlled UI behavior for Tabs, Accordion, Disclosure, and ActionMenu
  panels in State Views, including active/inactive panel handling and focused
  examples.
- Added `route.hash` support for Preview Scenario samples and preview-evaluable
  conditions.
- Added generated document sections for View Context and View Context Samples,
  including section lead/notes, entity lead/notes, values, default values,
  properties, and sample values.
- Added Preview Scenarios section/scenario lead and notes rendering in VS Code
  preview and static HTML export.
- Added parse-output coverage sentinel fixtures and regression tests for
  preview/export output gaps.

### Changed

- Improved Preview Scenario State View diffing so scenario variants compare
  against the relevant base state and show scenario sample data as authored
  display data.
- Improved controlled panel State View tables by limiting rows to visible panel
  content and shortening controlled-content explanations.
- Refined process card icon placement and focused component example marker
  expectations.
- Updated authoring docs and coverage docs for View Context, Preview Scenarios,
  route hash samples, and structured prose output.

### Fixed

- Fixed closed ActionMenu example coverage and controlled panel conditions.
- Fixed initial-load response examples so response transitions are modeled from
  the initializing state.
- Fixed prose output gaps for Preview Scenarios and View Context sections in
  generated preview/static export documents.

### Migration Guide

- If a Preview Scenario previously used `hash` as ordinary element sample data,
  move it under `route:` when it represents the URL fragment. Conditions should
  reference it as `${route.hash}`.
- Review generated documents that contain `## View Context`,
  `## View Context Samples`, or `## Preview Scenarios`: their lead/notes prose is
  now visible in preview/export, so remove duplicated explanatory notes from
  nearby free-form sections if they were only compensating for missing output.
- For Tabs, Accordion, Disclosure, and ActionMenu specs, prefer authored
  controlled panel relationships and state/view conditions over extra duplicate
  states used only to force panel visibility in previews.

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
