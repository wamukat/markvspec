# Partial Updates

Partial updates describe targeted display changes as behavior, not framework
instructions. In MarkVSpec, write the request, result case, target, and
user-visible content change.

## Concept

A partial update changes part of the screen without navigating the whole page.
In MarkVSpec, describe which request or event runs, which region changes, and
whether the result is a message, an existing element, or a referenced partial.
Avoid framework-specific HTML attributes in the source.

This keeps the UI specification reviewable whether the implementation uses
server-rendered partials, SPA state updates, or a custom fetch flow. Preview can
show the target layout group or message area, and HTML/PDF export can still
explain the update intent.

![Profile Home partial update preview](../../assets/vscode-previews/profile-page-with-template-vscode-preview.png)

## Implementation Readings

The DSL stays the same across implementation styles:

| Implementation style | How to read the MarkVSpec update |
| --- | --- |
| Thymeleaf / htmx | A request returns server-rendered content and the target region shows that result. |
| React / Vue / Svelte | State, store, or component data changes, and the target component subtree re-renders. |
| SSR + fetch | A fetch result updates the view model or HTML for the target region. |

`mode: replace`, when used, means the visible content of the target region is
replaced. It is not a DOM swap instruction or an `hx-swap` value.

## Minimal Example

This is an `## Actions` snippet. A complete screen file also defines the target
layout group, caller element, and any states used by the result cases.

```markdown markvspec-skip reason=requires-partial-context
## Actions

### A-RefreshProfile Refresh profile

- Process P1: Request profile summary
  - request:
    - GET /profile/summary
  - case: success
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
```

This example says that a refresh action loads summary content and updates
`L-ProfileSummary`. `partial: PRT-*` names the referenced partial document; it
is not a raw library attribute.

## Common Patterns

- Put requests under `request:` inside `Process Pn:`.
- Put result-specific partial changes under process `case:` entries with `display`.
- Keep `target` and display payloads semantic.
- Use the ID of the updated layout group or message element as `target`.
- Use `partial: PRT-*` when the update uses a referenced partial document.
- Use `element: E-*` when the update shows an existing element.
- Use `message:` when the update shows message text or a message reference.
- Do not use `content:` as the canonical display payload. Use `message:`,
  `element:`, or `partial:` so the content remains semantic and reusable across
  frameworks.
- Use `mode: replace` only when you need to make the replacement semantics
  explicit; it describes the target's visible content, not a framework swap
  operation.
- Do not use raw HTML, CSS selectors, or raw framework attributes as the payload.
- In failure cases, update a message area or state separately from the normal target.

## Example: Update Search Results

This snippet shows the relevant layout and action sections only. A complete
screen file also includes front matter, a screen heading, state definitions, and
the referenced elements.

```markdown markvspec-skip reason=requires-partial-context
## Layout: mobile

### L-SearchPanel Search Panel

- stack

#### Items

- "Query": E-SearchInput
- "Results": L-ResultList
- "Status": E-SearchMessage

## Actions

### A-SearchProducts Search products

- Process P1: Search products
  - request:
    - GET /products/search
    - params:
      - q: E-SearchInput.value
  - case: sent
    - state: searching
  - case: success
    - state: results
    - display:
      - target: L-ResultList
      - partial: PRT-PRODUCT-RESULTS
  - case: empty
    - state: empty
    - display:
      - target: L-ResultList
      - element: E-EmptyResults
  - case: failure
    - state: error
    - display:
      - target: E-SearchMessage
      - message: Search error message
```

Search results, empty results, and errors are separate cases. Writing update
targets by ID makes the relationship between layout, states, and actions easy to
trace in both Git diffs and preview.

## Next Reading

- [Actions](./actions.md)
- [Layout](./layout.md)
- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)
- [Reference](../reference/index.md)
