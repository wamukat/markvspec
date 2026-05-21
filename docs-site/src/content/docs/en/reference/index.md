---
title: "Reference"
---

Use Reference to look up exact MarkVSpec syntax.

Learning-oriented explanations live in [Guide](/markvspec/en/guide/). Reference is for checking what each section can contain and how each property should be written while authoring a `.vspec.md` file.

## How To Use This Reference

- Check the shape of a source file: [File Format](/markvspec/en/reference/file-format/)
- Check sections such as `## Layout: mobile`, `## Form Groups`, and `## Preview Scenarios`: [Sections](/markvspec/en/reference/sections/)
- Check the canonical parser-facing syntax: [Grammar](/markvspec/en/reference/grammar/)
- Check UI element types and properties: [Elements](/markvspec/en/reference/elements/)
- Check clicks, requests, state changes, and partial updates: [Actions](/markvspec/en/reference/actions/)
- Check input constraints and error display: [Validations](/markvspec/en/reference/validations/)
- Check screen-specific decisions: [Business Rules](/markvspec/en/reference/rules/)
- Check ID prefixes and references: [IDs](/markvspec/en/reference/ids/)
- Check CLI validation, HTML/PDF export, and project document-list export: [CLI](/markvspec/en/reference/cli/)
- Check what MarkVSpec intentionally does not model: [Limitations](/markvspec/en/reference/limitations/)

## Reference Pages

| Page | Covers |
| --- | --- |
| [File Format](/markvspec/en/reference/file-format/) | `.vspec.md`, Front Matter, document type, and body shape |
| [Grammar](/markvspec/en/reference/grammar/) | Canonical EBNF, semantic constraints, and non-canonical forms |
| [Sections](/markvspec/en/reference/sections/) | Recognized sections, including layout, events, form groups, validations, slots, error codes, and history |
| [Elements](/markvspec/en/reference/elements/) | Elements such as `Heading`, `Paragraph`, `Text`, `Input`, and `Button` |
| [Actions](/markvspec/en/reference/actions/) | `action: A-*`, `## Events`, `Process Pn:`, `request`, `receive`, `case:`, and `display` |
| [Validations](/markvspec/en/reference/validations/) | `## Field Validations`, `constraints`, and validation messages |
| [Business Rules](/markvspec/en/reference/rules/) | Business rules and screen-specific conditions in `## Business Rules` |
| [IDs](/markvspec/en/reference/ids/) | How to use `SCR-*`, `L-*`, `E-*`, `A-*`, and `R-*` |
| [CLI](/markvspec/en/reference/cli/) | `validate`, HTML/PDF export, and project `document-list` export |
| [Limitations](/markvspec/en/reference/limitations/) | Markdown tables, JSON, visual design, and implementation details |

## Common Lookups

- Write the smallest useful screen: [File Format](/markvspec/en/reference/file-format/), [Sections](/markvspec/en/reference/sections/), [Elements](/markvspec/en/reference/elements/)
- Check parser-facing canonical syntax: [Grammar](/markvspec/en/reference/grammar/)
- Write a form: [Elements](/markvspec/en/reference/elements/), [Validations](/markvspec/en/reference/validations/), [Actions](/markvspec/en/reference/actions/)
- Write form groups, preview scenarios, slots, or error codes: [Sections](/markvspec/en/reference/sections/)
- Write an HTTP request: [Actions](/markvspec/en/reference/actions/), [Business Rules](/markvspec/en/reference/rules/), [IDs](/markvspec/en/reference/ids/)
- Write a partial update: [Actions](/markvspec/en/reference/actions/), [Elements](/markvspec/en/reference/elements/)
- Export output: [CLI](/markvspec/en/reference/cli/), [Limitations](/markvspec/en/reference/limitations/)

## Small Example

```markdown
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---

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

![Hello Screen source and generated preview](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## Related Pages

- [Guide](/markvspec/en/guide/)
- [Examples](/markvspec/en/examples/)
- [Hello Screen](/markvspec/examples/showcase/hello-screen.html)
