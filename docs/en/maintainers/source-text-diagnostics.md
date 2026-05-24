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

## Coverage Matrix

Classifications:

- `represented`: the source contributes to the semantic model, render model,
  generated document, preview, or static export.
- `represented-extension`: the source is not standard DSL, but it is preserved
  and reported as an extension `info` diagnostic.
- `unrepresented`: the source is parsed but not represented in output, so it
  reports `unrepresented-source-text`.
- `unsupported`: the source is a malformed or unsupported structured item and
  reports a warning or error.
- `intentional-ignore`: the source is a syntax marker, empty line, standalone
  authoring comment, or other explicitly non-rendered construct.
- `unknown`: current tests or docs are not strong enough to classify the source
  confidently.

### Cross-Cutting Block Coverage

| Source shape | Classification | Evidence / rule |
| --- | --- | --- |
| YAML Front Matter required and known fields | `represented` | Parsed by `parseMarkVSpec` / `parseMarkVSpecProject`; required-field and reference tests cover missing or malformed values. |
| YAML Front Matter unknown fields | `represented-extension` / `unsupported` | Unknown scalar top-level keys such as `x-owner: team-a` are preserved in Front Matter metadata and reported as `frontMatter.representedExtension` info diagnostics on the source line. Unknown non-scalar fields are `unsupported` because they cannot be preserved in the public `frontMatter` metadata map. |
| `# SCR-*` screen heading | `represented` | Heading ID/title are validated against Front Matter and drive screen metadata. |
| Top-level prose before the first `##` section | `represented` | Stored as the screen description; covered by `uses top-level prose as the screen description`. |
| Unknown or free-form `##` sections | `represented` | Preserved as free-form Markdown sections and do not affect semantic section ordering. |
| Section lead, entity lead, entity notes, and `### Section Notes` | `represented` | `sectionProse`, `overview`, and `notes` are rendered by preview/static export; covered by structured-section-prose tests. |
| Standalone HTML comment blocks | `intentional-ignore` | File-format and document-structure docs define these as source-only authoring comments; tests verify they are removed from prose and render invalidation. |
| Inline HTML comments inside paragraph text | `represented` | Not treated as hidden authoring comments; they remain part of the paragraph source. |
| Markdown tables in prose/notes | `represented` | `isEntityNoteBlock` and structured prose docs preserve tables as supplemental Markdown unless a section grammar consumes them. |
| Fenced code blocks in prose/notes | `represented` | Entity prose tests preserve code fences in overview/notes. |
| Blockquotes in prose/notes | `represented` | `isEntityNoteBlock` includes blockquotes as supplemental Markdown. |
| Raw HTML blocks other than standalone comments | `unknown` | They are not reported by current diagnostics, but display policy is weaker than paragraph/table/code/blockquote prose. Follow-up: classify as `represented` or `unsupported` once a concrete output expectation is defined. |
| Thematic breaks in structured prose | `unknown` | They are accepted as note blocks but have no source text diagnostic-specific assertion. Follow-up with raw HTML if output loss is observed. |

### Section Coverage

