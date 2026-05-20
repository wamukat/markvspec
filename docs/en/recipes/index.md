# Recipes

Recipes are the goal-oriented entry point for common UI specification patterns.

MarkVSpec describes screen states, elements, actions, and outcomes semantically. It is not a place for implementation code or framework-specific attributes. When you are unsure where to start, open the closest recipe and begin from the minimal shape.

## Choose By Goal

| Goal | Recipe | Main Concepts |
| --- | --- | --- |
| Describe login, validation, and authentication request in one screen | [Login Form](login-form.md) | `Elements`, `Business Rules`, `Actions`, `case:` |
| Model initial loading, loading, empty, error, and success | [Loading And Error](loading-error.md) | `States`, `page.load`, `case:` |
| Specify server-rendered partial replacement | [Server Partial Update](server-partial-update.md) | `server`, `display`, `mode: replace` |
| Share `.vspec.md` as HTML / PDF | [PDF Export](pdf-export.md) | VS Code export, CLI export |

## Reading Order

1. Pick the recipe that matches the screen goal.
2. Do not blindly copy the `Minimal Shape`; replace IDs, labels, paths, and state names with your screen vocabulary.
3. Check `Common Pitfalls` to avoid leaking implementation details or CSS into the spec.
4. Open the related example to see the preview shape.
5. Use the guide / reference only when you need more detail.

## Browse By Example

- [Hello Screen](../../../examples/showcase/hello-screen.html): Minimal document structure.
- [Login](../../../examples/showcase/login-basic.html): Form, validation, and authentication flow.
- [Async Fetching](../../../examples/showcase/async-loading.html): Loading / empty / error state transitions.
- [Display Updates](../../../examples/showcase/display-effects.html): Messages, toasts, dialogs, and field feedback.
- [Profile Home](../../../examples/showcase/profile-page-with-template.html): Template and partial refresh behavior.

## Browse By Reference

- [Guide](../guide/index.md): Learn the authoring flow.
- [Actions Guide](../guide/actions.md): Requests, cases, and effects.
- [Partial Updates Guide](../guide/partial-updates.md): Server-rendered partial update model.
- [CLI Reference](../reference/cli.md): HTML / PDF export from the CLI.
- [Reference](../reference/index.md): Sections, IDs, elements, and rules.

## How To Use Recipes

- Write at screen-specification level. Do not write implementation code, CSS classes, or raw framework attributes.
- Use `SCR-*`, `L-*`, `E-*`, `A-*`, and `R-*` IDs so screens, layouts, elements, actions, and rules are traceable.
- Put behavior that changes state under `Actions` and `case:` entries.
- Make the user-visible result explicit with `state`, `update`, `display`, or `navigate`.
- Keep one `.vspec.md` as the source of truth for preview and export.
