---
title: "Server Partial Update"
---

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

- Process P1: Request profile summary
  - request:
    - GET /profile/summary
    - params:
      - userId: route.userId
  - case: sent
    - state: refreshing-summary

### A-HandleSummaryResponse Handle summary response

- From
  - refreshing-summary
- Process P1: Apply profile summary response
  - receive:
    - response: A-RefreshSummary.P1.response
  - case: success
    - response: 200 profile summary partial
    - display:
      - target: L-ProfileSummary
      - partial: PRT-PROFILE-SUMMARY
  - case: failure
    - response: network error or 5xx
    - display:
      - target: L-MessageArea
      - message: Summary refresh error message
```

## Authoring Notes

- Put the request under `request:` inside `Process Pn:`.
- Use a layout ID as the `target`.
- Use `partial: PRT-*` when the returned content corresponds to a referenced partial document.
- Use `element: E-*` only when an existing element is the replacement content.
- Use `message:` for error feedback or simple message replacement.
- Include an error case so the reader understands what happens when the partial update fails.

## Common Pitfalls

- Do not write raw attributes such as `hx-get`, `hx-target`, or `hx-swap`. MarkVSpec specifies screen behavior, not implementation attributes.
- Do not use CSS selectors such as `target: #summary`. Use a MarkVSpec ID such as `L-ProfileSummary`.
- Success-only partial updates leave failure feedback undefined.
- Raw HTML is too vague. Reference the partial document, element, or message meaning.
- If one action updates multiple regions, write multiple `display` entries and keep each target/content pair explicit.

## Related Example

- [Profile Home](/markvspec/examples/showcase/profile-page-with-template.html): Host screen with partial refresh behavior.
- [Profile Summary Partial](/markvspec/examples/showcase/profile-summary.partial.html): Partial document structure.

## Related Reference

- [Partial Updates Guide](/markvspec/en/guide/partial-updates/)
- [Actions Guide](/markvspec/en/guide/actions/)
- [Layout Guide](/markvspec/en/guide/layout/)
- [Actions Reference](/markvspec/en/reference/actions/)
- [Sections Reference](/markvspec/en/reference/sections/)

## Verify

- Request method, path, and required parameters are visible.
- The update target is traceable through a MarkVSpec layout ID.
- Replacement content is described through `partial`, `element`, or `message`.
- Success and failure have separate user-visible results.
- The spec reads as semantic action / display change, not as htmx or framework attributes.
- Reviewers can check the behavior as a `semantic action/display change`, not as implementation attributes.
