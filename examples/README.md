# MarkVSpec Examples

The examples are organized as a learning path. Open them in order when checking
the DSL, preview, State Views, Action Details, and export output.

- `01-basics/hello-screen.vspec.md`: minimum document shape with metadata, one state, one viewport, layout, elements, and a click action marker.
- `01-basics/login-basic.vspec.md`: compact login flow covering responsive layout, required validation, request parameters, response cases, disabled controls, and navigation.
- `02-states/async-loading.vspec.md`: asynchronous state modeling for request send, response handling, loading, loaded, empty, and error previews.
- `02-states/model-samples.vspec.md`: model-backed preview data with list-style Model Samples, state-specific samples, and supplemental empty table syntax.
- `02-states/responsive-profile.vspec.md`: mobile and desktop layout variants over shared elements and state-aware actions.
- `03-actions/event-triggers.vspec.md`: `screen.load`, `.change`, `.blur`, `.focus`, `.submit`, and dialog click/close triggers with visible display effects.
- `03-actions/form-submit-flow.vspec.md`: submit lifecycle with validation receive source, request parameters, server process details, stop/continue flow, and navigation.
- `03-actions/single-field-validation.vspec.md`: focused single-field validation contracts and browser-facing input constraints without request or navigation noise.
- `03-actions/parallel-initial-load.vspec.md`: grouped parallel server calls, model effects, response cases, and final Resolve state decision.
- `04-real-world-screens/notice-detail.vspec.md`: Display Content Spec mapping for wording, data sources, samples, formats, values, and navigation params.
- `04-real-world-screens/profile-edit-rich.vspec.md`: extended element catalog for form controls, media, list content, and modal dialog wiring.
- `04-real-world-screens/search-list.vspec.md`: real-world search list with filters, table rows from Model Samples, paging, empty/error states, and result replacement.
- `05-reuse/template-shell.vspec.md`: template document unit, reusable navigation shell, language select, and `content` slot placeholder.
- `05-reuse/profile-page-with-template.vspec.md`: template composition, route params, referenced partials, slot content, and partial refresh.
- `05-reuse/profile-summary.partial.vspec.md`: partial document route, partial-local states, and server-side load/build action for a host screen.
- `06-structured-sections/history-and-errors.vspec.md`: Error Codes, custom History Fields, History entries, and a small save flow that references them.
