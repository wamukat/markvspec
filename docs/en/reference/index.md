# Reference

Use Reference to look up exact MarkVSpec syntax.

Learning-oriented explanations live in [Guide](../guide/index.md). Reference is for checking what each section can contain and how each property should be written while authoring a `.vspec.md` file.

## How To Use This Reference

- Check the shape of a source file: [File Format](file-format.md)
- Check sections such as `## Layout: mobile` and `## Elements`: [Sections](sections.md)
- Check UI element types and properties: [Elements](elements.md)
- Check clicks, requests, state changes, and partial updates: [Actions](actions.md)
- Check input constraints and error display: [Validations](validations.md)
- Check screen-specific decisions: [Business Rules](rules.md)
- Check ID prefixes and references: [IDs](ids.md)
- Check CLI validate/export commands: [CLI](cli.md)
- Check what MarkVSpec intentionally does not model: [Limitations](limitations.md)

## Reference Pages

| Page | Covers |
| --- | --- |
| [File Format](file-format.md) | `.vspec.md`, Front Matter, document type, and body shape |
| [Sections](sections.md) | Recognized top-level sections and Markdown heading roles |
| [Elements](elements.md) | Elements such as `Heading`, `Paragraph`, `Text`, `Input`, and `Button` |
| [Actions](actions.md) | `action: A-*`, `## Events`, `Process Pn:`, `server`, `receive`, `case:`, and `display` |
| [Validations](validations.md) | `required`, `constraints`, format/range, and error messages |
| [Business Rules](rules.md) | Business rules and screen-specific conditions in `## Business Rules` |
| [IDs](ids.md) | How to use `SCR-*`, `L-*`, `E-*`, `A-*`, and `R-*` |
| [CLI](cli.md) | `validate`, HTML export, and PDF export |
| [Limitations](limitations.md) | Markdown tables, JSON, visual design, and implementation details |

## Common Lookups

- Write the smallest useful screen: [File Format](file-format.md), [Sections](sections.md), [Elements](elements.md)
- Write a form: [Elements](elements.md), [Validations](validations.md), [Actions](actions.md)
- Write a server request: [Actions](actions.md), [Business Rules](rules.md), [IDs](ids.md)
- Write a partial update: [Actions](actions.md), [Elements](elements.md)
- Export output: [CLI](cli.md), [Limitations](limitations.md)

## Small Example

```markdown
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---

## States

- idle

## Layout: mobile

### L-Page Hello page

- stack
- gap: md
- align: center

#### Items

- E-Title
- E-Continue

## Elements

### E-Title Heading

- level: 1
- text: Hello MarkVSpec

### E-Continue Button

- label: Continue
- variant: primary
- action: A-Continue

## Actions

### A-Continue Continue

- Process P1: Navigate to next screen
  - navigate: SCR-NEXT
```

![Hello Screen source and generated preview](../../assets/previews/hello-screen-showcase.png)

## Related Pages

- [Guide](../guide/index.md)
- [Examples](../examples/index.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
