# Structured Section Reference Prototype

This prototype confirms the shape used by:

- `docs/en/user/structured-section-reference.md`
- `docs/ja/user/structured-section-reference.md`

## Coverage

The reference covers the current implementation's recognized sections:

| Section | Kind | Entity shape |
| --- | --- | --- |
| `States` | state list | none |
| `Layout` / `Layout: <viewport>` | layout groups | `### [marker:]L-* Name`, `### [marker:]P-* Name` |
| `Slot: <name>` | slot content layout groups | same as Layout |
| `Slots` | template slot definitions | `### <slot-name>` |
| `Elements` | element catalog | `### [marker:]E-* Type` |
| `Form Groups` | form group catalog | `### F-* Name` |
| `Actions` | action catalog | `### [marker:]A-* Name` |
| `Model Samples` | sample groups | `### <state>`, `#### ${model.path}` |
| `View Context` | view context definitions | `### <view-name>`, not an ID entity |
| `View Context Samples` | named view sets | `### <sample-name>`, not an ID entity |
| `Preview Scenarios` | explicit preview combinations | `### <scenario-name>`, not an ID entity |
| `Validations` | validation catalog | `### [marker:]V-* Name` |
| `Business Rules` | rule catalog/list | optional `### R-* Name` |
| `Error Codes` | error code catalog | `### ERR-* Name` |
| `History Fields` | history metadata schema | none |
| `History` | history entries | `### <version>` entry, not a normal entity |
| Free-form sections | preserved Markdown | none |

## Layout Prose Ownership Check

```markdown
## Layout: mobile
(A)

### L1:L-Page Async loading page
(B)

- stack
- gap: md
(C)

#### Items
(D)

- E-Title
- E-RefreshButton
- L-StatusArea
- E-ItemsTable
- E-EmptyText
(E)
```

Interpretation:

- `(A)`: `Section Lead`
- `(B)`: `Entity Lead`
- `(C)`: `Entity Notes`
- `(D)`: `Entity Notes`
- `(E)`: `Entity Notes`

Display policy:

- Layout `Section Lead` appears before the Layouts fragment for that viewport or slot.
- Layout `Entity Lead` appears with the corresponding row/detail in the Layouts fragment.
- Layout `Entity Notes` appears after the corresponding layout structured details.
- Wireframe rendering remains driven by `Structured Body`; prose may annotate the generated document but must not become layout semantics.
