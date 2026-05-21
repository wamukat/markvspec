---
title: "States"
---

States name the display modes a screen can be in. Use names such as loading, empty, error, and success so reviewers can see how the UI changes.

## Concept

A screen can be one screen while still having many display states. Initial, loading, input error, submitting, saved, and empty-result views should be named as states so reviews can stay clear about which version of the UI is being discussed.

Use state names from the user's point of view, not implementation booleans. Prefer `loading` over `isLoading`, and `auth-error` over `hasError`. Good state names are easy to reference from layout notes, elements, and action cases.

## Minimal Example

This is only the `## States` section. In a full screen file, place it under the
front matter and `# SCR-* ...` heading.

```markdown
## States

- idle*
- loading
- error
```

This minimal example defines the normal, loading, and error states. The `*`
marks `idle` as the initial state. Even before you describe visual differences,
these names can be used as action results and preview targets.

![Async Fetching state preview](../../assets/vscode-previews/async-loading-vscode-preview.png)

## Common Patterns

- Use short state names that are meaningful in the screen.
- Write states as bullets under `## States`; use `*` on one state for the initial state.
- Reference states from layout, elements, and action cases.
- For async work, align action cases with resulting states.
- Start with common names such as `idle`, `loading`, `empty`, `error`, and `success`, then specialize only when needed, such as `auth-error` or `permission-denied`.
- For in-flight API requests, use names such as `submitting` or `refreshing` so the user-facing wait state is clear.
- Avoid duplicating the whole screen for every state. Put state-specific differences near the layout, element, message, or action case that changes.
- When you only need named review cases for one state, use [Scenarios](/markvspec/en/guide/scenarios/) instead of creating extra states.
- To add sample data to a state's normal preview, create a scenario with the same name as the state and omit `state:`.

## Example: Connect Actions To States

The following snippet belongs inside `## Actions`; `idle`, `loading`, `success`,
`empty`, and `error` are states already defined in `## States`.

```markdown
## Actions

### A-LoadOrders Load orders

- From
  - idle
- Process P1: Request orders
  - request:
    - GET /orders
  - case: sent
    - state: loading
  - case: success
    - state: success
  - case: empty
    - state: empty
  - case: failure
    - state: error
```

Write state changes under `case:` entries inside `Process Pn:`. This makes it easy to trace which operation creates each state in both preview and review.

## Next Reading

- [Layout](/markvspec/en/guide/layout/)
- [Actions](/markvspec/en/guide/actions/)
- [Scenarios](/markvspec/en/guide/scenarios/)
- [Async Fetching](/markvspec/examples/showcase/async-loading.html)
- [Reference](/markvspec/en/reference/)
