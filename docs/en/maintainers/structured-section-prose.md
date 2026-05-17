# Supplemental Prose in Structured Sections

## Role of This Document

This internal design note defines how MarkVSpec assigns paragraphs, Markdown tables, and code blocks inside structured sections to semantic owners, and how preview / generated documents display them.

User-facing DSL guidance belongs in [DSL reference](../user/dsl.md). Preview display responsibilities should stay aligned with [Preview information architecture](preview-information-architecture.md).

## Background

MarkVSpec is a constrained DSL, but it is also Markdown. Authors naturally put explanatory prose before and after structured lists.
The final specification should not silently discard authored prose. At the same time, prose that is not structured data must not be treated as an implementation contract by inference.

## Terms

- Section Lead
  - Supplemental prose inside a `##` section before the first structured data block.
  - Describes the whole section.
- Section Notes
  - Supplemental prose inside a `##` section after section-level structured data.
  - Adds notes for the whole section.
- Entity Lead
  - Supplemental prose immediately under a `###` entity heading before the first entity structured data block.
  - Describes that entity.
- Entity Notes
  - Supplemental prose after entity structured data.
  - Adds notes for that entity.
- Supplemental prose
  - Paragraphs, Markdown tables, and code blocks.
  - List items and headings are not included because they may be structured DSL.
  - Markdown tables are structured data when the section grammar requires them, for example Element `sample rows:`.
  - HTML blocks, thematic breaks, and unknown Markdown blocks are not preserved until a display policy exists; they are diagnostic targets.
- Structured data
  - Headings, lists, tables, and other blocks interpreted by the section grammar.

## Principles

- Do not silently discard supplemental prose.
- Prose before structured data is lead.
- Prose after structured data is notes.
- Preview / generated documents display lead and notes.
- Unreserved `##` sections remain free-form sections; they are not split into lead / notes.
- Do not warn merely because prose exists. Warn only when ownership cannot be decided or the prose looks like malformed structured data.
- Breaking changes are acceptable where they make ownership explicit. Content previously treated as notes may become lead.

## Common Syntax

```markdown
## States

This screen models authentication progress as states.

- idle*
- wait-auth
- auth-error

`auth-error` keeps the entered values.
```

Handling:

- `This screen...`
  - Section Lead for `States`.
- State list
  - Structured `States` data.
- `` `auth-error` keeps... ``
  - Section Notes for `States`.

## Ownership Rules

### Section Level

Structured `##` sections may have Section Lead and Section Notes.

- Supplemental prose before the first section-level structured data:
  - Section Lead.
- Supplemental prose after the last section-level structured data:
  - Section Notes.
- In entity sections, supplemental prose before the first `###` entity:
  - Section Lead.
- In entity sections, supplemental prose after the first `###` entity:
  - Belongs to the previous entity by default.
  - Markdown does not provide a stable end marker for the last entity.
- To write section-level notes in an entity section:
  - Use reserved `### Section Notes`.
  - `### Section Notes` is a notes marker for the containing `##` section, not an entity.
  - The parser checks it before normal entity-heading parsing.

### Entity Level

Entities starting with a `###` heading may have Entity Lead and Entity Notes.

- Supplemental prose immediately after the `###` heading and before the first entity structured data:
  - Entity Lead.
- Supplemental prose after entity structured data until the next `###` heading or next `##` section:
  - Entity Notes.
- If `### Section Notes` appears:
  - Following supplemental prose is Section Notes and is not assigned to the entity.

### Start of Structured Data

The start of structured data is the first block that can be validly interpreted by the current section grammar.
Malformed headings and malformed list items are not structured-data starts. Supplemental prose after them is ambiguous and should produce diagnostics.

## Section-Specific Rules

### States

- Structured data starts at the first top-level list item.
- Section Lead describes the state list.
- Section Notes adds notes for the state list.
- Child list items under a state remain that state's description.
- There are no entities.

### Layout / Slot

- Structured data starts at the first `### L-*` or `### P-*`.
- Section Lead describes the viewport or slot content as a whole.
- Section Notes are written under `### Section Notes`.
- Entity Lead is prose under `### L-*` / `### P-*` before layout properties or `#### Items`.
- Entity Notes are prose after layout properties or `#### Items`.
- List items under `#### Items` remain layout items.

### Slots

- Structured data starts at the first `### <slot-name>`.
- Section Lead describes the slot definitions.
- Section Notes are written under `### Section Notes`.
- Entity Lead / Notes describe individual slot definitions.

### Elements

- Structured data starts at the first `### E-*`.
- Section Lead describes the element catalog.
- Section Notes are written under `### Section Notes`.
- Entity Lead appears in Element Summary Description and element detail.
- Entity Notes appear in element detail. If shown in summaries, they should be less prominent than lead.
- `description` / `purpose` are short list descriptions.
- Entity Lead is detailed prose.
- Element Summary Description uses the first available value in this order: `description`, `purpose`, first Entity Lead paragraph.
- Element detail shows both `description` / `purpose` and Entity Lead.

### Form Groups

- Structured data starts at the first `### F-*`.
- Section Lead describes the form group list.
- Section Notes are written under `### Section Notes`.
- Entity Lead describes the semantic form unit.
- Entity Notes add FormGroup notes.

### Actions

Actions formalize the existing behavior.

- Structured data starts at the first `### A-*`.
- Section Lead describes the action list.
- Section Notes are written under `### Section Notes`.
- Entity Lead is prose under the action heading before the first structured list such as `Triggered`, `From`, `Process`, `Cases`, or `Effects`.
- Entity Lead appears in Action Summary and Action Details.
- Entity Notes are prose after the action structured list.
- Entity Notes appear in Action Details, not Action Summary.

