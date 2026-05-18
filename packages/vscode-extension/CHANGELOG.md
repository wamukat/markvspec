# Changelog

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
