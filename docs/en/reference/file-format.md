# File Format

<!-- markvspec-coverage:reference.page.file-format -->

A `.vspec.md` file is the MarkVSpec authoring source. One file normally describes one screen, template, or partial.
A `.vspec.project.md` file describes a project index that points to screen and template files.

## Syntax You Can Write

```markdown markvspec
---
id: SCR-LOGIN
type: screen
title: Login
route: /login
locale: en
---

## States

- idle*

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
| `type` | yes | `screen`, `template`, `partial`, or `project` |
| `title` | yes | Human-readable screen name |
| `route` | no | URL path for a screen |
| `locale` | no | Locale such as `ja` or `en` |
| `messages` | no | Renderer message file path, resolved relative to the MarkVSpec file |
| `references.partials` | no | Map of `PRT-*` IDs to partial document paths |
| `screens` | project only | Screen entries for a `.vspec.project.md` project file |
| `templates` | project only | Template entries for a `.vspec.project.md` project file |

Do not put element properties, actions, or layout items in Front Matter. Put them in the Markdown body.

`messages` is used by HTML/PDF export and preview labels. The path must be
relative to the MarkVSpec file and must stay inside that file's directory. If it
points outside that directory, MarkVSpec falls back to built-in labels and
reports a warning. See [External Inputs And Configuration](configuration.md) for
the full message resolution order.

Use `references.partials` when a screen or template references `PRT-*` partial
documents. Missing `references.partials` entries are reported as diagnostics,
for example when `display.partial` or a layout `partial.id` references a partial
ID that is not declared in Front Matter.

### Project Files

Use a project file when you want one preview to list related screens and templates.

```markdown markvspec-skip reason=project-file-example
---
id: PRJ-ACCOUNT
type: project
title: Account Project
screens:
  - id: SCR-LOGIN
    path: screens/login.vspec.md
templates:
  - id: TPL-ACCOUNT-SHELL
    path: templates/account-shell.vspec.md
---

# PRJ-ACCOUNT Account Project

Use this project to review the account screens together.

## Notes

Keep navigation and shared shell changes visible in one place.
```

Project preview renders the project lead and `## Notes` so reviewers can read the project intent beside the screen/template list and transition graph. HTML/PDF export can also accept a project file; it loads the listed screens and packages those screen specifications into one artifact. CLI [document-list export](./cli.md) intentionally keeps the output compact and does not include long project lead / notes prose.

Project file entries are written in Front Matter. Each `screens:` or
`templates:` entry should include `path`; `id`, `title`, and `template` are also
recognized on entries when you need stable inventory labels or a screen/template
relationship. Project files do not scan directories automatically.

Related:

- [Preview](../start/preview.md): project preview contents.
- [Export](../start/export.md): project HTML/PDF export.
- [CLI](./cli.md): `export document-list` for a compact inventory.
- [External Inputs And Configuration](configuration.md): input summary and
  renderer message file precedence.

### Body

Write the body with Markdown headings and bullets.

- `##` is a top-level section.
- `###` declares an object.
- `####` declares a subsection inside an object.
- Bullets describe properties, rules, conditions, and transitions.
- A `###` object heading may be `### ID Name` or `### marker:ID Name`.

JSON is not the authoring format. Tools may use JSON internally or in exports, but users do not write JSON as the source format.

## Small Example

```markdown markvspec
---
id: SCR-HELLO
type: screen
title: Hello Screen
route: /hello
---

## Elements

### 1:E-Title Heading

- level: 1
- text: Hello MarkVSpec
```

![Hello Screen file format example and rendered preview](../../assets/vscode-previews/hello-screen-vscode-preview.png)

## Notes

- Use the `.vspec.md` file extension.
- Split multi-screen specifications into multiple screen files.
- Front Matter is YAML, but the body should not drift into YAML or JSON.
- Markdown tables may be used for explanation, but they are not canonical source.
- Use `type: partial` for reusable partial documents or screen fragments,
  including server-rendered HTML partials when that is your implementation.
- Use `type: project` only in `.vspec.project.md` files that list related screens and templates.
- Write states as bullets under `## States`; use `*` on one state for the initial state.

## Related Pages

- [Sections](./sections.md)
- [IDs](./ids.md)
- [Limitations](./limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
