# Server-Rendered Partial Updates

MarkVSpec models Thymeleaf and htmx-style partial updates as design intent first.
Implementation details may be attached, but they should not replace the
semantic description.

When a partial update is large enough to be designed and reviewed
independently, split it into a `type: partial` document. The screen document owns
the request and DOM replacement contract. The partial document owns the returned
HTML structure and server-side process.

Partial documents are reusable HTML fragments. A partial may compose child
partials through its own `references.partials`, and preview resolves nested
partials recursively. Circular partial references are invalid, and nesting is
limited to 10 levels to keep preview rendering bounded.

A partial may also describe a self refresh action. In that case, a named
request process may use `display.content.partial` with its own PRT ID to mean
"request this partial again and replace the current partial root." This is
request/display behavior, not child partial composition, so it does not create a
nested partial dependency. A layout-level `partial:` reference to the same
partial is still recursive composition and remains invalid.

## Principle

Use these layers:

1. `content`: what the user sees after the update.
2. `target`: which layout or element changes.
3. `request`: implementation contract hints such as method and path.

Do not write htmx attributes such as `hx-post` or `hx-target` as the primary
DSL. They are implementation choices derived from Action and display details.

## Preferred Pattern

On the screen side, an Action describes the request and the resulting page
replacement:

```markdown
### A2:A-AuthResponse Handle auth response

- Triggered
  - A-SubmitLogin.P1.response
- From
  - wait-auth
- Process P1: Handle auth response
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - content: Authentication error message
```

`content` is the design contract. Framework-specific fragments are adapter
details rather than author-facing Action DSL.

When the screen embeds a partial preview, put the partial ID and screen-state to
partial-state mapping on the target layout. This lets the same partial render as
`loading` while the screen is `initializing`, and as `loaded` when the screen is
`idle`.

```markdown
### L2:L-MemberProfilePartial Member Profile Partial

- stack
- variant: card
- partial:
  - id: PRT-MEMBER-PROFILE-CARD
  - states:
    - initializing: loading
    - idle: loaded
```

On the partial side, use `partial.render` for the lifecycle trigger that builds
the returned HTML:

```markdown
---
id: PRT-NOTICE-LIST-CARD
type: partial
title: Notice List Card
route: /mypage/partials/notices
---

# PRT-NOTICE-LIST-CARD Notice List Card

## Actions

### A-BuildNoticeList Build notice list

- Triggered
  - partial.render
- Process P1: Build notice list
  - server:
    - call: NoticeQueryService.findLatest()
  - case: success
    - response: 200 notices
    - Effects
      - model: ${model.notices.items} = result.items
      - model: ${model.notice} = current item from ${model.notices.items}
```

Architecture-specific words such as `bridge` are not MarkVSpec reserved words.
Use them only as project-specific details under a named process when needed.

For htmx-style self replacement inside a partial, model the refresh as a
named request process on that partial:

```markdown
---
id: PRT-POINTS-CONTENT
type: partial
title: Points Content
---

# PRT-POINTS-CONTENT Points Content

## Actions

### A-RefreshPoints Refresh points

- Triggered
  - E-Refresh.click
- Process P1: Refresh points content
  - request:
    - method: GET
    - path: /points/content
  - case: success
    - Effects
      - display:
        - target: L-PointsContent
        - content:
          - partial: PRT-POINTS-CONTENT
```

## Request Modeling

Requests belong under `Process P1: Send request`:

```markdown
- Process P1: Send login request
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
  - result:
    - login request submission result
```

This is implementation-aware without forcing htmx syntax into the design file.
An implementation may map it to a normal form post, `fetch`, or htmx.

## Response Modeling

Responses belong under `case: <name>` branches on the relevant response process:

```markdown
- Process P1: Handle response
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
  - case: failure
    - response: 401 with message fragment
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - content: Authentication error message
```

Use `state` when the current screen changes state. Use `navigate` when the
result leaves the current screen. A partial update may accompany either case,
but it should be scoped to the result that actually updates the page.

## Ambiguity Rules

- If framework-specific fragment names are needed, keep them in implementation
  notes; `display.content` should still be readable without knowing the template.
- If `target` is omitted, the effect is a side effect rather than a rendered
  partial update.
- If multiple targets update for one result, document the primary target in the
  result row and describe additional effects in the result notes.
- Keep server-side validation and client-side validation as separate actions
  when they have different triggers.

## Example Coverage

- [Login Basic](../../../examples/01-basics/login-basic.vspec.md) models
  authentication response errors and remember-me cookie side effects.
- [Search List](../../../examples/04-real-world-screens/search-list.vspec.md)
  models search, empty result, and load-error partial updates.
- [Form Submit Flow](../../../examples/03-actions/form-submit-flow.vspec.md)
  models validation, request cases, and update targets.
- [Template Shell](../../../examples/05-reuse/template-shell.vspec.md)
  shows the current reuse-oriented release example.
