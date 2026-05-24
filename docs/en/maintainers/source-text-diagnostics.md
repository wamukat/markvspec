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

Layout metadata coverage reports value-less unknown bullets directly under a
`## Layout:*` or `## Slot:*` layout group. Canonical value-less layout flags such
as `stack`, `row`, `grid`, and `inline` are represented as layout kinds and do
not warn. Key/value metadata such as `gap: md` is also represented; unsupported
key/value metadata remains an extension item and produces an `info` diagnostic
instead of this warning.

Example:

```markdown
## Layout: mobile

### L-Page

- stack
- gap: md
- unsupported layout sentence
```

`unsupported layout sentence` looks like meaningful author text, but it is not a
supported layout flag or property and is not rendered. The parser reports it as
unrepresented source text on the bullet line.

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

`#### Items` entries under layout groups are intentionally handled by the layout
item classifier, not the layout metadata classifier. Element references, layout
group references, field mappings, and slot references under `#### Items` should
not produce this warning.

## Known Limits

This is not yet a complete soundness guarantee for every Markdown text node in
the document. Current coverage is scoped to confirmed `Actions > Process`,
`Preview Scenarios`, and Layout metadata blind spots. Future expansion should
add section-specific classifiers rather than searching rendered HTML for raw
strings.
