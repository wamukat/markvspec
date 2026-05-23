# Actions

<!-- markvspec-coverage:reference.page.actions -->

`## Actions` connects user interaction, HTTP requests, state changes, navigation, and partial updates. Buttons and links refer to actions with `action: A-*`; lifecycle events such as page load are connected in `## Events`.

## Syntax You Can Write

This is an `## Actions` section snippet. The referenced states, layouts,
elements, validations, and messages are assumed to be defined in the same screen
document.

```markdown markvspec-skip reason=requires-validation-context
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
    - state: wait-auth
  - case: send-failed
    - state: auth-error

### A-HandleLoginResponse Handle login response

- From
  - wait-auth
- Process P1: Apply login response
  - receive:
    - response: A-SubmitLogin.P1.response
  - case: success
    - from: wait-auth
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - case: failure
    - from: wait-auth
    - response: 401 invalid credentials
    - state: auth-error
    - display:
      - target: L-MessageArea
      - message: Authentication error message
```

### Action Heading

Declare an action with `### A-* Name`. When you want the preview to show an
action marker, write `### marker:A-* Name`.

These are heading snippets only.

```markdown markvspec-skip reason=requires-actions-context
### A-RefreshList Refresh list

### A1:A-RefreshList Refresh list
```

### Blocks

<!-- markvspec-generated:reference-actions:start -->
This block is generated from `packages/core/src/grammar-definition.ts`. Do not hand-edit it; update the grammar definition and regenerate the docs.

#### Action Top-Level Structured Items

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `From` | `canonical` | represented | - | Action source states. |
| `Process Pn:` | `canonical` | represented | - | Marked process step. |
| `Otherwise` | `canonical` | represented | - | Fallback outcome. |
| `Triggered` | `non-canonical` | not represented | `warning` | Legacy trigger wrapper. Use Element action or Events. |

#### Process Structured Items

| Item | Classification | Output | Diagnostic | Description |
| --- | --- | --- | --- | --- |
| `request` | `canonical` | represented | - | HTTP request block. |
| `receive` | `canonical` | represented | - | External result block. |
| `sync` | `canonical` | represented | - | Synchronous service or calculation detail. |
| `server` | `canonical` | represented | - | Server-side service call detail. HTTP method/path belongs under request. |
| `response` | `canonical` | represented | - | Response classification detail. |
| `validation` | `canonical` | represented | - | Validation process detail. |
| `when` | `canonical` | represented | - | Process guard. |
| `skip when` | `canonical` | represented | - | Skip guard. |
| `parallel` | `canonical` | represented | - | Parallel process group. |
| `resolve` | `canonical` | represented | - | Resolve process group. |
| `case` | `canonical` | represented | - | Process result branch. |
| `state` | `canonical` | represented | - | Immediate state transition effect. |
| `navigate` | `canonical` | represented | - | Immediate navigation effect. |
| `display` | `canonical` | represented | - | Display effect block. |
| `update` | `canonical` | represented | - | Partial update effect block. |
| `model` | `canonical` | represented | - | Structured model side effect. |
| `view` | `canonical` | represented | - | Structured view side effect. |
| `stop` | `canonical` | represented | - | Process case flow directive. |
| `continue` | `canonical` | represented | - | Process case flow directive. |
| `Effects` | `non-canonical` | not represented | `warning` | Legacy effect wrapper. |
| `input` | `non-canonical` | not represented | `warning` | Old process wrapper label. |
| `inputs` | `non-canonical` | not represented | `warning` | Old process wrapper label. |
| `condition` | `non-canonical` | not represented | `warning` | Old process wrapper label. |
| `conditions` | `non-canonical` | not represented | `warning` | Old process wrapper label. |
| `cases` | `non-canonical` | not represented | `warning` | Old process wrapper label. |
<!-- markvspec-generated:reference-actions:end -->

### HTTP Request

Put HTTP request details under `request:` inside `Process Pn:`, then write the method/path and request parameters. Use `server:` only when you need to describe a server-side service call that is not the HTTP request itself.

This is a `Process` snippet inside an action.

```markdown markvspec-skip reason=requires-action-heading
- Process P1: Load profile
  - request:
    - GET /profile
    - params:
      - userId: route.userId
```

### Partial Update

Describe server-rendered partial updates with `display` inside a result case, not raw htmx attributes.

This is a `Process` snippet inside an action.

```markdown markvspec-skip reason=requires-action-heading
- Process P1: Apply profile response
  - case: success
    - response: 200 profile partial
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
```

Use `display` fields consistently:

- `target`: MarkVSpec layout or element ID to update.
- `message`: semantic message text or message reference.
- `element`: `E-*` ID when the update shows an existing element.
- `partial`: `PRT-*` document ID when the update replaces the target with a
  referenced partial file.

Do not write raw HTML, CSS selectors, or htmx attributes in `display`. Describe
the user-visible result with MarkVSpec IDs and semantic messages.

## Small Example

This is a single-action snippet. In an actual screen, also define the caller
element and any valid states.

```markdown markvspec-skip reason=requires-actions-context
### A-OpenSettings Open settings

- Process P1: Navigate to settings
  - navigate: SCR-SETTINGS
```

![Form Submit Flow actions preview](../../assets/vscode-previews/form-submit-flow-vscode-preview.png)

## Notes

- Use the `A-*` prefix for action IDs.
- Element events such as click are connected with `action: A-*` on the element.
- Lifecycle events such as page load are written in `## Events`.
- State names should match names written in `## States`.
- `partial` describes a partial replacement; it is not an instruction to write `hx-*` attributes.
- Use `message`, `element`, or `partial` as the display payload.
- Request parameters are easiest to review when written as references to element values.
- Write result branches as `case:` entries under the relevant `Process Pn:`.

## Related Pages

- [Elements](./elements.md)
- [Business Rules](./rules.md)
- [Validations](./validations.md)
- [IDs](./ids.md)
- [Form Submit Flow](../../../examples/showcase/form-submit-flow.html)
