# Example Gallery

The active examples are an English sample gallery for learning MarkVSpec by
feature area.

The gallery is preview-first: every active `.vspec.md` file should open in the
VS Code preview, static HTML export, and print regression flow.

## Coverage Plan

The gallery is intentionally split by authoring concern so users can find the
smallest useful reference:

- `Hello Screen` teaches the smallest useful screen: metadata, one state, one
  viewport, a layout, elements, and a click action marker while avoiding richer
  behavior.
- `Login Basic` teaches a compact login flow with responsive layout, required
  validation, request parameters, response cases, disabled form controls,
  navigation, Form Groups, and Business Rules.
- `Async Fetching` teaches separating request sending from asynchronous response
  handling, including fetching, empty, loaded, and error states.
- `Responsive Profile` teaches mobile and desktop layout variants over shared
  elements and state-aware actions without server flow noise.
- `Event Triggers` teaches `page.load`, `.change`, `.blur`, `.focus`,
  `.submit`, and dialog click/close triggers with Preview Scenarios for display
  effects.
- `Display Effects` teaches the core `display:` variants in one small screen:
  layout-level element insertion, field validation text, business-rule message
  text, targetless dialogs, and targetless toasts.
- `Form Submit Flow` teaches validation, request parameters, server process
  details, stop/continue flow, and success navigation.
- `Single Field Validation` teaches field-level validation contracts alongside
  element input constraints such as length, pattern, type, range, and step.
- `Parallel Initial Load` teaches parallel process groups and
  `Process P3: Resolve grouped processes` final state decisions.
- `Search List` teaches admin list patterns: filters, Select options, Tables,
  paging, fetching/empty/error states, Scenario samples, and response-driven result
  replacement.
- `Template Shell`, `Basic Slot Page`, `Responsive Slot Page`,
  `Default Slot Page`, `Profile Page With Template`, and
  `Profile Summary Partial` teach templates, slots, viewport-specific slot
  content, default fallback, template composition, partial hosts,
  `references.partials`, `display.element` references to authored UI,
  `type: partial`, and route parameters.
- `History And Errors` teaches Error Codes, custom History Fields, and History
  entries with Markdown body text.

## Marker Convention

Use short display markers in headings when they help the preview stay readable:

```markdown
### L1:L-AccountShell Account shell
### 1:E-PageTitle Heading
### A1:A-LoadProfile Load profile partial
```

Markers are display aids only. Cross-references, layout items, action triggers,
updates, and implementation notes should continue to use stable IDs such as
`L-AccountShell`, `E-PageTitle`, and `A-LoadProfile`. Do not use short markers
as references.

For rule and validation headings, use the stable IDs directly, for example
`### R-AccessControl Access control` and
`### V-RequiredEmail Required email`, so document symbols and parser tests stay
unambiguous.

For `F-*` and `V-*` examples that should appear as reference chips, prefer a
`marker:` property such as `F1` or `V1` instead of changing the stable ID.

## Learning Path

