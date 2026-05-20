# PDF Export

## When To Use

Use this recipe when you need to export `.vspec.md` as HTML / PDF for review, sharing, attachments, or release notes. Keep the source in Git. Treat HTML as a browser-friendly review artifact and PDF as a fixed-layout distribution artifact.

If you use the VS Code extension, exporting HTML / PDF from the extension is the simplest path. Use the CLI for CI, scripts, or batch export.

## Target Result

Keep one `.vspec.md` as the source of truth. Check it in VS Code preview, export HTML from the same source for browser review, and export PDF when you need a distributable fixed-layout artifact.

## Export From VS Code

1. Open a `.vspec.md` file in VS Code.
2. Run `MarkVSpec: Open Preview` and check the preview.
3. Use the command palette to run HTML or PDF export.
4. Open the generated HTML / PDF and verify that the screen title, states, wireframe, and messages are readable.

Exporting from VS Code keeps preview and export close together. Prefer this path when sharing one screen from your local workspace.

## Export From The CLI

```bash
npx @markvspec/cli@latest export html examples/01-basics/hello-screen.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf examples/01-basics/hello-screen.vspec.md --out markvspec-pdf
```

The CLI is useful when you need to:

- verify examples or docs export in CI;
- generate multiple review HTML files;
- create PDF release artifacts;
- export without using local preview.

See [CLI Reference](../reference/cli.md) for details.

## Common Pitfalls

- Checking only PDF makes layout issues harder to debug. Verify HTML export first.
- Do not edit source and export artifacts separately. Change `.vspec.md`, then export again.
- PDF export needs a Chrome-compatible browser. Prepare the browser dependency in CI.
- Export artifacts are for review and distribution. The canonical source remains `.vspec.md`.
- If README or scripts include fixed paths, make sure they match real example paths.

## Related Example

- [Hello Screen](../../../examples/showcase/hello-screen.html): Minimal exported screen.
- [Login](../../../examples/showcase/login-basic.html): Exported screen with form and action behavior.
- [Async Fetching](../../../examples/showcase/async-loading.html): Exported screen with multiple states.

## Related Reference

- [Export Start](../start/export.md)
- [CLI Reference](../reference/cli.md)
- [File Format Reference](../reference/file-format.md)
- [Limitations Reference](../reference/limitations.md)

## Verify

- HTML export creates the target screen `.html`.
- The HTML opens in a browser and shows readable title, states, wireframe, and actions.
- PDF export has no obvious page break or text overflow problems.
- For CI usage, command, output directory, and browser dependency are clear.
- When sharing artifacts, include a link to the source `.vspec.md` when useful.
