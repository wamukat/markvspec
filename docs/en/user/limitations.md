# Known Limitations

This page lists the current limitations that can affect first-time use or
release evaluation. It is intentionally short; implementation notes and future
design ideas belong in maintainer documents.

## Preview And Export

- PDF export uses an installed Chrome, Edge, Brave, or Chromium browser. Output
  quality depends on that browser's print engine.
- VS Code preview, standalone HTML, and PDF export can differ slightly in
  spacing, pagination, and Mermaid rendering.
- Large wireframes, wide tables, and complex State Flow diagrams can become hard
  to read in PDF. Prefer standalone HTML when interactive reading is more
  important than a fixed page layout.

## Scope

- MarkVSpec is screen-first. It documents screen structure, states, interactions,
  validation, and handoff IDs, but it is not a high-fidelity visual design tool.
- Project-wide indexes and transition diagrams are supported for release use,
  but the first-user flow still starts from a single `.vspec.md` screen file.
- Template and partial documents are part of the basic feature set, but they are
  easier to adopt after learning a standalone screen example.

## Authoring

- The formatter and quick fixes are intentionally conservative. They help with
  structure, but they do not rewrite a document into a complete style guide.
- External Markdown images are blocked in rendered supplemental prose. Keep
  inspectable product or screen assets in the repository when documentation
  needs images.
