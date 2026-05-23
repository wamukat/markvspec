# Project Documents

Use project documents when a review needs more than one screen. A project
document is a `.vspec.project.md` file that explicitly lists the screens and
templates in the review scope.

Project documents are useful for two related workflows:

- Project preview: open the `.vspec.project.md` file in VS Code and run
  `MarkVSpec: Open Preview`.
- Document list export: run `export document-list` to create a compact Markdown
  inventory of screens, templates, and referenced partials.

## Copyable Example

The repository includes a project-level example:

- [Project Documents example](../../../examples/project/account-project.html)

That directory contains:

- `account-project.vspec.project.md`: the project index.
- `screens/account-dashboard.vspec.md` and `screens/account-settings.vspec.md`:
  screens listed by the project.
- `templates/account-shell.vspec.md`: a template listed by the project.
- `partials/account-summary.partial.vspec.md`: a partial reached through
  `references.partials`.

## Preview The Project

Open `account-project.vspec.project.md` and run:

```text
MarkVSpec: Open Preview
```

Project preview shows the project title, notes, screen list, template list,
transition graph, transition table, and project-level diagnostics.

## Export The Document List

From a checkout of this repository, run:

```bash
npx @markvspec/cli@latest export document-list examples/07-project-documents/account-project.vspec.project.md --out markvspec-docs
```

The output is `markvspec-docs/document-list.md`.

## Related Pages

- [Preview](../start/preview.md)
- [CLI](../reference/cli.md)
- [File Format](../reference/file-format.md)

