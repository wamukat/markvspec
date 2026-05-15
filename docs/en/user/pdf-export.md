# PDF Export Approach

MarkVSpec supports two export paths from the VS Code extension.

## Commands

- `MarkVSpec: Export Static HTML` writes a standalone HTML design document.
- `MarkVSpec: Export PDF` writes a PDF through an installed Chrome,
  Microsoft Edge, Brave, or Chromium browser.

The extension does not bundle Chromium. It reuses the standalone HTML renderer
and asks the installed browser to run headless print-to-PDF. This keeps the VSIX
small while avoiding the unreliable VS Code webview print workflow.

## Compared Approaches

| Approach | Fit | Tradeoffs |
| --- | --- | --- |
| VS Code webview print | Poor | Webview printing is environment-dependent and can fail before the system print dialog opens. |
| Standalone HTML export then browser print | Good fallback | Deterministic output and easy inspection, but requires a manual browser print step. |
| Spawn an installed browser from the extension | Current direct PDF path | No bundled browser, but depends on Chrome/Chromium-compatible browser availability. |
| Bundle Playwright or Chromium in the extension | Deferred | More reliable automation, but much larger package size and update burden. |
| Separate CLI export using Playwright | Future option | Useful for CI/export pipelines without making the VS Code extension heavy. |

## Notes

- PDF export looks for Chrome, Edge, Brave, or Chromium.
- If no compatible browser is found, use `MarkVSpec: Export Static HTML` and
  print from a browser.
- Mermaid is embedded from the bundled extension asset when available. If
  Mermaid rendering fails, the design document keeps readable Mermaid source.
- MarkVSpec applies a standard print policy: page breaks after the inline
  contents list and before History as chapter boundaries.
- States, Layouts, Elements, and Actions do not always start on a new page. They
  stay in the normal flow so the wireframe, state description, and related
  tables can be read together.
- Wireframe introductions, action details, model update groups, and model sample
  blocks request `break-inside: avoid` with legacy `page-break-*` fallbacks.
  Tables are not kept as one large block; headers and rows are optimized for
  print instead.
