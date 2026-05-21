# Sections

Sections are top-level headings in the `.vspec.md` body. MarkVSpec uses the section name to decide how to read the objects that follow.

## Syntax You Can Write

```markdown markvspec-skip reason=context
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

### Layout And P-* Panels

Use `L-*` for meaningful regions. Use `P-*` only for a helper group that adjusts
visual arrangement.

```markdown markvspec-skip reason=context
### L-Form Form

- stack

#### Items

- P-NameFields
- E-SubmitButton

### P-NameFields Name fields

- row

#### Items

- E-FirstNameInput
- E-LastNameInput
```

`P-*` can be used as a layout item, but preview does not show a layout marker for
it. `marker` is ignored, and `visible when` / `hidden when` / `disabled when` /
`enabled when` / `partial` / action or display `target` are not allowed. Use
`L-*` when a region needs to be targetable.

Recognized layout kinds are `stack`, `row`, `grid`, and `inline`. Use `stack`
for common vertical groups.

MarkVSpec recognizes these top-level sections.

| Section | What To Write |
| --- | --- |
| `## States` | Screen state names |
| `## Layout: mobile` | Layout groups and item order |
| `## Elements` | UI element meaning, labels, values, and actions |
| `## Actions` | Triggers, requests, effects, and cases |
| `## Events` | Page or lifecycle events that call actions |
| `## Form Groups` | Form-level field groups and submit action |
| `## View Context` | View context that changes independently from state |
| `## View Context Samples` | Named sets of view-context values |
| `## Field Validations` | Single-field constraints and messages |
| `## Cross-field Validations` | Multi-field or form-level checks |
| `## Validations` | Compatibility validation section. Prefer `Field Validations` / `Cross-field Validations` for new source |
| `## Preview Scenarios` | Named preview cases for states and Action case results |
| `## Business Rules` | Business rules and screen-specific decisions |
| `## Error Codes` | Reusable error definitions and display targets |
| `## Slots` | Template slot declarations |
| `## Slot: name` | Slot content supplied by a page or partial |
| `## History Fields` | Structured fields used by history entries |
| `## History` | Revision history entries |
| `## Notes` | Additional notes, implementation context, and intent |
| `## Open Questions` | Unresolved questions |

### States

Write states as bullets under `## States`. Add `*` to exactly one state when you
want to mark the initial state explicitly.

```markdown markvspec-skip reason=context
## States

- idle*
- loading
- error
```

Use the same state names from action cases, element visibility, and preview
notes.

### Form Groups

Use `## Form Groups` when several inputs are validated or submitted together.

```markdown markvspec-skip reason=context
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

```markdown markvspec-skip reason=context
## Events

- page.load: A-LoadPreferences
```

Use it for initial load, partial initialization, or data refresh triggered by
the screen lifecycle. See
[Parallel Initial Load](../../../examples/showcase/parallel-initial-load.html).

### View Context

Use `## View Context` and `## View Context Samples` when tabs, selected rows,
open help panels, or similar display context changes without creating another
state.

```markdown markvspec-fragment
## View Context

### selectedTab

- type: enum
- values:
  - profile*
  - billing

## View Context Samples

### billing-tab

- selectedTab: billing
```

`## Validations` is recognized for compatibility. For new source, write
single-field checks in `## Field Validations` and cross-field checks in
`## Cross-field Validations`.

### Preview Scenarios

Use `## Preview Scenarios` to name reviewable preview states without duplicating
the whole screen.

Preview Data is the umbrella term for values that MarkVSpec passes to
preview/export rendering. It includes scalar Element display values, Element
`sample rows:`, Preview Scenario `samples:`, Preview Scenario `route:`, and
`## View Context Samples`.

```markdown markvspec-skip reason=context
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
states. `samples:` is Scenario Preview Data for Element-specific values. Use
`E-ElementId: value` for ordinary elements and `rows:` for `Table` / `List`.
Use `rows: []` for an empty repeated view.

```markdown markvspec-skip reason=context
- samples:
  - E-Users:
    - rows:
      - row:
        - name: Alice
  - E-EmptyUsers:
    - rows: []
```

`route:` is Route Preview Data for route parameters and hash fragments. It must
be a block. Keys other than `hash` should match a `:param` in the screen
metadata `route:`.

`cases:` references Action results in the `A-ActionId.P-marker.case-name` form.
`view:` references a `## View Context Samples` name. `before:` names the state
or scenario that this scenario should appear before. `model:` is kept as the
model name for the State View.

When a scenario name is exactly the same as a state name and omits `state:`, it
is baseline sample data for that state, not an additional scenario. In that
form, only `samples:` and `route:` are allowed.

See [Scenario Preview Data](../../../examples/showcase/scenario-samples.html)
and [Display Effects](../../../examples/showcase/display-effects.html).

### Field And Cross-Field Validations

Use `## Field Validations` for one input. Use `## Cross-field Validations` when
the check depends on multiple inputs or a form group.

```markdown markvspec-skip reason=context
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

```markdown markvspec-skip reason=context
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
display style. Each error code must define `business rule`, `target`, `message`,
and `display`. Recognized `display` values are `inline`, `form`, `global`,
`banner`, `toast`, `dialog`, and `none`.

```markdown markvspec-skip reason=context
## Business Rules

### R-EmailMustBeUnique Email must be unique

- messages:
  - Email is already registered.

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

```markdown markvspec-skip reason=context
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

```markdown markvspec-fragment
## Elements

### E-Message Paragraph

- text: Check your inbox.
- tone: info

## Open Questions

- Should the resend action be visible before 30 seconds?
```

![Hello Screen sections and generated preview](../../assets/vscode-previews/hello-screen-sections-vscode-preview.png)

## Notes

- Use the fixed English section names, even in Japanese documents.
- Markdown headings declare objects. They are not visual heading decoration.
- Objects use `### ID Name` or marker-prefixed `### marker:ID Name` headings.
- Subsections such as `#### Items` belong to the previous object.
- Unknown sections may be treated as prose and may not participate in preview or validation.

## Related Pages

- [File Format](./file-format.md)
- [Elements](./elements.md)
- [Actions](./actions.md)
- [Business Rules](./rules.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
