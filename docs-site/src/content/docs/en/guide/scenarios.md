---
title: "Scenarios"
---

Use Preview Scenarios when one screen needs several reviewable preview cases.
Do not copy the whole screen just to show an error, empty state, toast, dialog,
or direct link.

## When To Use

- Show a validation error without rewriting the screen.
- Show empty, error, or loading data for the same state.
- Show a toast, dialog, or message caused by an action result.
- Show a direct link with route parameters or a hash fragment.
- Give reviewers named cases they can discuss in preview and exported HTML.

States name the display modes of the screen. Preview Scenarios name concrete
review cases inside those states.

## Minimal Example

```markdown
## Preview Scenarios

### invalid-email

- state: idle
- cases:
  - A-SubmitLogin.P1.invalid
- samples:
  - E-EmailInput: invalid@example
- route:
  - token: expired
```

This scenario says: show the `idle` state, apply the invalid submit case, fill
the email input with preview data, and render the route as if `token=expired`
was present.

## What Goes Where

| Need | Write |
| --- | --- |
| Which state to render | `state:` |
| Which action or validation result to show | `cases:` |
| Element-specific preview values | `samples:` |
| Route parameters or hash fragments | `route:` |

Preview Scenarios are preview data. They do not create a new screen, new state,
or new action. Keep the real screen behavior in `## States`, `## Elements`, and
`## Actions`; use scenarios only to name useful review views.

## Next Reading

- [States](/markvspec/en/guide/states/)
- [Actions](/markvspec/en/guide/actions/)
- [Validation](/markvspec/en/guide/validation/)
- [Preview Scenarios Reference](/markvspec/en/reference/sections/)
- [Scenario Preview Data Example](/markvspec/examples/showcase/scenario-samples.html)
