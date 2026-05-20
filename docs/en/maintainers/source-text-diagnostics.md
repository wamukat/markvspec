# Source Text Diagnostics

MarkVSpec should not silently drop meaningful source text. When a source line is
parsed but is not represented in a render model, preview/export semantic model,
diagnostic, or explicit ignore rule, it should produce a warning.

## Initial Coverage

The first implementation covers `## Actions` `Process Pn:` bullets. A value-less
process bullet that is not a recognized block label is classified as
unrepresented source text and reported with diagnostic code
`unrepresented-source-text`.

Example:

```markdown
- Process P1: Submit login
  - Encode request body
  - request:
    - method: POST
    - path: /login
```

`Encode request body` is meaningful author text, but it is not a supported
process property and is not rendered. The parser reports a warning instead of
dropping it silently.

## Intentional Ignores

The initial classifier intentionally ignores syntax-only labels such as
`request:`, `params:`, `result:`, `case:`, `display:`, and `update:`. Their child
entries carry the represented meaning.

Supported process details, result entries, case entries, state effects, layout
items, element properties, and section prose/notes are represented by existing
models and should not produce this warning.

## Known Limits

This is not yet a complete soundness guarantee for every Markdown text node in
the document. Initial coverage is scoped to the confirmed `Actions > Process`
blind spot. Future expansion should add section-specific classifiers rather than
searching rendered HTML for raw strings.
