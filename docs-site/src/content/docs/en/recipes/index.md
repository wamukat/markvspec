---
title: "Recipes"
---

Recipes are the goal-oriented entry point for common UI specification patterns.

MarkVSpec describes screen states, elements, actions, and outcomes semantically. It is not a place for implementation code or framework-specific attributes. When you are unsure where to start, open the closest recipe and begin from the minimal shape.

## Choose By Goal

| Goal | Recipe | Main Concepts |
| --- | --- | --- |
| Describe login, validation, and authentication request in one screen | [Login Form](/markvspec/en/recipes/login-form/) | `Elements`, `Business Rules`, `Actions`, `case:` |
| Model initial loading, loading, empty, error, and success | [Loading And Error](/markvspec/en/recipes/loading-error/) | `States`, `page.load`, `case:` |
| Specify server-rendered partial replacement | [Server Partial Update](/markvspec/en/recipes/server-partial-update/) | `request`, `display`, `target`, `partial` |
| Share `.vspec.md` as HTML / PDF | [PDF Export](/markvspec/en/recipes/pdf-export/) | VS Code export, CLI export |

## Reading Order

1. Pick the recipe that matches the screen goal.
2. Do not blindly copy the `Minimal Shape`; replace IDs, labels, paths, and state names with your screen vocabulary.
3. Check `Common Pitfalls` to avoid leaking implementation details or CSS into the spec.
4. Open the related example to see the preview shape.
5. Use the guide / reference only when you need more detail.

## Browse By Example

- [Hello Screen](/markvspec/examples/showcase/hello-screen.html): Minimal document structure.
- [Login](/markvspec/examples/showcase/login-basic.html): Form, validation, and authentication flow.
- [Async Fetching](/markvspec/examples/showcase/async-loading.html): Loading / empty / error state transitions.
- [Display Updates](/markvspec/examples/showcase/display-effects.html): Messages, toasts, dialogs, and field feedback.
- [Profile Home](/markvspec/examples/showcase/profile-page-with-template.html): Template and partial refresh behavior.

## Browse By Reference

- [Guide](/markvspec/en/guide/): Learn the authoring flow.
- [Actions Guide](/markvspec/en/guide/actions/): Requests, cases, and effects.
- [Partial Updates Guide](/markvspec/en/guide/partial-updates/): Server-rendered partial update model.
- [CLI Reference](/markvspec/en/reference/cli/): validation, HTML/PDF export, and project `document-list` export.
- [Reference](/markvspec/en/reference/): Sections, IDs, elements, and rules.

## How To Use Recipes

- Write at screen-specification level. Do not write implementation code, CSS classes, or raw framework attributes.
- Use `SCR-*`, `L-*`, `E-*`, `A-*`, and `R-*` IDs so screens, layouts, elements, actions, and rules are traceable.
- Put behavior that changes state under `Actions` and `case:` entries.
- Make the user-visible result explicit with `state`, `update`, `display`, or `navigate`.
- Keep one `.vspec.md` as the source of truth for preview and export.
