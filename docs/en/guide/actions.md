# Actions

Actions describe what happens when users interact with a screen or when the screen loads. Splitting trigger, process, and cases makes UI and API behavior easier to review.

## Minimal Example

```markdown
## Actions

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

## Authoring Notes

- Connect triggers to an element and event.
- Put requests or calculations in process.
- Use cases for success, failure, empty, and other branches.

## Related Example

- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)

## Related Reference

- [Reference](../reference/index.md)
