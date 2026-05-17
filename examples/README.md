# MarkVSpec Examples

The examples are organized as a learning path. Open them in order when checking
the DSL, preview, State Views, Action Details, and export output.

- `01-basics/hello-screen.vspec.md`: minimum document shape with metadata, one state, one viewport, layout, elements, and a click action marker.
- `02-states/async-loading.vspec.md`: asynchronous state modeling for request send, response handling, loading, loaded, empty, and error previews.
- `02-states/scenario-samples.vspec.md`: baseline Element samples and Preview Scenario data variations, including table `rows: []` in the same loaded state.
- `02-states/responsive-profile.vspec.md`: mobile and desktop layout variants over shared elements.
- `03-actions/event-triggers.vspec.md`: `screen.load`, `.change`, `.blur`, `.focus`, `.submit`, and dialog click/close triggers with visible display effects.
- `03-actions/form-submit-flow.vspec.md`: submit lifecycle with validation receive source, request parameters, server process details, stop/continue flow, and navigation.
- `03-actions/single-field-validation.vspec.md`: focused single-field validation contracts and browser-facing input constraints without request or navigation noise.
- `03-actions/toast-feedback.vspec.md`: non-modal toast feedback from action cases, targetless display effects, toast stacks, and Error Codes with `display: toast`.
- `03-actions/parallel-initial-load.vspec.md`: grouped parallel server calls, response cases, and final Resolve state decision.
- `04-real-world-screens/notice-detail.vspec.md`: Display Content Spec mapping for wording, data sources, samples, formats, values, and navigation params.
- `04-real-world-screens/profile-edit-rich.vspec.md`: extended element catalog for form controls, media, list content, and modal dialog wiring.
- `04-real-world-screens/search-list.vspec.md`: real-world search list with filters, table sample rows, paging, empty/error states, and result replacement.
- `04-real-world-screens/login-basic.vspec.md`: compact authentication flow covering responsive layout, required validation, request parameters, response cases, disabled controls, and navigation.
- `05-reuse/template-shell.vspec.md`: template document unit, reusable navigation shell, language select, and `content` slot placeholder.
- `05-reuse/basic-slot-page.vspec.md`: smallest screen that fills a template `content` slot without partial or action noise.
- `05-reuse/responsive-template-shell.vspec.md`: mobile and desktop template shell that renders the same slot in different viewport layouts.
- `05-reuse/responsive-slot-page.vspec.md`: viewport-neutral slot fallback for mobile and viewport-specific slot override for desktop.
- `05-reuse/default-slot-page.vspec.md`: template slot default fallback when the screen intentionally provides no slot content.
- `05-reuse/profile-page-with-template.vspec.md`: template composition, route params, referenced partials, slot content, and partial refresh.
- `05-reuse/profile-summary.partial.vspec.md`: partial document route, partial-local states, and server-side load/build action for a host screen.
- `06-structured-sections/history-and-errors.vspec.md`: Error Codes, custom History Fields, History entries, and a small save flow that references them.
