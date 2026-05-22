# Example Preview Audit

## Docs-Site Showcase Direction

The public example route is `/examples/showcase/<slug>.html`. The showcase page
is moving to dynamic rendering first: JavaScript-enabled browsers should see a
preview rendered from the published `.vspec.md` source and dependency manifest.
The generated `/examples/generated/<slug>.html` artifact remains available for
fallback, export, print, and regression comparison. It is not the normal browsing
route. `/examples/dynamic/<slug>.html` is a compatibility and runtime
verification route, excluded from primary catalog and Pagefind navigation.

When a ticket changes docs-site examples or the browser renderer, verify these
representative showcase pages:

- `hello-screen`
- `login-basic`
- `history-and-errors`
- `profile-page-with-template`
- `responsive-profile`

For dynamic-first work, the verification record should state which examples used
dynamic rendering, which fallback path was forced or observed, and whether source
asset, dependency manifest, generated fallback, and runtime bundle assets were
present in the built `_site` artifact.

Run the browser regression before completing dynamic-first showcase tickets:

```bash
npm run check:showcase-browser
```

This command builds the Pages site, serves `_site` locally, and launches
Chrome/Chromium through the DevTools Protocol to verify the representative
showcase pages on desktop and mobile. Its automated set is `hello-screen`,
`login-basic`, `history-and-errors`, and `profile-page-with-template`; keep
using the broader representative list above for manual spot checks when a
change affects responsive behavior. It checks that browser-rendered preview DOM
is non-empty, that source and preview panes do not overlap, and that aborting
the published source fetch shows the generated fallback. This check is not part
of the default release gate yet because it requires a local browser binary; set
`CHROME_BIN` when Chrome or Chromium is not in a standard location. Run it
manually for browser-runtime showcase work until the Pages deploy gate
explicitly adopts it.

## Dynamic Preview Security Boundary

The showcase runtime may fetch author-controlled `.vspec.md` source and
dependency source, but it must only insert HTML returned by
`renderMarkVSpecHtml()` into `[data-dynamic-preview-output]`. Status,
diagnostics, metrics, and fetch errors are written with `textContent` or DOM
nodes. Do not pass fetched source text, dependency text, diagnostic messages, or
configuration values directly to `innerHTML`.

The browser-safe renderer is responsible for escaping author-controlled labels,
messages, Markdown prose that reaches wireframe output, Mermaid source text, and
element values. Link-like element URLs must reject `javascript:`, `vbscript:`,
and `data:` schemes before rendering. `npm run check:core-browser` includes the
dangerous-source fixture for this boundary: HTML blocks, inline HTML, Markdown
links, display/message/content text, link URLs, and dependency-compatible source
must not produce executable tags, event handler attributes, dangerous `href`
values, or iframes in dynamic preview output.

Generated fallback artifacts are same-origin HTML produced by the controlled
exporter. They remain in an iframe for fallback/export/print/regression
comparison. We do not sandbox that iframe yet because the generated artifact uses
the controlled Mermaid runtime for diagrams; instead, the exporter initializes
Mermaid with strict security and the dynamic path relies on escaped renderer
output. Revisit CSP or iframe sandboxing before allowing arbitrary plugins,
external renderer assets, or user-provided runtime scripts.

## VS Code Preview Audit

Run the shipped example preview audit before completing tickets that touch
examples, State Views, Action Details, display effects, template composition, or
wireframe rendering:

```bash
npm run audit:examples
```

The audit renders every `examples/**/*.vspec.md` document through the VS Code
preview document path, including template and partial references where available.
It checks:

- all examples render without parser diagnostics or preview exceptions
- visible layouts are not also marked `not placed in current layout`
- element-trigger actions are not shown when their trigger element is absent
- Preview Scenario display effects appear in the rendered wireframe or overlay
- known generated English fragments are detected in Japanese Action Details
- targetless Toast display effects render in toast regions, not modal overlays

Known findings are allowed only when they name the Kanbalone ticket that will
remove the allowlist, the reason, and the removal condition. New findings fail
the audit and must include the file, state or scenario, ID, and expected
behavior in the error output. When the audit exposes a new product bug, create a
Japanese Kanbalone ticket instead of folding the fix into the audit ticket.

Current known allowlist:

- `MarkVSpec#1072`: Japanese Action Details still contain generated English text.
