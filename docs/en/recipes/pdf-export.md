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
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

The CLI is useful when you need to:

- verify your `.vspec.md` files in CI;
- generate multiple review HTML files;
- create PDF release artifacts;
- export without using local preview.

For CI, validate first and choose explicit inputs:

```bash
npx @markvspec/cli@latest validate "screens/**/*.vspec.md" --fail-on-warnings
npx @markvspec/cli@latest export html "screens/**/*.vspec.md" --out markvspec-html
```

Use `--messages <path>` when exported labels need a custom message file. See
[CLI Reference](../reference/cli.md) for `diagnose input`, input patterns,
message files, output names, and PDF browser details.

If you are working inside a checkout of the MarkVSpec repository, you can also pass paths under `examples/`. For normal product work, pass the `.vspec.md` file in your own workspace.

## Common Pitfalls

- Checking only PDF makes layout issues harder to debug. Verify HTML export first.
- Do not edit source and export artifacts separately. Change `.vspec.md`, then export again.
- PDF export needs Chrome, Edge, Brave, or Chromium. Prepare the browser dependency in CI.
- Export artifacts are for review and distribution. The canonical source remains `.vspec.md`.
- If README or scripts include fixed paths, make sure they match files that exist in that workspace.
- If two source files have the same export base name, choose separate output directories or rename one source.

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
