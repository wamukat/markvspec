# MarkVSpec Examples

Examples are organized by the screen pattern you want to copy. Start with
`beginner`, then jump to the workflow closest to your screen.

## Beginner

- `01-basics/hello-screen.vspec.md`: the smallest screen that still previews in VS Code.

## Form And Validation

- `03-actions/form-submit-flow.vspec.md`: submit, request, response cases, and field feedback.
- `03-actions/single-field-validation.vspec.md`: one input with required / format constraints and error text.
- `04-real-world-screens/login-basic.vspec.md`: compact login flow with validation, disabled controls, request, response, and navigation.
- `04-real-world-screens/profile-edit-rich.vspec.md`: larger edit form with richer controls and dialog wiring.

## Loading, Empty, And Error States

- `02-states/async-loading.vspec.md`: fetching, loaded, empty, and error states for a list.
- `03-actions/parallel-initial-load.vspec.md`: parallel initial requests and final state selection.
- `04-real-world-screens/search-list.vspec.md`: filters, results, paging, empty state, error state, and replacement.
- `02-states/scenario-samples.vspec.md`: sample data variations for the same state.

## Partial Updates

- `03-actions/display-effects.vspec.md`: messages, dialogs, toasts, and layout insertion as action results.
- `05-reuse/profile-page-with-template.vspec.md`: a host screen that refreshes a partial.
- `05-reuse/profile-summary.partial.vspec.md`: partial document loaded by a host screen.

## Navigation And Overlay UI

- `03-actions/event-triggers.vspec.md`: page load, change, blur, focus, submit, and dialog events.
- `03-actions/toast-feedback.vspec.md`: toast feedback from action cases.
- `04-real-world-screens/tabs-settings.vspec.md`: tabs, active panel, and item actions.
- `04-real-world-screens/anchored-help.vspec.md`: popover and tooltip anchors.
- `04-real-world-screens/accordion-disclosure.vspec.md`: accordion / disclosure open state.
- `04-real-world-screens/action-menu.vspec.md`: action menu, disabled item, and danger action.

## Reuse And Templates

- `05-reuse/template-shell.vspec.md`: reusable shell with a content slot.
- `05-reuse/basic-slot-page.vspec.md`: smallest screen that fills a template slot.
- `05-reuse/responsive-template-shell.vspec.md`: mobile / desktop slot placement in a shell.
- `05-reuse/responsive-slot-page.vspec.md`: viewport-specific slot content.
- `05-reuse/default-slot-page.vspec.md`: template default content when a page supplies nothing.

## Content And Display Details

- `02-states/source-kind-metadata.vspec.md`: source, kind, and format metadata for displayed values.
- `04-real-world-screens/notice-detail.vspec.md`: display wording, data sources, samples, formats, values, and navigation params.
- `06-structured-sections/history-and-errors.vspec.md`: error codes, history fields, history entries, and a small save flow.
