# Layout

Layout describes screen structure and order. Prefer meaningful groups, direction, gap, and items over low-level CSS details.

## Minimal Example

```markdown
## Layout

### L-Form Login Form

- column
- gap: sm

#### Items

- "Email": E-EmailInput
- "Password": E-PasswordInput
- "Submit": E-SignInButton
```

## Authoring Notes

- Use `L-*` IDs for layout groups.
- Use `Items` to connect labels with element IDs.
- Do not write width, height, or CSS class details.

## Related Example

- [Responsive Profile](../../../examples/showcase/responsive-profile.html)

## Related Reference

- [Reference](../reference/index.md)
