# Sections

Sections are top-level headings in the `.vspec.md` body. MarkVSpec uses the section name to decide how to read the objects that follow.

## Syntax You Can Write

```markdown markvspec-skip reason=requires-cross-section-context
## States

- idle*
- loading
- error

## Layout: mobile

### L-Page Page layout

- stack
- gap: md

#### Items

- E-Title
- E-Submit
```

MarkVSpec recognizes these top-level sections.

<!-- markvspec-generated:reference-sections:start -->
This block is generated from `packages/core/src/grammar-definition.ts`. Do not hand-edit it; update the grammar definition and regenerate the docs.

| Section | Heading Pattern | Order |
| --- | --- | --- |
| `## States` | `"States"` | 1 |
| `## Layout` | `"Layout" \| "Layout:" viewport` | 2 |
| `## Slot` | `"Slot:" slot_name [":" viewport]` | 2 |
| `## Slots` | `"Slots"` | 3 |
| `## Elements` | `"Elements"` | 4 |
| `## Form Groups` | `"Form Groups"` | 5 |
| `## Events` | `"Events"` | 6 |
| `## Actions` | `"Actions"` | 7 |
| `## View Context` | `"View Context"` | 8 |
| `## View Context Samples` | `"View Context Samples"` | 9 |
| `## Preview Scenarios` | `"Preview Scenarios"` | 10 |
| `## Field Validations` | `"Field Validations"` | 11 |
| `## Cross-field Validations` | `"Cross-field Validations"` | 12 |
| `## Validations` | `"Validations"` | 13 |
| `## Business Rules` | `"Business Rules"` | 14 |
| `## Error Codes` | `"Error Codes"` | 15 |
| `## History Fields` | `"History Fields"` | 16 |
| `## History` | `"History"` | 17 |

Recommended section order: `States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Events, Actions, View Context, View Context Samples, Preview Scenarios, Field Validations, Cross-field Validations, Validations, Business Rules, Error Codes, History Fields, History`

`## Notes` and `## Open Questions` are not recognized sections in the structured render model; they remain hand-written prose.
<!-- markvspec-generated:reference-sections:end -->

### States

Write states as bullets under `## States`. Add `*` to exactly one state when you
want to mark the initial state explicitly.

```markdown markvspec-skip reason=requires-cross-section-context
## States

- idle*
- loading
- error
```

Use the same state names from action cases, element visibility, and preview
notes.

### Form Groups

Use `## Form Groups` when several inputs are validated or submitted together.

```markdown markvspec-skip reason=requires-cross-section-context
## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
- submit: A-SubmitLogin
```

Use it for login, search, profile, and settings forms. See
[Login Basic](../../../examples/showcase/login-basic.html) and
[Form Submit Flow](../../../examples/showcase/form-submit-flow.html).

### Events

Use `## Events` for lifecycle events that are not clicked from an element.

```markdown markvspec-skip reason=requires-cross-section-context
## Events

- page.load: A-LoadPreferences
```

Use it for initial load, partial initialization, or data refresh triggered by
the screen lifecycle. See
[Parallel Initial Load](../../../examples/showcase/parallel-initial-load.html).

### Preview Scenarios

Use `## Preview Scenarios` to name reviewable preview states without duplicating
the whole screen.

Preview Data is the umbrella term for values that MarkVSpec passes to
preview/export rendering. It includes scalar Element display values, Element
`sample rows:`, Preview Scenario `samples:`, Preview Scenario `route:`, and
`## View Context Samples`.

```markdown markvspec-skip reason=requires-cross-section-context
## Preview Scenarios

### idle-validation-error

- state: idle
- cases:
  - A-SubmitLogin.P1.invalid
- samples:
  - E-EmailInput: invalid@example
- route:
  - token: expired
```

Use it when a reviewer must see error, empty, dialog, toast, or direct-link
states. `samples:` is Scenario Preview Data for Element-specific values.
`route:` is Route Preview Data for route parameters and hash fragments.

See [Scenario Preview Data](../../../examples/showcase/scenario-samples.html)
and [Display Effects](../../../examples/showcase/display-effects.html).

### Field And Cross-Field Validations

Use `## Field Validations` for one input. Use `## Cross-field Validations` when
the check depends on multiple inputs or a form group.

```markdown markvspec-skip reason=requires-cross-section-context
## Field Validations

### V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.

## Cross-field Validations

### V-LoginForm Required login fields

- target: F-LoginForm
- inputs:
  - E-EmailInput
  - E-PasswordInput
- check: email and password are both present
```

See [Single Field Validation](../../../examples/showcase/single-field-validation.html)
and [Login Basic](../../../examples/showcase/login-basic.html).

### Slots

Use `## Slots` in a template to declare the slot. Use `## Slot: name` in a page
or partial to provide content for that slot.

```markdown markvspec-skip reason=requires-cross-section-context
## Slots

### content Main content

- required
- default: E-EmptySlotMessage

## Slot: content

### L-AccountContent Account content

#### Items

- E-Title
```

Use `## Slot: name: viewport` for viewport-specific slot content. See
[Profile Page With Template](../../../examples/showcase/profile-page-with-template.html)
and [Responsive Slot Page](../../../examples/showcase/responsive-slot-page.html).

### Error Codes

Use `## Error Codes` when the same error needs a stable code, target, and
display style.

```markdown markvspec-skip reason=requires-cross-section-context
## Error Codes

### ER1:ERR-EMAIL-ALREADY-REGISTERED Email already registered

- business rule: R-EmailMustBeUnique
- target: E-SubmitError
- message: Email is already registered.
- display: banner
```

See [Form Submit Flow](../../../examples/showcase/form-submit-flow.html).

### History

Use `## History Fields` to define structured fields, then write release entries
under `## History`.

```markdown markvspec-skip reason=requires-cross-section-context
## History Fields

- date
  label: Date
  required: true

## History

### 0.1

- date: 2026-05-10
- author: Docs Team
- reason: Initial version.
```

Use it for specification files that need review history. See
[History And Errors](../../../examples/showcase/history-and-errors.html).

## Small Example

```markdown markvspec-skip reason=requires-cross-section-context
## Elements

### E-Message Paragraph

- text: Check your inbox.
- tone: info

## Open Questions

- Should the resend action be visible before 30 seconds?
```

![Hello Screen sections and rendered preview](../../assets/vscode-previews/hello-screen-sections-vscode-preview.png)

## Notes

- Use the fixed English section names, even in Japanese documents.
- Markdown headings declare objects. They are not visual heading decoration.
- Objects use `### ID Name` or marker-prefixed `### marker:ID Name` headings.
- Subsections such as `#### Items` belong to the previous object.
- Unknown sections may be treated as prose and may not participate in preview or validation.

## Related Pages

- [File Format](file-format.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
