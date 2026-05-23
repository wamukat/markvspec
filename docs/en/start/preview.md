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

Open a `.vspec.project.md` file with the same command when you need to review
multiple screens together. Project preview shows the project overview, notes,
screen list, template list, project transition diagram, transition table, and
diagnostics.

Use project preview for project-level review. Open each `.vspec.md` screen when
you need the screen wireframe and detailed screen sections.

## VS Code Commands

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
