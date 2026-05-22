# Validation

Validation explains what input is accepted and how errors appear.

Start by separating where the decision is made and what it checks.

## Six Buckets

| Kind | Examples | Write it in |
| --- | --- | --- |
| Client single-field check | required, email format, text length, numeric range | `## Field Validations` |
| Input metadata | type, placeholder, min/max, browser-facing input hints | `## Elements` on the input |
| Client cross-field check | password confirmation, start date <= end date | `## Cross-field Validations` |
| Client product rule | age gate, plan restriction before submit | `## Business Rules` |
| Pre-submit decision | plan restriction before submit, other screen-level checks | `## Business Rules` or a pre-submit action |
| Server field check | duplicate email, unknown product code | `## Actions` response `case:` with the affected field |
| Server business check | stock shortage, missing permission, contract restriction | `## Actions` response `case:` and `## Business Rules` |

Business Rules are for product decisions. They are not the place for basic input shape such as required, format, min, max, or simple field comparison.

![Single Field Validation preview](../../assets/vscode-previews/single-field-validation-vscode-preview.png)

## Client Single-field Checks

Rules that can be decided from one input belong in `## Field Validations`. Keep UI metadata such as label, type, placeholder, and min/max on the input element.

```markdown markvspec-fragment
## Elements

### E-EmailInput Input

- label: Email
- type: email
- placeholder: user@example.com
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

In preview and review, the reader can inspect the input metadata and validation contract separately. `Element` describes the UI. `Validation` describes the check and message.

## Client Cross-field Checks

Rules that compare multiple inputs should not be hidden on one element.

```markdown markvspec-skip reason=requires-validation-context
## Form Groups

### F-PasswordForm Password form

- fields:
  - E-PasswordInput
  - E-PasswordConfirmInput

## Cross-field Validations

### V-PasswordMatches Password matches

- target: F-PasswordForm
- inputs:
  - E-PasswordInput
  - E-PasswordConfirmInput
- check: E-PasswordInput.value equals E-PasswordConfirmInput.value
- message: Password confirmation does not match.
```

Name the fields the rule reads and where the error is shown.

## Server Field Checks

Errors that only the server can decide belong to response cases.

```markdown markvspec-skip reason=requires-validation-context
## Elements

### E-EmailInput Input

- label: Email
- type: email
- input rule:
  - type: email

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

```markdown markvspec-skip reason=requires-rule-error-context
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

- One field decides it: write it in `## Field Validations`.
- Multiple fields are compared: write it in `## Cross-field Validations`.
- A product condition decides it: write it in `## Business Rules`.
- A server response decides it: write it in `## Actions` as a `case:`.
- The user sees it: write a `display` target and message.
- Reviewers need to see the error case in preview: add a [Scenario](./scenarios.md) that points to the relevant `case:`.

## Next Reading

- [Elements](./elements.md)
- [Actions](./actions.md)
- [Scenarios](./scenarios.md)
- [Business Rules](../reference/rules.md)
- [Validation Reference](../reference/validations.md)
- [Single Field Validation](../../../examples/showcase/single-field-validation.html)
- [Login](../../../examples/showcase/login-basic.html)
