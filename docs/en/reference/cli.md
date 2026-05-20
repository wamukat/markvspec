# CLI

Use the CLI to validate `.vspec.md` files and export generated output. A common workflow is to author with VS Code preview, then use the CLI for CI or static artifacts when needed.

## Syntax You Can Write

### Validate

```bash
npx @markvspec/cli@latest validate examples/01-basics/hello-screen.vspec.md
```

Parse and validate a source file, checking syntax gaps and reference problems.

### Export HTML

```bash
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
```

Generate static HTML for preview and sharing.

### Export PDF

```bash
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

PDF export needs a Chrome-compatible browser.

## Small Example

```bash
npx @markvspec/cli@latest validate ./screens/login.vspec.md
npx @markvspec/cli@latest export html ./screens/login.vspec.md --out ./dist/markvspec
```

## Notes

- The CLI does not require JSON as the authoring source. Input is `.vspec.md`.
- In CI, run `validate` first and export only sources that pass validation.
- `--out` is the output directory. Manage existing artifacts according to your environment.
- PDF font rendering and page breaks may vary by browser runtime.
- When the VS Code extension can export HTML/PDF, extension export is usually simpler for individual work.

## Related Pages

- [File Format](file-format.md)
- [Limitations](limitations.md)
- [Hello Screen](../../../examples/showcase/hello-screen.html)
