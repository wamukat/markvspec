# Login Form

## Purpose

Describe login inputs, validation, authentication request, and success/failure cases in one screen spec.

## Target Result

The user enters email and password, then selects Sign in. Success navigates to the dashboard. Failure moves to an error state and updates the message area.

## Minimal Snippet

```markdown
### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin

### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- Process
  - HttpRequest
    - POST /login
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
- Cases
  - success:
    - navigate: SCR-DASHBOARD
  - failure:
    - state: auth-error
```

## Related Example

- [Login](../../../examples/showcase/login-basic.html)

## Related Reference

- [Actions Guide](../guide/actions.md)
- [Validation Guide](../guide/validation.md)
- [Reference](../reference/index.md)

## Verify

- Required fields are visible as elements or rules.
- Request parameters come from input elements.
- Success and failure cases are separate.
