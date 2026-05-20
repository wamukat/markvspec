# Concepts

This section explains the product ideas behind MarkVSpec.

MarkVSpec is a Markdown-first format for screen specifications. It is designed
for product work where a screen should be easy to read, review, version, preview,
and edit with AI assistance.

## Text-first, Not Visual-first

Modern UI design tools usually start from a canvas. MarkVSpec starts from text.
That choice makes the source suitable for:

- pull request reviews and line diffs
- Git history and local-first workflows
- AI edits that can preserve structure
- lightweight authoring in VS Code
- low-fidelity preview and export from the same source

The preview matters because Markdown is readable, but it is not a visual design
surface. The VS Code preview gives immediate feedback while the Markdown remains
the canonical source.

## Screen-first Authoring

One `.vspec.md` file describes one screen. Componentization can happen in the
implementation, but the primary authoring model stays screen-oriented so product,
design, and engineering reviewers can discuss behavior in one place.

## Semantic UI Specs

MarkVSpec describes intent instead of raw CSS or framework attributes.

- `variant` describes priority, such as `primary` or `secondary`.
- `tone` describes semantic intent, such as `warning` or `danger`.
- `Process` and `HttpRequest` describe what an action does.
- `Cases` and `update` describe state changes and partial updates.

This keeps the document useful across implementation stacks while still being
structured enough for validation and rendering.

## Read Next

- [Start](../start/)
- [Guide: Markdown Model](../guide/markdown-model.md)
- [Guide: Actions](../guide/actions.md)
- [Reference](../reference/)
- [Examples](../examples/)
