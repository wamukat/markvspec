# Partial Updates

Partial updates describe server-rendered partials and htmx-style replacement as behavior, not raw attributes. In MarkVSpec, write the request and update semantics.

## Minimal Example

```markdown
### A-RefreshProfile Refresh profile

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

- Put requests under `Process` / `HttpRequest`.
- Put result-specific partial changes under `Cases` / `update`.
- Keep `target` and `content` semantic.

## Related Example

- [Profile Home](../../../examples/showcase/profile-page-with-template.html)
- [Profile Summary Partial](../../../examples/showcase/profile-summary.partial.html)

## Related Reference

- [Reference](../reference/index.md)
