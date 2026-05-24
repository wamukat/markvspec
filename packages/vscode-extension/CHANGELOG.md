# Changelog

## 0.7.1 - 2026-05-24

### Added

- Added shared diagnostics for unknown YAML Front Matter extension fields.
- Added source text diagnostics coverage documentation for Front Matter, Layout
  and Slot metadata, raw HTML prose blocks, and thematic breaks.

### Changed

- Aligned generated/static document thematic break rendering with VS Code
  preview output.
- Clarified raw HTML prose handling as escaped represented text.

### Fixed

- Fixed Layout and Slot metadata diagnostics so unsupported value-less author
  text is reported instead of being silently dropped.

## 0.7.0 - 2026-05-24

### Added

- Added section-based Action authoring syntax with parser support, migration
  diagnostics, renderer/export integration, and updated documentation/examples.
- Added source-aware VS Code preview editing support: source anchors,
  preview-to-source jump, source-to-preview highlight/scroll, diagnostics
  summary and affected block indicators.
- Added parse-error placeholders, last-known-good stale preview overlays, and
  scroll/focused-item retention across preview refreshes.
- Added project preview and document-list example documentation in the docs
  site.

### Changed

- Clarified framework-neutral partial update guidance and removed wording that
  implied HTMX-only authoring.
- Documented the responsibility boundary between shared preview runtime,
  VS Code extension preview UI, and docs-site dynamic preview.
- Updated Pages/example artifact generation so it bundles the current CLI
  before export and syncs docs-site content before catalog validation.

### Fixed

- Fixed clean checkout docs-site checks that failed before generated
  docs-site content existed.
- Fixed stale CLI bundle usage in Pages builds after Action syntax changes.

## 0.6.4 - 2026-05-23

### Fixed

- Fixed static/export generated design document references so Marker/ID cells,
  Layouts items, and Form Groups fields show stable MarkVSpec IDs instead of
  labels or sample text.
- Added cross-renderer parity coverage for VS Code preview and static/export
  reference rendering across shipped examples.

## 0.6.3 - 2026-05-22

### Added

- Added browser-rendered dynamic example previews and an experimental online
  live editor proof of concept.
- Added preview maximize controls for example preview panes.

### Changed

- Made example showcase pages dynamic-first and stopped publishing generated
  example HTML pages as normal site artifacts.
- Improved generated document preview ordering, table of contents display,
  history documentation, and source-link behavior.

### Fixed

- Fixed dynamic preview CSS, Mermaid rendering, table and wireframe surface
  backgrounds, and Pages parity checks.

## 0.6.2 - 2026-05-22

### Added

- Added grammar-backed diagnostics for unknown and non-canonical structured
  items in MarkVSpec documents.
- Added release gates that verify generated grammar docs, reference docs, and
  docs-site output before publishing.

### Changed

- Aligned parser and preview diagnostics with the canonical grammar definition
  used by the generated reference docs.
- Updated documentation and examples around current Action, validation,
  scenario, and template authoring syntax.

### Fixed

- Warned on deprecated Action blocks and HTTP requests written under `server:`.
- Reduced stale documentation paths that could suggest unsupported DSL forms.

## 0.4.1 - 2026-05-19

### Added

- Added formal preview and generated-document support for Tabs, Popover,
  Tooltip, Accordion, Disclosure, and ActionMenu elements.
- Added route sample support for Preview Scenarios and generated project
  document-list export.
- Added auxiliary icons for preview diagnostics, source kind chips, sample-row
  references, and unplaced state-view rows.

### Changed

- Improved generated Display Content Spec output for table columns, selection
  options, input value/source columns, conditions, sample rows, and metadata.
- Updated shipped documentation and Pages example navigation for source plus
  preview showcase pages.

### Fixed

- Fixed sample-row anchors, route samples across display properties, page-load
  transitions, lifecycle origins, layout condition display, and representative
  localized diagnostics.

## 0.4.0 - 2026-05-18

### Added

- Architecture-neutral Action DSL rendering and diagnostics, including process
  cases, direct process effects, parallel process groups, Resolve steps, and
  view/context effects.
- View Context, Preview Scenarios, Scenario Samples, display effects, field
  error messages, business rule messages, dialog overlays, and toast overlays in
  the generated preview.
- Template and partial composition support for slot contracts, slot defaults,
  nested partials, and `display.partial` updates.
- Example preview audit coverage and packaged VSIX smoke verification.

### Changed

- Reworked the shipped example set around focused learning paths and moved the
  login sample to the real-world screens examples.
- Improved State Views, display content tables, validation tables, marker/ID
  reference chips, localized labels, and print/export layout.
- Updated snippets and documentation away from legacy model authoring toward
  data/source samples and preview scenarios.

### Removed

- Removed legacy canonical model sample rendering paths, direct model update
  preview semantics, legacy `bind` support, and removed Front Matter metadata
  from the release authoring path.

### Fixed

- Fixed partial dependency detection, viewport fallback handling, marker
  placement, printed table ID columns, README screenshot generation, and VSIX
  smoke default paths.

## 0.3.0 - 2026-05-15

### Changed

- Renamed the VS Code extension package identifier to `markvspec` for the first
  public Marketplace listing.
- Prepared release artifacts for the `0.3.0` release.

## 0.2.0 - 2026-05-14

Initial MarkVSpec VS Code Marketplace release.

### Added

- Live preview and diagnostics for `.vspec.md` and `.vspec.project.md`.
- Generated design document view with wireframes, State Views, action
  details, Mermaid diagrams, and project transition diagrams.
- Static HTML and PDF export commands.
- Syntax highlighting, snippets, document symbols, formatter support, and
  quick fixes for common MarkVSpec structure issues.
- Bundled MarkVSpec icon and Marketplace metadata for publisher `wamukat`.

### Compatibility

- Uses `ServerCall` terminology for server-side service calls.
- Includes an English example gallery covering screens, templates, partials,
  and extended input primitives.

### Notes

- MarkVSpec is marked as a preview extension.
- PDF export requires an installed Chrome, Edge, Brave, or Chromium browser.
