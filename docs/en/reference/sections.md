# Sections

Sections are top-level headings in the `.vspec.md` body. MarkVSpec uses the section name to decide how to read the objects that follow.

## Syntax You Can Write

```markdown
## States

- idle
- loading
- error

## Layout: mobile

### L-Page Page layout

- stack
- gap: md

#### Items

- E-Title
- E-Submit
```

MarkVSpec recognizes these top-level sections.

| Section | What To Write |
| --- | --- |
| `## States` | Screen state names |
| `## Layout: mobile` | Layout groups and item order |
| `## Elements` | UI element meaning, labels, values, and actions |
| `## Actions` | Triggers, requests, effects, and cases |
| `## Business Rules` | Business rules and screen-specific decisions |
| `## Notes` | Additional notes, implementation context, and intent |
| `## Open Questions` | Unresolved questions |

## Small Example

```markdown
## Elements

### E-Message Paragraph

- text: Check your inbox.
- tone: info

## Open Questions

- Should the resend action be visible before 30 seconds?
```

![Hello Screen sections and generated preview](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## Notes

- Use the fixed English section names, even in Japanese documents.
- Markdown headings declare objects. They are not visual heading decoration.
- Objects usually use the `### ID Name` form.
- Subsections such as `#### Items` belong to the previous object.
- Unknown sections may be treated as prose and may not participate in preview or validation.

## Related Pages

- [File Format](file-format.md)
- [Elements](elements.md)
- [Actions](actions.md)
- [Business Rules](rules.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
