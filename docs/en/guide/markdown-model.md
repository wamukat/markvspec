# Markdown Model

MarkVSpec uses Markdown as the source of truth. YAML Front Matter holds document metadata, Markdown headings declare screen objects, and bullets describe properties and behavior.

## Concept

A `.vspec.md` file keeps the human-readable screen specification and the tool-readable structure in the same Markdown document. Front Matter stores document-level information such as screen ID, title, role, and locale. In the body, `#` names the screen, `##` creates major sections such as States, Layout, Elements, and Actions, and `###` declares individual objects.

The key is to use Markdown freely for notes while keeping structured parts stable with headings and bullets. This gives VS Code preview a predictable source, keeps Git diffs readable, and makes AI edits easier because you can point to a section or ID.

## Minimal Example

```markdown markvspec
---
id: SCR-HELLO
type: screen
title: Hello Screen
locale: en
---

# SCR-HELLO Hello Screen

## States

- idle*

## Layout: mobile

### L1:L-Main Main

- stack

#### Items

- E-Title

## Elements

### 1:E-Title Heading

- level: 1
- text: Hello
```

This example has screen metadata and only three sections: `States`, `Layout`, and `Elements`. That is enough to start rendering a preview. Start this small, confirm the preview works, then add actions and validation so problems are easy to isolate.

![Hello Screen source and generated preview](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## Common Patterns

- Use `SCR-*` for screens, `L-*` for layout groups, `E-*` for elements, `A-*` for actions, and `R-*` for rules.
- Use `### ID Name` or `### marker:ID Name` for objects. The marker is optional; the ID is what references use.
- Write states as bullets under `## States`; use `*` on one state for the initial state.
- Put only document-level information in Front Matter. Put element labels, actions, and behavior in the body.
- Use `##` sections for major concerns. Put visual structure in `Layout` and `Elements`, behavior in `Actions`, and constraints in `Business Rules` or validation-oriented sections.
- Put explanatory prose under `## Notes` or directly under a section. Avoid mixing free-form notes into object property lists.
- Markdown tables are fine for explanation, but headings and bullets should remain the canonical source.

## Next Reading

- [Document Structure](./document-structure.md)
- [States](./states.md)
- [Layout](./layout.md)

- [Hello Screen](../../../examples/showcase/hello-screen.html)
- [Reference](../reference/index.md)
