# Changelog

## 0.7.0 - 2026-05-24

### Added

- Added section-based Action authoring syntax, including parser/model support,
  migration diagnostics, renderer/export output, and updated guide/reference
  examples.
- Added VS Code preview editing support with source anchors, preview-to-source
  jump, source-to-preview highlight/scroll, diagnostics summary and affected
  block indicators, parse-error placeholders, last-known-good error overlays,
  and refresh retention.
- Added project preview and document-list examples and documentation for the
  docs site.
- Added Reference coverage for external inputs, Front Matter, source metadata,
  file format fields, comments, diagnostics, renderer/export output, and
  example-to-reference mappings.

### Changed

- Clarified partial update documentation so MarkVSpec remains
  framework-neutral across server-rendered, HTMX-style, React, Vue, and other
  SPA workflows.
- Documented the responsibility boundary between shared renderer/runtime,
  VS Code extension preview behavior, and docs-site dynamic preview behavior.
- Updated generated docs-site and Pages build flow so example artifact
  generation uses the current CLI bundle and works from a clean checkout.

### Fixed

- Fixed stale CLI bundle usage in Pages/example artifact generation.
- Fixed clean checkout Pages builds by syncing generated docs-site content
  before example catalog validation.
- Fixed VS Code preview recovery behavior around parse/validation errors and
  refresh state retention.

## 0.6.2 - 2026-05-22

### Added

- Added a canonical grammar definition as the source of truth for recognized
  sections and structured item keys.
- Added generated grammar/reference documentation checks and release gates so
  parser, diagnostics, docs, and docs-site output stay aligned.
- Added diagnostics for unknown or non-canonical structured items, including
  deprecated Action blocks and invalid HTTP request placement.
- Added documentation audits for reference pages, links, code snippets, and
  implementation vocabulary.

### Changed

- Moved structured item parser decisions to grammar definition queries across
  Actions, Elements, Validations, Business Rules, View Context, Preview
  Scenarios, History, and related sections.
- Generated the grammar reference and major reference tables from the grammar
  definition instead of maintaining duplicate hand-written tables.
- Clarified the documentation source-of-truth policy and synced root docs with
  docs-site content generation.
- Limited composed template display to wireframe / State Views rendering paths.

### Fixed

- Warned when authored source text would otherwise be ignored by structured
  sections.
- Removed stale legacy syntax guidance from current docs and examples.
- Tightened docs-site build generation so Starlight content is synchronized
  during build.

## 0.6.1 - 2026-05-21

### Added

- Added `unrepresented-source-text` diagnostics so meaningful author text that
  is parsed but not represented by the semantic model, preview/export output,
  another diagnostic, or an explicit ignore rule is reported instead of being
  silently dropped.
- Added source text diagnostic coverage for `Actions > Process` prose and
  `Preview Scenarios` nested bullets under scalar scenario entries.
- Added `markvspec --version` / `markvspec -v` for CLI version checks.
- Added the Starlight documentation site and example showcase pages with English
  and Japanese guide, recipe, reference, and start content.
- Added presentation panel documentation and a focused example.

### Changed

- Updated user documentation for preview scenarios, project preview/export
  paths, CLI document-list export, Starlight navigation, examples, and canonical
  section/reference pages.
- Improved documentation validation for documented `.vspec.md` snippets and
  example catalog links.
- Restored the visual document structure guide in the docs site.

### Removed

- Removed legacy action process compatibility, legacy sample/repeat syntax
  remnants, legacy metadata/property compatibility, and stale syntax trace
  references so only the current DSL remains documented and accepted.

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
