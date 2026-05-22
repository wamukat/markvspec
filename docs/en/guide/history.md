# History

Use `## History Fields` and `## History` when the screen specification itself
needs review history that is visible in preview, export, and document review.

History is different from Git commit history. Git explains how the source file
changed. MarkVSpec History explains which version of the screen specification a
reviewer should read, when it was changed, who authored it, and why the product
meaning changed.

## Authoring Flow

1. Define the metadata columns in `## History Fields` when the standard fields
   are not enough.
2. Write revision entries under `## History`.
3. Use the entry heading `### <version>` as the version. Do not define
   `version` as a history field.
4. Put metadata bullets immediately after the entry heading.
5. Write the change summary as Markdown prose after the metadata bullets.

```markdown markvspec-fragment section=history
## History Fields

- ticket
  label: Ticket
  required: false
  type: string

- approvedBy
  label: Approved By
  required: false
  type: string

## History

### 0.2

- date: 2026-05-15
- author: Docs Team
- reviewer: QA Lead
- ticket: DOC-118
- approvedBy: QA Lead
- reason: Added release review metadata.

Added custom History Fields so release reviewers can track ticket and approval
metadata inside the generated design document.
```

## Standard Fields

Every document has these effective history fields, even when `## History Fields`
is omitted.

| Field | Required | Type | Use |
| --- | --- | --- | --- |
| `date` | yes | `date` | Revision date in `YYYY-MM-DD` format |
| `author` | yes | `string` | Person or team that authored the revision |
| `reviewer` | no | `string` | Person or team that reviewed the revision |
| `reason` | no | `string` | Why the revision was made |

Custom fields such as `ticket` or `approvedBy` are appended to these standard
fields. If a custom field uses the same key as a standard field, it overrides
that field's label, required flag, and type.

## Entry Body

The body after the metadata bullets is kept as Markdown prose. Use it for a
human-readable change summary, not as another metadata list.

```markdown markvspec-fragment section=history
### 1.0

- date: 2026-05-20
- author: Product Design
- reason: Release candidate for account settings.

Released the first reviewed account settings specification.

- Added required-field validation.
- Added save failure handling.
```

## Basic Info And Preview

Preview and static export show `## History` as a structured table with
`Version`, each effective field label, and `Changes`.

The document Basic Info uses the latest history entry in source order:

- `Version` comes from the entry heading.
- `Date` comes from the entry's `date` metadata.
- `Author` comes from the entry's `author` metadata.

Project document-list export uses the greatest non-empty `date` metadata value
for `lastUpdated`. Parseable dates are sorted as dates; otherwise the exporter
falls back to string ordering. Invalid date values still produce diagnostics.

## When To Add History

Add History when the specification is reviewed as an artifact: release specs,
approval workflows, compliance-sensitive screens, or shared product documents.
For a quick draft or throwaway exploration, Git history is usually enough.

## Example

See [History And Errors](../../../examples/showcase/history-and-errors.html) for
a complete screen that combines Error Codes, custom History Fields, and History
entries.

## Next Reading

- [History Reference](../reference/history.md)
- [Sections Reference](../reference/sections.md)
- [CLI Reference](../reference/cli.md)
