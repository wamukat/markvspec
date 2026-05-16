# Example Preview Audit

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

Known findings are allowed only when they name the Kanbalone ticket that will
remove the allowlist, the reason, and the removal condition. New findings fail
the audit and must include the file, state or scenario, ID, and expected
behavior in the error output. When the audit exposes a new product bug, create a
Japanese Kanbalone ticket instead of folding the fix into the audit ticket.

Current known allowlist:

- `MarkVSpec#1072`: Japanese Action Details still contain generated English text.
- `MarkVSpec#1074`: dialog button actions can appear outside the dialog display scenario.
- `MarkVSpec#1076`: composed template slot layouts can be visible while marked not placed.
- `MarkVSpec#1078`: element-trigger actions can appear when their trigger element is absent from the rendered state/scenario.

Toast-specific overlay checks are pending `MarkVSpec#1075`, because `Toast` is
not a supported element type yet. Until then, display effects for non-Dialog
targets are checked by `data-mm-id`, and `MarkVSpec#1075` must extend this audit
when it adds the toast region.
