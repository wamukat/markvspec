# Structured Section Reference

This reference describes each MarkVSpec `Section` using the document structure
terms defined in [DSL](dsl.md#document-structure-terms). It is based on the
current implementation's recognized level-2 sections.

## Recognized Sections

The current parser recognizes these sections:

- `## States`
- `## Layout` and `## Layout: <viewport>`
- `## Slot: <name>` and `## Slot: <name>: <viewport>`
- `## Slots`
- `## Elements`
- `## Form Groups`
- `## Actions`
- `## View Context`
- `## View Context Samples`
- `## Preview Scenarios`
- `## Field Validations`
- `## Cross-field Validations`
- `## Validations` (legacy-compatible)
- `## Business Rules`
- `## Error Codes`
- `## History Fields`
- `## History`

Unrecognized level-2 sections, including `## Notes` and `## Open Questions`, are
`Free-form Section`s.

## Common Prose Rules

- `Section Lead` describes the whole section and appears before that section's
  structured summary in generated documents.
- `Section Notes` describe the whole section after its structured definitions.
  Entity-style sections use `### Section Notes` for unambiguous section-level
  notes after entities.
- `Entity Lead` describes one entity and appears at the beginning of that
  entity's detail. Some summaries also use it as their description text.
- `Entity Notes` supplement one entity after its `Structured Body`.
- `Structured Body` is the machine-readable DSL. Prose regions are preserved as
  Markdown but are not interpreted as DSL semantics.

## Section Matrix

| Section | Role | Entity Block | Structured Body | Preview / generated document |
| --- | --- | --- | --- | --- |
| `States` | Defines display states. | No. | Top-level state list; `*` marks initial state. | State list, state flow, and baseline State Views. |
| `Layout` / `Layout: <viewport>` | Defines wireframe layout groups for a viewport. | Yes: `### [marker:]L-* Name` and presentation `P-*`. | Layout kind/properties and `#### Items`. | Wireframe and State View Layouts fragment. |
| `Slot: <name>` | Defines screen-provided content for a template slot. | Yes: same as Layout. | Layout kind/properties and `#### Items`. | Composed wireframe at the template slot. |
| `Slots` | Defines template-owned slot contracts. | Yes: `### <slot-name>`. | Slot metadata such as `required`, `purpose`, and `default: <ID>`. | Template slot summary. |
| `Elements` | Defines UI elements. | Yes: `### [marker:]E-* Type`. | Element properties such as `label`, `src`, `action`, `action event`, `visible when`. | Wireframe elements, Element Summary, and detail fragments. |
| `Form Groups` | Defines semantic form units. | Yes: `### F-* Name`. | Field/member references and submit/validation metadata. | Form group summary and validation context. |
| `Events` | Defines lifecycle event dispatches to actions. | No. | `page.load: A-*`, `partial.render: A-*`. | System events and action caller labels. |
| `Actions` | Defines accepted states, processes, and outcomes. | Yes: `### [marker:]A-* Name`. | `From`, `Process`, process `case`, `Effects`, `stop`, `continue`. | Action Summary, Action Details, action markers, state flow, and transition diagrams. |
| `View Context` | Defines UI-local context separate from state. | Definition headings, not ID entities: `### <view-name>`. | View type, values, and optional default `*`. | State View context resolution and condition evaluation. |
| `View Context Samples` | Names reusable view context value sets. | Sample headings, not ID entities: `### <sample-name>`. | View values keyed by `${view.*}`. | Preview scenario and baseline view resolution. |
| `Preview Scenarios` | Adds explicit state/view/sample preview combinations. | Scenario headings, not ID entities: `### <scenario-name>`. | State, view, before, cases, and `samples`. | Additional State Views after baseline state previews. |
| `Field Validations` | Defines client-side single-field validation contracts. | Yes: `### [marker:]V-* Name`. | `target`, optional `run`, `constraints`, and messages. | Validation summary and display-message resolution. |
| `Cross-field Validations` | Defines client-side form or multi-input validation contracts. | Yes: `### [marker:]V-* Name`. | `target`, `inputs`, `check`, optional `run`, and messages. | Validation summary and display-message resolution. |
| `Validations` | Legacy-compatible validation section. | Yes: `### [marker:]V-* Name`. | Validation properties, rules/constraints, target/scope/run, and messages. | Validation summary and display-message resolution. |
| `Business Rules` | Defines domain or UI business rules. | Optional: `### R-* Name`; otherwise top-level list. | Rule list or rule entity properties. | Business rule summary and display-message resolution. |
| `Error Codes` | Maps error codes to UI display contracts. | Yes: `### ERR-* Name`. | Error code properties such as code, message, display, target. | Error code summary and display-message resolution. |
| `History Fields` | Defines metadata fields used by history entries. | No. | Top-level field list. | History field summary. |
| `History` | Defines document change history. | History entry headings, not normal entities: `### <version>`. | Entry metadata list followed by changes body. | History table/detail. |
| Free-form sections | Preserves notes and open questions. | No DSL entity interpretation. | Markdown only. | Preserved as authored Markdown. |

## Section Details

### States

Use `Section Lead` for the state model's intent. There is no `Entity Block`.
`Structured Body` starts at the first top-level state list item. Prose after the
state list is `Section Notes`.

```markdown
## States

The screen tracks request progress only.

- idle*
- fetching
- loaded

`fetching` disables submit actions.
```

### Layout / Slot Content

Use `Section Lead` for viewport or slot-level intent. Each `L-*` or `P-*`
heading is an `Entity Block`. `Entity Lead` describes the layout group before
layout properties. `Structured Body` contains layout kind/properties and
`#### Items`. Prose after layout properties, directly under `#### Items`, or
after the item list is `Entity Notes`.

For the prose positions below:

- `(A)` is `Section Lead`.
- `(B)` is `Entity Lead`.
- `(C)`, `(D)`, and `(E)` are `Entity Notes`.

`Layout` `Entity Lead` and `Entity Notes` should be displayed with the Layouts
fragment in generated documents. They may also inform wireframe annotations, but
the wireframe itself remains driven by `Structured Body`.

```markdown
## Layout: mobile
(A)

### L1:L-Page Async fetching page
(B)

- stack
- gap: md
(C)

#### Items
(D)

- E-Title
- E-RefreshButton
- L-StatusArea
(E)
```

### Slots

`Slots` defines template-owned slot contracts. Use `Section Lead` for the contract set.
Each `### <slot-name>` heading is an `Entity Block`. `Entity Lead` describes the
slot purpose; `Structured Body` contains slot metadata such as `required` and
`default: <ID>`; `Entity Notes` add slot specific caveats. `default: <ID>` must
refer to an `E-*` element or `L-*` layout in the same template. Use
`### Section Notes` for notes about all slots.

```markdown
## Slots

### content

Main page content slot.

- required: true
```

### Elements

Use `Section Lead` for the element catalog. Each `### [marker:]E-* Type` heading
is an `Entity Block`. `Entity Lead` is a richer description than `description` or
`purpose`; `Structured Body` contains element properties; `Entity Notes` hold
element-specific caveats. The preview interprets only the structured properties.

```markdown
## Elements

### E-SubmitButton Button

Submits the current form.

- label: Submit
- variant: primary
- action: A-Submit
```

### Form Groups

Use `Section Lead` for the form model. Each `### F-* Name` heading is an
`Entity Block`. `Structured Body` contains field membership and form-level
validation or submit metadata.

```markdown
## Form Groups

### F-Login Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
```

### Actions

Use `Section Lead` for action design policy. Each `### [marker:]A-* Name`
heading is an `Entity Block`. `Entity Lead` is the authored action summary.
`Structured Body` contains source states, processes, cases, and effects. User
callers come from Element `action:` properties. Use `action event:` for
non-click callers. Lifecycle callers come from `## Events`. `Entity Notes`
appear in Action Details, not in Action Summary.

```markdown
## Actions

### A1:A-Submit Submit

Validate and send the form.

- From
  - idle
- Process P1: Send request
  - request:
    - method: POST
    - path: /login
  - case: sent
    - Effects
      - state: submitting
```

### Preview Scenarios

`Preview Scenarios` uses scenario headings rather than ID-bearing entities.
`Section Lead` describes all scenarios. `### <scenario-name>` starts a scenario
that can bind `state`, `view`, `before`, display `cases`, and `samples`.
Scenario `samples` are structured preview overrides keyed by Element ID.

```markdown
## Preview Scenarios

### loaded-with-results

- state: loaded
- samples:
  - E-ItemsTable:
    - rows:
      - row:
        - name: First item
```

### View Context

Use `View Context` for UI-local context such as selected tab or open panel.
Each `### <view-name>` heading starts a view context definition, but it is not an
ID-bearing `Entity Block`. Supported types are enum-like value lists and boolean
values.

```markdown
## View Context

### selectedTab

- type: enum
- values:
  - summary*
  - details

### isHelpPanelOpen

- type: boolean
- values:
  - false*
  - true
```

### View Context Samples

Use this section to name reusable view values. Each `### <sample-name>` heading
starts a sample, but it is not an ID-bearing `Entity Block`.

```markdown
## View Context Samples

### default

- ${view.selectedTab}: summary
- ${view.isHelpPanelOpen}: false
```

### Preview Scenarios

Use this section to add explicit preview combinations. Each
`### <scenario-name>` heading starts a scenario, but it is not an ID-bearing
`Entity Block`. If absent, preview/export still renders all states as baseline
previews.

```markdown
## Preview Scenarios

### loaded details

- state: loaded
- view: default
```

### Field Validations / Cross-field Validations

Use `Field Validations` for single-field checks and `Cross-field Validations`
for form-level or multi-input checks. Server-detected domain constraints belong
in `Business Rules`, and concrete API errors belong in `Error Codes`. Each
`### [marker:]V-* Name` heading is an `Entity Block`. `Structured Body`
contains target, constraints or inputs/check, optional run, and messages.

```markdown
## Field Validations

### V-EmailRequired Email required

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
```

### Business Rules

Use `Business Rules` for domain rules. A simple top-level list is treated as a
free-form rule set. Use `### R-* Name` when a rule needs its own `Entity Lead`,
`Structured Body`, or `Entity Notes`.

```markdown
## Business Rules

### R-AccountLocked Locked account

- condition: account is locked
- message: Account is locked.
```

### Error Codes

Each `### ERR-* Name` heading is an `Entity Block`. `Structured Body` maps a code
or condition to display text and target.

```markdown
## Error Codes

### ERR-AUTH-401 Invalid credentials

- code: 401
- display: banner
- target: L-MessageArea
```

### History Fields

There is no `Entity Block`. The top-level field list is `Structured Body`.
Prose before and after the field list is `Section Lead` and `Section Notes`.

```markdown
## History Fields

- author
  - type: string
- date
  - type: date
```

### History

`### <version>` starts a history entry, but history entries are not normal
`Entity Block`s. The metadata list after the heading is `Structured Body`; prose
after metadata is the entry changes body, not `Entity Notes`.

```markdown
## History

### 0.3.0

- date: 2026-05-17

- Added validation examples.
```

### Free-form Sections

Any unrecognized level-2 section is preserved as Markdown and is not split into
`Section Lead`, `Structured Body`, and `Section Notes`.

```markdown
## Open Questions

- Should the help panel be a View Context value?
```
