# Preview

The VS Code live preview lets you inspect a `.vspec.md` file as a low-fidelity UI specification.

## Open Preview

### Step 1: Open The Source

Open the `hello.vspec.md` file you created in VS Code.

### Step 2: Open The Command Palette

Open the Command Palette.

### Step 3: Run The Preview Command

Run this command.

```text
MarkVSpec: Open Preview
```

The preview follows source changes. Edit Markdown and check how states, layout, elements, and actions appear.

## Project Preview

Use project preview when you already have a `.vspec.project.md` file that lists
the screens and templates you want to review together. Project preview does not
discover every `.vspec.md` file in the workspace by itself; the project file is
the explicit index.

```markdown markvspec-skip reason=project-file-example
---
id: PRJ-ACCOUNT
type: project
title: Account Project
screens:
  - id: SCR-LOGIN
    path: screens/login.vspec.md
  - id: SCR-SETTINGS
    path: screens/settings.vspec.md
templates:
  - id: TPL-ACCOUNT-SHELL
    path: templates/account-shell.vspec.md
---

# PRJ-ACCOUNT Account Project

Use this project to review the account screens together.

## Notes

Keep navigation and shared shell changes visible in one place.
```

Open the `.vspec.project.md` file and run the same command:

```text
MarkVSpec: Open Preview
```

The repository includes a copyable project example at
[`examples/07-project-documents/account-project.vspec.project.md`](https://github.com/wamukat/markvspec/blob/main/examples/07-project-documents/account-project.vspec.project.md).

Project preview shows:

- the project ID, title, and lead text from the project file;
- project notes from `## Notes` and other note sections;
- the template list with load status;
- the screen list with screen ID, title, route, and path;
- a project transition diagram based on `navigate:` targets in listed screens;
- a transition table with action, source state, result, target type, and target;
- project-level diagnostics, including missing files, duplicate screen IDs,
  route collisions, and missing navigation targets.

Use project preview for project-level review: screen inventory, project notes,
cross-screen navigation, and diagnostics. Open each `.vspec.md` screen when you
need the screen wireframe, state views, element details, action details, or other
screen-local sections.

Project preview, project export, and `document-list` have different purposes:

| Feature | Use When | Output |
| --- | --- | --- |
| Project preview | You need to read project intent, screen/template lists, transition graph, and diagnostics inside VS Code. | Live preview webview. |
| Project HTML/PDF export | You need one shareable artifact that packages the listed screen specifications. | HTML or PDF containing loaded screen design documents. |
| `export document-list` | You need a compact inventory of screens, templates, and referenced partials. | Markdown table at `document-list.md`. |

Project preview is not a replacement for a generated project summary over every
screen in a workspace. If you need a summary from all screen design files, create
or generate a project index first, or use a dedicated project summary workflow
when one is available.

## VS Code Commands

<!-- markvspec-coverage:external-input.vscode-commands -->

These commands are available from the Command Palette. The displayed command
name is `MarkVSpec: <title>`.

| Command | Use When |
| --- | --- |
| `MarkVSpec: Open Preview` | Open or focus the live preview for the current `.vspec.md` or `.vspec.project.md` file. |
| `MarkVSpec: Format Structure` | Clean up recognized MarkVSpec structure in the active source file before review. It is not a general Markdown formatter: prose, unknown sections, Markdown tables, and list indentation are preserved. |
| `MarkVSpec: Export Static HTML` | Write a standalone HTML review artifact for the current screen or project file. |
| `MarkVSpec: Export PDF` | Write a PDF review artifact for the current screen or project file when a compatible browser is available. |
| `MarkVSpec: Refresh Preview` | Force the current preview to re-render when automatic updates are paused, delayed, or did not pick up a source/message-file change. |

Use `Open Preview` while authoring, `Refresh Preview` when you need a manual
reload of the existing preview, and `Export Static HTML` or `Export PDF` when
you need a shareable artifact. Use `Format Structure` only when you want the
extension to normalize recognized MarkVSpec blocks without rewriting narrative
Markdown.

## What To Look At

- Source headings become preview sections.
- Layout groups appear as wireframe groups.
- Elements show semantic details such as type, label, variant, and tone.
- Actions show trigger, process, and case flow.

## Decisions To Check In Preview

Preview is not a pixel-perfect design review. Use it to catch missing or
misleading specification details:

- Are the main screen pieces present in `Elements`?
- Do `Layout` `Items` appear in an order that communicates the screen?
- Is the `variant: primary` action actually the main action?
- Do `tone: danger` and `tone: warning` match the intended state or message?
- Do action `From`, `Process Pn:`, and `case:` entries read as a state transition?

After changing text or structure, save the file and re-check the preview. Reading
the Markdown diff together with the preview makes specification reviews easier.

## When Preview Looks Wrong

- If an element does not appear, check whether `Layout` `Items` references it.
- If a button has no clear behavior, check that `action: A-*` matches an ID under `## Actions`.
- For state-dependent display, check `visible when`, `disabled when`, and state spelling.
- If syntax is ambiguous, use [Reference](../reference/index.md) for the exact form.

## Next

- [Export](./export.md)
- [File Format](../reference/file-format.md)
