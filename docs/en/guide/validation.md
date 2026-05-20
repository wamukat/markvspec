# Validation

Validation keeps input rules and error behavior in the source. Separating field constraints from action failure cases makes missing rules easier to spot.

## Minimal Example

```markdown
### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email

### R-EmailRequired Rule

- target: E-EmailInput
- message: Email is required
```

## Authoring Notes

- Keep field constraints near the element.
- Split business rules into `R-*` rules.
- Use action failure cases to update error state or message areas.

## Related Example

- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)

## Related Reference

- [Reference](../reference/index.md)
