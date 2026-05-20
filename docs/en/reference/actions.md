# Actions

## Purpose

`## Actions` describes trigger, process, case, and effect. It connects UI interaction with server request, state change, navigation, and partial update.

## Example

```markdown
### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- Process
  - HttpRequest
    - POST /login
- Cases
  - success:
    - navigate: SCR-DASHBOARD
  - failure:
    - state: auth-error
```

## Partial Update

Describe server-rendered partial updates with `HttpRequest` and `update`, not raw htmx attributes.

```markdown
- Cases
  - success:
    - update:
      - target: L-MessageArea
      - content: Error message partial
      - mode: replace
```

## Related Example

- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)

## Old Document

- [DSL reference](../user/dsl.md)
