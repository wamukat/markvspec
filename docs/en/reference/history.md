# History Reference

<!-- markvspec-coverage:reference.page.history -->

History covers two canonical sections:

- `## History Fields`: defines metadata fields for history entries.
- `## History`: defines revision entries.

The canonical section headings are exactly `## History Fields` and `## History`.
The current parser does not define Japanese aliases for these headings.

## History Fields

`## History Fields` is optional. Use it when the standard fields need a different
label, required flag, type, or when the document needs custom metadata fields.

```markdown markvspec-fragment section=history
## History Fields

- ticket
  label: Ticket
  required: false
  type: string
```

### Field Bullet

Each top-level bullet defines one field key.

| Syntax | Meaning |
| --- | --- |
| `- ticket` | Defines the field key `ticket` |
| `label: Ticket` | Display label in preview/export tables |
| `required: true` | Entry must provide this field |
| `type: date` | Field value must be `YYYY-MM-DD` |

Supported field properties:

| Property | Required | Values | Default |
| --- | --- | --- | --- |
| `label` | no | text | field key |
| `required` | no | `true` or any other value | `false` |
| `type` | no | `string`, `date` | `string` |

Unknown properties under a history field are not represented in output.

### Standard Fields

Effective History Fields always start with these standard fields.

| Field | Label | Required | Type |
| --- | --- | --- | --- |
| `date` | `Date` | yes | `date` |
| `author` | `Author` | yes | `string` |
| `reviewer` | `Reviewer` | no | `string` |
| `reason` | `Reason` | no | `string` |

Custom fields are merged by key. If a custom field uses one of the standard
keys, it replaces that standard field definition.

## History

`## History` contains revision entries. Each `### <version>` heading creates one
entry, and the heading text becomes the entry `Version`.

```markdown markvspec-fragment section=history
## History Fields

- ticket
  label: Ticket
  required: false
  type: string

## History

### 0.2

- date: 2026-05-15
- author: Docs Team
- reviewer: QA Lead
- ticket: DOC-118
- reason: Added release review metadata.

Added custom History Fields for release review.
```

### Entry Metadata

Metadata bullets are read only immediately after the entry heading, before the
entry body starts.

| Syntax | Meaning |
| --- | --- |
| `### 0.2` | Entry version. This is not a History Field. |
| `- date: 2026-05-15` | Metadata value for the `date` field |
| `- ticket: DOC-118` | Metadata value for a custom `ticket` field |

Any field key is syntactically accepted in entry metadata, because the key space
is defined by `## History Fields`. Undefined keys are preserved by the parser but
produce a warning diagnostic.

After the first non-metadata body line, later lines belong to the entry body.
The entry body is rendered as Markdown in the `Changes` column.

## Validation

The validator checks:

| Case | Severity | Message shape |
| --- | --- | --- |
| Duplicate custom field key | error | duplicate history field |
| Unknown field `type` | warning | use `string` or `date` |
| Missing required field | error | `History <version> is missing required field <key>.` |
| Undefined entry metadata field | warning | `History <version> uses undefined field <key>.` |
| `date` field not in `YYYY-MM-DD` format | warning | `History <version> field <key> must be a date in YYYY-MM-DD format.` |

`date` validation applies to any effective field whose type is `date`, including
custom fields.

## Rendering

Preview and static export render History as a table:

- `Version`
- each effective History Field label
- `Changes`

The document Basic Info uses the latest history entry in source order:

- `Version`: the entry heading text.
- `Date`: the entry `date` field.
- `Author`: the entry `author` field.

Project `document-list` export uses the greatest non-empty `date` metadata value
as `lastUpdated`, independently of source order. Parseable values are sorted as
dates; otherwise the exporter falls back to string ordering. Invalid date values
still produce diagnostics.

## Generated Grammar

The generated grammar page lists `History Fields` and `History` in the canonical
section order and marks History entry field keys as represented extensions:

- [Grammar](grammar.md)
- [Sections](sections.md)

## Example

- Source: `examples/06-structured-sections/history-and-errors.vspec.md`
- Showcase: [History And Errors](../../../examples/showcase/history-and-errors.html)
