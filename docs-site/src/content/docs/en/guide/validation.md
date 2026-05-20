---
title: "Validation"
---

Validation explains what input is accepted and how errors appear.

Start by separating where the decision is made and what it checks.

## Four Buckets

| Kind | Examples | Write it in |
| --- | --- | --- |
| Client single-field check | required, email format, text length, numeric range | `## Elements` on the input |
| Client cross-field check | password confirmation, start date <= end date | `## Business Rules` or a pre-submit action |
| Server field check | duplicate email, unknown product code | `## Actions` response `case:` with the affected field |
| Server business check | stock shortage, missing permission, contract restriction | `## Actions` response `case:` and `## Business Rules` |

Business Rules are for product decisions. They are not the place for basic input shape such as required, format, min, or max.

![Single Field Validation preview](../../assets/vscode-previews/single-field-validation-vscode-preview.png)

## Client Single-field Checks

Rules that can be decided from one input belong near that input.

```markdown
## Elements

### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email
- error:
  - required: Email is required.
  - format: Enter a valid email address.
```

In preview and review, the reader can see what the field accepts without hunting through another section.

## Client Cross-field Checks

Rules that compare multiple inputs should not be hidden on one element.

```markdown
## Business Rules

### R-PasswordMatches Password matches

- when:
  - E-PasswordInput.value is present
  - E-PasswordConfirmInput.value differs from E-PasswordInput.value
- appliesTo:
  - E-PasswordConfirmInput
- message: Password confirmation does not match.
```

Name the fields the rule reads and where the error is shown.

## Server Field Checks

Errors that only the server can decide belong to response cases.

```markdown
## Elements

### E-EmailInput Input

- label: Email
- required
- constraints
  - format: email

### E-EmailError Text

- tone: danger
- visible when: input-error

## Actions

### A-SubmitProfile Submit profile

- Process P1: Submit profile
  - request:
    - POST /profile
    - params:
      - email: E-EmailInput.value
  - case: email-duplicated
    - state: input-error
    - display:
      - target: E-EmailError
      - message: This email address is already used.
```

`format: email` and `email-duplicated` are different checks. The format can be checked before submit. Duplication is decided by the server response.

## Server Business Checks

Stock, permission, contract, or plan restrictions usually need both a rule and a response case.

```markdown
## Business Rules

### R-PlanAllowsExport Plan allows export

- when: current plan does not allow PDF export
- appliesTo: A-ExportPdf
- message: Your current plan cannot export PDF.

## Actions

### A-ExportPdf Export PDF

- Process P1: Request PDF export
  - request:
    - POST /exports/pdf
  - case: plan-not-allowed
    - state: export-error
    - display:
      - target: E-ExportMessage
      - message: Your current plan cannot export PDF.
```

The Business Rule explains why the action is not allowed. The Action case explains what the screen does with the server result.

## Error Display

Validation is incomplete if the user-visible display is missing.

- Field-level message: `E-EmailError`
- Form-level message: `E-FormMessage`
- Action result message: `display` with `target` and `message`
- Error state: `state: input-error` or `state: submit-error`

Put display elements in `## Elements` as `Text`, `Paragraph`, or `Banner` with `tone: danger`.

## When Unsure

- One field decides it: write it in `## Elements`.
- Multiple fields or a product condition decide it: write it in `## Business Rules`.
- A server response decides it: write it in `## Actions` as a `case:`.
- The user sees it: write a `display` target and message.
- Reviewers need to see the error case in preview: add a [Scenario](/markvspec/en/guide/scenarios/) that points to the relevant `case:`.

## Next Reading

- [Elements](/markvspec/en/guide/elements/)
- [Actions](/markvspec/en/guide/actions/)
- [Scenarios](/markvspec/en/guide/scenarios/)
- [Business Rules](/markvspec/en/reference/rules/)
- [Validation Reference](/markvspec/en/reference/validations/)
- [Single Field Validation](/markvspec/examples/showcase/single-field-validation.html)
- [Login](/markvspec/examples/showcase/login-basic.html)
