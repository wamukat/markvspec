# Export

MarkVSpec can export HTML / PDF from `.vspec.md`.

## VS Code

Run either command from the Command Palette.

```text
MarkVSpec: Export Static HTML
MarkVSpec: Export PDF
```

![VS Code Command Palette showing MarkVSpec HTML and PDF export commands](../../assets/start/vscode-export-command.png)

For a first run, exporting from the VS Code extension is the simplest path.

If you prefer the CLI, see [CLI reference](../reference/cli.md) for options.

## HTML

```bash
npx @markvspec/cli@latest export html hello.vspec.md --out markvspec-html
```

This creates `hello.html` in the output directory. Use it as a static artifact for review and sharing.

Use HTML export when you need a lightweight artifact that opens in a browser.
Keep the source in the pull request and share the HTML artifact with reviewers
who do not need to read Markdown.

Static HTML includes the structured specification that reviewers need outside VS Code: states, layout, elements, actions, Form Groups, Business Rules, Validations, Error Codes, custom Notes, and section/entity lead or notes prose. Treat it as a review artifact generated from the `.vspec.md` source, not as a separate document to edit.

For a compact inventory of screens, templates, and referenced partials in a
project file, use CLI `export document-list`. See [CLI reference](../reference/cli.md).

## PDF

```bash
npx @markvspec/cli@latest export pdf hello.vspec.md --out markvspec-pdf
```

PDF export needs a Chrome-compatible browser. If the environment has no browser available, use HTML export to inspect the result.

Use PDF export when you need a fixed artifact for issues, specification reviews,
or non-engineering stakeholders. The exported file is not the source of truth.
Keep `.vspec.md` as the canonical source and treat HTML / PDF as shareable
artifacts.

## Before Exporting

- Check in preview that the main states, elements, and actions are readable.
- Check that Form Groups, Business Rules, Validations, Error Codes, and Notes that matter to the review appear in the HTML output.
- Keep the source in a Git-managed location.
- Share `.vspec.md` when recipients need to edit; share HTML / PDF when they only need to read.
- For CLI export of multiple files, pass an explicit output directory.

## Next

- [Examples](../examples/index.md)
- [Guide](../guide/index.md)
