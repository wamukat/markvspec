# CLI

Use the CLI when you want to validate a source file or export review artifacts outside the VS Code extension.

The usual path is still:

1. write `hello.vspec.md` in VS Code;
2. check it with `MarkVSpec: Open Preview`;
3. export from VS Code when you are sharing one screen;
4. use the CLI for CI, scripts, batch export, or project document lists.

You do not need to clone this repository to use the CLI against your own `.vspec.md` or `.vspec.project.md` files.

## Syntax You Can Write

### Version

```bash
npx @markvspec/cli@latest --version
npx @markvspec/cli@latest -v
```

Print the installed `@markvspec/cli` version.

### Validate

```bash
npx @markvspec/cli@latest validate hello.vspec.md
npx @markvspec/cli@latest validate "screens/**/*.vspec.md" --fail-on-warnings
```

Parse and validate source files, checking syntax gaps and reference problems. Use
`--fail-on-warnings` when CI should fail on warnings as well as errors.

### Diagnose Input

```bash
npx @markvspec/cli@latest diagnose input requirements.md
```

Print an AI design input readiness report as JSON. Use this before asking AI to
create or revise MarkVSpec source from a planning document. The command exits
non-zero when the report is `high-risk`.

### Export HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export html "screens/**/*.vspec.md" --out markvspec-html --messages markvspec.messages.yml
```

Generate static HTML for preview and sharing.

### Export PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
npx @markvspec/cli@latest export pdf "screens/**/*.vspec.md" --out markvspec-pdf --messages markvspec.messages.yml
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
npx @markvspec/cli@latest validate hello.vspec.md --fail-on-warnings
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export document-list markvspec.project.md --out markvspec-docs
```

## Inputs And Outputs

- `validate`, `export html`, and `export pdf` accept a file, directory, or glob.
- If no input is passed, the CLI scans the current directory for `.vspec.md` and `.vspec.project.md` files. Prefer an explicit file or glob in scripts.
- Directory and glob expansion skips `.git` and `node_modules`.
- `export html` writes `<base>.html`; `export pdf` writes `<base>.pdf`.
- `login.vspec.md` exports as `login.html` / `login.pdf`.
- `admin.vspec.project.md` exports as `admin.project.html` / `admin.project.pdf`.
- `vspec.project.md` exports as `vspec.project.html` / `vspec.project.pdf`.
- If two inputs would write the same output name, export fails instead of overwriting one file with another.

## Renderer Messages

`export html` and `export pdf` accept `--messages <path>` when you need custom
renderer labels. This is mainly for localized or product-specific export labels.

Message resolution is:

1. explicit `--messages <path>`;
2. front matter `messages: ./file.yml`;
3. default `markvspec.messages.<locale>.yml`, `.yaml`, `.json`, or `markvspec.messages.yml`, `.yaml`, `.json` near the source.

Front matter `messages` must be relative to the MarkVSpec file and stay inside
that file's directory. If a message file is invalid or outside the allowed area,
the export falls back to built-in labels and reports a warning.

## PDF Environment

PDF export runs a Chrome-compatible browser in headless mode. The CLI looks for
Chrome, Edge, Brave, or Chromium depending on the operating system. In CI, install
one of those browsers first. If PDF export fails, export HTML and inspect that
output before debugging browser-specific page breaks or fonts.

## Notes

- The CLI does not require JSON as the authoring source. Input is `.vspec.md` or `.vspec.project.md`.
- In CI, run `validate` first and export only sources that pass validation.
- `--out` is the output directory. Manage existing artifacts according to your environment.
- `export document-list` accepts exactly one project index file and writes `<out>/document-list.md`.
- When the VS Code extension can export HTML/PDF, extension export is usually simpler for individual work.
- Paths under `examples/` assume you have checked out the MarkVSpec repository. For your own work, pass the path to the `.vspec.md` file in your workspace.

## Related Pages

- [File Format](file-format.md)
- [Sections](sections.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
