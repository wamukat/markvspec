# Server Partial Update

## When To Use

Use this recipe when a server-rendered HTML partial, such as a Thymeleaf fragment, updates one region of the screen instead of replacing the full page. Do not write raw htmx attributes in MarkVSpec. Describe which user action sends the request and which region is replaced with which meaningful content.

## Target Result

A Refresh button or filter change sends a server request. The returned summary partial replaces `L-ProfileSummary`. If the request fails, the target remains understandable and the message area shows error feedback.

## Minimal Shape

```markdown
## Layout: mobile

### L-ProfileSummary Profile summary

- stack
- gap: sm

### L-MessageArea Message area

- stack

## Elements

### E-RefreshButton Button

- label: Refresh
- action: A-RefreshSummary

## Actions

### A-RefreshSummary Refresh summary

- Triggered
  - E-RefreshButton.click
- Process
  - HttpRequest
    - GET /profile/summary
    - userId: route.userId
- Effects
  - state: refreshing-summary
- Cases
  - success:
    - response: 200 profile summary partial
    - update:
      - target: L-ProfileSummary
      - content: Profile summary partial
      - mode: replace
  - failure:
    - response: network error or 5xx
    - update:
      - target: L-MessageArea
      - content: Summary refresh error message
      - tone: danger
```

## Authoring Notes

- Put the request under `Process` / `HttpRequest`.
- Use a layout ID as the `target`.
- Describe the returned content by meaning, such as `Profile summary partial`, rather than embedding an HTML fragment.
- Add `mode: replace` when replacement semantics matter.
- Include an error case so the reader understands what happens when the partial update fails.

## Common Pitfalls

- Do not write raw attributes such as `hx-get`, `hx-target`, or `hx-swap`. MarkVSpec specifies screen behavior, not implementation attributes.
- Do not use CSS selectors such as `target: #summary`. Use a MarkVSpec ID such as `L-ProfileSummary`.
- Success-only partial updates leave failure feedback undefined.
- `content: HTML` is too vague. Name what the partial means.
- If one action updates multiple regions, write multiple `update` entries and keep each target/content pair explicit.

## Related Example

- [Profile Home](../../../examples/showcase/profile-page-with-template.html): Host screen with partial refresh behavior.
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html): Partial document structure.

## Related Reference

- [Partial Updates Guide](../guide/partial-updates.md)
- [Actions Guide](../guide/actions.md)
- [Layout Guide](../guide/layout.md)
- [Actions Reference](../reference/actions.md)
- [Sections Reference](../reference/sections.md)

## Verify

- Request method, path, and required parameters are visible.
- The update target is traceable through a MarkVSpec layout ID.
- Replacement content is described by meaning.
- Success and failure have separate user-visible results.
- The spec reads as semantic action / update, not as htmx or framework attributes.
- Reviewers can check the behavior as a `semantic action/update`, not as implementation attributes.
