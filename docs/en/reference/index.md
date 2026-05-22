# Reference

Use Reference to look up exact MarkVSpec syntax.

Learning-oriented explanations live in [Guide](../guide/index.md). Reference is for checking what each section can contain and how each property should be written while authoring a `.vspec.md` file.

## How To Use This Reference

- Check the shape of a source file: [File Format](file-format.md)
- Check sections such as `## Layout: mobile`, `## Form Groups`, and `## Preview Scenarios`: [Sections](sections.md)
- Check the canonical parser-facing syntax: [Grammar](grammar.md)
- Check UI element types and properties: [Elements](elements.md)
- Check clicks, requests, state changes, and partial updates: [Actions](actions.md)
- Check input constraints and error display: [Validations](validations.md)
- Check screen-specific decisions: [Business Rules](rules.md)
- Check review history fields and entries: [History](history.md)
- Check ID prefixes and references: [IDs](ids.md)
- Check CLI validation, HTML/PDF export, and project document-list export: [CLI](cli.md)
- Check what MarkVSpec intentionally does not model: [Limitations](limitations.md)

## Reference Pages

| Page | Covers |
| --- | --- |
| [File Format](file-format.md) | `.vspec.md`, Front Matter, document type, and body shape |
| [Grammar](grammar.md) | Canonical EBNF, semantic constraints, and non-canonical forms |
| [Sections](sections.md) | Recognized sections, including layout, events, form groups, validations, slots, error codes, and history |
| [Elements](elements.md) | Elements such as `Heading`, `Paragraph`, `Text`, `Input`, and `Button` |
| [Actions](actions.md) | `action: A-*`, `## Events`, `Process Pn:`, `request`, `receive`, `case:`, and `display` |
| [Validations](validations.md) | `## Field Validations`, `constraints`, and validation messages |
| [Business Rules](rules.md) | Business rules and screen-specific conditions in `## Business Rules` |
| [History](history.md) | `## History Fields`, `## History`, entry metadata, and rendering behavior |
| [IDs](ids.md) | How to use `SCR-*`, `L-*`, `E-*`, `A-*`, and `R-*` |
| [CLI](cli.md) | `validate`, HTML/PDF export, and project `document-list` export |
| [Limitations](limitations.md) | Markdown tables, JSON, visual design, and implementation details |

## Common Lookups

- Write the smallest useful screen: [File Format](file-format.md), [Sections](sections.md), [Elements](elements.md)
- Check parser-facing canonical syntax: [Grammar](grammar.md)
- Write a form: [Elements](elements.md), [Validations](validations.md), [Actions](actions.md)
- Write form groups, preview scenarios, slots, or error codes: [Sections](sections.md)
- Write review history: [History](history.md), [Sections](sections.md)
- Write an HTTP request: [Actions](actions.md), [Business Rules](rules.md), [IDs](ids.md)
- Write a partial update: [Actions](actions.md), [Elements](elements.md)
- Export output: [CLI](cli.md), [Limitations](limitations.md)

## Small Example

```markdown markvspec
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---
# SCR-HELLO Hello Screen

## States

- idle*

## Layout: mobile

### L-Page Hello page

- stack
- gap: md
- align: center

#### Items

- E-Title
- E-Continue

## Elements

### 1:E-Title Heading

- level: 1
- text: Hello MarkVSpec

### 2:E-Continue Button

- label: Continue
- variant: primary
- action: A-Continue

## Actions

### A1:A-Continue Continue

- Process P1: Stay on the current screen
  - state: idle
```

![Hello Screen source and rendered preview](../../assets/vscode-previews/hello-screen-vscode-preview.png)

The public example links below open showcase pages. Showcase uses dynamic
browser rendering as the primary preview when JavaScript is available: the
browser generates the design document from the published source. Runtime
failures show diagnostics and source/raw links, not a pre-generated example HTML
fallback.

## Related Pages

- [Guide](../guide/index.md)
- [Examples](../examples/index.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
- [History And Errors](../../../examples/showcase/history-and-errors.html)
