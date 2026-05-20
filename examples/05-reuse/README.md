# Reuse Examples

These examples teach reusable page structure in small steps. Open the screen
examples directly in the VS Code preview; template and partial dependencies are
loaded through Front Matter references.

| Example | Role |
| --- | --- |
| [`template-shell.vspec.md`](template-shell.vspec.md) | Minimal reusable `type: template` page shell. It owns the navigation frame, top bar, language Select, `## Slots`, and `default: E-EmptySlotMessage`. |
| [`basic-slot-page.vspec.md`](basic-slot-page.vspec.md) | Smallest `type: screen` that references a template and fills viewport-neutral `## Slot: content`. |
| [`default-slot-page.vspec.md`](default-slot-page.vspec.md) | Shows template default fallback when the screen intentionally provides no slot content. |
| [`responsive-template-shell.vspec.md`](responsive-template-shell.vspec.md) | Template with `mobile` and `desktop` layouts that both render the same `content` slot. |
| [`responsive-slot-page.vspec.md`](responsive-slot-page.vspec.md) | Screen with viewport-neutral slot content plus a `desktop` slot override. |
| [`profile-page-with-template.vspec.md`](profile-page-with-template.vspec.md) | Screen that combines template composition, route params, `references.partials`, an `L-*` partial host, and response-side `display`. |
| [`profile-summary.partial.vspec.md`](profile-summary.partial.vspec.md) | Standalone `type: partial` fragment with partial-local states and a `partial.render` build action. |

Read order:

1. `template-shell.vspec.md`
2. `basic-slot-page.vspec.md`
3. `default-slot-page.vspec.md`
4. `responsive-template-shell.vspec.md`
5. `responsive-slot-page.vspec.md`
6. `profile-summary.partial.vspec.md`
7. `profile-page-with-template.vspec.md`

Authoring boundaries:

- `template.id` is the expected template document ID; `template.src` is the file
  path used to load it.
- `references.partials` maps `PRT-*` IDs to files. It does not declare where the
  partial appears.
- `partial:` on an `L-*` layout declares the partial host.
- response-side `display` describes replacement of that host. Use `partial` for
  a referenced partial document ID. Use `element` or `message` for non-partial
  display updates.
- Template-owned states stay inside the template. Screens provide slot content.
