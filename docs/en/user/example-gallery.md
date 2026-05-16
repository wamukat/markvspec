# Example Gallery

The active examples are an English sample gallery for learning MarkVSpec by
feature area.

The gallery is preview-first: every active `.vspec.md` file should open in the
VS Code preview, static HTML export, and print regression flow.

## Coverage Plan

The gallery is intentionally split by authoring concern so users can find the
smallest useful reference:

- `Hello Screen` teaches the smallest useful screen: metadata, one state, one
  viewport, a layout, elements, and a button action marker.
- `Login Basic` teaches responsive layouts, validation states,
  disabled form controls, overlays, request parameters, response cases,
  navigation, Form Groups, and Business Rules.
- `Async Loading` teaches separating request sending from asynchronous response
  handling, including loading, empty, loaded, and error states.
- `Responsive Profile` teaches mobile and desktop layout variants over shared
  elements and state-aware actions.
- `Form Submit Flow` teaches validation, request parameters, server process
  details, stop/continue flow, and success navigation.
- `Single Field Validation` teaches field-level validation contracts alongside
  element input constraints such as length, pattern, type, range, and step.
- `Parallel Initial Load` teaches parallel process groups and
  `Process P3: Resolve grouped processes` final state decisions.
- `Search List` teaches admin list patterns: filters, Select options, Tables,
  paging, loading/empty/error states, Model Samples, and response-driven result
  replacement.
- `Template Shell`, `Profile Page With Template`, and `Profile Summary Partial`
  teach templates, slots, template composition, partial hosts,
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

## Learning Path

| Example | Purpose | Demonstrates |
| --- | --- | --- |
| [Hello Screen](../../../examples/01-basics/hello-screen.vspec.md) | Minimum useful screen. | One screen, one state, one viewport, layout, elements, and a button action marker. |
| [Login Basic](../../../examples/01-basics/login-basic.vspec.md) | Authentication screen with mobile and desktop layouts. | Required inputs, validation state, auth-error state, spinner overlay, disabled controls, request parameters, response cases, screen navigation, and Business Rules. |
| [Async Loading](../../../examples/02-states/async-loading.vspec.md) | Request send and response handling. | Loading, loaded, empty, and load-error states, response cases, and Model Samples. |
| [Model Samples](../../../examples/02-states/model-samples.vspec.md) | Dedicated model-backed preview data example. | List-first object and collection samples, state-specific sample sets, and supplemental empty table syntax. |
| [Responsive Profile](../../../examples/02-states/responsive-profile.vspec.md) | Same content in mobile and desktop layouts. | Viewport-specific layout groups and state-aware actions. |
| [Event Triggers](../../../examples/03-actions/event-triggers.vspec.md) | Non-click events and lifecycle triggers. | `change`, `submit`, `focus`, `blur`, `close`, and `screen.load` in one preferences flow. |
| [Form Submit Flow](../../../examples/03-actions/form-submit-flow.vspec.md) | Submit action lifecycle. | Validation receive source, request parameters, server process details, flow stop/continue, and success navigation. |
| [Single Field Validation](../../../examples/03-actions/single-field-validation.vspec.md) | Field-level validation examples. | Required, length, pattern, email, and numeric range validation contracts tied to element input specifications. |
| [Parallel Initial Load](../../../examples/03-actions/parallel-initial-load.vspec.md) | Parallel server calls with a final resolver. | `group: initial-load`, `Process P3: Resolve grouped processes`, model side effects, and final state decisions. |
| [Notice Detail](../../../examples/04-real-world-screens/notice-detail.vspec.md) | Display Content Spec field coverage. | `label src`, `placeholder src`, `sample`, `src`, `format`, machine `value`, and navigation `params`. |
| [Profile Edit Rich](../../../examples/04-real-world-screens/profile-edit-rich.vspec.md) | Element type coverage screen using a realistic profile/settings form. | `Textarea`, `MultiSelect`, `CheckboxGroup`, `Switch`, `RadioGroup`, `List`, `Dialog`, `Image`, `Icon`, `Divider`, file inputs, date/time inputs, and number input. |
| [Search List](../../../examples/04-real-world-screens/search-list.vspec.md) | Search screen with filters and pagination. | Desktop toolbar, Select options, Table, empty state, load-error state, Model Samples, and display element replacement. |
| [Template Shell](../../../examples/05-reuse/template-shell.vspec.md) | Shared template shell. | Template document unit, navigation frame, top bar, language Select, and `content` slot placeholder. |
| [Profile Page With Template](../../../examples/05-reuse/profile-page-with-template.vspec.md) | Screen using a template slot and partial. | Front Matter `template`, `references.partials`, `## Slot: content`, route params, and `display.element` references to the partial host layout. |
| [Profile Summary Partial](../../../examples/05-reuse/profile-summary.partial.vspec.md) | Partial document rendered inside a screen. | `type: partial`, partial route, partial-local states, and server-side build action. |
| [History And Errors](../../../examples/06-structured-sections/history-and-errors.vspec.md) | Structured release-oriented sections. | Error Codes, custom History Fields, and History entries with Markdown body text. |

## Suggested Smoke Path

1. Open [Login Basic](../../../examples/01-basics/login-basic.vspec.md) and verify the preview
   renders both mobile and desktop viewport sections.
2. Toggle Layout, Element, and Action markers.
3. Switch viewport filters between `All`, `mobile`, and `desktop`.
4. Open [Search List](../../../examples/04-real-world-screens/search-list.vspec.md)
   and confirm model-backed rows render in the `idle` state.
5. Open [Model Samples](../../../examples/02-states/model-samples.vspec.md)
   and confirm list-style object and collection samples render.
6. Open [Event Triggers](../../../examples/03-actions/event-triggers.vspec.md)
   and confirm non-click events and lifecycle triggers render in Action Details.
7. Open [Notice Detail](../../../examples/04-real-world-screens/notice-detail.vspec.md)
   and confirm Display Content Spec separates wording, samples, data sources, formats, values, and params.
8. Open [Profile Edit Rich](../../../examples/04-real-world-screens/profile-edit-rich.vspec.md)
   and confirm the extended element type controls render without diagnostics.
9. Open [Profile Page With Template](../../../examples/05-reuse/profile-page-with-template.vspec.md)
   and confirm template composition and partial references render.
10. Open [History And Errors](../../../examples/06-structured-sections/history-and-errors.vspec.md)
   and confirm structured release metadata renders.
11. Run `npm run test -w @markvspec/core` before changing example syntax.
