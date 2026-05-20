# File Format

## Scope

A MarkVSpec source file is a `.vspec.md` file. One file describes one screen, template, or partial.

## Front Matter

```yaml
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
---
```

Required metadata is `id`, `type`, and `title`. `type` is `screen`, `template`, or `partial`.

## Body

After Front Matter, write the specification with Markdown headings and bullets. JSON is not the authoring format; it is an internal or export representation.

## Related Example

- [Hello Screen](../../../examples/showcase/hello-screen.html)

## Old Document

- [DSL reference](../user/dsl.md)
