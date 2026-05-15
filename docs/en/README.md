# MarkVSpec Documentation

<p>
  <img src="../../assets/markvspec-icon.svg" alt="MarkVSpec" width="80">
</p>

This directory is the English documentation portal for MarkVSpec.
It separates documents for users, output/operation, internal design, and release maintenance.

MarkVSpec lets authors write screen specifications in Markdown, review state-specific previews and generated design documents in VS Code, and share the result as HTML/PDF.

Japanese documentation starts at [docs/ja/README.md](../ja/README.md).
The directory is split into user-facing `user/` documents and maintainer-facing `maintainers/` documents.

## Fast Paths

| Goal | Read |
| --- | --- |
| Write your first screen spec | [DSL reference](user/dsl.md), then [Example gallery](user/example-gallery.md) |
| Share HTML/PDF output | [PDF export approach](user/pdf-export.md) |

## Document Types

| Type | Role |
| --- | --- |
| User-facing | For people writing, reviewing, and sharing design documents. |
| Output / operations | For HTML/PDF export, partial updates, and renderer message overrides. |
| Internal design | Design decisions and future design for MarkVSpec maintainers. |
| Release work | Release preparation and regression checks. |

## By Task

### Write Design Documents

- [DSL reference](user/dsl.md): file structure, Front Matter, layouts, elements, actions, and validation rules.
- [UI coverage](user/ui-coverage.md): supported UI elements and screen patterns.

### Browse Examples

- [Example gallery](user/example-gallery.md): entry point for screens, templates, and partials under `examples/`.
- [Server-rendered partials](user/server-partials.md): partial documents, partial requests, and response modeling.

### Preview and Export

- [PDF export approach](user/pdf-export.md): HTML/PDF output constraints and fallback behavior.
- [Known limitations](user/limitations.md): current limitations that can affect first-time use or release evaluation.
- [Renderer message dictionary](user/renderer-message-dictionary.md): overriding preview/export fixed UI text.

### Internal Design and Release Work

- [MarkVSpec concept](maintainers/markvspec-concept.md): product positioning and design principles.
- [Design spec](maintainers/design-spec.md): implementation-oriented design notes.
- [Authoring quality](maintainers/authoring-quality.md): lint, formatting, and validation-gate notes.
- [HTML vs Markdown](maintainers/html-vs-markdown.md): source-format design decision.
- [Preview information architecture](maintainers/preview-information-architecture.md): preview structure and responsibilities.
- [Preview style inventory](maintainers/preview-style-inventory.html): visual checklist for preview and generated-document styles.
- [FormGroup design](maintainers/form-group-design.md): semantic form grouping and validation target design.
- [Supplemental prose in structured sections](maintainers/structured-section-prose.md): overview/notes ownership inside structured DSL sections.
- [Project index](maintainers/project-index.md): future project-index design.
- [Project transition diagrams](maintainers/project-transition-diagrams.md): future transition-diagram design.
- [Test organization](maintainers/test-organization.md): test file ownership and split policy.
- [Print regression](maintainers/print-regression.md): print/PDF regression checks.
- [Brand assets](maintainers/brand-assets.md): icon and asset usage.
- [Release checklist](maintainers/release-checklist.md): release preparation checks.

## When Unsure

- To start authoring, read [DSL reference](user/dsl.md) and [Example gallery](user/example-gallery.md).
- For export or printing issues, read [PDF export approach](user/pdf-export.md).
- If every document feels implementation-oriented, return to the repository root [README.md](../../README.md).
