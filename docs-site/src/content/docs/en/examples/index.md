---
title: "Examples"
---

Use examples as screen patterns you can copy into your own `.vspec.md` file.
The generated catalog is the main place to browse source and preview together.

- [Example catalog](/markvspec/examples/)
- [Hello Screen showcase](/markvspec/examples/showcase/hello-screen.html)
- [Login showcase](/markvspec/examples/showcase/login-basic.html)
- [Form Submit Flow showcase](/markvspec/examples/showcase/form-submit-flow.html)
- [Profile Home showcase](/markvspec/examples/showcase/profile-page-with-template.html)

## Choose By Task

| Task | Start With | Use When |
| --- | --- | --- |
| Beginner | [Hello Screen](/markvspec/examples/showcase/hello-screen.html) | You want the smallest file that opens in preview. |
| Form and validation | [Login](/markvspec/examples/showcase/login-basic.html) | You need required fields, submit, response cases, and error messages. |
| Loading / empty / error | [Async Fetching](/markvspec/examples/showcase/async-loading.html) | You need request states, empty results, and error display. |
| Partial update | [Profile Home](/markvspec/examples/showcase/profile-page-with-template.html) | A server response replaces part of the screen. |
| Navigation and overlays | [Action Menu](/markvspec/examples/showcase/action-menu.html) | You need tabs, menus, dialogs, popovers, or toasts. |
| Reuse and templates | [Account Shell](/markvspec/examples/showcase/template-shell.html) | Multiple screens share a shell or slot. |

## Recommended Order

1. `Hello Screen`: learn the smallest file shape.
2. `Login`: copy a real form flow with validation and response cases.
3. `Async Fetching`: model loading, empty, and error states.
4. `Search List`: combine filters, results, paging, and replacement.
5. `Profile Home`: see template composition and partial refresh.

## How To Copy An Example

- Copy the closest `.vspec.md` into your workspace.
- Change Front Matter `id`, `title`, and `route`.
- Rename states, layout groups, elements, and actions to match your screen.
- Keep behavior semantic. Write what changes on the screen before adding framework-specific details.
- Open preview and check that states, actions, and messages are visible.

## Related Documentation

- [Start: First Screen](/markvspec/en/start/first-screen/)
- [Guide: Markdown Model](/markvspec/en/guide/markdown-model/)
- [Guide: Actions](/markvspec/en/guide/actions/)
- [Guide: Partial Updates](/markvspec/en/guide/partial-updates/)
- [Reference: File Format](/markvspec/en/reference/file-format/)
- [Recipes: Login Form](/markvspec/en/recipes/login-form/)
