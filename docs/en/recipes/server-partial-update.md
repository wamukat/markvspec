# Server Partial Update

## Purpose

Describe server-rendered partial replacement as MarkVSpec semantic action/update, not as htmx attributes.

## Target Result

A button or filter change sends a server request. The returned partial replaces a target region in the screen.

## Minimal Snippet

```markdown
### A-RefreshSummary Refresh summary

- Triggered
  - E-RefreshButton.click
- Process
  - HttpRequest
    - GET /profile/summary
- Cases
  - success:
    - update:
      - target: L-ProfileSummary
      - content: Profile summary partial
      - mode: replace
```

## Authoring Notes

- Do not write raw `hx-get` or `hx-target`.
- Put the request under `Process` / `HttpRequest`.
- Put the target and content under `Cases` / `update` as semantic intent.

## Related Example

- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)

## Related Reference

- [Partial Updates Guide](../guide/partial-updates.md)
- [Actions Guide](../guide/actions.md)
- [Reference](../reference/index.md)

## Verify

- Method and path are visible.
- Target layout is visible.
- Replacement content is described by meaning.
