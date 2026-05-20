# Actions

Actions describe what happens when users interact with a screen or when the screen loads. Splitting trigger, process, and cases makes UI and API behavior easier to review.

## Concept

An action describes one flow: what triggers it, what work runs, and how the screen changes as a result. Put events such as button click, link click, form submit, screen load, timer, and selection change under `Triggered`.

Put the work under `Process`. For an API request, use `HttpRequest`; for screen-local work, describe the calculation. Put result branches under `Cases`, such as success, failure, empty, and validation-error, then describe state changes, navigation, updates, or messages for each case.

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

This example says that a button click sends a `/login` request, success navigates to the dashboard, and failure changes the screen to `auth-error`. It records the flow that needs review without depending on implementation function names.

## Common Patterns

- Connect triggers to an element and event.
- Put requests or calculations in process.
- Use cases for success, failure, empty, and other branches.
- Reference element values as request parameters, such as `email: E-EmailInput.value`.
- If work starts a loading view, put `state: loading` under `Effects`.
- Split navigation, state changes, partial updates, and messages by result case.
- Do not overload one action with unrelated responsibilities. If the user operation is different, create a separate action.

## Example: Form Submit

```markdown
## Actions

### A-SubmitProfile Submit profile

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process
  - HttpRequest
    - POST /profile
    - name: E-NameInput.value
    - email: E-EmailInput.value
- Effects
  - state: submitting
- Cases
  - success:
    - state: saved
    - update:
      - target: L-MessageArea
      - content: Saved message
  - validation-error:
    - state: input-error
    - update:
      - target: L-MessageArea
      - content: Validation error message
  - failure:
    - state: error
```

This keeps request parameters, in-flight state, and result-specific UI changes in one place. In VS Code preview, you can switch states and verify which case creates which UI.

## Next Reading

- [States](states.md)
- [Partial Updates](partial-updates.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Reference](../reference/index.md)
