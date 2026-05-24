# Action Section Manual Acceptance

Use this checklist when reviewing the Action section-based syntax change in the
VS Code extension. Docs-site rendering and unit tests are not enough for this
change because the acceptance target is the authoring experience: live preview
updates, Problems entries, underline diagnostics, and exported HTML.

## Start VS Code

Start an Extension Development Host with a real `.vspec.md` file:

```bash
npm run smoke:vscode-devhost -- examples/03-actions/form-submit-flow.vspec.md
```

In the Extension Development Host, run `MarkVSpec: Open Preview` from the
Command Palette. Keep the source editor and the preview side by side.

## Valid Section Syntax

Use `examples/03-actions/form-submit-flow.vspec.md`.

1. In `A-SubmitRequest`, add a prose note directly under
   `#### P1: Process Check validation`.
2. Save the file, or wait for auto update when it is enabled.
3. Confirm the Action Details area in the preview shows that note inside the
   Process card.
4. Change the text of the note.
5. Confirm the preview updates without reopening the preview.

Expected result:

- No Problems entry is created for `#### From`, `#### P1: Process ...`, or
  `#### Otherwise`.
- The Process heading remains visible as the process label.
- The note appears in preview and remains visible after editing.

## Exported HTML

With the same file open:

1. Run `MarkVSpec: Export Static HTML`.
2. Save the exported file outside the repository or in a temporary directory.
3. Open the exported HTML in a browser.
4. Confirm the edited Process note appears in the exported Action Details.

Expected result:

- The exported HTML contains the same Process note that was visible in VS Code.
- The exported Action Details still show From states, Process heading, request,
  cases, and state transitions.

## Legacy Syntax Diagnostics

In a temporary copy of the file, replace one action with this legacy form:

```markdown
### A-LegacySubmit Legacy submit

- From
  - idle
- Process P1: Send request
  - request:
    - POST /legacy
```

Expected result:

- Problems shows warning diagnostics for legacy list-based `From` and
  list-based `Process` syntax.
- The editor underlines the legacy `- From` and `- Process P1:` source lines.
- The diagnostic message tells the author to use `#### From` and
  `#### P1: Process ...`.

## Unknown Key Diagnostics

In a valid process subsection, add a key-like typo:

```markdown
#### P1: Process Send request
- requset:
  - POST /broken
```

Expected result:

- Problems shows a warning for `requset:`.
- The editor underlines the typo line.
- The valid surrounding `#### P1: Process ...` subsection is still parsed as a
  Process step.

## Duplicate And Unsupported Heading Diagnostics

Use this temporary action:

```markdown
### A-BrokenSections Broken sections

#### From
- idle
#### From
- submitting
#### P1: Send request
- request:
  - POST /broken
```

Expected result:

- Problems shows a warning for duplicate `#### From`.
- Problems shows a warning for unsupported process heading `#### P1: Send request`.
- The unsupported heading message tells the author to use
  `#### P1: Process <name>`.

## Review Record

When accepting a ticket that changes Action section syntax, record the actual
VS Code target file, the edited cases, and whether each of these checks passed.
Do not accept the ticket from docs-site output alone.