| Example | Purpose | Demonstrates |
| --- | --- | --- |
| [Hello Screen](../../../examples/01-basics/hello-screen.vspec.md) | Minimum useful screen. | Metadata, one state, one viewport, layout, elements, and a click action marker. |
| [Async Fetching](../../../examples/02-states/async-loading.vspec.md) | Request send and response handling. | Fetching, loaded, empty, and fetch-error states, response cases, and table sample rows. |
| [Scenario Samples](../../../examples/02-states/scenario-samples.vspec.md) | Dedicated preview data variation example. | Neutral Element `sample` / `sample rows:` plus loaded-state Preview Scenario `samples`, including `rows: []`. |
| [Source Kind Metadata](../../../examples/02-states/source-kind-metadata.vspec.md) | Property-level display value metadata. | `kind`, `source`, and `format` on `label`, `value`, `placeholder`, `src`, `href`, and Select options. |
| [Responsive Profile](../../../examples/02-states/responsive-profile.vspec.md) | Same content in mobile and desktop layouts. | Viewport-specific layout groups over shared elements. |
| [Event Triggers](../../../examples/03-actions/event-triggers.vspec.md) | Non-click events and lifecycle triggers. | `page.load`, `.change` unsaved notice display, `.blur` validation, `.focus` help text, `.submit`, dialog click actions, `close`, and Preview Scenarios. |
| [Display Effects](../../../examples/03-actions/display-effects.vspec.md) | Focused display effect reference. | `target: L-*` with `element:`, `target: E-*.error` with `message: V-*.messages`, layout-level `message: R-*.messages`, targetless Dialog, targetless Toast, and Preview Scenarios for each case. |
| [Form Submit Flow](../../../examples/03-actions/form-submit-flow.vspec.md) | Submit action lifecycle. | Validation receive source, request parameters, server process details, flow stop/continue, and success navigation. |
| [Single Field Validation](../../../examples/03-actions/single-field-validation.vspec.md) | Field-level validation examples. | Required, length, pattern, email, and numeric range validation contracts tied to element input specifications. |
| [Toast Feedback](../../../examples/03-actions/toast-feedback.vspec.md) | Non-modal save feedback. | `Toast`, targetless `display.element`, toast stacks, success/error tones, and Error Codes with `display: toast`. |
| [Parallel Initial Load](../../../examples/03-actions/parallel-initial-load.vspec.md) | Parallel server calls with a final resolver. | `group: initial-load`, `Process P3: Resolve grouped processes`, response cases, and final state decisions. |
| [Notice Detail](../../../examples/04-real-world-screens/notice-detail.vspec.md) | Display Content Spec field coverage. | `label`, `placeholder`, `sample`, `src`, `format`, machine `value`, and navigation `params`. |
| [Profile Edit Rich](../../../examples/04-real-world-screens/profile-edit-rich.vspec.md) | Element type coverage screen using a realistic profile/settings form. | `Textarea`, `MultiSelect`, `CheckboxGroup`, `Switch`, `RadioGroup`, `List`, `Dialog`, `Image`, `Icon`, `Divider`, file inputs, date/time inputs, and number input. |
| [Search List](../../../examples/04-real-world-screens/search-list.vspec.md) | Search screen with filters and pagination. | Desktop toolbar, Select options, Table sample rows, empty state, fetch-error state, and display element replacement. |
| [Tabs Settings](../../../examples/04-real-world-screens/tabs-settings.vspec.md) | Focused Tabs element example. | Active tab, tab panel references, item actions, and Display Content Spec aggregation. |
| [Anchored Help](../../../examples/04-real-world-screens/anchored-help.vspec.md) | Focused Popover and Tooltip example. | Anchored non-modal help, placement, visibility, wireframe rendering, and Display Content Spec overlay rows. |
| [Login Basic](../../../examples/04-real-world-screens/login-basic.vspec.md) | Compact authentication flow with mobile and desktop layouts. | Required inputs, validation/auth/request messages as display scenarios, spinner overlay, disabled controls, request parameters, response cases, screen navigation, and Business Rules. |
| [Template Shell](../../../examples/05-reuse/template-shell.vspec.md) | Shared template shell. | Template document unit, navigation frame, top bar, language Select, and `content` slot placeholder. |
| [Basic Slot Page](../../../examples/05-reuse/basic-slot-page.vspec.md) | Smallest screen using a template slot. | Front Matter `template` and viewport-neutral `## Slot: content` without partial or action noise. |
| [Responsive Template Shell](../../../examples/05-reuse/responsive-template-shell.vspec.md) | Shared responsive template shell. | Mobile and desktop template layouts that render the same `content` slot. |
| [Responsive Slot Page](../../../examples/05-reuse/responsive-slot-page.vspec.md) | Viewport-specific template slot content. | `## Slot: content` fallback for mobile and `## Slot: content: desktop` override for desktop. |
| [Default Slot Page](../../../examples/05-reuse/default-slot-page.vspec.md) | Template slot default fallback. | No screen slot content; preview renders template-owned `default: E-EmptySlotMessage`. |
| [Profile Page With Template](../../../examples/05-reuse/profile-page-with-template.vspec.md) | Screen using a template slot and partial. | Front Matter `template`, `references.partials`, `## Slot: content`, route params, partial host layout metadata, and `display.partial` updates. |
| [Profile Summary Partial](../../../examples/05-reuse/profile-summary.partial.vspec.md) | Partial document rendered inside a screen. | `type: partial`, partial route, partial-local states, and server-side build action. |
| [History And Errors](../../../examples/06-structured-sections/history-and-errors.vspec.md) | Structured release-oriented sections. | Error Codes, custom History Fields, and History entries with Markdown body text. |

## Suggested Smoke Path

1. Open [Login Basic](../../../examples/04-real-world-screens/login-basic.vspec.md) and verify the preview
   renders both mobile and desktop viewport sections.
2. Toggle Layout, Element, and Action markers.
3. Switch viewport filters between `All`, `mobile`, and `desktop`.
4. Open [Search List](../../../examples/04-real-world-screens/search-list.vspec.md)
   and confirm table sample rows render in the `idle` state.
5. Open [Scenario Samples](../../../examples/02-states/scenario-samples.vspec.md)
   and confirm scenario sample overrides render.
6. Open [Source Kind Metadata](../../../examples/02-states/source-kind-metadata.vspec.md)
   and confirm Display Content Spec shows property-level Kind/Source/Format.
7. Open [Event Triggers](../../../examples/03-actions/event-triggers.vspec.md)
   and confirm non-click events and lifecycle triggers render in Action Details.
8. Open [Display Effects](../../../examples/03-actions/display-effects.vspec.md)
   and confirm each Preview Scenario shows a different display target pattern.
9. Open [Notice Detail](../../../examples/04-real-world-screens/notice-detail.vspec.md)
   and confirm Display Content Spec separates wording, samples, data sources, formats, values, and params.
10. Open [Profile Edit Rich](../../../examples/04-real-world-screens/profile-edit-rich.vspec.md)
   and confirm the extended element type controls render without diagnostics.
11. Open [Tabs Settings](../../../examples/04-real-world-screens/tabs-settings.vspec.md)
   and confirm the active tab, panel references, and tab actions are traceable.
12. Open [Anchored Help](../../../examples/04-real-world-screens/anchored-help.vspec.md)
   and confirm Popover and Tooltip anchors, placement, and text are visible.
13. Open [Basic Slot Page](../../../examples/05-reuse/basic-slot-page.vspec.md),
   [Responsive Slot Page](../../../examples/05-reuse/responsive-slot-page.vspec.md),
   and [Default Slot Page](../../../examples/05-reuse/default-slot-page.vspec.md)
   to confirm template slot content, viewport-specific slot override, and
   default fallback render.
12. Open [Profile Page With Template](../../../examples/05-reuse/profile-page-with-template.vspec.md)
   and confirm template composition and partial references render.
13. Open [History And Errors](../../../examples/06-structured-sections/history-and-errors.vspec.md)
   and confirm structured release metadata renders.
14. Run `npm run test -w @markvspec/core` before changing example syntax.
