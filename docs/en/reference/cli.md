# CLI

Use the CLI when you want to validate a source file or export review artifacts outside the VS Code extension.

The usual path is still:

1. write `hello.vspec.md` in VS Code;
2. check it with `MarkVSpec: Open Preview`;
3. export from VS Code when you are sharing one screen;
4. use the CLI for CI, scripts, batch export, or project document lists.

You do not need to clone this repository to use the CLI against your own `.vspec.md` or `.vspec.project.md` files.

## Syntax You Can Write

### Validate

```bash
npx @markvspec/cli@latest validate hello.vspec.md
```

Parse and validate a source file, checking syntax gaps and reference problems. Use this before export in CI.

### Export HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

Generate static HTML for preview and sharing.

### Export PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export needs a Chrome-compatible browser.

### Export Document List

```bash
npx @markvspec/cli@latest export document-list path/to/markvspec.project.md --out markvspec-docs
```

Generate `<out>/document-list.md` from one project index file. The input is a
`.vspec.project.md` file with `screens:` entries and optional `templates:`
entries. This command does not scan an arbitrary directory.

The document list includes:

- `Screen` rows for screens listed by the project file.
- `Template` rows for templates listed by the project file.
- `Partial` rows for partials reached through declared `references.partials`.

The output table columns are `No.`, `Kind`, `ID`, `Title`, `Summary`, `Route`,
`Last Updated`, `File`, and `Diagnostics`. `Diagnostics` is a count summary such
as `0 errors / 0 warnings`, not the full diagnostic text.

Use this export when reviewers need a compact screen/template/partial inventory.
Use project preview when they need to read project intent, notes, document lists,
and transition graph together. Long project lead / notes prose is intentionally
not copied into `document-list.md`.

## Small Example

```bash
npx @markvspec/cli@latest validate hello.vspec.md
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export document-list markvspec.project.md --out markvspec-docs
```

## Notes

- The CLI does not require JSON as the authoring source. Input is `.vspec.md` or `.vspec.project.md`.
- In CI, run `validate` first and export only sources that pass validation.
- `--out` is the output directory. Manage existing artifacts according to your environment.
- `export document-list` accepts exactly one project index file and writes `<out>/document-list.md`.
- PDF font rendering and page breaks may vary by browser runtime.
- When the VS Code extension can export HTML/PDF, extension export is usually simpler for individual work.
- Paths under `examples/` assume you have checked out the MarkVSpec repository. For your own work, pass the path to the `.vspec.md` file in your workspace.

## Related Pages

- [File Format](file-format.md)
- [Sections](sections.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
