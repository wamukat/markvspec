# Examples

This section is the documentation entry point for reading `examples/` as a
learning path.

The generated example catalog is the primary place to browse runnable `.vspec.md`
screens:

- [Example catalog](../../../examples/)
- [Hello Screen showcase](../../../examples/showcase/hello-screen.html)
- [Login Basic showcase](../../../examples/showcase/login-basic.html)
- [Form Submit Flow showcase](../../../examples/showcase/form-submit-flow.html)
- [Partial Profile showcase](../../../examples/showcase/profile-summary.partial.html)

## How To Read Examples

Start with `Hello Screen`, then follow the catalog learning path. Each showcase
keeps the source and generated preview side by side, so you can see how Markdown
headings and bullets become a low-fidelity UI specification.

Use examples for:

- learning the file shape before reading the full reference
- copying a small screen pattern into a new `.vspec.md` file
- checking how actions, states, and partial updates are written together
- reviewing renderer coverage for common UI patterns

## Learning Order

The catalog learning path moves from the base file shape toward practical
screens:

1. `Hello Screen`: the smallest shape for Front Matter, states, layout, elements, and actions.
2. `Async Fetching`: loading / error states and initial loading.
3. `Responsive Profile`: mobile / desktop layout variants.
4. `Form Submit Flow`: form submit, request, success / failure cases.
5. `Single Field Validation`: field validation and error text.
6. `Display Updates`: changing displayed content as an action outcome.

If you jump into the middle, read `What this teaches` and the related docs on
the showcase page first. They explain what the example is meant to demonstrate.

## Applying An Example

Examples are not just snippets to copy. Use them to understand the screen spec
shape, then adapt the intent to your screen. Change these first:

- Front Matter `id`, `title`, and `route`.
- State names under `## States`.
- Layout group names and `Items`.
- Element labels, text, tone, and variant.
- Action process, request, case, and update details.

Before adding framework-specific attributes, check whether the behavior can be
expressed as semantic MarkVSpec action / update content.

## Related Documentation

- [Start: First Screen](../start/first-screen.md)
- [Guide: Markdown Model](../guide/markdown-model.md)
- [Guide: Actions](../guide/actions.md)
- [Reference: File Format](../reference/file-format.md)
- [Reference: Elements](../reference/elements.md)
- [Recipes: Login Form](../recipes/login-form.md)
