---
title: "Business Rules"
---

`## Business Rules` describes business rules and screen-specific decisions. Keep it separate from input validation, tool diagnostics, and implementation-level if statements.

Use Business Rules when the decision depends on product meaning: permissions, account status, plan restrictions, stock, date relationships, or multiple fields. Do not use this section for basic input shape such as required, format, min, or max.

## Syntax You Can Write

```markdown
## Business Rules

### R-AccountLocked Locked account

- when: account.status is locked
- effect: disable E-SignInButton
- message: Account is locked.

### R-AccountRequiresMfa Account requires MFA

- when:
  - account.mfaRequired is true
  - device is not trusted
- effect: show E-MfaStep
- message: Additional verification is required.
```

### Rule Heading

Declare a rule with the `### R-* Name` form.

```markdown
### R-PasswordPolicy Password policy
```

### Common Properties

| Property | Use |
| --- | --- |
| `when` | Condition, written as one line or nested bullets |
| `effect` | Screen effect when the condition is true |
| `message` | Explanation or error shown to the user |
| `appliesTo` | Target element, layout, or action |
| `priority` | Priority when multiple rules may apply |

## Small Example

```markdown
### R-EmptyResult Empty search result

- when: search returns no items
- effect: show E-EmptyMessage
- message: No matching results.
```

![History And Errors business rules preview](../../assets/vscode-previews/history-and-errors-vscode-preview.png)

## Difference From Validator Diagnostics

Validator Diagnostics are tool output from parser / validator checks. `## Business Rules` is author-written specification content for screen decisions.

## Notes

- Put required fields, formats, and ranges in [Validations](/markvspec/en/reference/validations/).
- Put server response errors in [Actions](/markvspec/en/reference/actions/) response `case:` entries with `display`.
- Put request/response branches in `case:` entries under [Actions](/markvspec/en/reference/actions/).
- `## Business Rules` is human-authored specification content. It is not where Validator Diagnostics are written.
- Use stable IDs such as `E-*` and `A-*` when a rule refers to elements or actions.
- Write conditions that matter to the screen specification, not CSS or implementation branches.

## Related Pages

- [Actions](/markvspec/en/reference/actions/)
- [Validations](/markvspec/en/reference/validations/)
- [IDs](/markvspec/en/reference/ids/)
- [Limitations](/markvspec/en/reference/limitations/)
- [Account Settings](/markvspec/examples/showcase/history-and-errors.html)
