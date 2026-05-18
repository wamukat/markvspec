# Server-Rendered Partial Updates

MarkVSpec models Thymeleaf and htmx-style partial updates as design intent first.
Implementation details may be attached, but they should not replace the
semantic description.

When a partial update is large enough to be designed and reviewed
independently, split it into a `type: partial` document. The screen document owns
the request and the display effect that places partial-derived content into a
partial host. The partial document owns the returned HTML structure and
server-side process.

Partial documents are reusable HTML fragments. A partial may compose child
partials through its own `references.partials`, and preview resolves nested
partials recursively. Circular partial references are invalid, and nesting is
limited to 10 levels to keep preview rendering bounded.

Partial refresh actions should still describe the request and result state.
`request:` describes only the communication contract: method, path, and
parameters. It does not mean that a partial is displayed. The display update is
written under `Effects` as `display:`. Use singular `element:` for authored
`E-*` / `L-*` content, or `partial:` for content supplied by a referenced
`PRT-*` document. Direct `display.content` and `display.content.partial`
payloads are no longer authoring syntax.

## Principle

Use these layers:

1. `request`: which endpoint is called and which parameters are sent.
2. `partial` on Layout: which `L-*` layout is a partial host.
3. `display.partial`: which referenced `PRT-*` content is placed into that host.
4. `display.element`: which authored element or layout appears after the update
   when the result is not modeled as a partial document.
5. `target`: which layout or element changes.

Do not write htmx attributes such as `hx-post` or `hx-target` as the primary
DSL. They are implementation choices derived from Action and display details.

## Preferred Pattern

On the screen side, an Action describes the request and the resulting page
replacement:

```markdown
### A2:A-AuthResponse Handle auth response

- From
  - wait-auth
- Process P1: Handle auth response
  - receive:
    - response: A-SubmitLogin.P1.response
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner
```

`element` is the design contract. Framework-specific fragments are adapter
details rather than author-facing Action DSL.

When the screen embeds a partial preview, put the partial ID and screen-state to
partial-state mapping on the target layout. This marks the `L-*` layout as a
partial host. Initial MarkVSpec supports one partial ID per host: one host maps
to one `PRT-*` document. The left side of each `states` entry is the screen
state, and the right side is the render state used inside the partial document.
This lets the same partial render as `loading` while the screen is
`initializing`, and as `loaded` when the screen is `idle`.

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

`references.partials` is the document-level map from partial document IDs to
file paths. A Layout `partial.id` and an Action `display.partial` both refer to
IDs from that map.

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

- Process P1: Build notice list
  - server:
    - call: NoticeQueryService.findLatest()
  - case: success
    - description: 200 notices
    - Effects
      - state: loaded
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

- Process P1: Refresh points content
  - request:
    - method: GET
    - path: /points/content
  - case: success
    - Effects
      - state: loading
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
  - receive:
    - response: A-SubmitLogin.P1.response
  - case: success
    - response: 2xx authenticated user
    - Effects
      - navigate: SCR-DASHBOARD
  - case: failure
    - response: 401 with message fragment
    - Effects
      - state: idle
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner
```

For a response that replaces a partial host with returned partial content, use
`display.partial` in the response-side case:

```markdown
- Process P1: Handle profile summary response
  - receive:
    - response: A-RefreshProfile.P1.response
  - case: success
    - description: 200 profile summary partial
    - Effects
      - state: idle
      - display:
        - target: L-ProfileSummaryHost
        - partial: PRT-PROFILE-SUMMARY
    - stop
```

`display.target` points to the existing `L-*` partial host.
`display.partial` points to the `PRT-*` document content displayed in that host.
Do not combine `display.partial` with `display.element` or `display.message` in
the same display effect. Canonical examples keep request-sent cases to effects
such as `state: loading`; the partial content appears on the response success
case.

Use `state` when the current screen changes state. Message-only failures can
return to the baseline state and use `display` to show the banner. Use
`navigate` when the result leaves the current screen. A partial update may
accompany any case, but it should be scoped to the result that actually updates
the page.

## Ambiguity Rules

- `partial:` directly under an Action Process is unsupported authoring syntax.
  It is not a compatibility alias for `display.partial`.
- If framework-specific fragment names are needed, keep them in implementation
  notes; `display.element` should still point to authored UI that reviewers can inspect.
- Targetless `Dialog` effects render as modal overlays, and targetless `Toast`
  effects render in the toast region. Other effects without `target` are side
  effects rather than rendered partial updates.
- If multiple targets update for one result, document the primary target in the
  result row and describe additional effects in the result notes.
- Keep server-side validation and client-side validation as separate actions
  when they have different triggers.

## Example Coverage

- [Login Basic](../../../examples/04-real-world-screens/login-basic.vspec.md) models
  authentication response errors and remember-me cookie side effects.
- [Search List](../../../examples/04-real-world-screens/search-list.vspec.md)
  models search, empty result, and load-error partial updates.
- [Form Submit Flow](../../../examples/03-actions/form-submit-flow.vspec.md)
  models validation, request cases, and update targets.
- [Template Shell](../../../examples/05-reuse/template-shell.vspec.md)
  shows the current reuse-oriented release example.
