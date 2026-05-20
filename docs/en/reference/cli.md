# CLI

Use the CLI when you want to validate or export a `.vspec.md` file outside the VS Code extension.

The usual path is still:

1. write `hello.vspec.md` in VS Code;
2. check it with `MarkVSpec: Open Preview`;
3. export from VS Code when you are sharing one screen;
4. use the CLI for CI, scripts, or batch export.

You do not need to clone this repository to use the CLI against your own `.vspec.md` file.

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

## Small Example

```bash
npx @markvspec/cli@latest validate hello.vspec.md
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

## Notes

- The CLI does not require JSON as the authoring source. Input is `.vspec.md`.
- In CI, run `validate` first and export only sources that pass validation.
- `--out` is the output directory. Manage existing artifacts according to your environment.
- PDF font rendering and page breaks may vary by browser runtime.
- When the VS Code extension can export HTML/PDF, extension export is usually simpler for individual work.
- Paths under `examples/` assume you have checked out the MarkVSpec repository. For your own work, pass the path to the `.vspec.md` file in your workspace.

## Related Pages

- [File Format](file-format.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
