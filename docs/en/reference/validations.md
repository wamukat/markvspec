# Validations

Validations cover input constraints and error display. Keep field validation near the element, and put screen or business decisions in [Business Rules](rules.md).

## Syntax You Can Write

```markdown
## Elements

### E-EmailInput Input

- label: Email
- value: email
- required
- constraints
  - format: email
  - maxLength: 255
- error:
  - required: Email is required.
  - format: Enter a valid email address.
```

### Common Constraints

| Constraint | Example | Use |
| --- | --- | --- |
| `required` | `- required` | Do not allow an empty value |
| `format` | `- format: email` | Formats such as email or URL |
| `minLength` | `- minLength: 8` | Minimum character count |
| `maxLength` | `- maxLength: 255` | Maximum character count |
| `min` | `- min: 1` | Lower bound for numbers or counts |
| `max` | `- max: 99` | Upper bound for numbers or counts |
| `pattern` | `- pattern: ^[A-Z0-9]+$` | Domain-specific input format |

### Error Messages

Error messages can be written in a shape that matches constraints.

```markdown
- error:
  - required: Password is required.
  - minLength: Use at least 8 characters.
```

## Small Example

```markdown
### E-QuantityInput Input

- label: Quantity
- value: quantity
- required
- constraints
  - min: 1
  - max: 10
- error:
  - min: Quantity must be at least 1.
  - max: Quantity must be 10 or less.
```

![Single Field Validation preview](../../assets/previews/single-field-validation-showcase.png)

## Notes

- Validation covers field format, required status, and ranges.
- `## Business Rules` covers business rules and screen-specific conditions.
- Validator diagnostics are tool output, separate from validation requirements written in the source.
- Error display elements can be written in `## Elements` as `Paragraph` or `Text` with `tone: danger`.
- Server response errors are clearest when written in `## Actions` with `case:` and `display`.

## Related Pages

- [Guide: Validation](../guide/validation.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
