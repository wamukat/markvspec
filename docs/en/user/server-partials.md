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

## Principle

Use these layers:

1. `content`: what the user sees after the update.
2. `target`: which layout or element changes.
3. `mode`: how the target is replaced, when relevant.
4. `fragment`: optional server template fragment reference.

Do not write htmx attributes such as `hx-post` or `hx-target` as the primary
DSL. They are implementation choices derived from Action and update details.

## Preferred Pattern

On the screen side, an Action describes the request and the resulting page
replacement:

```markdown
### A2:A-AuthResponse Handle auth response

- Triggered
  - A-SubmitLogin.response
- From
  - wait-auth
- Cases
  - failure:
    - response: 401 invalid credentials
    - state: auth-error
    - update:
      - target: L-MessageArea
      - content: Authentication error message
      - mode: replace
      - fragment: auth/login :: message
```

`content` is the design contract. `fragment` is an implementation hint that
connects the design to Thymeleaf.

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
- Process
  - ServerCall
    - client: NoticeQueryService.findLatest()
    - ${model.notices.items}: result.items
    - ${model.notice}: current item from ${model.notices.items}
```

Architecture-specific words such as `bridge` are not MarkVSpec reserved words.
Use them only as project-specific details under process steps such as
`ServerCall` when needed.

## Request Modeling

Requests belong under `Process`:

```markdown
- Process
  - HttpRequest
    - POST /login
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
```

This is implementation-aware without forcing htmx syntax into the design file.
An implementation may map it to a normal form post, `fetch`, or htmx.

## Response Modeling

Responses belong under `Cases`:

```markdown
- Cases
  - success:
    - response: 2xx authenticated user
    - navigate: SCR-DASHBOARD
  - failure:
    - response: 401 with message fragment
    - state: auth-error
    - update:
      - target: L-MessageArea
      - content: Authentication error message
```

Use `state` when the current screen changes state. Use `navigate` when the
result leaves the current screen. A partial update may accompany either case,
but it should be scoped to the result that actually updates the page.

## Ambiguity Rules

- If `fragment` is present, `content` should still be present so reviewers can
  understand the update without knowing the template.
- If `target` is omitted, the update is a side effect rather than a rendered
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
