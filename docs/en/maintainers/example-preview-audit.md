# Example Preview Audit

## Docs-Site Showcase Direction

The public example route is `/examples/showcase/<slug>.html`. JavaScript-enabled
browsers should see a generated design document rendered from the published
`.vspec.md` source and dependency manifest. The docs-site build must not publish
per-example `/examples/generated/<slug>.html` artifacts as showcase fallback.
Runtime failures show diagnostics and source/raw links inside the page instead
of embedding a pre-generated HTML preview. `/examples/dynamic/<slug>.html` is a
compatibility and runtime verification route, excluded from primary catalog and
Pagefind navigation.

When a ticket changes docs-site examples or the browser renderer, verify these
representative showcase pages:

- `hello-screen`
- `login-basic`
- `history-and-errors`
- `profile-page-with-template`
- `responsive-profile`

For dynamic generated-document work, the verification record should state which
examples used browser-side rendering, which runtime failure path was forced or
observed, and whether source assets, dependency manifests, runtime bundle
assets, and no-generated-artifact checks passed in the built `_site` artifact.

`npm run check:docs-site` includes a dynamic generated-document smoke check for
every catalog example. It verifies that the built `_site` does not contain
per-example generated HTML preview artifacts, then renders each example through
the browser-safe document renderer and checks generated-document sections,
wireframe presence, marker IDs, marker categories, validation status, key
rendered text, and the security boundary. `source-kind-metadata` also has a
direct State Views sample-selection check so Preview Scenario sample values stay
visible in the dynamic document. There is no generated-artifact parity allowlist.

Run the browser regression before completing dynamic-first showcase tickets:

```bash
npm run check:showcase-browser
```

This command builds the Pages site, serves `_site` locally, and launches
Chrome/Chromium through the DevTools Protocol to verify the representative
showcase pages on desktop and mobile. Its automated set is `hello-screen`,
`login-basic`, `history-and-errors`, and `profile-page-with-template`; keep
using the broader representative list above for manual spot checks when a
change affects responsive behavior. It checks that browser-rendered document DOM
is non-empty, that source and preview panes do not overlap, and that aborting
the published source fetch shows runtime failure diagnostics plus source/raw
links. This check is not part of the GitHub Pages deploy job because it requires
a local browser binary; set
`CHROME_BIN` when Chrome or Chromium is not in a standard location. The Pages
workflow remains a static artifact gate: it builds `_site`, runs
`npm run check:pages-site`, and uploads only after dynamic runtime assets,
public source assets, dependency manifests, no-generated-artifact checks,
security boundary checks, and dynamic generated-document smoke checks pass. Run
`npm run check:showcase-browser` during release or browser-runtime acceptance
when the actual browser DOM and runtime failure path need verification.

## Dynamic Preview Security Boundary

The showcase runtime may fetch author-controlled `.vspec.md` source and
dependency source, but it must only insert HTML returned by
`renderBrowserDesignDocumentHtml()` into `[data-dynamic-preview-output]`. Status,
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

Do not reintroduce same-origin generated preview iframes as showcase fallback.
CLI/export HTML remains an explicit export workflow outside the docs-site
showcase route. Revisit CSP, iframe sandboxing, and runtime asset policy before
allowing arbitrary plugins, external renderer assets, or user-provided runtime
scripts.

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