### Preview Scenarios

Preview Scenarios may have lead / notes at the section and scenario levels.

- Structured data starts at the first `### <scenario-name>`.
- Section Lead describes the scenario set.
- Section Notes are written under `### Section Notes`.
- Scenario lead is prose under `### <scenario-name>` before the first scenario property.
- Scenario notes are prose after the scenario properties.
- `samples` and `display` child lists remain structured scenario data.

### Validations

- Structured data starts at the first `### V-*`.
- Section Lead describes the validation list.
- Section Notes are written under `### Section Notes`.
- Entity Lead describes the validation purpose.
- Entity Notes add validation notes.

### Business Rules

- Structured data starts at the first top-level list item or `### R-*`.
- Section Lead describes the rule set.
- Section Notes are written under `### Section Notes`.
- `### R-*` rules may have Entity Lead / Notes.
- If there is no `### R-*` and only list items, the list is treated as the free-form `R-BusinessRules` rule.

### Error Codes

- Structured data starts at the first `### ERR-*`.
- Section Lead describes the error code list.
- Section Notes are written under `### Section Notes`.
- Entity Lead describes the error code intent.
- Entity Notes add error code notes.

### History Fields

- Structured data starts at the first field list item.
- Section Lead describes the history metadata schema.
- Section Notes describe the schema as a whole.
- Because `History Fields` has no per-field entities, supplemental prose after the field list is Section Notes.
- There is no field-level lead / notes.

### History

History entry body text is semantically changes, so it differs from normal entity sections.

- Structured data starts at the first `### <version>`.
- Section Lead describes the whole history.
- Section Notes are written under `### Section Notes`.
- The metadata list after `### <version>` is history entry metadata.
- Supplemental prose after metadata is the history entry changes body.
- History entries do not have Entity Lead / Notes.

## Free-Form Sections

Unreserved `##` sections are preserved as Markdown.
They are not interpreted as structured DSL and are not split into Section Lead / Notes.

```markdown
## Implementation Memo

- Prefer server-side rendering for the first release.
```

## Display Rules

- Section Lead appears immediately under the structured section heading.
- Section Notes appears at the end of the structured section.
- Entity Lead appears in the entity detail location.
- Entity Notes appears in the entity detail location.
- Whether lead appears in a list summary depends on the entity type.

Summary display policy:

- Action Summary
  - Shows `Entity Lead`.
  - Does not show `Entity Notes`.
- Element Summary
  - Shows `Entity Lead` as Description.
  - `Entity Notes` primarily appear in detailed element sections.
- Validation summary
  - Shows `Entity Lead` in the existing table supplemental column.
  - Shows `Entity Notes` in the same table with less emphasis.
  - No dedicated detail article in the initial implementation.
- Form Groups
  - Shows `Entity Lead` in the description column.
  - Shows `Entity Notes` in the same table with less emphasis.
- Error Codes
  - Shows `Entity Lead` / `Entity Notes` in the existing table supplemental column.
  - No dedicated detail article in the initial implementation.

## Diagnostics

Do not warn when supplemental prose can be assigned to lead / notes.

Warn for:

- Supplemental prose in a structured section that cannot be assigned to any lead / notes owner.
- Supplemental prose after a malformed heading.
- Top-level list items that look like structured data but are not valid in the current section.
- HTML blocks, thematic breaks, or unknown Markdown blocks without a stable preview display policy.

Do not initially warn merely because Notes text contains specification-like words.
Words such as "transition" or "error" also appear in ordinary notes. If this is added later, it should be limited to stronger patterns such as missing required structured data.

## Data Model Direction

The parse result needs section-level supplemental data in addition to entity `overview` / `notes`.

Candidate shape:

```ts
interface MarkVSpecSectionProse {
  sectionId: string;
  title: string;
  kind: SectionKind;
  viewport?: string;
  slotName?: string;
  overview: string[];
  notes: string[];
  location: SourceLocation;
  renderKeys: string[];
}
```

Entity types reuse or extend existing `overview?: string[]` / `notes?: string[]`.
Preview Scenarios need type extensions for prose on scenario entries.
History entries keep `bodyLines` as changes and do not add entry overview / notes.

For repeated section instances:

- `Layout: <viewport>` prose carries `sectionId` and `viewport`.
- `Slot: <name>` prose carries `sectionId`, `slotName`, and optionally `viewport`.
- In composed screens, template-derived prose and screen-derived prose follow the same exclusion granularity as template items.
- In partial / focused preview, prose outside the focus target is not displayed.

## Implementation Split

1. Core parser foundation for section prose.
2. Unified entity prose for Layout, Slots, Elements, Form Groups, Actions, Validations, Business Rules, and Error Codes.
3. Preview Scenarios prose for section and scenario entries.
4. History / History Fields prose, handled separately because they use the raw line parser.
5. Preview / generated document display.
6. Diagnostics for unowned prose, malformed-heading prose, malformed structured data, and unsupported Markdown blocks.
7. Documentation and examples.

## Acceptance Criteria

- Prose before the `## States` list is displayed as Section Lead.
- Prose after the `## States` list is displayed as Section Notes.
- State child lists remain state descriptions.
- `## Actions` `Entity Lead` / `Entity Notes` remain compatible with existing behavior.
- `## Elements` entity lead / notes appear in detail output.
- Supplemental prose in `## Validations`, `## Form Groups`, and `## Error Codes` is not silently discarded.
- Unreserved `##` sections render as free-form Markdown sections.
- Unowned prose produces diagnostics.
- Existing structured-data parse results do not regress.
