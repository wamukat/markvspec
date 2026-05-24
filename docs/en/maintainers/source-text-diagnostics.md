# Source Text Diagnostics

MarkVSpec should not silently drop meaningful source text. When a source line is
parsed but is not represented in a render model, preview/export semantic model,
diagnostic, or explicit ignore rule, it should produce a warning.

## Coverage

The first implementation covered `## Actions` `#### Pn: Process ...` subsections.
A value-less process bullet that is not a recognized block label is classified as
unrepresented source text and reported with diagnostic code
`unrepresented-source-text`.

Example:

```markdown
#### P1: Process Submit login
- Encode request body
- request:
  - method: POST
  - path: /login
```

`Encode request body` is meaningful author text, but it is not a supported
process property and is not rendered. The parser reports a warning instead of
dropping it silently.

The next coverage step covers `## Preview Scenarios` nested bullets under scalar
scenario entries such as `state:`, `view:`, `model:`, and `before:`. Those child
bullets do not contribute to the scenario model, so they are reported with the
same diagnostic code.

Example:

```markdown
### loaded

- state: loaded
  - Explain why loaded data is visible here
```

`Explain why loaded data is visible here` is author text nested under a scalar
scenario property. It is not represented by the preview scenario model and is
therefore reported as unrepresented source text.

## Intentional Ignores

The classifier intentionally ignores syntax-only labels such as
`request:`, `params:`, `result:`, `case:`, `display:`, and `update:`. Their child
entries carry the represented meaning.

Preview Scenario labels such as `route:`, `samples:`, and `cases:` are also
syntax-only labels. Their child entries are represented as route samples,
element samples, or case references.

Supported process details, result entries, case entries, state effects, layout
items, element properties, and section prose/notes are represented by existing
models and should not produce this warning.

## Known Limits

This is not yet a complete soundness guarantee for every Markdown text node in
the document. Current coverage is scoped to confirmed `Actions > Process` and
`Preview Scenarios` blind spots. Future expansion should add section-specific
classifiers rather than searching rendered HTML for raw strings.
