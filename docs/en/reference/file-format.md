# File Format

A `.vspec.md` file is the MarkVSpec authoring source. One file normally describes one screen, template, or partial.

## Syntax You Can Write

```markdown
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
locale: en
---

## States

- idle

## Layout: mobile

### L-Page Login page

- stack
- gap: md
```

### Front Matter

Front Matter contains document-level metadata only.

| Field | Required | Value |
| --- | --- | --- |
| `id` | yes | `SCR-*`, or a stable ID that matches the document type |
| `type` | yes | `screen`, `template`, or `partial` |
| `title` | yes | Human-readable screen name |
| `route` | no | URL path for a screen |
| `locale` | no | Locale such as `ja` or `en` |

Do not put element properties, actions, or layout items in Front Matter. Put them in the Markdown body.

### Body

Write the body with Markdown headings and bullets.

- `##` is a top-level section.
- `###` declares an object.
- `####` declares a subsection inside an object.
- Bullets describe properties, rules, conditions, and transitions.

JSON is not the authoring format. Tools may use JSON internally or in exports, but users do not write JSON as the source format.

## Small Example

```markdown
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---

## Elements

### E-Title Heading

- level: 1
- text: Hello MarkVSpec
```

## Notes

- Use the `.vspec.md` file extension.
- Split multi-screen specifications into multiple screen files.
- Front Matter is YAML, but the body should not drift into YAML or JSON.
- Markdown tables may be used for explanation, but they are not canonical source.
- Use `type: partial` for server-rendered partials or screen fragments.

## Related Pages

- [Sections](sections.md)
- [IDs](ids.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