| Section / area | Headings and prose | Top-level list or table entries | Nested list entries | Current classification and follow-up |
| --- | --- | --- | --- | --- |
| Front Matter | N/A | YAML fields are `represented`; malformed YAML or missing required fields are `unsupported`; unknown scalar top-level keys are `represented-extension`; unknown non-scalar top-level keys are `unsupported`. | Nested `references.*` values are `represented` when they define templates/partials. | Unknown scalar YAML keys report `frontMatter.representedExtension` info diagnostics and do not become `unrepresented-source-text` warnings. Unknown non-scalar keys report `frontMatter.unsupportedExtension`. |
| Top-level overview prose | Paragraphs before the first `##` are `represented`. | N/A | N/A | Standalone comments are `intentional-ignore`. |
| Unknown/free-form sections | `##` heading and Markdown body are `represented`. | Lists/tables/code are `represented` as free-form Markdown. | Nested lists are `represented` as Markdown. | No structured diagnostics expected. |
| `## States` | Section lead/notes are `represented`. | State bullets are `represented`; malformed suffix markers are `unsupported`. | Nested bullets under a state are `represented` as the state message; nested bullets without a parent are `unsupported`. | Covered by state parser tests and structured prose tests. |
| `## Layout:*` | Section lead, layout group heading, layout overview, and notes are `represented`. | Canonical metadata (`stack`, `row`, `grid`, `inline`, `gap: md`) is `represented`; unknown key/value metadata is `represented-extension`; direct `L-*` / `E-*` child refs outside `#### Items` are `unsupported`; unknown value-less metadata is `unrepresented` (#1453). | `partial:` children are `represented`; other indented metadata is `unsupported`. | `#### Items` is classified separately and is not part of layout metadata diagnostics. |
| `## Slot:*` | Same as `## Layout:*`, scoped to slot content. | Same as `## Layout:*`; #1453 tests include Slot unknown value-less metadata. | Same as `## Layout:*`. | Covered by the same parser path as Layout. |
| `## Slots` | Section lead/notes and slot definition headings are `represented`. | Slot definition key/value bullets are `represented`; unsupported keys are `unsupported`. | Unexpected nested entries are `unsupported` or ignored by the slot-definition classifier. | No `unrepresented-source-text` coverage currently needed. |
| `## Elements` | Section/entity lead and notes are `represented`; malformed headings are `unsupported`. | Canonical element properties are `represented`; unknown element properties are `represented-extension`; malformed structured data is `unsupported`. | Recognized nested option/table/sample/control entries are `represented`; malformed nested entries are `unsupported`. | Covered by element validator and structured prose tests. |
| `## Actions` | Section/action lead and notes are `represented`; malformed headings are `unsupported`. | `#### From` and section-based process headings are `represented`; unsupported action/process structured items are `unsupported`. | Recognized process details, result entries, cases, effects, and syntax labels are `represented` or `intentional-ignore`; value-less unsupported process text is `unrepresented` (#1325/#1332). | Current `unrepresented-source-text` baseline coverage is here. |
| `## Events` | Section lead/notes are `represented`. | `event: A-ActionId` entries are `represented`; malformed value-less or empty action entries are `unsupported`. | Nested event entries are `unsupported` because they are ignored. | Covered by `parseEventsSection`; no text-specific warning currently needed. |
| `## Preview Scenarios` | Section/scenario lead and notes are `represented`; scenario headings are `represented`. | Canonical scalar properties (`state`, `view`, `model`, `before`) are `represented`; unknown value-less or unsupported keys are `unsupported`. | Children under `route`, `samples`, and `cases` are `represented`; children under scalar entries are `unrepresented` (#1332). | Syntax-only labels such as `route:`, `samples:`, and `cases:` are `intentional-ignore`. |
| `## Field Validations` / `## Cross-field Validations` / `## Validations` | Section/validation lead and notes are `represented`. | Validation headings and canonical rules/properties are `represented`; structured-looking list items before a valid heading are `unsupported`. | Rule targets and nested rule metadata are `represented`; unsupported nested validation items are `unsupported`. | Covered by validation-section semantic tests. |
| `## Business Rules` | Section/rule lead and notes are `represented`. | `### R-*` rules and free-form rule bullets are `represented`; unsupported rule properties are `unsupported`. | Rule nested body/properties are `represented` when accepted by the rule parser. | Free-form list-only Business Rules are intentionally `represented` as `R-BusinessRules`. |
| `## Error Codes` | Section/error-code lead and notes are `represented`. | `ERR-*` headings and key/value properties are `represented`; unsupported keys are `unsupported`. | Nested metadata follows the error-code structured item parser. | Covered by error-code parser and reference coverage docs. |
| `## History Fields` | Section overview/trailing notes are `represented`. | Field schema bullets are `represented`. | Nested schema metadata is `represented` where accepted; other content becomes notes only after structured content. | Uses raw-line section prose; covered by history tests. |
| `## History` | Section overview and notes are `represented`. | History entry headings and metadata bullets are `represented`; body paragraphs/lists are `represented`. | Nested body lists are `represented` as history body Markdown. | Covered by history tests. |
| `## Notes` | Section heading and Markdown body are `represented`. | Lists/tables/code are `represented` as note Markdown. | Nested lists are `represented`. | This is the preferred home for author text that is not DSL semantics. |
| `## Open Questions` | Section heading and Markdown body are `represented`. | Lists/tables/code are `represented` as note Markdown. | Nested lists are `represented`. | Same treatment as Notes. |

### Unknowns And Follow-Up Policy

Current `unknown` entries are not known false negatives; they are areas where
the source text diagnostics contract is not specific enough yet. If an issue is
reported for one of these cases, create a follow-up ticket with:

- the exact source example
- whether the expected classification is `represented`, `unsupported`, or
  `unrepresented`
- the expected diagnostic code, severity, and source line
- the preview/export/generated-document surface where the text should appear or
  where the author should be warned

Known follow-up candidates:

- Raw HTML blocks and thematic breaks in structured prose: confirm whether the
  renderer represents them consistently or whether they should receive an
  `unsupported` diagnostic.

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
