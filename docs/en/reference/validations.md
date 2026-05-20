# Validations

## Purpose

Validations cover input constraints and error display. Keep field validation near elements and separate it from business rules.

## Example

```markdown
### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email
```

## Difference From Rules

Validation covers field format, required status, and ranges. `## Rules` covers screen or business decisions. Validator diagnostics are tool output, not `## Rules` content.

## Related Example

- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
