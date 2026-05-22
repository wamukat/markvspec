# Validations

Validations cover validation contracts and error display. Put input metadata in `## Elements`, validation rules and messages in `## Field Validations`, and screen or business decisions in [Business Rules](rules.md).

## Boundary

| If the check is about... | Put it in |
| --- | --- |
| Required input metadata | The `Input` element `required` or `input rule` |
| Format, length, range, or pattern metadata | The `Input` element `input rule`, or `NumberInput` `min` / `max` / `step` |
| Validation rules and user-facing messages | `## Field Validations` |
| Comparing multiple fields | `## Cross-field Validations`, `## Business Rules`, or a pre-submit action |
| A server response for one field | `## Actions` `case:` with `display` targeting the field error |
| A product decision such as permission, stock, or contract state | `## Business Rules`, then the server response `case:` |

## Syntax You Can Write

```markdown markvspec-skip reason=requires-validation-context
## Elements

### E-EmailInput Input

- label: Email
- value: email
- type: email
- input rule:
  - type: email

## Field Validations

### V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required:
    - message: Email is required.
  - email:
    - message: Enter a valid email address.
```

### Structured Properties

<!-- markvspec-generated:reference-validations:start -->
This block is generated from `packages/core/src/grammar-definition.ts`. Do not hand-edit it; update the grammar definition and regenerate the docs.

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `marker` | `canonical` | represented | - | Validation property. |
| `description` | `canonical` | represented | - | Validation property. |
| `target` | `canonical` | represented | - | Validation property. |
| `scope` | `canonical` | represented | - | Validation property. |
| `run` | `canonical` | represented | - | Validation property. |
| `inputs` | `canonical` | represented | - | Validation property. |
| `rules` | `canonical` | represented | - | Validation property. |
| `constraints` | `canonical` | represented | - | Validation property. |
| `check` | `canonical` | represented | - | Validation property. |
| `when` | `canonical` | represented | - | Validation property. |
| `message` | `canonical` | represented | - | Validation property. |
| `messages` | `canonical` | represented | - | Validation property. |
| `error code` | `canonical` | represented | - | Validation property. |
<!-- markvspec-generated:reference-validations:end -->

### Common Constraints

| Constraint | Example | Use |
| --- | --- | --- |
| `required` | `- required:` | Do not allow an empty value |
| `email` | `- email:` | Email format |
| `length: element` | `- length: element` | Use `input rule` `min length` / `max length` metadata |
| `range: element` | `- range: element` | Use `NumberInput` `min` / `max` / `step` metadata |
| `pattern` | `- pattern:` | Domain-specific input format |

### Error Messages

Write error messages as `message` rows under each `## Field Validations` constraint.

```markdown markvspec-skip reason=requires-validation-context
- constraints:
  - required:
    - message: Password is required.
  - length: element
    - message: Use at least 8 characters.
```

## Small Example

```markdown markvspec-skip reason=requires-validation-context
### E-QuantityInput Input

- label: Quantity
- value: quantity
- input rule:
  - required

### E-AgeInput NumberInput

- label: Age
- min: 13
- max: 120

## Field Validations

### V-QuantityRules Quantity rules

- target: E-QuantityInput
- constraints:
  - required:
    - message: Quantity is required.

### V-AgeRange Age range

- target: E-AgeInput
- constraints:
  - range: element
    - message: Age must be between 13 and 120.
```

![Single Field Validation preview](../../assets/vscode-previews/single-field-validation-vscode-preview.png)

## Notes

- Element-level `constraints` and `error:` are not current MarkVSpec syntax.
- Write validation rules as `V-*` entries in `## Field Validations`.
- `## Business Rules` covers business rules and screen-specific conditions.
- Validator diagnostics are tool output, separate from validation requirements written in the source.
- Error display elements can be written in `## Elements` as `Paragraph` or `Text` with `tone: danger`.
- Server response errors are clearest when written in `## Actions` with `case:` and `display`.
- Use `display` `message` for user-visible error text. Use `element` or `partial` when the result shows an existing element or partial.

## Related Pages

- [Guide: Validation](../guide/validation.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
