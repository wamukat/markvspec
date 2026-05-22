# Examples

Use examples as screen patterns you can copy into your own `.vspec.md` file.
The example catalog links to showcase pages where the published source and the
dynamic browser-generated design document preview are shown together. Runtime
failures show diagnostics plus source/raw links instead of falling back to a
pre-generated example HTML artifact. The experimental Online Live Editor is
separate from showcase: use it only when you explicitly want an editable browser
PoC.

- [Example catalog](../../../examples/)
- [Hello Screen showcase](../../../examples/showcase/hello-screen.html)
- [Login showcase](../../../examples/showcase/login-basic.html)
- [Form Submit Flow showcase](../../../examples/showcase/form-submit-flow.html)
- [Profile Home showcase](../../../examples/showcase/profile-page-with-template.html)

## Choose By Task

| Task | Start With | Use When |
| --- | --- | --- |
| Beginner | [Hello Screen](../../../examples/showcase/hello-screen.html) | You want the smallest file that opens in preview. |
| Form and validation | [Login](../../../examples/showcase/login-basic.html) | You need required fields, submit, response cases, and error messages. |
| Loading / empty / error | [Async Fetching](../../../examples/showcase/async-loading.html) | You need request states, empty results, and error display. |
| Partial update | [Profile Home](../../../examples/showcase/profile-page-with-template.html) | A server response replaces part of the screen. |
| Navigation and overlays | [Action Menu](../../../examples/showcase/action-menu.html) | You need tabs, menus, dialogs, popovers, or toasts. |
| Reuse and templates | [Account Shell](../../../examples/showcase/template-shell.html) | Multiple screens share a shell or slot. |

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

- [Start: First Screen](../start/first-screen.md)
- [Guide: Markdown Model](../guide/markdown-model.md)
- [Guide: Actions](../guide/actions.md)
- [Guide: Partial Updates](../guide/partial-updates.md)
- [Reference: File Format](../reference/file-format.md)
- [Recipes: Login Form](../recipes/login-form.md)
