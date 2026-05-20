# Rules

## Purpose

`## Rules` describes business rules and screen-specific decisions. Keep it separate from input validation.

## Example

```markdown
## Rules

### R-AccountLocked Locked account

- when: account.status is locked
- effect: disable E-SignInButton
- message: Account is locked
```

## Difference From Validator Diagnostics

`## Rules` is author-written specification content. Validator diagnostics are tool output from parser / validator checks.

## Related Example

- [Account Settings](../../../examples/showcase/history-and-errors.html)

## Old Document

- [DSL reference](../user/dsl.md)
