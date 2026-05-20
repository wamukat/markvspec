# Actions

Actions describe what happens when users interact with a screen or when the screen loads. Splitting callers, processes, and result cases makes UI and API behavior easier to review.

## Concept

An action describes one flow: where it is called from, what work runs, and how the screen changes as a result. Connect button and link clicks with `action: A-*` on the element. Put lifecycle events such as page load under `## Events`.

Put the work under `Process Pn:`. For a server request, use `server:`; for screen-local calculation or validation, use `sync:` or `receive:`. Put result branches under the process as `case:` entries, such as success, failure, empty, and validation-error, then describe state changes, navigation, display updates, or messages for each case.

## Minimal Example

```markdown
## Actions

### A-SubmitLogin Submit login

- Process P1: Send login request
  - server:
    - POST /login
  - case: sent
    - state: submitting
```

The button connection lives on `E-SignInButton` with `action: A-SubmitLogin`. This example records the request start flow that needs review without depending on implementation function names.

## Common Patterns

- Connect user events with `action: A-*` on elements and lifecycle events with `## Events`.
- Put requests, calculations, and response handling in `Process Pn:`.
- Put success, failure, empty, and other branches under the relevant process as `case:`.
- Reference element values as request parameters, such as `email: E-EmailInput.value`.
- If work starts a loading view, put `state: loading` under the sending process `case: sent`.
- Split navigation, state changes, partial updates, and messages by result case.
- Do not overload one action with unrelated responsibilities. If the user operation is different, create a separate action.

## Example: Form Submit

```markdown
## Actions

### A-SubmitProfile Submit profile

- From
  - idle
- Process P1: Send profile request
  - server:
    - POST /profile
    - params:
      - name: E-NameInput.value
      - email: E-EmailInput.value
  - case: sent
    - state: submitting

### A-HandleProfileResponse Handle profile response

- From
  - submitting
- Process P1: Apply profile response
  - receive:
    - response: A-SubmitProfile.P1.response
  - case: success
    - state: saved
    - display:
      - target: L-MessageArea
      - content: Saved message
  - case: validation-error
    - state: input-error
    - display:
      - target: L-MessageArea
      - content: Validation error message
  - case: failure
    - state: error
```

This keeps request parameters, in-flight state, and result-specific UI changes in one place. In VS Code preview, you can switch states and verify which case creates which UI.

## Next Reading

- [States](states.md)
- [Partial Updates](partial-updates.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
- [Reference](../reference/index.md)
