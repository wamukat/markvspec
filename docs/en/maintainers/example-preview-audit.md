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
