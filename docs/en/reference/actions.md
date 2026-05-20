# Actions

`## Actions` connects user interaction, server requests, state changes, navigation, and partial updates. Elements refer to actions with `action: A-*`.

## Syntax You Can Write

```markdown
## Actions

### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- From
  - idle
- Process
  - HttpRequest
    - POST /login
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
- Effects
  - state: wait-auth
- Cases
  - success:
    - from: wait-auth
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - failure:
    - from: wait-auth
    - response: 401 invalid credentials
    - state: auth-error
    - update:
      - target: L-MessageArea
      - content: Authentication error message
      - mode: replace
```

### Action Heading

Declare an action with the `### A-* Name` form.

```markdown
### A-RefreshList Refresh list
```

### Blocks

| Block | Use |
| --- | --- |
| `Triggered` | Event that starts the action, such as `E-Button.click` |
| `From` | State where the action is available |
| `Process` | Request, calculation, or local process |
| `Effects` | Immediate state changes or navigation |
| `Cases` | Result-specific behavior such as success, failure, or empty |

### HttpRequest

Put `HttpRequest` under `Process`, then write the method/path and request parameters.

```markdown
- Process
  - HttpRequest
    - GET /profile
    - userId: E-UserId.value
```

### Partial Update

Describe server-rendered partial updates with `update` inside a result case, not raw htmx attributes.

```markdown
- Cases
  - success:
    - response: 200 profile partial
    - update:
      - target: L-ProfileSummary
      - content: Profile summary partial
      - mode: replace
```

## Small Example

```markdown
### A-OpenSettings Open settings

- Triggered
  - E-SettingsLink.click
- Effects
  - navigate: SCR-SETTINGS
```

## Notes

- Use the `A-*` prefix for action IDs.
- Trigger targets should refer to `E-*` elements defined in `## Elements`.
- State names should match names written in `## States`.
- `mode: replace` describes partial update semantics; it is not an instruction to write `hx-*` attributes.
- Request parameters are easiest to review when written as references to element values.
- Use `Cases` when server responses, validation failures, or empty results branch behavior.

## Related Pages

- [Elements](elements.md)
- [Business Rules](rules.md)
- [Validations](validations.md)
- [IDs](ids.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
