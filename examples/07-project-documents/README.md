# Project Documents Example

This directory shows the two project-level review paths:

- Open `account-project.vspec.project.md` in VS Code and run
  `MarkVSpec: Open Preview` to inspect the project preview.
- Run the document-list export against the same project file to create a compact
  inventory of screens, templates, and referenced partials.

```bash
npx @markvspec/cli@latest export document-list examples/07-project-documents/account-project.vspec.project.md --out markvspec-docs
```

The generated `markvspec-docs/document-list.md` should include:

- `Screen` rows for `SCR-ACCOUNT-DASHBOARD` and `SCR-ACCOUNT-SETTINGS`.
- A `Template` row for `TPL-ACCOUNT-SHELL`.
- A `Partial` row for `PRT-ACCOUNT-SUMMARY`, reached through
  `references.partials`.

