# Print Regression Check

Use this check to keep the practical examples printable after DSL, renderer, or
sample changes. It complements the PDF export implementation notes by defining a
repeatable regression flow for the current example set.

## Command

```sh
npm run check:print-regression
```

The command writes artifacts to `.markvspec-regression/`:

- `html/`: standalone HTML exports for every `examples/**/*.vspec.md` file.
- `pdf/`: PDF exports when a compatible Chrome, Edge, Brave, or Chromium browser
  is available.
- `html-files.txt` and `pdf-files.txt`: generated artifact manifests.
- `print-regression.log`: validation and export output.

PDF export is browser-dependent. By default, the command keeps the HTML
artifacts and logs a clear message when PDF export is unavailable. Set
`MARKVSPEC_REQUIRE_PDF=1` when PDF generation must fail the command.

```sh
MARKVSPEC_REQUIRE_PDF=1 npm run check:print-regression
```

## Target Examples

The regression set is every bundled MarkVSpec document:

- `examples/01-basics/hello-screen.vspec.md`
- `examples/04-real-world-screens/login-basic.vspec.md`
- `examples/02-states/async-loading.vspec.md`
- `examples/02-states/scenario-samples.vspec.md`
- `examples/02-states/responsive-profile.vspec.md`
- `examples/03-actions/event-triggers.vspec.md`
- `examples/03-actions/form-submit-flow.vspec.md`
- `examples/03-actions/single-field-validation.vspec.md`
- `examples/03-actions/toast-feedback.vspec.md`
- `examples/03-actions/parallel-initial-load.vspec.md`
- `examples/04-real-world-screens/notice-detail.vspec.md`
- `examples/04-real-world-screens/profile-edit-rich.vspec.md`
- `examples/04-real-world-screens/search-list.vspec.md`
- `examples/05-reuse/profile-page-with-template.vspec.md`
- `examples/05-reuse/profile-summary.partial.vspec.md`
- `examples/05-reuse/template-shell.vspec.md`
- `examples/06-structured-sections/history-and-errors.vspec.md`

## Visual Checklist

Check the generated HTML or PDF for these points:

- Every viewport/state section is visible in print order, including responsive
  login layouts and my page partial states.
- Wide tables wrap or scroll without hiding columns, especially field
  definitions, action details, API contracts, and message tables.
- Long cells wrap without overlapping adjacent content.
- Mermaid state and transition diagrams render as SVG, or fall back to readable
  source when Mermaid cannot run.
- Wireframes keep marker badges attached to the correct layout, element, and
  action targets.
- Element `sample rows:` and scenario samples show repeated structure without
  requiring unique markers for every sampled data row.
- Partial placeholders and embedded partial previews remain visually distinct.
- i18n label references, URL parameter transitions, and `PartialRequest`
  sections remain readable.
- Front Matter metadata is present.
- Page breaks do not cut headings away from their first content block in an
  unreadable way.
- The standard print policy starts a new page after the inline contents list and
  before History as chapter boundaries.
- States, Layouts, Elements, and Actions do not always start on a new page; the
  wireframe, state description, and related tables remain readable in one flow.
- Wireframe introductions, action details, process cards, and model sample
  blocks should avoid internal page breaks where the browser can honor the
  request.
- Tables are not kept as one large block; headers and rows should remain
  readable in print.

## When To Run

Run this check before completing changes that touch:

- `examples/**/*.vspec.md`
- `packages/core/src/renderer.ts`
- `packages/vscode-extension/src/extension.ts`
- `packages/exporter/src/index.ts`
- print CSS, marker badge CSS, Mermaid rendering, table rendering, or partial
  composition.
