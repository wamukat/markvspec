# Login Form

## When To Use

Use this recipe for login, sign-in, admin entry, or any screen that validates inputs and sends an authentication request. Keep inputs, submit button, required rules, success navigation, and failure message in one screen spec.

This recipe is not for describing form styling in detail. It is for making the user input, triggered action, and resulting screen behavior readable.

## Target Result

The user enters email and password, then selects Sign in. Missing input shows field feedback. While the request is in flight, the submit flow is in a waiting state. Success navigates to the dashboard. Failure moves to an error state and updates the message area.

## Minimal Shape

```markdown
## States

### idle

### submitting

### auth-error

## Elements

### E-EmailInput Input

- label: Email
- required

### E-PasswordInput Input

- label: Password
- type: password
- required

### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin

## Actions

### A-SubmitLogin Submit login

- From
  - idle
- Process P1: Send login request
  - request:
    - POST /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - case: sent
    - state: submitting

### A-HandleLoginResponse Handle login response

- From
  - submitting
- Process P1: Apply login response
  - receive:
    - response: A-SubmitLogin.P1.response
  - case: success
    - from: submitting
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - case: failure
    - from: submitting
    - response: 401 invalid credentials
    - state: auth-error
    - display:
      - target: L-MessageArea
      - content: Authentication error message
```

## Authoring Notes

- Give each `Input` a user-visible label and input type when needed.
- Connect the submit source with `action: A-*` on the button.
- Write request parameters as element values, such as `E-EmailInput.value`.
- Separate in-flight, success, and failure behavior with states and `case:` entries.
- For failure feedback, make the target and content explicit under `display`.

## Common Pitfalls

- `action: submit` alone is not enough. Reviewers cannot see the request path, parameters, or result cases.
- If password policy or required input rules live only in prose, they are easy to miss. Use `required` or a separate `Business Rules` section.
- Do not over-describe API internals. Keep method, path, inputs, and response cases that matter to the screen.
- Do not specify disabled colors or CSS classes. Use semantic state such as `submitting` and priority such as `variant: primary`.
- Do not collapse success and failure into one paragraph. Separate cases are easier to preview and review.

## Related Example

- [Login](../../../examples/showcase/login-basic.html): Responsive layout, required validation, request parameters, response cases, and navigation.
- [Single Field Validation](../../../examples/showcase/single-field-validation.html): Field-level validation feedback.

## Related Reference

- [Actions Guide](../guide/actions.md)
- [Validation Guide](../guide/validation.md)
- [Elements Reference](../reference/elements.md)
- [Actions Reference](../reference/actions.md)
- [Business Rules Reference](../reference/rules.md)

## Verify

- Required fields are visible as elements or rules.
- Request parameters come from input element values.
- In-flight, success, and failure behavior are separate states / cases.
- Failure message placement is traceable through `target`.
- Navigation to another screen, such as dashboard, uses an explicit destination ID.
